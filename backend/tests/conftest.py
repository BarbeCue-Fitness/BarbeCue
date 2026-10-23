"""Test config: isolated SQLite file per run, fresh schema, shared TestClient."""

import os
import tempfile
from datetime import date
from pathlib import Path

# Must be set before app imports: the engine is built at import time.
_TMPDB = Path(tempfile.mkdtemp()) / "test.db"
os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{_TMPDB}"
os.environ.setdefault("JWT_SECRET", "test-secret-key-0123456789abcdef0123456789abcdef")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import (  # noqa: E402
    Attribute,
    Match,
    Photo,
    User,
    UserAttribute,
    match_between,
    now_utc,
)
from app.security import hash_password  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def schema():
    Base.metadata.create_all(engine)
    yield


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def make_user(
    db,
    name: str,
    *,
    email: str | None = None,
    password: str = "password123",
    lat: float = 12.97,
    lng: float = 77.59,
    age: int = 25,
    gender: str = "Female",
    **extra,
) -> User:
    dob_year = now_utc().year - age
    user = User(
        email=email or f"{name.lower().replace(' ', '')}{age}@test.dev",
        password_hash=hash_password(password),
        name=name,
        date_of_birth=date(dob_year, 6, 1),
        latitude=lat,
        longitude=lng,
        **extra,
    )
    db.add(user)
    db.flush()
    db.add(Photo(user_id=user.id, url=f"https://i.pravatar.cc/600?img={len(name) % 70 + 1}", position=0))
    db.commit()
    return user


def add_attr(db, user: User, kind: str, value: str) -> None:
    attribute = db.query(Attribute).filter(Attribute.kind == kind, Attribute.value == value).first()
    if not attribute:
        attribute = Attribute(kind=kind, value=value)
        db.add(attribute)
        db.flush()
    if kind in ("diet", "body_type", "activity_level"):  # single-value kinds are FK columns on users
        setattr(user, f"{kind}_id", attribute.id)
        db.commit()
    else:
        user.attributes.append(UserAttribute(user_id=user.id, attribute_id=attribute.id))
        db.commit()


def auth_header(db, user: User) -> dict:
    from app.security import create_token

    return {"Authorization": f"Bearer {create_token(user)}"}


def force_match(db, a: User, b: User) -> Match:
    a_id, b_id = match_between(a.id, b.id)
    match = Match(user_a_id=a_id, user_b_id=b_id)
    db.add(match)
    db.commit()
    db.refresh(match)
    return match
