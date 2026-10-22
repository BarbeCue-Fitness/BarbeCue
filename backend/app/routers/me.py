"""Profile: GET/PATCH /me, photos, and the media upload endpoint."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..matching import AttributeKind, get_attribute
from ..models import PREFER_NOT_TO_SAY, Attribute, Photo, User, UserAttribute, new_id, now_utc
from ..schemas import MePatchIn, PhotosIn
from ..serializers import user_out

router = APIRouter(tags=["profile"])

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
ALLOWED_UPLOAD_TYPES = ("image/jpeg", "image/png")


@router.get("/me")
def get_me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return user_out(db, user)


@router.patch("/me")
def patch_me(body: MePatchIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    data = body.model_dump(exclude_unset=True)

    # single-value attributes: "Prefer not to say" or "" clears the column (stored NULL);
    # unknown values are added to the vocabulary on the fly (pilot: no admin UI)
    for kind in ("diet", "body_type", "activity_level"):
        if kind in data:
            value = data.pop(kind)
            attribute = get_attribute(db, AttributeKind(kind), value or "")
            if attribute is None and value not in (None, "", PREFER_NOT_TO_SAY):
                attribute = Attribute(kind=AttributeKind(kind), value=value)
                db.add(attribute)
                db.flush()
            setattr(user, f"{kind}_id", attribute.id if attribute else None)

    # multi-value attributes: replace that kind's rows
    for field in ("interests", "goals", "languages"):
        values = data.pop(field, None)
        if values is None:
            continue
        kind = AttributeKind(field.rstrip("s"))
        user.attributes = [ua for ua in user.attributes if ua.attribute.kind != kind]
        for value in values:
            attribute = get_attribute(db, kind, value)
            if attribute is None:
                attribute = Attribute(kind=kind, value=value)
                db.add(attribute)
                db.flush()
            user.attributes.append(UserAttribute(user_id=user.id, attribute_id=attribute.id))

    if body.latitude is not None or body.longitude is not None:
        user.latitude = body.latitude if body.latitude is not None else user.latitude
        user.longitude = body.longitude if body.longitude is not None else user.longitude
        # fuzz to ~1 km: coarse storage on purpose, fine precision is not needed for a 25 km radius
        user.latitude = round(user.latitude, 2)
        user.longitude = round(user.longitude, 2)
        user.location_updated_at = now_utc()

    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user_out(db, user)


@router.put("/me/photos")
def put_photos(body: PhotosIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    user.photos = []  # replace ordered list
    for position, url in enumerate(body.urls):
        user.photos.append(Photo(user_id=user.id, url=url, position=position))
    db.commit()
    db.refresh(user)
    return user_out(db, user)


@router.post("/media")
def upload_media(
    file: UploadFile = File(),
    _user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_UPLOAD_TYPES:
        raise HTTPException(status_code=415, detail="Only JPEG or PNG images are accepted")
    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 5 MB or smaller")
    extension = "jpg" if file.content_type == "image/jpeg" else "png"
    name = f"{new_id()}.{extension}"
    (settings.uploads_path / name).write_bytes(data)
    # root-relative URL: the frontend fetches media from the same API origin (works on device + web)
    return {"url": f"/api/v1/media/{name}"}
