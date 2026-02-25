"""
Food Rescue Platform — Application Settings
Uses pydantic-settings for validation and .env support.
"""
import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # ─── Core ──────────────────────────────────────
    PROJECT_NAME: str = "Food Rescue Platform"
    VERSION: str = "2.0.0"
    DESCRIPTION: str = "AI-Powered Food Waste Prevention & Redistribution Platform"
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # ─── Database ──────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./food_rescue.db"
    DB_ECHO: bool = False  # SQLAlchemy echo (True = log every query)

    # ─── JWT / Auth ────────────────────────────────
    SECRET_KEY: str = "change-me-in-env-file"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 h
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ─── CORS ──────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*",
    ]

    # ─── ML / AI ───────────────────────────────────
    ML_MODEL_PATH: str = "./ml_models/"
    SURPLUS_MODEL_VERSION: str = "xgboost-v2.1"
    ROUTE_SOLVER: str = "ortools-nearest-neighbor"
    CLASSIFIER_MODEL: str = "indicbert-v2-finetuned"

    # ─── Rate Limiting ─────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 120

    # ─── GCP (Production) ─────────────────────────
    GCP_PROJECT_ID: str = "food-rescue-platform"
    GCP_REGION: str = "asia-south1"

    # ─── Notifications ─────────────────────────────
    NOTIFICATION_TTL_DAYS: int = 30
    MAX_WEBSOCKET_CONNECTIONS: int = 500

    # ─── Food Safety ───────────────────────────────
    DEFAULT_EXPIRY_HOURS: int = 2  # 120 min default pickup urgency
    MAX_DELIVERY_RADIUS_KM: float = 25.0
    DRIVER_SPEED_KMH: float = 25.0
    DRIVER_RATE_PER_KM: float = 12.0
    DRIVER_BASE_FARE: float = 30.0

    # ─── Conversion Constants ─────────────────────
    MEALS_PER_KG: float = 4.0  # 1 kg food = 4 meals (standard)
    CO2_PER_KG: float = 2.5    # 1 kg food waste = 2.5 kg CO₂ equivalent
    WATER_PER_KG: float = 1000.0  # litres of water per kg food
    VALUE_PER_KG_INR: float = 100.0  # ₹ value per kg

    # ─── Temperature Safety Thresholds ────────────
    TEMP_SAFE_COLD_MAX_C: float = 5.0   # Cold food must stay below 5°C
    TEMP_SAFE_HOT_MIN_C: float = 65.0   # Hot food must stay above 65°C

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_db_url(cls, v: str) -> str:
        if not v:
            raise ValueError("DATABASE_URL must not be empty")
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
