"""End-to-end tests over the seeded-style flows: auth → discover → swipe → match → chat → safety."""

from datetime import timedelta

from app.models import Message, Swipe, SwipeAction, now_utc

from .conftest import add_attr, auth_header, force_match, make_user


def signup(client, **overrides):
    body = {"name": "Test User", "email": "test@example.com", "password": "password123", "dateOfBirth": "2000-01-15"}
    body.update(overrides)
    response = client.post("/api/v1/auth/signup", json=body)
    assert response.status_code == 200, response.text
    return response.json()


def test_health(client):
    assert client.get("/api/v1/health").json() == {"status": "ok"}


def test_signup_validation(client):
    assert (
        client.post(
            "/api/v1/auth/signup", json={"name": "Kid", "email": "k@x.dev", "password": "password123", "dateOfBirth": "2015-01-01"}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/auth/signup", json={"name": "Shorty", "email": "s@x.dev", "password": "1719", "dateOfBirth": "2000-01-01"}
        ).status_code
        == 422
    )
    dup = signup(client)
    assert (
        client.post(
            "/api/v1/auth/signup", json={"name": "Again", "email": dup["email"], "password": "password123", "dateOfBirth": "2000-01-01"}
        ).status_code
        == 409
    )


def test_login(client, db):
    signup(client, email="login@x.dev")
    ok = client.post("/api/v1/auth/login", json={"email": "login@x.dev", "password": "password123"})
    assert ok.status_code == 200 and ok.json()["token"]
    bad = client.post("/api/v1/auth/login", json={"email": "login@x.dev", "password": "wrongpass123"})
    assert bad.status_code == 401


def test_requires_auth(client):
    assert client.get("/api/v1/me").status_code == 401
    assert client.get("/api/v1/matches").status_code == 401


def test_me_roundtrip(client, db):
    auth = auth_header(db, make_user(db, "Roundtrip"))
    assert client.get("/api/v1/me", headers=auth).status_code == 200
    patched = client.patch(
        "/api/v1/me",
        headers=auth,
        json={
            "bio": "lift",
            "fitnessLevel": "Advanced",
            "interests": ["Gym", "Running"],
            "diet": "Vegan",
            "latitude": 12.9,
            "longitude": 77.5,
        },
    )
    assert patched.status_code == 200
    me = patched.json()
    assert me["bio"] == "lift" and me["fitnessLevel"] == "Advanced" and me["interests"] == ["Gym", "Running"] and me["diet"] == "Vegan"
    # "Prefer not to say" clears a single-value attribute (stored NULL)
    cleared = client.patch("/api/v1/me", headers=auth, json={"diet": "Prefer not to say"}).json()
    assert cleared["diet"] is None


def test_discover_filters_and_exclusion(client, db):
    me = make_user(db, "Seeker")
    auth = auth_header(db, me)
    near = make_user(db, "Near", lat=12.971, lng=77.592, age=24, gender="Female")
    far = make_user(db, "Far", lat=13.5, lng=77.8, age=24)
    add_attr(db, near, "interest", "Gym")
    add_attr(db, near, "diet", "Vegan")

    deck = client.get("/api/v1/discover", headers=auth).json()
    ids = {user["id"] for user in deck}
    # unfiltered deck: no distance cap yet, so `far` may appear; self never does
    assert near.id in ids and me.id not in ids

    filtered = client.get("/api/v1/discover", headers=auth, params={"distanceKm": 10, "interests": "Gym", "diet": "Vegan"}).json()
    filtered_ids = {user["id"] for user in filtered}
    assert near.id in filtered_ids and far.id not in filtered_ids

    with_attr = client.get("/api/v1/discover", headers=auth, params={"diet": "Vegan"}).json()
    assert near.id in {user["id"] for user in with_attr} and far.id not in {user["id"] for user in with_attr}

    # PNTS matches undisclosed values (far has no diet at all)
    pnts = client.get("/api/v1/discover", headers=auth, params={"diet": "Prefer not to say"}).json()
    assert far.id in {user["id"] for user in pnts} and near.id not in {user["id"] for user in pnts}

    # already-swiped users never return
    client.post("/api/v1/swipes", headers=auth, json={"userId": near.id, "action": "pass"})
    after = client.get("/api/v1/discover", headers=auth).json()
    assert near.id not in {user["id"] for user in after}


def test_swipe_reciprocal_match(client, db):
    me = make_user(db, "Matcher")
    other = make_user(db, "MatchMe", lat=12.97, lng=77.59)
    auth, other_auth = auth_header(db, me), auth_header(db, other)

    first = client.post("/api/v1/swipes", headers=auth, json={"userId": other.id, "action": "like"}).json()
    assert first == {"matched": False, "matchId": None}
    second = client.post("/api/v1/swipes", headers=other_auth, json={"userId": me.id, "action": "like"}).json()
    assert second["matched"] and second["matchId"]
    match_id = second["matchId"]

    matches = client.get("/api/v1/matches", headers=auth).json()
    assert len(matches) == 1 and matches[0]["id"] == match_id
    assert matches[0]["category"] == "new" and matches[0]["unread"] == 0


def test_chat_flow(client, db):
    me = make_user(db, "Chat")
    other = make_user(db, "Chatter", lat=12.97, lng=77.59)
    auth, other_auth = auth_header(db, me), auth_header(db, other)
    match = force_match(db, me, other)

    sent = client.post(f"/api/v1/matches/{match.id}/messages", headers=other_auth, json={"text": "Big lifts today?"})
    assert sent.status_code == 200
    body = sent.json()
    assert body["senderId"] == other.id and body["read"] is False

    # unread shows on the matches list for me
    row = client.get("/api/v1/matches", headers=auth).json()[0]
    assert row["unread"] == 1 and row["hasUnread"] and row["lastMessage"]["text"] == "Big lifts today?"

    # cursor polling returns nothing new
    fresh = client.get(f"/api/v1/matches/{match.id}/messages", headers=auth, params={"after": body["timestamp"]}).json()
    assert fresh == []
    full = client.get(f"/api/v1/matches/{match.id}/messages", headers=auth).json()
    assert [m["text"] for m in full] == ["Big lifts today?"]

    # read receipt clears unread
    assert client.post(f"/api/v1/matches/{match.id}/read", headers=auth).status_code == 204
    assert client.get("/api/v1/matches", headers=auth).json()[0]["unread"] == 0
    # my own send: no auto-read weirdness
    mine = client.post(f"/api/v1/matches/{match.id}/messages", headers=auth, json={"text": "Yes, 6am."}).json()
    assert mine["senderId"] == me.id

    # category becomes active once messages flow
    assert client.get("/api/v1/matches", headers=auth).json()[0]["category"] == "active"


def test_match_category_expired(client, db):
    me = make_user(db, "Old")
    other = make_user(db, "OldChat", lat=12.97, lng=77.59)
    auth = auth_header(db, me)
    match = force_match(db, me, other)
    stale = Message(match_id=match.id, sender_id=other.id, body="old", created_at=now_utc() - timedelta(days=30))
    db.add(stale)
    db.commit()
    assert client.get("/api/v1/matches", headers=auth).json()[0]["category"] == "expired"


def test_likes_you(client, db):
    me = make_user(db, "Admired")
    admirer = make_user(db, "Admirer", lat=12.97, lng=77.59)
    otheradm = make_user(db, "Admirer2", lat=12.97, lng=77.59)
    auth = auth_header(db, me)
    db.add_all(
        [
            Swipe(swiper_id=admirer.id, target_id=me.id, action=SwipeAction.like),
            Swipe(swiper_id=otheradm.id, target_id=me.id, action=SwipeAction("pass")),
        ]
    )
    db.commit()
    likes = client.get("/api/v1/matches/likes-you", headers=auth).json()
    assert [user["id"] for user in likes] == [admirer.id]
    # liking back creates the match and removes the entry
    got = client.post("/api/v1/swipes", headers=auth, json={"userId": admirer.id, "action": "like"}).json()
    assert got["matched"]
    assert client.get("/api/v1/matches/likes-you", headers=auth).json() == []


def test_unmatched_blocks_conversation(client, db):
    me = make_user(db, "Unmatched")
    other = make_user(db, "UnmatchMe", lat=12.97, lng=77.59)
    auth = auth_header(db, me)
    match = force_match(db, me, other)
    assert client.post(f"/api/v1/matches/{match.id}/messages", headers=auth, json={"text": "hi"}).status_code == 200
    assert client.delete(f"/api/v1/matches/{match.id}", headers=auth).status_code == 204
    assert client.get(f"/api/v1/matches/{match.id}/messages", headers=auth).status_code == 404
    assert client.post(f"/api/v1/matches/{match.id}/messages", headers=auth, json={"text": "hey"}).status_code == 404
    assert client.get("/api/v1/matches", headers=auth).json() == []


def test_block_hides_everywhere(client, db):
    me = make_user(db, "Blocker")
    target = make_user(db, "BlockMe", lat=12.97, lng=77.59)
    auth = auth_header(db, me)
    db.add(Swipe(swiper_id=target.id, target_id=me.id, action=SwipeAction.like))
    db.commit()
    assert client.post(f"/api/v1/blocks/{target.id}", headers=auth).status_code == 204
    assert client.get("/api/v1/users/" + target.id, headers=auth).status_code == 404
    assert all(user["id"] != target.id for user in client.get("/api/v1/matches/likes-you", headers=auth).json())
    assert target.id not in {u["id"] for u in client.get("/api/v1/discover", headers=auth).json()}
    # from the other side, me is invisible too
    assert client.get("/api/v1/users/" + me.id, headers=auth_header(db, target)).status_code == 404


def test_foreign_match_is_404(client, db):
    a, b = make_user(db, "SecretA"), make_user(db, "SecretB")
    outsider_auth = auth_header(db, make_user(db, "Outsider"))
    match = force_match(db, a, b)
    assert client.get(f"/api/v1/matches/{match.id}", headers=outsider_auth).status_code == 404
    assert client.get(f"/api/v1/matches/{match.id}/messages", headers=outsider_auth).status_code == 404


def test_public_profile_contract(client, db):
    me = make_user(db, "Viewer")
    target = make_user(db, "Visible", lat=12.97, lng=77.59)
    add_attr(db, target, "interest", "Yoga")
    auth = auth_header(db, me)
    profile = client.get(f"/api/v1/users/{target.id}", headers=auth).json()
    assert profile["name"] == "Visible"
    assert "email" not in profile  # never leak emails
    assert profile["interests"] == ["Yoga"]
    assert profile["matchId"] is None
    assert isinstance(profile["distance"], (int, float))


def test_media_upload(client, db):
    auth = auth_header(db, make_user(db, "Uploader"))
    png = b"\x89PNG\r\n\x1a\n" + b"fake-bytes"
    response = client.post("/api/v1/media", headers=auth, files={"file": ("a.png", png, "image/png")})
    assert response.status_code == 200
    url = response.json()["url"]
    assert url.startswith("/api/v1/media/")
    assert client.get(url).status_code == 200
    # wrong mime rejected
    assert client.post("/api/v1/media", headers=auth, files={"file": ("a.exe", b"x", "application/octet-stream")}).status_code == 415


# ---------- Nutrition scanner ----------

# what the (mocked) Gemini call returns: model fields before deterministic DB-backed scaling
FAKE_GEMINI = {"items": [{"name": "roti / chapati", "grams": 180, "k": 0, "p2": 0, "c2": 0, "f2": 0, "fb": 0, "conf": "HIGH"}]}
JPEG_BYTES = "data:image/jpeg;base64,/9j/4AAAAAAAAAAAAAAAAAAAAAA="


def test_nutrition_disabled_without_key(client, db, monkeypatch):
    auth = auth_header(db, make_user(db, "Nutty"))
    monkeypatch.setattr("app.config.settings.gemini_api_key", "")
    response = client.post("/api/v1/nutrition/scan", headers=auth, json={"imageBase64": "xxx"})
    assert response.status_code == 503
    assert client.get("/api/v1/nutrition/usage", headers=auth).json()["scansUsed"] == 0


def test_nutrition_scan_quota_and_auth(client, db, monkeypatch):
    me = make_user(db, "ScanUser")
    auth = auth_header(db, me)
    monkeypatch.setattr("app.config.settings.gemini_api_key", "test-key")
    monkeypatch.setattr("app.nutrition._call_once", lambda data, mime: FAKE_GEMINI)

    # undecodable images → 422, quota untouched
    for garbage in ("bm90IGFuIGltYWdl", "!!!notb64!!!", "data:image/jpeg;base64,bm90IGFuIGltYWdl"):
        assert client.post("/api/v1/nutrition/scan", headers=auth, json={"imageBase64": garbage}).status_code == 422, garbage
    assert client.get("/api/v1/nutrition/usage", headers=auth).json()["scansUsed"] == 0

    # valid jpeg magic: data-URL accepted, item matched against the DB food table
    first = client.post("/api/v1/nutrition/scan", headers=auth, json={"imageBase64": JPEG_BYTES})
    assert first.status_code == 200, first.text
    body = first.json()
    assert body["scanId"] and body["scansUsed"] == 1 and body["scansRemaining"] == 9
    assert body["items"][0]["source"] == "DB" and body["totals"]["kcal"] == 504
    stored = client.get("/api/v1/nutrition/history", headers=auth).json()
    assert stored[0]["scanId"] == body["scanId"] and stored[0]["items"] == body["items"]
    assert client.get(f"/api/v1/nutrition/history?scanId={body['scanId']}", headers=auth).json()[0]["items"][0]["name"] == "roti / chapati"

    # 9 more scans fill the quota; the 11th is 429 with a Retry-After header
    for used in range(2, 11):
        response = client.post("/api/v1/nutrition/scan", headers=auth, json={"imageBase64": JPEG_BYTES})
        assert response.json()["scansUsed"] == used, used
    exhausted = client.post("/api/v1/nutrition/scan", headers=auth, json={"imageBase64": JPEG_BYTES})
    assert exhausted.status_code == 429 and "Retry-After" in exhausted.headers
    usage_row = client.get("/api/v1/nutrition/usage", headers=auth).json()
    assert usage_row["scansUsed"] == 10 and usage_row["dailyLimit"] == 10

    # other users have their own quota
    other = client.post(
        "/api/v1/nutrition/scan",
        headers=auth_header(db, make_user(db, "FreshFace", lat=12.98, lng=77.60)),
        json={"imageBase64": JPEG_BYTES},
    )
    assert other.status_code == 200


def test_nutrition_requires_auth(client):
    assert client.post("/api/v1/nutrition/scan", json={"imageBase64": "/9j/"}).status_code == 401
    assert client.get("/api/v1/nutrition/usage").status_code == 401
