"""Request bodies only. Responses are plain dicts built in serializers.py so they match the
frontend's camelCase TS types exactly (computed fields like distance/age can't come from ORM)."""

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class SignUpIn(CamelModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    date_of_birth: str  # "YYYY-MM-DD"; parsed + 18+ checked server-side

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class LoginIn(CamelModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class MePatchIn(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    bio: str | None = Field(default=None, max_length=500)
    prompt: str | None = Field(default=None, max_length=280)
    focus: str | None = Field(default=None, max_length=80)
    fitness_level: str | None = Field(default=None, max_length=40)
    schedule: str | None = Field(default=None, max_length=280)
    height_cm: int | None = Field(default=None, ge=50, le=250)
    gender: str | None = Field(default=None, max_length=40)
    diet: str | None = None  # attribute values; None clears, "" clears, PNTS clears too
    body_type: str | None = None
    activity_level: str | None = None
    interests: list[str] | None = None
    goals: list[str] | None = None
    languages: list[str] | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class PhotosIn(CamelModel):
    urls: list[str] = Field(max_length=6)


class SwipeIn(CamelModel):
    user_id: str
    action: str  # like | pass | super-like

    @field_validator("action")
    @classmethod
    def known_action(cls, value: str) -> str:
        if value not in ("like", "pass", "super-like"):
            raise ValueError("action must be like, pass or super-like")
        return value


class MessageIn(CamelModel):
    text: str = Field(min_length=1, max_length=1000)


class ReportIn(CamelModel):
    user_id: str
    reason: str | None = Field(default=None, max_length=1000)
