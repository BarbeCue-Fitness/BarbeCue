# BarbeCue Backend (FastAPI + SQLite)

Pilot back end for the BarbeCue Expo app. All routes under `/api/v1`.

## Run it

```sh
cd backend
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"

# database
.venv/bin/alembic upgrade head

# seed ~50 demo profiles + demo account (idempotent)
.venv/bin/python scripts/seed.py

# serve
.venv/bin/uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/api/v1/docs
- Demo account: `demo@barbecue.app` / `demopass123` (plus one live match with an unread thread and one inbound like in Likes-you)

## Frontend

Point the app at this server with `EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1` in `frontend/.env`, then `npx expo start --clear`.

## Environment

| Var | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite+pysqlite:///./barbecue.db` | swap for Postgres/Supabase URL later |
| `JWT_SECRET` | insecure placeholder | set a 32+ char secret in any real deployment |
| `CORS_ORIGINS` | localhost:8081/19006 | comma-separated allow-list |
| `GEMINI_API_KEY` | *(empty)* | enables `POST /nutrition/scan`; empty = feature disabled (endpoint → 503) |
| `NUTRITION_DAILY_LIMIT` | `10` | scans per user per UTC day (quota enforced via `nutrition_scans`) |

## Tests / lint

```sh
.venv/bin/pytest
.venv/bin/ruff check .
```

## Nutrition scanner

`POST /api/v1/nutrition/scan` (auth): meal photo as base64 → Gemini vision analysis → items + totals.
Gemini key lives **server-side only** (`GEMINI_API_KEY`); the phone never sees it. Best documented
contract (with request/response examples): the Swagger UI at `/api/v1/docs` → the `nutrition` section.

## Conventions

- IDs are UUIDv7 strings, timestamps ISO 8601 UTC (`...Z`).
- `null` attribute = "Prefer not to say"; filters include the literal string `Prefer not to say` to select NULLs.
- Distance is always computed viewer-relative (km), never stored on users.
- SQLite PRAGMAs (WAL, foreign_keys) are set in `app/db.py` only.
