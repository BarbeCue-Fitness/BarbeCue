"""Single-value helpers shared by routers: distance, attribute lookups, filtering, match helpers."""

from datetime import datetime, timedelta
from math import asin, cos, radians, sin, sqrt

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (
    PREFER_NOT_TO_SAY,
    Attribute,
    AttributeKind,
    Block,
    Match,
    Photo,
    Swipe,
    SwipeAction,
    User,
    UserAttribute,
    match_between,
    now_utc,
)

# PNTS filter selection matches NULL (undisclosed) attribute values.
HEIGHT_BANDS = ("under-5-2", "5-2-to-5-8", "over-5-8")
ACTIVE_WINDOW = timedelta(minutes=15)  # activeNow = made an authenticated request within this window
CATEGORY_WINDOW = timedelta(days=7)  # active match = last message within this window

VOCAB = {
    "interest": [
        "Gym",
        "Running",
        "Yoga",
        "Cycling",
        "Boxing",
        "Climbing",
        "Music",
        "Healthy Food",
        "Photography",
        "Travel",
        "Adventure",
        "Self Growth",
        "Pilates",
        "Calisthenics",
        "Weight Loss",
        "Lifestyle",
        "Fitness",
        "Strength",
        "Powerlifting",
        "Nutrition",
    ],
    "goal": [
        "Build Muscle",
        "Build muscle",
        "Lose Weight",
        "Maintain",
        "Get Fit",
        "Stay Fit",
        "Athletic",
        "General Health",
        "Get Stronger",
        "Build Habits",
        "Travel",
        "Stay consistent",
    ],
    "language": ["English", "Hindi", "Spanish", "Korean", "Other"],
    "diet": ["High protein", "Vegetarian", "Vegan", "Keto", "No preference", PREFER_NOT_TO_SAY],
    "body_type": ["Slim", "Athletic", "Muscular", "Curvy", "Average", PREFER_NOT_TO_SAY],
    "activity_level": ["Low", "Moderate", "High", PREFER_NOT_TO_SAY],
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_km = 6371.0
    p1, p2 = radians(lat1), radians(lat2)
    dp, dl = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(dp / 2) ** 2 + cos(p1) * cos(p2) * sin(dl / 2) ** 2
    return 2 * earth_km * asin(min(1.0, sqrt(a)))


def height_band(cm: int) -> str:
    inches = cm / 2.54
    if inches < 62:
        return "under-5-2"
    if inches <= 68:
        return "5-2-to-5-8"
    return "over-5-8"


def get_attribute(db: Session, kind: AttributeKind, value: str) -> Attribute | None:
    if value in ("", PREFER_NOT_TO_SAY):
        return None
    return db.scalar(select(Attribute).where(Attribute.kind == kind, Attribute.value == value))


def attribute_map(db: Session, user_ids: set[str]) -> dict[str, dict[str, list[str]]]:
    """attribute values per user: {user_id: {kind: [values]}} — one query for the whole set."""
    if not user_ids:
        return {}
    result: dict[str, dict[str, list[str]]] = {}
    for user_id, kind, value in db.execute(
        select(UserAttribute.user_id, Attribute.kind, Attribute.value)
        .join(Attribute, Attribute.id == UserAttribute.attribute_id)
        .where(UserAttribute.user_id.in_(user_ids))
    ).all():
        result.setdefault(user_id, {}).setdefault(kind, []).append(value)
    return result


def photo_map(db: Session, user_ids: set[str]) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    for user_id, url in db.execute(select(Photo.user_id, Photo.url).where(Photo.user_id.in_(user_ids)).order_by(Photo.position)).all():
        result.setdefault(user_id, []).append(url)
    return result


def is_blocked(db: Session, a_id: str, b_id: str) -> bool:
    row = (
        db.query(Block)
        .filter(((Block.blocker_id == a_id) & (Block.blocked_id == b_id)) | ((Block.blocker_id == b_id) & (Block.blocked_id == a_id)))
        .first()
    )
    return row is not None


def active_match_between(db: Session, a_id: str, b_id: str) -> Match | None:
    a, b = match_between(a_id, b_id)
    return db.scalar(select(Match).where(Match.user_a_id == a, Match.user_b_id == b, Match.unmatched_at.is_(None)))


def deck_candidates(db: Session, me_id: str) -> list[User]:
    """Everyone not the requester, not already swiped, not blocked in either direction."""
    swiped_ids = select(Swipe.target_id).where(Swipe.swiper_id == me_id).scalar_subquery()
    i_blocked = select(Block.blocked_id).where(Block.blocker_id == me_id).scalar_subquery()
    blocked_me = select(Block.blocker_id).where(Block.blocked_id == me_id).scalar_subquery()
    return list(db.query(User).filter(User.id != me_id, ~User.id.in_(swiped_ids), ~User.id.in_(i_blocked), ~User.id.in_(blocked_me)).all())


def apply_filters(candidates: list[User], attrs: dict[str, dict[str, list[str]]], me: User, filters: dict) -> list[User]:
    """filters uses snake_case keys already parsed from the query string (values are lists/None)."""

    def single(selected: list[str] | None) -> str | None:
        return selected[0] if selected else None

    me_loc = (me.latitude, me.longitude)
    age_min, age_max = filters.get("age_min", 18), filters.get("age_max", 99)
    out: list[tuple[float, User]] = []
    today = now_utc().date()

    for user in candidates:
        # age
        dob = user.date_of_birth
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        if not (age_min <= age <= age_max):
            continue

        # distance: candidates without coordinates or without viewer coordinates are dropped (pilot rule)
        if me_loc[0] is None or user.latitude is None or user.longitude is None:
            continue
        distance = haversine_km(me_loc[0], me_loc[1], user.latitude, user.longitude)
        if filters.get("distance_km") is not None and distance > filters["distance_km"]:
            continue

        # selectable single-value facets: value must be selected, or PNTS selected and value NULL
        user_attrs = attrs.get(user.id, {})
        diet_v = user.diet.value if user.diet else None
        body_v = user.body_type.value if user.body_type else None
        activity_v = user.activity_level.value if user.activity_level else None

        for facet, column in (
            ("gender", user.gender),
            ("fitness_level", user.fitness_level),
            ("diet", diet_v),
            ("body_type", body_v),
            ("activity_level", activity_v),
        ):
            selected = filters.get(facet) or []
            if selected and column not in selected and not (PREFER_NOT_TO_SAY in selected and column is None):
                break
        else:
            # multi-value facets: any overlap
            ok = True
            for facet in ("interest", "goal", "language"):
                selected = filters.get(f"{facet}s") or []
                if selected and not set(selected) & set(user_attrs.get(facet, [])):
                    ok = False
                    break
            if not ok:
                continue

            height = filters.get("height") or []
            band = height_band(user.height_cm) if user.height_cm else None
            if height and band not in height and not (PREFER_NOT_TO_SAY in height and band is None):
                continue

            mode = filters.get("mode")
            if mode == "standouts" and not user.standout:
                continue

            out.append((distance, user))

    # deterministic: nearest first, ties resolved by most recently active (pinned order per page request)
    out.sort(key=lambda pair: (round(pair[0], 1), -pair[1].last_seen_at.timestamp()))
    return [user for _, user in out]


def category_of(last_message_at: datetime | None) -> str:
    if last_message_at is None:
        return "new"
    return "active" if now_utc() - last_message_at <= CATEGORY_WINDOW else "expired"


def ensure_reciprocal_match(db: Session, me_id: str, target_id: str) -> Match | None:
    """If both sides liked each other and no active match exists, create one."""
    theirs = db.scalar(select(Swipe).where(Swipe.swiper_id == target_id, Swipe.target_id == me_id))
    if not theirs or theirs.action not in (SwipeAction.like, SwipeAction.super_like):
        return None
    return active_match_between(db, me_id, target_id) or _create_match(db, me_id, target_id)


def _create_match(db: Session, a_id: str, b_id: str) -> Match:
    a, b = match_between(a_id, b_id)
    match = Match(user_a_id=a, user_b_id=b)
    db.add(match)
    db.commit()
    db.refresh(match)
    return match
