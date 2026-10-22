"""Public profile view. No email; blocked profiles look like they don't exist."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..matching import active_match_between, is_blocked
from ..models import User
from ..serializers import user_out

router = APIRouter(tags=["users"])


@router.get("/users/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    user = db.get(User, user_id)
    if not user or is_blocked(db, me.id, user.id):
        raise HTTPException(status_code=404, detail="User not found")
    out = user_out(db, user, viewer=me)
    match = active_match_between(db, me.id, user.id)
    out["matchId"] = match.id if match else None  # used for the inline "Message" action
    return out
