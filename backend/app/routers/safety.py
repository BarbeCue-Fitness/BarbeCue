"""Blocks and reports. Reports are stored rows only (no moderation workflow in v1)."""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..matching import active_match_between
from ..models import Block, Report, User, now_utc
from ..schemas import ReportIn

router = APIRouter(tags=["safety"])


@router.post("/blocks/{user_id}", status_code=204)
def block_user(user_id: str, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    target = db.get(User, user_id)
    if not target or user_id == me.id:
        raise HTTPException(status_code=404, detail="User not found")
    if not db.query(Block).filter(Block.blocker_id == me.id, Block.blocked_id == user_id).first():
        db.add(Block(blocker_id=me.id, blocked_id=user_id))
    # a block kills an existing match
    match = active_match_between(db, me.id, user_id)
    if match:
        match.unmatched_at = now_utc()
    db.commit()
    return Response(status_code=204)


@router.post("/reports", status_code=201)
def report(body: ReportIn, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    if not db.get(User, body.user_id):
        raise HTTPException(status_code=404, detail="User not found")
    db.add(Report(reporter_id=me.id, reported_user_id=body.user_id, reason=body.reason))
    db.commit()
    return {"reported": True}
