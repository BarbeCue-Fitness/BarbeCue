"""Matches list/detail, unmatch, chat messages (cursor polling), read receipts."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..db import get_db
from ..deps import get_current_user
from ..matching import category_of, is_blocked
from ..models import Match, Message, User, now_utc
from ..schemas import MessageIn
from ..serializers import iso, user_out

router = APIRouter(tags=["matches"])


def _other_user(match: Match, me: User) -> User | None:
    return match.user_a if match.user_b_id == me.id else match.user_b


@router.get("/matches/likes-you")
def likes_you(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    """Users who liked me and whom I have not swiped yet (free in v1)."""
    from ..models import Swipe, SwipeAction

    mine = {row.target_id for row in db.query(Swipe).filter(Swipe.swiper_id == me.id).all()}
    liked_mine = (
        db.query(User)
        .join(Swipe, Swipe.swiper_id == User.id)
        .filter(Swipe.target_id == me.id, Swipe.action.in_([SwipeAction.like, SwipeAction.super_like]))
        .all()
    )
    out: list[dict] = []
    for user in liked_mine:
        if user.id in mine or is_blocked(db, me.id, user.id):
            continue
        out.append(user_out(db, user, viewer=me))
    return out


@router.get("/matches")
def list_matches(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    matches = (
        db.query(Match)
        .options(joinedload(Match.user_a), joinedload(Match.user_b))
        .filter((Match.user_a_id == me.id) | (Match.user_b_id == me.id), Match.unmatched_at.is_(None))
        .order_by(Match.created_at.desc())
        .all()
    )
    others: list[User] = []
    active: list[tuple[Match, User]] = []
    for match in matches:
        other = _other_user(match, me)
        if other and not is_blocked(db, me.id, other.id):
            active.append((match, other))
            others.append(other)
    return [match_out(match, other, me, db) for match, other in active]


def match_out(match: Match, other: User, me: User, db: Session) -> dict:
    last = db.scalars(select(Message).where(Message.match_id == match.id).order_by(Message.created_at.desc()).limit(1)).first()
    unread = db.query(Message).filter(Message.match_id == match.id, Message.sender_id == other.id, Message.read_at.is_(None)).count()
    return {
        "id": match.id,
        "user": user_out(db, other, viewer=me),
        "matchedAt": iso(match.created_at),
        "hasUnread": unread > 0,
        "unread": unread,
        "category": category_of(last.created_at if last else None),
        "lastMessage": message_out(last) if last else None,
    }


def message_out(message: Message) -> dict:
    return {
        "id": message.id,
        "matchId": message.match_id,
        "senderId": message.sender_id,
        "text": message.body,
        "timestamp": iso(message.created_at),
        "type": "text",
        "read": message.read_at is not None,
    }


@router.get("/matches/{match_id}")
def get_match(match_id: str, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    match = _match_record(match_id, db, me)
    return match_out(match, _other_user(match, me), me, db)


def _match_record(match_id: str, db: Session, me: User) -> Match:
    match = db.get(Match, match_id)
    if not match or match.unmatched_at is not None:
        raise HTTPException(status_code=404, detail="Match not found")
    if me.id not in (match.user_a_id, match.user_b_id):
        raise HTTPException(status_code=404, detail="Match not found")  # don't leak existence
    other = _other_user(match, me)
    if not other or is_blocked(db, me.id, other.id):
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.delete("/matches/{match_id}", status_code=204)
def unmatch(match_id: str, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    match = _match_record(match_id, db, me)
    match.unmatched_at = now_utc()
    db.commit()


@router.get("/matches/{match_id}/messages")
def get_messages(
    match_id: str,
    after: str | None = Query(default=None, description="ISO timestamp of the last message already fetched"),
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    _match_record(match_id, db, me)
    query = db.query(Message).filter(Message.match_id == match_id)
    if after:
        try:
            cursor = datetime.fromisoformat(after.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="after must be an ISO timestamp") from exc
        query = query.filter(Message.created_at > cursor)
    return [message_out(m) for m in query.order_by(Message.created_at.asc()).all()]


@router.post("/matches/{match_id}/messages")
def send_message(
    match_id: str,
    body: MessageIn,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    match = _match_record(match_id, db, me)
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Message cannot be empty")
    message = Message(match_id=match.id, sender_id=me.id, body=text)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message_out(message)


@router.post("/matches/{match_id}/read", status_code=204)
def mark_read(match_id: str, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    match = _match_record(match_id, db, me)
    other = _other_user(match, me)
    (
        db.query(Message)
        .filter(Message.match_id == match.id, Message.sender_id == other.id, Message.read_at.is_(None))
        .update({"read_at": now_utc()}, synchronize_session=False)
    )
    db.commit()
    return Response(status_code=204)
