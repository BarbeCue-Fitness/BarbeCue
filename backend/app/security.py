"""Passwords (Argon2id) and JWT tokens (HS256, single 30-day token, no refresh — v1 decision)."""

from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from .config import settings
from .models import User

_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    try:
        return _hasher.hash(password)
    except InvalidHashError:  # pragma: no cover - argon2 raises this only on corrupt inputs
        raise


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        # InvalidHashError: a corrupt stored hash must read as "wrong password", not 500
        return False


def create_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": user.id, "iat": now, "exp": now + timedelta(days=settings.token_ttl_days)},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None
