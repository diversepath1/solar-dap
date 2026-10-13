from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "SOLAR DAP Analytics API"
    version: str = "0.1.0"
    data_dir_found: bool
    available_cities: List[str]
    normalized_timezone: str = "Asia/Kolkata (IST, UTC+05:30)"

class CityMetadata(BaseModel):
    id: str
    name: str
    state: str
    latitude: float
    longitude: float
    fixed_tilt: float
    azimuth: float
    climate_zone: str
    source_offset: str
    normalized_timezone: str = "Asia/Kolkata"
    total_observations: int = 34944

class CitiesResponse(BaseModel):
    total_cities: int
    cities: List[CityMetadata]

class MetricRange(BaseModel):
    min: float
    mean: float
    max: float

class IrradianceMetrics(BaseModel):
    max_w_m2: float
    mean_overall_w_m2: float
    mean_daylight_w_m2: float
    annual_insolation_kwh_m2: float
    daily_avg_insolation_kwh_m2: float

class DniDhiMetrics(BaseModel):
    max_w_m2: float
    mean_daylight_w_m2: float

class DateRangeMetadata(BaseModel):
    start_date_ist: str
    end_date_ist: str
    start_timestamp_ist: str
    end_timestamp_ist: str
    distinct_calendar_days_ist: int

class TimezoneSemantics(BaseModel):
    source_offset: str
    target_timezone: str = "Asia/Kolkata"
    interval: str = "15 minutes (PT15M)"
    integration_convention: str = "Interval-end convention (timestamp marks the end of 15-minute integration period)"

class WeatherSummary(BaseModel):
    air_temp_c: MetricRange
    cloud_opacity_pct: MetricRange
    relative_humidity_pct: MetricRange
    wind_speed_10m_ms: MetricRange

class IrradianceSummary(BaseModel):
    ghi: IrradianceMetrics
    dni: DniDhiMetrics
    dhi: DniDhiMetrics
    gti: IrradianceMetrics

class SummaryResponse(BaseModel):
    location: str
    total_records: int
    date_range: DateRangeMetadata
    timezone_semantics: TimezoneSemantics
    irradiance: IrradianceSummary
    weather: WeatherSummary

class TimeseriesRecord(BaseModel):
    timestamp_ist: str
    timestamp_original: str
    date_ist: str
    time_ist: str
    ghi: float
    dni: float
    dhi: float
    gti: float
    air_temp: float
    cloud_opacity: float
    relative_humidity: float
    wind_speed_10m: float

class TimeseriesResponse(BaseModel):
    location: str
    start_date: str
    end_date: str
    record_count: int
    interval: str = "PT15M"
    timezone: str = "Asia/Kolkata"
    records: List[TimeseriesRecord]

class ErrorDetail(BaseModel):
    detail: str
    code: str
    suggested_action: Optional[str] = None

# --- ML Evaluation Artifact Schemas ---

class ModelMetricItem(BaseModel):
    model_name: str
    mae: float
    rmse: float
    r2: float

class ModelMetadataResponse(BaseModel):
    project: str
    model_type: str
    target: str
    forecast_horizon_minutes: int
    sampling_interval_minutes: int
    features: List[str]
    training_rows: int
    test_rows: int
    test_start: str
    test_end: str
    test_split_method: str
    n_estimators: int
    min_samples_leaf: int
    random_state: int
    anomaly_method: str
    anomaly_thresholds_w_m2: Dict[str, float]
    limitations: List[str]

class AggregateMetricsResponse(BaseModel):
    metrics: List[ModelMetricItem]
    metadata: ModelMetadataResponse

class CityWiseMetricItem(BaseModel):
    location: str
    observations: int
    rf_mae: float
    rf_rmse: float
    rf_r2: float
    persistence_mae: float
    persistence_rmse: float
    persistence_r2: float

class CityWiseMetricsResponse(BaseModel):
    city_metrics: List[CityWiseMetricItem]

class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float
    percentage: float

class FeatureImportanceResponse(BaseModel):
    features: List[FeatureImportanceItem]

class PredictionRecord(BaseModel):
    location: str
    target_time: str
    time_ist: str
    date_ist: str
    actual_ghi: float
    predicted_ghi: float
    persistence_ghi: float
    forecast_error: float
    absolute_error: float

class PredictionsResponse(BaseModel):
    total_matched: int
    location: Optional[str] = None
    date: Optional[str] = None
    evaluation_notice: str = "Chronological holdout evaluation (Oct 19 - Dec 31, 2025) including nighttime observations."
    predictions: List[PredictionRecord]

class FlaggedAnomalyRecord(BaseModel):
    location: str
    target_time: str
    date_ist: str
    time_ist: str
    actual_ghi: float
    predicted_ghi: float
    persistence_ghi: float
    residual: float
    abs_residual: float
    threshold: float
    is_anomaly: bool
    severity: str

class AnomaliesResponse(BaseModel):
    total_flagged: int
    thresholds: Dict[str, float]
    methodology_notice: str = "Anomaly flags represent unusual prediction errors / model-vs-observation residuals, not confirmed physical hardware faults."
    anomalies: List[FlaggedAnomalyRecord]

