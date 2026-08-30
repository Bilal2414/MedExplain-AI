import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env if it exists
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings:
    ENV: str = os.getenv("ENV", "development")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    API_BEARER_TOKEN: str = os.getenv("API_BEARER_TOKEN", "")
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    RATE_LIMIT: str = os.getenv("RATE_LIMIT", "60/minute")
    
    # Absolute paths resolved relative to backend base directory
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    MODEL_PATH: Path = BASE_DIR / "models" / "best_model.joblib"
    ENCODER_PATH: Path = BASE_DIR / "models" / "label_encoder.joblib"
    FEATURES_PATH: Path = BASE_DIR / "models" / "feature_names.json"
    METADATA_PATH: Path = BASE_DIR / "models" / "model_metadata.json"
    
    # CORS_ORIGINS as a list of allowed hosts
    CORS_ORIGINS_RAW: str = os.getenv(
        "CORS_ORIGINS", 
        os.getenv(
            "ALLOWED_CORS_ORIGINS",
            "http://localhost:3000,http://localhost:5173,http://localhost:8080,http://127.0.0.1:3000,http://127.0.0.1:5173,http://localhost,http://127.0.0.1"
        )
    )
    
    @property
    def cors_origins(self) -> list[str]:
        origins = [origin.strip() for origin in self.CORS_ORIGINS_RAW.split(",") if origin.strip()]
        if self.ENV == "production" and "*" in origins:
            raise ValueError("Wildcard '*' origin is not allowed in production CORS policy for security.")
        return origins

settings = Settings()

