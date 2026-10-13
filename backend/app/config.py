from pathlib import Path
from typing import Dict, Any

# Path resolution relative to this file - never depends on current working directory
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
ML_ARTIFACTS_DIR = PROJECT_ROOT / "ml" / "artifacts"

# Standard normalized timezone for all Indian locations
TARGET_TIMEZONE = "Asia/Kolkata"  # IST, UTC+05:30

# City Registry & Solcast File Map
CITIES_CONFIG: Dict[str, Dict[str, Any]] = {
    "Delhi": {
        "id": "Delhi",
        "name": "Delhi NCR",
        "state": "National Capital Territory",
        "filename": "csv_28.704059_77.10249_fixed_26_180_PT15M.csv",
        "latitude": 28.704059,
        "longitude": 77.10249,
        "fixed_tilt": 26.0,
        "azimuth": 180.0,
        "source_offset": "+05:00",
        "climate_zone": "Semi-Arid / Composite",
        "expected_rows": 34944,
    },
    "Jaisalmer": {
        "id": "Jaisalmer",
        "name": "Jaisalmer",
        "state": "Rajasthan",
        "filename": "csv_26.90898_70.91464_fixed_25_180_PT15M.csv",
        "latitude": 26.90898,
        "longitude": 70.91464,
        "fixed_tilt": 25.0,
        "azimuth": 180.0,
        "source_offset": "+04:00",
        "climate_zone": "Hot Arid (Thar Desert)",
        "expected_rows": 34944,
    },
    "Raipur": {
        "id": "Raipur",
        "name": "Raipur",
        "state": "Chhattisgarh",
        "filename": "csv_21.251384_81.629641_fixed_20_180_PT15M.csv",
        "latitude": 21.251384,
        "longitude": 81.629641,
        "fixed_tilt": 20.0,
        "azimuth": 180.0,
        "source_offset": "+05:00",
        "climate_zone": "Tropical Wet & Dry",
        "expected_rows": 34944,
    },
}
