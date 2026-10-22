"""ORM → camelCase dicts that match frontend/src/types/index.ts exactly."""

from datetime import datetime

from sqlalchemy.orm import Session

from .matching import ACTIVE_WINDOW, attribute_map, height_band, photo_map
from .models import User, now_utc


def iso(dt: datetime | None) -> str | None:
    return dt.isoformat() + "Z" if dt else None  # naive UTC stored; Z marks it as UTC for JS Date


def age_on(dob) -> int:
    today = now_utc().date()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def height_str(cm: int | None) -> str:
    if not cm:
        return ""
    feet, inches = divmod(round(cm / 2.54), 12)
    if feet == 0:
        return f"{inches}”"
    return f"{feet}’{inches}”"


def user_out(db: Session, user: User, viewer: User | None = None) -> dict:
    attributes = attribute_map(db, {user.id})
    user_attrs = attributes.get(user.id, {})
    photos = photo_map(db, {user.id}).get(user.id, [])

    if viewer and viewer.id != user.id and viewer.latitude is not None and user.latitude is not None:
        from .matching import haversine_km

        distance = round(haversine_km(viewer.latitude, viewer.longitude, user.latitude, user.longitude), 1)
    else:
        distance = 0

    def values(kind: str) -> list[str]:
        return user_attrs.get(kind, [])

    single_attr = lambda column: getattr(user, column).value if getattr(user, column) else None  # noqa: E731

    return {
        "id": user.id,
        "name": user.name,
        "age": age_on(user.date_of_birth),
        "distance": distance,
        "fitnessLevel": user.fitness_level,
        "focus": user.focus,
        "bio": user.bio,
        "prompt": user.prompt,
        "avatar": photos[0] if photos else "",
        "photos": photos,
        "interests": values("interest"),
        "goals": values("goal"),
        "schedule": user.schedule,
        "languages": values("language"),
        "verified": False,  # no verification system in v1
        "activeNow": user.last_seen_at is not None and (now_utc() - user.last_seen_at) <= ACTIVE_WINDOW,
        "standout": user.standout,
        "bodyType": single_attr("body_type"),
        "diet": single_attr("diet"),
        "activityLevel": single_attr("activity_level"),
        "height": height_str(user.height_cm),
        "heightCm": user.height_cm,
        "heightBand": height_band(user.height_cm) if user.height_cm else None,
        "gender": user.gender,
        # email deliberately excluded — only /auth endpoints return it (AuthUser shape)
    }
