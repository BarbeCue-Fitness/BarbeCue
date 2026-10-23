"""App settings. Everything overridable by env vars for the Postgres/Docker migration later."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

_DEFAULT_JWT_SECRET = "CHANGE-ME-32-bytes-minimum-secret-key"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = f"sqlite+pysqlite:///{BASE_DIR / 'barbecue.db'}"
    jwt_secret: str = _DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    token_ttl_days: int = 30
    uploads_dir: Path = BASE_DIR / "uploads"
    # CORS origins allowed to call the API (Expo web dev server, etc.)
    cors_origins: str = "http://localhost:8081,http://localhost:19006"
    # Nutrition scanner (photo → meal analysis). Empty key = feature disabled (endpoint returns 503).
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"
    nutrition_daily_limit: int = 10  # scans per user per UTC day

    @property
    def uploads_path(self) -> Path:
        self.uploads_dir.mkdir(exist_ok=True)
        return self.uploads_dir

    def model_post_init(self, __context) -> None:
        # fail fast: a publicly known secret means anyone can forge login tokens for any user
        if self.jwt_secret == _DEFAULT_JWT_SECRET:
            raise RuntimeError(
                "JWT_SECRET is not set — refusing to sign tokens with the known default. "
                'Generate one: python -c "import secrets; print(secrets.token_hex(32))"'
            )


settings = Settings()
