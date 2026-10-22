"""FastAPI dependencies: DB session and the current user (with last_seen touch → drives presence)."""

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .db import get_db
from .models import User, now_utc
from .security import decode_token


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip() if auth.lower().startswith("bearer ") else ""
    user_id = decode_token(token) if token else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    # presence: every authenticated request refreshes last_seen (activeNow window)
    user.last_seen_at = now_utc()
    db.commit()
    return user
