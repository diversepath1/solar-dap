from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.config import CITIES_CONFIG, TARGET_TIMEZONE
from app.schemas import (
    CitiesResponse, 
    CityMetadata, 
    SummaryResponse, 
    TimeseriesResponse, 
    TimeseriesRecord
)
from app.data_loader import (
    normalize_city_name, 
    get_city_dataframe, 
    get_city_summary_stats, 
    get_city_timeseries_slice
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/cities", response_model=CitiesResponse)
def get_cities():
    """Return all available solar observation cities and their metadata."""
    cities_list: List[CityMetadata] = []
    
    for city_id, config in CITIES_CONFIG.items():
        cities_list.append(
            CityMetadata(
                id=city_id,
                name=config["name"],
                state=config["state"],
                latitude=config["latitude"],
                longitude=config["longitude"],
                fixed_tilt=config["fixed_tilt"],
                azimuth=config["azimuth"],
                climate_zone=config["climate_zone"],
                source_offset=config["source_offset"],
                normalized_timezone=TARGET_TIMEZONE,
                total_observations=config["expected_rows"]
            )
        )
        
    return CitiesResponse(
        total_cities=len(cities_list),
        cities=cities_list
    )

@router.get("/summary", response_model=SummaryResponse)
def get_summary(
    location: str = Query(..., description="City identifier (e.g. Delhi, Raipur, Jaisalmer)")
):
    """Return historical irradiance and atmospheric summary statistics for a city."""
    try:
        norm_location = normalize_city_name(location)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
        
    try:
        stats = get_city_summary_stats(norm_location)
        return SummaryResponse(**stats)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating summary statistics: {str(e)}"
        )

@router.get("/timeseries", response_model=TimeseriesResponse)
def get_timeseries(
    location: str = Query(..., description="City identifier (e.g. Delhi, Raipur, Jaisalmer)"),
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format (IST)"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format (IST)"),
):
    """
    Return time-series observations at 15-minute intervals for charting.
    All timestamps normalized to Indian Standard Time (Asia/Kolkata).
    """
    # 1. Validate Location
    try:
        norm_location = normalize_city_name(location)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
        
    # 2. Validate Date Format
    try:
        dt_start = datetime.strptime(start_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid start_date format '{start_date}'. Must be YYYY-MM-DD."
        )
        
    try:
        dt_end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid end_date format '{end_date}'. Must be YYYY-MM-DD."
        )
        
    # 3. Validate Date Range Order
    if dt_start > dt_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"start_date ({start_date}) cannot be after end_date ({end_date})."
        )
        
    # 4. Validate Dataset Boundaries (2025 Solcast Export)
    dataset_min_date = datetime.strptime("2025-01-01", "%Y-%m-%d").date()
    dataset_max_date = datetime.strptime("2025-12-31", "%Y-%m-%d").date()
    
    if dt_end < dataset_min_date or dt_start > dataset_max_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Requested range [{start_date} to {end_date}] is outside available 2025 dataset coverage "
                f"[{dataset_min_date} to {dataset_max_date}]."
            )
        )
        
    try:
        records_data = get_city_timeseries_slice(norm_location, start_date, end_date)
        records = [TimeseriesRecord(**r) for r in records_data]
        
        return TimeseriesResponse(
            location=norm_location,
            start_date=start_date,
            end_date=end_date,
            record_count=len(records),
            interval="PT15M",
            timezone=TARGET_TIMEZONE,
            records=records
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving time-series records: {str(e)}"
        )
