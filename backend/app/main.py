"""FastAPI app factory. All routes live under /api/v1."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .routers import auth, discover, matches, me, safety, users

app = FastAPI(title="BarbeCue API", version="1.0.0", docs_url="/api/v1/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

API = "/api/v1"
app.include_router(auth.router, prefix=API)
app.include_router(me.router, prefix=API)
app.include_router(discover.router, prefix=API)
app.include_router(matches.router, prefix=API)
app.include_router(safety.router, prefix=API)
app.include_router(users.router, prefix=API)

# uploaded photos (pilot: local disk; swap for object storage later without touching the DB URLs)
app.mount(f"{API}/media", StaticFiles(directory=settings.uploads_path), name="media")


@app.get(f"{API}/health")
def health():
    return {"status": "ok"}
