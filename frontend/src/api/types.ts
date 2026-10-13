export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  data_dir_found: boolean;
  available_cities: string[];
  normalized_timezone: string;
}

export interface CityMetadata {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  fixed_tilt: number;
  azimuth: number;
  climate_zone: string;
  source_offset: string;
  normalized_timezone: string;
  total_observations: number;
}

export interface CitiesResponse {
  total_cities: number;
  cities: CityMetadata[];
}

export interface MetricRange {
  min: number;
  mean: number;
  max: number;
}

export interface IrradianceMetrics {
  max_w_m2: number;
  mean_overall_w_m2: number;
  mean_daylight_w_m2: number;
  annual_insolation_kwh_m2: number;
  daily_avg_insolation_kwh_m2: number;
}

export interface DniDhiMetrics {
  max_w_m2: number;
  mean_daylight_w_m2: number;
}

export interface DateRangeMetadata {
  start_date_ist: string;
  end_date_ist: string;
  start_timestamp_ist: string;
  end_timestamp_ist: string;
  distinct_calendar_days_ist: number;
}

export interface TimezoneSemantics {
  source_offset: string;
  target_timezone: string;
  interval: string;
  integration_convention: string;
}

export interface WeatherSummary {
  air_temp_c: MetricRange;
  cloud_opacity_pct: MetricRange;
  relative_humidity_pct: MetricRange;
  wind_speed_10m_ms: MetricRange;
}

export interface IrradianceSummary {
  ghi: IrradianceMetrics;
  dni: DniDhiMetrics;
  dhi: DniDhiMetrics;
  gti: IrradianceMetrics;
}

export interface SummaryResponse {
  location: string;
  total_records: number;
  date_range: DateRangeMetadata;
  timezone_semantics: TimezoneSemantics;
  irradiance: IrradianceSummary;
  weather: WeatherSummary;
}

export interface TimeseriesRecord {
  timestamp_ist: string;
  timestamp_original: string;
  date_ist: string;
  time_ist: string;
  ghi: number;
  dni: number;
  dhi: number;
  gti: number;
  air_temp: number;
  cloud_opacity: number;
  relative_humidity: number;
  wind_speed_10m: number;
}

export interface TimeseriesResponse {
  location: string;
  start_date: string;
  end_date: string;
  record_count: number;
  interval: string;
  timezone: string;
  records: TimeseriesRecord[];
}

// --- ML Forecast & Anomaly Evaluation Types ---

export interface ModelMetricItem {
  model_name: string;
  mae: number;
  rmse: number;
  r2: number;
}

export interface ModelMetadataResponse {
  project: string;
  model_type: string;
  target: string;
  forecast_horizon_minutes: number;
  sampling_interval_minutes: number;
  features: string[];
  training_rows: number;
  test_rows: number;
  test_start: string;
  test_end: string;
  test_split_method: string;
  n_estimators: number;
  min_samples_leaf: number;
  random_state: number;
  anomaly_method: string;
  anomaly_thresholds_w_m2: Record<string, number>;
  limitations: string[];
}

export interface AggregateMetricsResponse {
  metrics: ModelMetricItem[];
  metadata: ModelMetadataResponse;
}

export interface CityWiseMetricItem {
  location: string;
  observations: number;
  rf_mae: number;
  rf_rmse: number;
  rf_r2: number;
  persistence_mae: number;
  persistence_rmse: number;
  persistence_r2: number;
}

export interface CityWiseMetricsResponse {
  city_metrics: CityWiseMetricItem[];
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
  percentage: number;
}

export interface FeatureImportanceResponse {
  features: FeatureImportanceItem[];
}

export interface PredictionRecord {
  location: string;
  target_time: string;
  time_ist: string;
  date_ist: string;
  actual_ghi: number;
  predicted_ghi: number;
  persistence_ghi: number;
  forecast_error: number;
  absolute_error: number;
}

export interface PredictionsResponse {
  total_matched: number;
  location?: string | null;
  date?: string | null;
  evaluation_notice: string;
  predictions: PredictionRecord[];
}

export interface FlaggedAnomalyRecord {
  location: string;
  target_time: string;
  date_ist: string;
  time_ist: string;
  actual_ghi: number;
  predicted_ghi: number;
  persistence_ghi: number;
  residual: number;
  abs_residual: number;
  threshold: number;
  is_anomaly: boolean;
  severity: string;
}

export interface AnomaliesResponse {
  total_flagged: number;
  thresholds: Record<string, number>;
  methodology_notice: string;
  anomalies: FlaggedAnomalyRecord[];
}
