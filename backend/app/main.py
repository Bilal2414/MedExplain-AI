import logging
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes.analysis import router as analysis_router
from app.limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

# Configure logging securely
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("app.main")
logger.info("Initializing MedExplain AI Backend (ENV: %s)", settings.ENV)

app = FastAPI(
    title="MedExplain AI Backend",
    description="FastAPI backend for medical machine learning prediction, SHAP explanation, and Gemini orchestration.",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(analysis_router)

@app.get("/health", tags=["Health"])
async def health_check():
    """
    General health check endpoint detailing server status and ML model state.
    """
    from app.services.ml_service import ml_service
    return {
        "status": "healthy",
        "model_loaded": ml_service.is_loaded
    }

@app.get("/ready", tags=["Health"])
async def readiness_check():
    """
    Readiness check endpoint used by orchestration/monitoring tools to confirm
    model parameters are loaded on disk and prediction is ready.
    """
    from app.services.ml_service import ml_service
    if ml_service.is_loaded:
        return {"status": "ready"}
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Model or SHAP explanation components are not loaded."
    )

