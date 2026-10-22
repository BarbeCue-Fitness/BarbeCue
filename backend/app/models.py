"""All ORM models. Portable types only: no SQLite-specific columns, no JSON columns."""

import enum
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)  # naive UTC everywhere; add tz back only on output


def new_id() -> str:
    return str(uuid.uuid7())


# "Prefer not to say" is never stored: a NULL attribute means undisclosed, and a
# filter that includes PREFER_NOT_TO_SAY matches NULLs.
PREFER_NOT_TO_SAY = "Prefer not to say"


class SwipeAction(str, enum.Enum):
    pass_ = "pass"
    like = "like"
    super_like = "super-like"


class AttributeKind(str, enum.Enum):
    interest = "interest"
    goal = "goal"
    language = "language"
    diet = "diet"
    body_type = "body_type"
    activity_level = "activity_level"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(120))
    date_of_birth: Mapped[date]

    gender: Mapped[str | None] = mapped_column(String, default=None)
    bio: Mapped[str | None] = mapped_column(Text, default=None)
    prompt: Mapped[str | None] = mapped_column(String(280), default=None)
    focus: Mapped[str | None] = mapped_column(String, default=None)
    fitness_level: Mapped[str | None] = mapped_column(String, default=None)  # Beginner/Intermediate/Advanced
    schedule: Mapped[str | None] = mapped_column(String, default=None)
    height_cm: Mapped[int | None] = mapped_column(Integer, default=None)

    diet_id: Mapped[str | None] = mapped_column(ForeignKey("attributes.id"), default=None)
    body_type_id: Mapped[str | None] = mapped_column(ForeignKey("attributes.id"), default=None)
    activity_level_id: Mapped[str | None] = mapped_column(ForeignKey("attributes.id"), default=None)

    latitude: Mapped[float | None] = mapped_column(default=None)
    longitude: Mapped[float | None] = mapped_column(default=None)
    location_updated_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)

    standout: Mapped[bool] = mapped_column(Boolean, default=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    photos: Mapped[list["Photo"]] = relationship(back_populates="user", order_by="Photo.position", cascade="all, delete-orphan")
    attributes: Mapped[list["UserAttribute"]] = relationship(back_populates="user", cascade="all, delete-orphan")

    diet: Mapped["Attribute | None"] = relationship(foreign_keys=[diet_id])
    body_type: Mapped["Attribute | None"] = relationship(foreign_keys=[body_type_id])
    activity_level: Mapped["Attribute | None"] = relationship(foreign_keys=[activity_level_id])


class Photo(Base):
    __tablename__ = "photos"
    __table_args__ = (UniqueConstraint("user_id", "position"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    url: Mapped[str] = mapped_column(String(500))
    position: Mapped[int] = mapped_column(Integer)

    user: Mapped[User] = relationship(back_populates="photos")


class Attribute(Base):
    __tablename__ = "attributes"
    __table_args__ = (UniqueConstraint("kind", "value"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    kind: Mapped[AttributeKind] = mapped_column(String, index=True)
    value: Mapped[str] = mapped_column(String(80))

    users: Mapped[list["UserAttribute"]] = relationship(back_populates="attribute")


class UserAttribute(Base):
    __tablename__ = "user_attributes"
    __table_args__ = (UniqueConstraint("user_id", "attribute_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    attribute_id: Mapped[str] = mapped_column(ForeignKey("attributes.id"), index=True)

    user: Mapped[User] = relationship(back_populates="attributes")
    attribute: Mapped[Attribute] = relationship(back_populates="users")


class Swipe(Base):
    __tablename__ = "swipes"
    __table_args__ = (UniqueConstraint("swiper_id", "target_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    swiper_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    target_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[SwipeAction] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (
        UniqueConstraint("user_a_id", "user_b_id"),
        # a < b canonical ordering makes the pair lookup trivial
        CheckConstraint("user_a_id < user_b_id", name="ck_match_order"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_a_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    user_b_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    unmatched_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)

    user_a: Mapped[User] = relationship(foreign_keys=[user_a_id])
    user_b: Mapped[User] = relationship(foreign_keys=[user_b_id])


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (Index("ix_messages_match_created", "match_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    match_id: Mapped[str] = mapped_column(ForeignKey("matches.id"), index=True)
    sender_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)


class Block(Base):
    __tablename__ = "blocks"
    __table_args__ = (UniqueConstraint("blocker_id", "blocked_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    blocker_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    blocked_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    reported_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    reason: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)


class NutritionScan(Base):
    """One successful meal-photo analysis. The photo itself is never stored (deliberate)."""

    __tablename__ = "nutrition_scans"
    __table_args__ = (Index("ix_nutrition_user_day", "user_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    item_count: Mapped[int] = mapped_column(Integer)
    items_json: Mapped[str] = mapped_column(Text)  # [{name, grams, conf, source, n:{kcal,...}}]
    totals_json: Mapped[str] = mapped_column(Text)  # {kcal, protein, carbs, fat, fiber}
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)


# a match is accessible only while both users reference it and it is unmatched
def match_between(a_id: str, b_id: str) -> tuple[str, str]:
    return (a_id, b_id) if a_id < b_id else (b_id, a_id)
