"""FastAPI dependencies: DB session and the current user (with last_seen touch → drives presence)."""

from datetime import timedelta

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .db import get_db
from .models import User, now_utc
from .security import decode_token

# re-writing last_seen on every request costs a commit each time; 2 minutes is
# far inside the 15 min activeNow window and cuts ~90% of the writes
_LAST_SEEN_REFRESH = timedelta(minutes=2)


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip() if auth.lower().startswith("bearer ") else ""
    user_id = decode_token(token) if token else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    # presence: refresh last_seen (activeNow window), but not more often than every 2 min
    now = now_utc()
    if user.last_seen_at is None or now - user.last_seen_at >= _LAST_SEEN_REFRESH:
        user.last_seen_at = now
        db.commit()
    return user
