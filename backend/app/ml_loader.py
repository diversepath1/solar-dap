import json
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd

from app.config import ML_ARTIFACTS_DIR, CITIES_CONFIG

# In-memory caches for ML artifacts
_PREDICTIONS_CACHE: Optional[pd.DataFrame] = None
_ANOMALIES_CACHE: Optional[pd.DataFrame] = None

def get_ml_metadata() -> Dict[str, Any]:
    """Load model metadata from model_metadata.json."""
    meta_path = ML_ARTIFACTS_DIR / "model_metadata.json"
    if not meta_path.exists():
        raise FileNotFoundError(f"Model metadata not found at: {meta_path}")
    with open(meta_path, "r", encoding="utf-8") as f:
        return json.load(f)

def get_aggregate_metrics() -> Dict[str, Any]:
    """Load aggregate holdout metrics from model_metrics.csv and model_metadata.json."""
    metrics_path = ML_ARTIFACTS_DIR / "model_metrics.csv"
    if not metrics_path.exists():
        raise FileNotFoundError(f"Model metrics not found at: {metrics_path}")
    
    df = pd.read_csv(metrics_path)
    metrics_list = []
    for row in df.itertuples(index=False):
        metrics_list.append({
            "model_name": str(row.Model),
            "mae": float(row.MAE),
            "rmse": float(row.RMSE),
            "r2": float(row.R2),
        })
        
    metadata = get_ml_metadata()
    return {
        "metrics": metrics_list,
        "metadata": metadata,
    }

def get_city_wise_metrics() -> List[Dict[str, Any]]:
    """Load city-wise holdout metrics from city_wise_metrics.csv."""
    path = ML_ARTIFACTS_DIR / "city_wise_metrics.csv"
    if not path.exists():
        raise FileNotFoundError(f"City metrics not found at: {path}")
        
    df = pd.read_csv(path)
    results = []
    for row in df.itertuples(index=False):
        results.append({
            "location": str(row.location),
            "observations": int(row.observations),
            "rf_mae": float(row.RF_MAE),
            "rf_rmse": float(row.RF_RMSE),
            "rf_r2": float(row.RF_R2),
            "persistence_mae": float(row.Persistence_MAE),
            "persistence_rmse": float(row.Persistence_RMSE),
            "persistence_r2": float(row.Persistence_R2),
        })
    return results

def get_feature_importances() -> List[Dict[str, Any]]:
    """Load feature importance rankings from feature_importance.csv."""
    path = ML_ARTIFACTS_DIR / "feature_importance.csv"
    if not path.exists():
        raise FileNotFoundError(f"Feature importance not found at: {path}")
        
    df = pd.read_csv(path)
    results = []
    for row in df.itertuples(index=False):
        imp = float(row.importance)
        results.append({
            "feature": str(row.feature),
            "importance": round(imp, 6),
            "percentage": round(imp * 100, 2),
        })
    return results

def _load_predictions_df() -> pd.DataFrame:
    """Load and prepare predictions dataframe with parsed date and time."""
    global _PREDICTIONS_CACHE
    if _PREDICTIONS_CACHE is not None:
        return _PREDICTIONS_CACHE
        
    path = ML_ARTIFACTS_DIR / "forecast_predictions.csv"
    if not path.exists():
        raise FileNotFoundError(f"Predictions artifact not found at: {path}")
        
    df = pd.read_csv(path)
    # Parse target_time string (e.g. '2025-10-19 06:15:00+05:30')
    df["date_ist"] = df["target_time"].str.slice(0, 10)
    df["time_ist"] = df["target_time"].str.slice(11, 16)
    
    _PREDICTIONS_CACHE = df
    return df

def get_forecast_predictions(
    location: Optional[str] = None, 
    date: Optional[str] = None,
    limit: Optional[int] = 500
) -> List[Dict[str, Any]]:
    """Query offline forecast predictions by city and/or date."""
    df = _load_predictions_df()
    
    if location:
        norm_loc = location.strip().capitalize()
        # Find exact case match in CITIES_CONFIG
        for c in CITIES_CONFIG:
            if c.lower() == location.strip().lower():
                norm_loc = c
                break
        df = df[df["location"] == norm_loc]
        
    if date:
        df = df[df["date_ist"] == date.strip()]
        
    if limit and limit > 0:
        df = df.head(limit)
        
    results = []
    for row in df.itertuples(index=False):
        results.append({
            "location": str(row.location),
            "target_time": str(row.target_time),
            "time_ist": str(row.time_ist),
            "date_ist": str(row.date_ist),
            "actual_ghi": round(float(row.actual_ghi), 2),
            "predicted_ghi": round(float(row.predicted_ghi), 2),
            "persistence_ghi": round(float(row.persistence_ghi), 2),
            "forecast_error": round(float(row.forecast_error), 2),
            "absolute_error": round(float(row.absolute_error), 2),
        })
    return results

def _load_anomalies_df() -> pd.DataFrame:
    """Load and prepare flagged anomalies dataframe."""
    global _ANOMALIES_CACHE
    if _ANOMALIES_CACHE is not None:
        return _ANOMALIES_CACHE
        
    path = ML_ARTIFACTS_DIR / "flagged_anomalies.csv"
    if not path.exists():
        raise FileNotFoundError(f"Flagged anomalies artifact not found at: {path}")
        
    df = pd.read_csv(path)
    df["date_ist"] = df["target_time"].str.slice(0, 10)
    df["time_ist"] = df["target_time"].str.slice(11, 16)
    
    # Severity classification: >= 200 W/m² discrepancy is Critical, otherwise High
    df["severity"] = df["abs_residual"].apply(lambda v: "Critical" if v >= 200.0 else "High")
    
    _ANOMALIES_CACHE = df
    return df

def get_flagged_anomalies(
    location: Optional[str] = None,
    severity: Optional[str] = None,
    limit: Optional[int] = 250
) -> Dict[str, Any]:
    """Retrieve flagged residual anomalies with thresholds and severity."""
    df = _load_anomalies_df()
    metadata = get_ml_metadata()
    thresholds = metadata.get("anomaly_thresholds_w_m2", {})
    
    if location:
        norm_loc = location.strip().capitalize()
        for c in CITIES_CONFIG:
            if c.lower() == location.strip().lower():
                norm_loc = c
                break
        df = df[df["location"] == norm_loc]
        
    if severity:
        df = df[df["severity"].str.lower() == severity.strip().lower()]
        
    total_matched = len(df)
    if limit and limit > 0:
        df = df.head(limit)
        
    results = []
    for row in df.itertuples(index=False):
        results.append({
            "location": str(row.location),
            "target_time": str(row.target_time),
            "date_ist": str(row.date_ist),
            "time_ist": str(row.time_ist),
            "actual_ghi": round(float(row.actual_ghi), 2),
            "predicted_ghi": round(float(row.predicted_ghi), 2),
            "persistence_ghi": round(float(row.persistence_ghi), 2),
            "residual": round(float(row.residual), 2),
            "abs_residual": round(float(row.abs_residual), 2),
            "threshold": round(float(row.threshold), 2),
            "is_anomaly": bool(row.is_anomaly),
            "severity": str(row.severity),
        })
        
    return {
        "total_flagged": total_matched,
        "thresholds": thresholds,
        "anomalies": results,
    }
