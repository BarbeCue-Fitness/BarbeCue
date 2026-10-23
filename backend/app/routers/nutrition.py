"""Nutrition scanner: photo → food items + totals via Gemini vision. 10 scans/user/UTC-day.

The photo is NEVER persisted — only the analysis result row (see NutritionScan), which also
doubles as the per-user daily counter (durable across restarts, IP-independent, authenticated
by construction)."""

from datetime import datetime, timedelta
from json import dumps, loads

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..models import NutritionScan, User, new_id, now_utc
from ..nutrition import GeminiError, ImageError, analyze_meal
from ..schemas import ScanIn, ScanOut, ScanRecord, UsageOut
from ..serializers import iso

router = APIRouter(prefix="/nutrition", tags=["nutrition"])

_INVALID_IMAGE = 422


def _daily_reset_at() -> datetime:
    """Midnight of the next UTC day — the moment the quota refills."""
    tomorrow = now_utc().date() + timedelta(days=1)
    return datetime.combine(tomorrow, datetime.min.time())


def _scans_used(db: Session, user_id: str) -> int:
    midnight = datetime.combine(now_utc().date(), datetime.min.time())
    return db.query(NutritionScan).filter(NutritionScan.user_id == user_id, NutritionScan.created_at >= midnight).count()


@router.post(
    "/scan",
    response_model=ScanOut,
    responses={
        _INVALID_IMAGE: {"description": "Not a decodable JPEG/PNG base64 image, or over 5 MB"},
        429: {
            "description": "User used all daily scans — retry after `Retry-After` seconds (quota resets at midnight UTC)",
        },
        502: {"description": "Gemini call failed (bad key, quota exhausted upstream, or malformed model output after retry)"},
        503: {"description": "Server has no GEMINI_API_KEY configured — scanning disabled"},
    },
    summary="Analyze a meal photo",
    description=(
        "Send the meal photo as base64 (`imageBase64`, JPEG or PNG, 5 MB max; a bare base64 string or "
        "the `data:image/*;base64,` prefix both work). The server sends it to the Gemini vision model "
        "with the app's nutrition prompt, matches distinct food items against the built-in food table "
        '(`source: "DB"`) or falls back to model estimates (`source: "AI"`), and returns per-item plus '
        "total nutrition. **Auth required. Cost: 1 scan of the per-user daily quota.** Failures to "
        "understand the image (422/502/503) do NOT consume quota."
    ),
)
def scan(body: ScanIn, db: Session = Depends(get_db), me: User = Depends(get_current_user)) -> ScanOut:
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Nutrition scanning is not configured on this server")

    used = _scans_used(db, me.id)
    if used >= settings.nutrition_daily_limit:
        retry_after = (_daily_reset_at() - now_utc()).total_seconds()
        raise HTTPException(
            status_code=429,
            detail=f"You've reached today's limit of {settings.nutrition_daily_limit} meal scans. Resets at midnight UTC.",
            headers={"Retry-After": str(max(1, int(retry_after)))},
        )

    try:
        result = analyze_meal(body.image_base64)
    except ImageError as exc:
        raise HTTPException(status_code=_INVALID_IMAGE, detail=str(exc)) from exc
    except GeminiError as exc:
        raise HTTPException(status_code=502, detail=f"Meal analysis failed: {exc}") from exc

    # recount after the (long) analysis: reqs sent while it ran have moved the counter.
    # shortcut: two concurrent scans from different devices can both pass and overshoot
    # by a couple of scans — harmless (a few paid calls), upgrade when real billing exists
    used = _scans_used(db, me.id)
    if used >= settings.nutrition_daily_limit:
        retry_after = (_daily_reset_at() - now_utc()).total_seconds()
        raise HTTPException(
            status_code=429,
            detail=f"You've reached today's limit of {settings.nutrition_daily_limit} meal scans. Resets at midnight UTC.",
            headers={"Retry-After": str(max(1, int(retry_after)))},
        )

    tally = ScanOut(
        scan_id=new_id(),
        items=result["items"],
        totals=result["totals"],
        scans_used=used + 1,
        scans_remaining=settings.nutrition_daily_limit - used - 1,
    )
    # the analysis row is the durable usage counter; the photo never touches disk
    db.add(
        NutritionScan(
            id=tally.scan_id,
            user_id=me.id,
            item_count=len(tally.items),
            items_json=dumps([item.model_dump(mode="json") for item in tally.items]),
            totals_json=dumps(tally.totals.model_dump(mode="json")),
        )
    )
    db.commit()
    return tally


@router.get(
    "/usage",
    response_model=UsageOut,
    summary="Today's scan quota",
    description="How many meal scans the user has used today, the limit, and when it resets (midnight UTC). "
    "**Auth required.** Free to call — does not consume quota.",
)
def usage(db: Session = Depends(get_db), me: User = Depends(get_current_user)) -> UsageOut:
    return UsageOut(
        scans_used=_scans_used(db, me.id),
        daily_limit=settings.nutrition_daily_limit,
        reset_at=iso(_daily_reset_at()),
    )


@router.get(
    "/history",
    response_model=list[ScanRecord],
    responses={404: {"description": "Unknown scanId"}},
    summary="Past scans",
    description="Past successful scans for the signed-in user, newest first (max 30). "
    "Optionally `?scanId=` for exactly one. **Auth required.**",
)
def history(scanId: str | None = None, db: Session = Depends(get_db), me: User = Depends(get_current_user)) -> list[ScanRecord]:
    if scanId:
        one = db.get(NutritionScan, scanId)
        if not one or one.user_id != me.id:
            raise HTTPException(status_code=404, detail="Scan not found")
        return [_scan_record(one)]
    rows = (
        db.query(NutritionScan)
        .filter(NutritionScan.user_id == me.id)
        .order_by(NutritionScan.created_at.desc())
        .limit(30)
        .all()
    )
    return [_scan_record(row) for row in rows]


def _scan_record(row: NutritionScan) -> ScanRecord:
    return ScanRecord(
        scan_id=row.id,
        created_at=iso(row.created_at),
        items=loads(row.items_json),
        totals=loads(row.totals_json),
    )
