from datetime import datetime
from typing import Dict, Any, List, Optional
import pandas as pd
from app.config import DATA_DIR, CITIES_CONFIG, TARGET_TIMEZONE

# In-memory dataframe cache
_DATA_CACHE: Dict[str, pd.DataFrame] = {}

def normalize_city_name(location: str) -> str:
    """Normalize user-provided city name against available cities case-insensitively."""
    loc_clean = location.strip().lower()
    for city_id in CITIES_CONFIG:
        if city_id.lower() == loc_clean:
            return city_id
    valid_cities = list(CITIES_CONFIG.keys())
    raise ValueError(f"Unknown location '{location}'. Available locations are: {valid_cities}")

def get_city_dataframe(location: str) -> pd.DataFrame:
    """
    Load and preprocess the Solcast dataset for the specified location.
    Cached in memory to prevent repeated disk I/O.
    """
    city_id = normalize_city_name(location)
    
    if city_id in _DATA_CACHE:
        return _DATA_CACHE[city_id]
        
    config = CITIES_CONFIG[city_id]
    csv_path = DATA_DIR / config["filename"]
    
    if not csv_path.exists():
        raise FileNotFoundError(f"Source dataset file not found at: {csv_path}")
        
    df = pd.read_csv(csv_path)
    
    # Preserve original timestamps
    df["period_end_original"] = df["period_end"].astype(str)
    
    # Parse timestamps with UTC awareness and convert to Asia/Kolkata (IST, UTC+05:30)
    utc_dt = pd.to_datetime(df["period_end"], utc=True)
    ist_dt = utc_dt.dt.tz_convert(TARGET_TIMEZONE)
    
    df["period_end_ist"] = ist_dt
    df["date_ist"] = ist_dt.dt.strftime("%Y-%m-%d")
    df["time_ist"] = ist_dt.dt.strftime("%H:%M")
    df["timestamp_ist_str"] = ist_dt.dt.strftime("%Y-%m-%dT%H:%M:%S%z")
    
    # Ensure all radiation and atmospheric values are float
    numeric_cols = [
        "ghi", "dni", "dhi", "gti", 
        "air_temp", "cloud_opacity", "relative_humidity", "wind_speed_10m"
    ]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
        
    _DATA_CACHE[city_id] = df
    return df

def get_city_summary_stats(location: str) -> Dict[str, Any]:
    """Calculate historical summary statistics for a given location."""
    city_id = normalize_city_name(location)
    config = CITIES_CONFIG[city_id]
    df = get_city_dataframe(city_id)
    
    total_records = len(df)
    start_date_ist = str(df["date_ist"].min())
    end_date_ist = str(df["date_ist"].max())
    distinct_days = int(df["date_ist"].nunique())
    
    # Daylight subsets (GHI > 0)
    daylight_mask = df["ghi"] > 0
    df_daylight = df[daylight_mask]
    
    # GHI metrics
    ghi_max = round(float(df["ghi"].max()), 2)
    ghi_mean_all = round(float(df["ghi"].mean()), 2)
    ghi_mean_day = round(float(df_daylight["ghi"].mean()), 2) if not df_daylight.empty else 0.0
    ghi_annual_kwh = round(float(df["ghi"].sum() * 0.25 / 1000.0), 2)
    ghi_daily_avg_kwh = round(ghi_annual_kwh / distinct_days, 2)
    
    # DNI metrics
    dni_max = round(float(df["dni"].max()), 2)
    dni_mean_day = round(float(df_daylight["dni"].mean()), 2) if not df_daylight.empty else 0.0
    
    # DHI metrics
    dhi_max = round(float(df["dhi"].max()), 2)
    dhi_mean_day = round(float(df_daylight["dhi"].mean()), 2) if not df_daylight.empty else 0.0
    
    # GTI metrics
    gti_max = round(float(df["gti"].max()), 2)
    gti_mean_all = round(float(df["gti"].mean()), 2)
    gti_mean_day = round(float(df_daylight["gti"].mean()), 2) if not df_daylight.empty else 0.0
    gti_annual_kwh = round(float(df["gti"].sum() * 0.25 / 1000.0), 2)
    gti_daily_avg_kwh = round(gti_annual_kwh / distinct_days, 2)
    
    def get_range(series: pd.Series) -> Dict[str, float]:
        return {
            "min": round(float(series.min()), 2),
            "mean": round(float(series.mean()), 2),
            "max": round(float(series.max()), 2),
        }
        
    return {
        "location": city_id,
        "total_records": total_records,
        "date_range": {
            "start_date_ist": start_date_ist,
            "end_date_ist": end_date_ist,
            "start_timestamp_ist": str(df["timestamp_ist_str"].iloc[0]),
            "end_timestamp_ist": str(df["timestamp_ist_str"].iloc[-1]),
            "distinct_calendar_days_ist": distinct_days,
        },
        "timezone_semantics": {
            "source_offset": config["source_offset"],
            "target_timezone": TARGET_TIMEZONE,
            "interval": "15 minutes (PT15M)",
            "integration_convention": "Interval-end convention (timestamp marks the end of 15-minute integration period)",
        },
        "irradiance": {
            "ghi": {
                "max_w_m2": ghi_max,
                "mean_overall_w_m2": ghi_mean_all,
                "mean_daylight_w_m2": ghi_mean_day,
                "annual_insolation_kwh_m2": ghi_annual_kwh,
                "daily_avg_insolation_kwh_m2": ghi_daily_avg_kwh,
            },
            "dni": {
                "max_w_m2": dni_max,
                "mean_daylight_w_m2": dni_mean_day,
            },
            "dhi": {
                "max_w_m2": dhi_max,
                "mean_daylight_w_m2": dhi_mean_day,
            },
            "gti": {
                "max_w_m2": gti_max,
                "mean_overall_w_m2": gti_mean_all,
                "mean_daylight_w_m2": gti_mean_day,
                "annual_insolation_kwh_m2": gti_annual_kwh,
                "daily_avg_insolation_kwh_m2": gti_daily_avg_kwh,
            },
        },
        "weather": {
            "air_temp_c": get_range(df["air_temp"]),
            "cloud_opacity_pct": get_range(df["cloud_opacity"]),
            "relative_humidity_pct": get_range(df["relative_humidity"]),
            "wind_speed_10m_ms": get_range(df["wind_speed_10m"]),
        },
    }

def get_city_timeseries_slice(location: str, start_date: str, end_date: str) -> List[Dict[str, Any]]:
    """Filter time-series records by IST date range."""
    city_id = normalize_city_name(location)
    df = get_city_dataframe(city_id)
    
    # Filter by date_ist
    mask = (df["date_ist"] >= start_date) & (df["date_ist"] <= end_date)
    filtered = df.loc[mask]
    
    records = []
    for row in filtered.itertuples(index=False):
        records.append({
            "timestamp_ist": row.timestamp_ist_str,
            "timestamp_original": row.period_end_original,
            "date_ist": row.date_ist,
            "time_ist": row.time_ist,
            "ghi": float(row.ghi),
            "dni": float(row.dni),
            "dhi": float(row.dhi),
            "gti": float(row.gti),
            "air_temp": float(row.air_temp),
            "cloud_opacity": float(row.cloud_opacity),
            "relative_humidity": float(row.relative_humidity),
            "wind_speed_10m": float(row.wind_speed_10m),
        })
    return records
