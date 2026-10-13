export type LocationId = 'Delhi' | 'Raipur' | 'Jaisalmer';

export interface LocationMeta {
  id: LocationId;
  name: string;
  state: string;
  coordinates: string;
  climateZone: string;
  nominalGhiPeak: number;
}

export interface SolarObservation {
  time: string; // e.g. "06:00", "06:15", ...
  timestamp: string; // ISO string
  date?: string; // e.g. "2025-06-03"
  ghi: number;
  dni: number;
  dhi: number;
  gti: number;
  air_temp: number;
  cloud_opacity: number;
  relative_humidity: number;
  wind_speed_10m: number;
}

export interface CityComparisonPoint {
  time: string;
  Delhi: number;
  Raipur: number;
  Jaisalmer: number;
}

export interface DailySummary {
  date: string;
  peakGhi: number;
  dailyInsolationKwh: number; // kWh/m²
  dailyGtiInsolationKwh?: number;
  daylightHours: number;
  avgTemp: number;
  avgCloudOpacity: number;
  dniGhiRatio?: number;
}

export interface LocationKpis {
  currentGhi: number;
  peakGhiToday: number;
  dailyInsolation: number; // kWh/m²
  cloudOpacity: number; // %
  airTemp: number; // °C
  relativeHumidity: number; // %
  windSpeed: number; // m/s
  dni: number;
  dhi: number;
}

export interface ScatterPoint {
  cloud_opacity: number;
  ghi: number;
  regression_ghi: number;
}

export interface CorrelationMatrixItem {
  feature: string;
  ghi: number;
  dni: number;
  dhi: number;
  gti: number;
  cloud_opacity: number;
  air_temp: number;
  relative_humidity: number;
}

export type NavTab = 'overview' | 'analytics' | 'forecasting' | 'anomalies' | 'insights';
