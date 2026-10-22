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


# ---------- Nutrition scanner ----------

_NUTRITION_FACTS_EXAMPLE = {"kcal": 682, "protein": 30, "carbs": 98, "fat": 13, "fiber": 8}

_NUTRITION_ITEM_EXAMPLE = {
    "name": "roti / chapati",
    "grams": 180,
    "conf": "HIGH",
    "source": "DB",
    "n": {"kcal": 504, "protein": 18, "carbs": 82.8, "fat": 9, "fiber": 7.2},
}


class NutritionFacts(BaseModel):
    """Nutrition totals as displayed on the results screen (grams for macros, count for kcal)."""

    model_config = ConfigDict(json_schema_extra={"example": _NUTRITION_FACTS_EXAMPLE, "description": "All values for the scanned meal."})

    kcal: int
    protein: float
    carbs: float
    fat: float
    fiber: float


class NutritionItem(BaseModel):
    """One distinct food item recognised in the photo."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [_NUTRITION_ITEM_EXAMPLE],
            "description": "`source` DB = matched against the built-in food table (deterministic), "
            "AI = model estimate. `conf` is the model's confidence.",
        }
    )

    name: str = Field(max_length=80)
    grams: float = Field(gt=0, le=3000, description="Estimated weight of this item in the photo.")
    conf: str = Field(description="Model confidence: HIGH | MEDIUM | LOW")
    source: str = Field(description="DB (deterministic food table) or AI (model per-100g estimate)")
    n: NutritionFacts


class ScanIn(CamelModel):
    """Request body for POST /nutrition/scan."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"imageBase64": "data:image/jpeg;base64,/9j/4AAQSk..."},
            "description": "The meal photo, base64-encoded. Both bare base64 and the `data:image/*;base64,` "
            "prefix are accepted. JPEG or PNG, 5 MB max.",
        }
    )

    image_base64: str


class ScanOut(BaseModel):
    """Response for POST /nutrition/scan — use these numbers straight on the results screen."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "scanId": "0195ef2a-7a1a-7ce1-8ff1-62e0c85db6a1",
                "scansUsed": 3,
                "scansRemaining": 7,
                "items": [
                    _NUTRITION_ITEM_EXAMPLE,
                    {
                        "name": "dal / lentil curry",
                        "grams": 250,
                        "conf": "MEDIUM",
                        "source": "DB",
                        "n": {"kcal": 290, "protein": 22.5, "carbs": 40, "fat": 3.8, "fiber": 15},
                    },
                ],
                "totals": _NUTRITION_FACTS_EXAMPLE,
            }
        }
    )

    scan_id: str = Field(serialization_alias="scanId")
    items: list[NutritionItem]
    totals: NutritionFacts
    scans_used: int = Field(serialization_alias="scansUsed")
    scans_remaining: int = Field(serialization_alias="scansRemaining")


class UsageOut(BaseModel):
    """Response for GET /nutrition/usage — show this near the scanner to display the user's daily allowance."""

    model_config = ConfigDict(json_schema_extra={"example": {"scansUsed": 4, "dailyLimit": 10, "resetAt": "2026-10-23T00:00:00Z"}})

    scans_used: int = Field(serialization_alias="scansUsed")
    daily_limit: int = Field(serialization_alias="dailyLimit")
    reset_at: str = Field(serialization_alias="resetAt", description="ISO timestamp when the daily quota resets (midnight UTC).")


class ScanRecord(BaseModel):
    """One stored scan as returned by GET /nutrition/history (quota counters omitted — they were live at the time)."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "scanId": "0195ef2a-7a1a-7ce1-8ff1-62e0c85db6a1",
                "createdAt": "2026-10-22T12:30:05.123456Z",
                "items": [_NUTRITION_ITEM_EXAMPLE],
                "totals": _NUTRITION_FACTS_EXAMPLE,
            }
        }
    )

    scan_id: str = Field(serialization_alias="scanId")
    created_at: str = Field(serialization_alias="createdAt")
    items: list[NutritionItem]
    totals: NutritionFacts
