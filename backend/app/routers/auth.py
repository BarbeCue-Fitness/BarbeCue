"""Auth: signup + login. 30-day JWT in the response (no refresh in v1)."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import User, age_on, now_utc
from ..schemas import LoginIn, SignUpIn
from ..security import create_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def auth_out(user: User) -> dict:
    return {"id": user.id, "name": user.name, "email": user.email, "token": create_token(user)}


@router.post("/signup")
def signup(body: SignUpIn, db: Session = Depends(get_db)):
    try:
        dob = date.fromisoformat(body.date_of_birth)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="dateOfBirth must be YYYY-MM-DD") from exc
    if age_on(dob) < 18:
        raise HTTPException(status_code=422, detail="You must be 18 or older to join BarbeCue")
    if db.scalar(select(User).where(User.email == body.email)):
        raise HTTPException(status_code=409, detail="That email is already registered")
    user = User(email=body.email, password_hash=hash_password(body.password), name=body.name.strip(), date_of_birth=dob)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # the same email raced in from a second request; the check above already missed it
        db.rollback()
        raise HTTPException(status_code=409, detail="That email is already registered") from None
    db.refresh(user)
    return auth_out(user)


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")  # same message either way
    user.last_seen_at = now_utc()
    db.commit()
    return auth_out(user)


@router.post("/logout", status_code=204)  # stateless JWT: server has nothing to revoke; kept for API symmetry
def logout(_user: User = Depends(get_current_user)):
    return None
