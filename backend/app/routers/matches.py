"""Matches list/detail, unmatch, chat messages (cursor polling), read receipts."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select, tuple_
from sqlalchemy.orm import Session, joinedload

from ..db import get_db
from ..deps import get_current_user
from ..matching import attribute_map, category_of, is_blocked, photo_map
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
    out_users: list[User] = []
    for user in liked_mine:
        if user.id in mine or is_blocked(db, me.id, user.id):
            continue
        out_users.append(user)
    attrs = attribute_map(db, {user.id for user in out_users})
    photos = photo_map(db, {user.id for user in out_users})
    return [user_out(db, user, viewer=me, attrs=attrs.get(user.id, {}), photo_urls=photos.get(user.id, [])) for user in out_users]


@router.get("/matches")
def list_matches(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    matches = (
        db.query(Match)
        .options(joinedload(Match.user_a), joinedload(Match.user_b))
        .filter((Match.user_a_id == me.id) | (Match.user_b_id == me.id), Match.unmatched_at.is_(None))
        .order_by(Match.created_at.desc())
        .all()
    )
    active: list[tuple[Match, User]] = []
    for match in matches:
        other = _other_user(match, me)
        if other and not is_blocked(db, me.id, other.id):
            active.append((match, other))
    if not active:
        return []
    # 3 queries for the whole page instead of ~5 per match (message fan-out bug class)
    match_ids = [match.id for match, _ in active]
    last_at = dict(
        db.query(Message.match_id, func.max(Message.created_at))
        .filter(Message.match_id.in_(match_ids))
        .group_by(Message.match_id)
        .all()
    )
    unread = dict(
        db.query(Message.match_id, func.count(Message.id))
        .filter(
            Message.match_id.in_(match_ids),
            Message.sender_id != me.id,
            Message.read_at.is_(None),
        )
        .group_by(Message.match_id)
        .all()
    )
    last: dict[str, Message] = {}
    if last_at:
        rows = db.query(Message).filter(tuple_(Message.match_id, Message.created_at).in_(list(last_at.items()))).all()
        for row in rows:
            current = last.get(row.match_id)
            if current is None or row.created_at >= current.created_at:
                last[row.match_id] = row
    others = {other.id for _, other in active}
    attrs = attribute_map(db, others)
    photos = photo_map(db, others)
    return [
        match_out(
            match,
            other,
            me,
            db,
            last_message=last.get(match.id),
            unread_count=unread.get(match.id, 0),
            attrs=attrs.get(other.id, {}),
            other_photos=photos.get(other.id, []),
        )
        for match, other in active
    ]


def match_out(
    match: Match,
    other: User,
    me: User,
    db: Session,
    last_message: Message | None = None,
    unread_count: int | None = None,
    attrs: dict | None = None,
    other_photos: list[str] | None = None,
) -> dict:
    if last_message is None:
        last = db.scalars(select(Message).where(Message.match_id == match.id).order_by(Message.created_at.desc()).limit(1)).first()
    else:
        last = last_message
    if unread_count is None:
        unread = db.query(Message).filter(Message.match_id == match.id, Message.sender_id == other.id, Message.read_at.is_(None)).count()
    else:
        unread = unread_count
    return {
        "id": match.id,
        "user": user_out(db, other, viewer=me, attrs=attrs, photo_urls=other_photos),
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
