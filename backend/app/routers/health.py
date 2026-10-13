from fastapi import APIRouter
from app.config import DATA_DIR, CITIES_CONFIG, TARGET_TIMEZONE
from app.schemas import HealthResponse

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
def get_health():
    """Health check endpoint to verify backend service and dataset availability."""
    data_dir_exists = DATA_DIR.exists() and DATA_DIR.is_dir()
    available_cities = list(CITIES_CONFIG.keys())
    
    return HealthResponse(
        status="ok",
        service="SOLAR DAP Analytics API",
        version="0.1.0",
        data_dir_found=data_dir_exists,
        available_cities=available_cities,
        normalized_timezone=f"{TARGET_TIMEZONE} (IST, UTC+05:30)"
    )
