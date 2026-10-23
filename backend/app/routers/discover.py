"""Discover deck and swiping."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..matching import (
    apply_filters,
    attribute_map,
    deck_candidates,
    ensure_reciprocal_match,
    is_blocked,
    photo_map,
)
from ..models import Swipe, SwipeAction, User, now_utc
from ..schemas import SwipeIn
from ..serializers import user_out

router = APIRouter(tags=["discover"])


def parse_list(value: str | None) -> list[str] | None:
    return [item.strip() for item in value.split(",") if item.strip()] if value else None


@router.get("/discover")
def discover(
    # scalar facets
    ageMin: int | None = None,
    ageMax: int | None = None,
    distanceKm: float | None = None,
    # selectable single-value facets (comma-separated values)
    gender: str | None = None,
    fitnessLevel: str | None = None,
    diet: str | None = None,
    bodyType: str | None = None,
    activityLevel: str | None = None,
    height: str | None = None,  # bands: under-5-2, 5-2-to-5-8, over-5-8 (+ "Prefer not to say")
    # multi-value facets
    interests: str | None = None,
    goals: str | None = None,
    languages: str | None = None,
    # deck controls
    mode: str | None = "nearby",  # nearby | standouts
    limit: int | None = None,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    if mode not in ("nearby", "standouts"):
        raise HTTPException(status_code=422, detail="mode must be nearby or standouts")
    visible = min(max(limit or 25, 1), 50)
    if ageMin is not None and ageMin < 18:
        raise HTTPException(status_code=422, detail="ageMin must be 18 or older")

    filters = {
        "age_min": ageMin if ageMin is not None else 18,
        "age_max": ageMax if ageMax is not None else 99,
        "distance_km": distanceKm,
        **{
            key: parse_list(value)
            for key, value in {
                "gender": gender,
                "fitness_level": fitnessLevel,
                "diet": diet,
                "body_type": bodyType,
                "activity_level": activityLevel,
                "height": height,
                "interests": interests,
                "goals": goals,
                "languages": languages,
            }.items()
        },
        "mode": mode,
    }
    candidates = deck_candidates(db, me.id)
    attrs = attribute_map(db, {user.id for user in candidates})
    ordered = apply_filters(candidates, attrs, me, filters)
    page = ordered[:visible]
    # attrs already covers the page (page ⊆ candidates); only photos still need one query
    photos = photo_map(db, {user.id for user in page})
    return [user_out(db, user, viewer=me, attrs=attrs.get(user.id, {}), photo_urls=photos.get(user.id, [])) for user in page]


@router.post("/swipes")
def swipe(body: SwipeIn, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    target = db.get(User, body.user_id)
    if not target or target.id == me.id:
        raise HTTPException(status_code=404, detail="User not found")
    if is_blocked(db, me.id, target.id):
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(Swipe).filter(Swipe.swiper_id == me.id, Swipe.target_id == target.id).first()
    if existing:
        existing.action = SwipeAction(body.action)
        existing.created_at = now_utc()
    else:
        db.add(Swipe(swiper_id=me.id, target_id=target.id, action=SwipeAction(body.action)))
    try:
        db.commit()
    except IntegrityError:
        # a retry/double-tap raced us in: the row exists, so update it instead of 500ing
        db.rollback()
        existing = db.query(Swipe).filter(Swipe.swiper_id == me.id, Swipe.target_id == target.id).first()
        if existing:
            existing.action = SwipeAction(body.action)
            existing.created_at = now_utc()
            db.commit()

    if body.action == "pass":
        return {"matched": False}
    match = ensure_reciprocal_match(db, me.id, target.id)
    return {"matched": match is not None, "matchId": match.id if match else None}
