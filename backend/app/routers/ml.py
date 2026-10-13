from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas import (
    AggregateMetricsResponse,
    CityWiseMetricsResponse,
    FeatureImportanceResponse,
    PredictionsResponse,
    PredictionRecord,
    AnomaliesResponse,
    FlaggedAnomalyRecord
)
from app.ml_loader import (
    get_aggregate_metrics,
    get_city_wise_metrics,
    get_feature_importances,
    get_forecast_predictions,
    get_flagged_anomalies
)

router = APIRouter(prefix="/ml", tags=["Machine Learning"])

@router.get("/metrics", response_model=AggregateMetricsResponse)
def get_metrics():
    """Return overall holdout evaluation metrics and model specifications."""
    try:
        data = get_aggregate_metrics()
        return AggregateMetricsResponse(**data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load model metrics: {str(e)}"
        )

@router.get("/city-metrics", response_model=CityWiseMetricsResponse)
def get_city_metrics():
    """Return holdout metrics broken down by location for Random Forest vs Persistence."""
    try:
        items = get_city_wise_metrics()
        return CityWiseMetricsResponse(city_metrics=items)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load city metrics: {str(e)}"
        )

@router.get("/feature-importance", response_model=FeatureImportanceResponse)
def get_feature_importance():
    """Return Random Forest Gini feature importances."""
    try:
        items = get_feature_importances()
        return FeatureImportanceResponse(features=items)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load feature importance: {str(e)}"
        )

@router.get("/predictions", response_model=PredictionsResponse)
def get_predictions(
    location: Optional[str] = Query(None, description="Filter by location (Delhi, Jaisalmer, Raipur)"),
    date: Optional[str] = Query(None, description="Filter by target date (YYYY-MM-DD within Oct 19 - Dec 31, 2025)"),
    limit: Optional[int] = Query(500, ge=1, le=2000, description="Max rows to return")
):
    """
    Return test holdout predictions (Actual vs Predicted GHI and Persistence baseline).
    Sampling is 15-minute intervals across 60-minute forecast horizon.
    """
    try:
        records_data = get_forecast_predictions(location=location, date=date, limit=limit)
        records = [PredictionRecord(**r) for r in records_data]
        return PredictionsResponse(
            total_matched=len(records),
            location=location,
            date=date,
            predictions=records
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query forecast predictions: {str(e)}"
        )

@router.get("/anomalies", response_model=AnomaliesResponse)
def get_anomalies(
    location: Optional[str] = Query(None, description="Filter by location (Delhi, Jaisalmer, Raipur)"),
    severity: Optional[str] = Query(None, description="Filter by severity ('Critical' or 'High')"),
    limit: Optional[int] = Query(250, ge=1, le=500, description="Max rows to return")
):
    """
    Return flagged 99th-percentile residual anomalies.
    Flags indicate unusual model-vs-observation prediction residuals, not confirmed physical faults.
    """
    try:
        data = get_flagged_anomalies(location=location, severity=severity, limit=limit)
        records = [FlaggedAnomalyRecord(**r) for r in data["anomalies"]]
        return AnomaliesResponse(
            total_flagged=data["total_flagged"],
            thresholds=data["thresholds"],
            anomalies=records
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query anomalies: {str(e)}"
        )
