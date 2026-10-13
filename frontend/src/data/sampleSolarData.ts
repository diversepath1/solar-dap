import type { 
  LocationId, 
  LocationMeta, 
  SolarObservation, 
  CityComparisonPoint, 
  DailySummary, 
  LocationKpis,
  ScatterPoint,
  CorrelationMatrixItem
} from '../types';

export const LOCATIONS: Record<LocationId, LocationMeta> = {
  Delhi: {
    id: 'Delhi',
    name: 'Delhi NCR',
    state: 'National Capital Territory',
    coordinates: '28.6139° N, 77.2090° E',
    climateZone: 'Semi-Arid / Composite',
    nominalGhiPeak: 940,
  },
  Raipur: {
    id: 'Raipur',
    name: 'Raipur',
    state: 'Chhattisgarh',
    coordinates: '21.2514° N, 81.6296° E',
    climateZone: 'Tropical Wet & Dry',
    nominalGhiPeak: 890,
  },
  Jaisalmer: {
    id: 'Jaisalmer',
    name: 'Jaisalmer (Thar Desert)',
    state: 'Rajasthan',
    coordinates: '26.9157° N, 70.9083° E',
    climateZone: 'Hot Arid (High Insolation)',
    nominalGhiPeak: 1010,
  },
};

// Generate realistic 15-minute diurnal cycle for a specific date
export const generateDiurnalReadings = (location: LocationId, dateStr: string = '2025-06-03'): SolarObservation[] => {
  const readings: SolarObservation[] = [];
  const basePeak = LOCATIONS[location].nominalGhiPeak;
  
  // Specific location baseline factors
  const dayOffset = parseInt(dateStr.slice(-2), 10) || 3;
  
  // Custom cloud factor per day to mimic actual weather events
  let cloudFactor = location === 'Delhi' ? 0.08 : location === 'Raipur' ? 0.22 : 0.03;
  if (dateStr === '2025-06-03') {
    cloudFactor = location === 'Delhi' ? 0.26 : location === 'Raipur' ? 0.18 : 0.04;
  } else if (dateStr === '2025-06-04') {
    cloudFactor = location === 'Delhi' ? 0.12 : location === 'Raipur' ? 0.42 : 0.02;
  } else if (dateStr === '2025-06-07') {
    cloudFactor = location === 'Delhi' ? 0.19 : location === 'Raipur' ? 0.35 : 0.08;
  }

  const tempBase = (location === 'Jaisalmer' ? 36 : location === 'Delhi' ? 34 : 31) + (dayOffset % 3);
  const rhBase = (location === 'Jaisalmer' ? 24 : location === 'Delhi' ? 42 : 62) - (dayOffset % 2) * 4;

  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const timeVal = hour + minute / 60;
      
      // Solar elevation curve: sunrise ~05:30 (5.5h), sunset ~19:15 (19.25h)
      const sunrise = 5.5;
      const sunset = 19.25;
      
      let ghi = 0;
      let dni = 0;
      let dhi = 0;
      let gti = 0;
      let cloudOpacity = Math.round(cloudFactor * 100 + (Math.sin(timeVal * 1.5 + dayOffset) * 6));
      cloudOpacity = Math.max(0, Math.min(100, cloudOpacity));

      // Specific afternoon dip on June 3 for Delhi (reflecting EDA notes)
      if (location === 'Delhi' && dateStr === '2025-06-03' && timeVal >= 13.0 && timeVal <= 14.5) {
        cloudOpacity = 54; // Convective cloud passage
      }

      if (timeVal >= sunrise && timeVal <= sunset) {
        const daylightFraction = (timeVal - sunrise) / (sunset - sunrise);
        const sunAngleFactor = Math.sin(daylightFraction * Math.PI);
        
        // Solar irradiance calculation
        const clearSkyGhi = basePeak * Math.pow(sunAngleFactor, 1.15);
        const attenuation = 1 - (cloudOpacity / 100) * 0.65;
        ghi = Math.max(0, Math.round(clearSkyGhi * attenuation));

        // Diffuse vs direct decomposition
        if (cloudOpacity > 30) {
          dhi = Math.round(ghi * 0.58);
          dni = Math.round((ghi - dhi) / (Math.sin(daylightFraction * Math.PI) + 0.08));
        } else {
          dhi = Math.round(ghi * 0.22);
          dni = Math.round((ghi - dhi) / (Math.sin(daylightFraction * Math.PI) + 0.08));
        }
        gti = Math.round(ghi * 1.08); // Fixed tilt ~25° gain
      }

      // Air temperature lags solar peak by ~2.5 hours (peaking ~15:00)
      const tempVariation = Math.sin(((timeVal - 8) / 24) * 2 * Math.PI) * 7;
      const airTemp = Math.round((tempBase + tempVariation) * 10) / 10;
      
      // Relative humidity inversely related to temperature
      const rhVariation = -Math.sin(((timeVal - 8) / 24) * 2 * Math.PI) * 18;
      const rh = Math.max(12, Math.min(95, Math.round(rhBase + rhVariation)));

      const windSpeed = Math.round((3.2 + Math.sin(timeVal * 0.8 + dayOffset) * 1.4) * 10) / 10;

      readings.push({
        time: timeStr,
        timestamp: `${dateStr}T${timeStr}:00+05:30`,
        date: dateStr,
        ghi,
        dni: Math.max(0, dni),
        dhi: Math.max(0, dhi),
        gti: Math.max(0, gti),
        air_temp: airTemp,
        cloud_opacity: cloudOpacity,
        relative_humidity: rh,
        wind_speed_10m: windSpeed,
      });
    }
  }

  return readings;
};

// Generate multi-day readings for the 7-day EDA evaluation window
export const generateSevenDayReadings = (location: LocationId): SolarObservation[] => {
  const dates = [
    '2025-06-01',
    '2025-06-02',
    '2025-06-03',
    '2025-06-04',
    '2025-06-05',
    '2025-06-06',
    '2025-06-07',
  ];
  return dates.flatMap((d) => generateDiurnalReadings(location, d));
};

// Multi-city comparison for June 03, 2025 (15-min intervals)
export const getCityComparisonData = (): CityComparisonPoint[] => {
  const delhi = generateDiurnalReadings('Delhi', '2025-06-03');
  const raipur = generateDiurnalReadings('Raipur', '2025-06-03');
  const jaisalmer = generateDiurnalReadings('Jaisalmer', '2025-06-03');

  return delhi.map((point, idx) => ({
    time: point.time,
    Delhi: point.ghi,
    Raipur: raipur[idx].ghi,
    Jaisalmer: jaisalmer[idx].ghi,
  }));
};

// 7-day historical summary (June 1 - June 7, 2025)
export const SEVEN_DAY_SUMMARIES: Record<LocationId, DailySummary[]> = {
  Delhi: [
    { date: '2025-06-01', peakGhi: 924, dailyInsolationKwh: 6.82, dailyGtiInsolationKwh: 7.36, daylightHours: 13.8, avgTemp: 37.2, avgCloudOpacity: 8, dniGhiRatio: 0.78 },
    { date: '2025-06-02', peakGhi: 938, dailyInsolationKwh: 7.04, dailyGtiInsolationKwh: 7.60, daylightHours: 13.8, avgTemp: 38.5, avgCloudOpacity: 5, dniGhiRatio: 0.81 },
    { date: '2025-06-03', peakGhi: 865, dailyInsolationKwh: 5.94, dailyGtiInsolationKwh: 6.41, daylightHours: 13.8, avgTemp: 36.1, avgCloudOpacity: 26, dniGhiRatio: 0.62 }, // June 3 anomaly/dip
    { date: '2025-06-04', peakGhi: 915, dailyInsolationKwh: 6.74, dailyGtiInsolationKwh: 7.28, daylightHours: 13.8, avgTemp: 37.8, avgCloudOpacity: 12, dniGhiRatio: 0.74 },
    { date: '2025-06-05', peakGhi: 942, dailyInsolationKwh: 7.12, dailyGtiInsolationKwh: 7.69, daylightHours: 13.8, avgTemp: 39.0, avgCloudOpacity: 4, dniGhiRatio: 0.83 },
    { date: '2025-06-06', peakGhi: 931, dailyInsolationKwh: 6.98, dailyGtiInsolationKwh: 7.54, daylightHours: 13.8, avgTemp: 38.4, avgCloudOpacity: 7, dniGhiRatio: 0.79 },
    { date: '2025-06-07', peakGhi: 890, dailyInsolationKwh: 6.35, dailyGtiInsolationKwh: 6.86, daylightHours: 13.8, avgTemp: 37.0, avgCloudOpacity: 19, dniGhiRatio: 0.69 },
  ],
  Raipur: [
    { date: '2025-06-01', peakGhi: 870, dailyInsolationKwh: 6.12, dailyGtiInsolationKwh: 6.61, daylightHours: 13.4, avgTemp: 34.1, avgCloudOpacity: 22, dniGhiRatio: 0.65 },
    { date: '2025-06-02', peakGhi: 845, dailyInsolationKwh: 5.84, dailyGtiInsolationKwh: 6.31, daylightHours: 13.4, avgTemp: 33.6, avgCloudOpacity: 31, dniGhiRatio: 0.58 },
    { date: '2025-06-03', peakGhi: 882, dailyInsolationKwh: 6.28, dailyGtiInsolationKwh: 6.78, daylightHours: 13.4, avgTemp: 35.0, avgCloudOpacity: 18, dniGhiRatio: 0.70 },
    { date: '2025-06-04', peakGhi: 820, dailyInsolationKwh: 5.42, dailyGtiInsolationKwh: 5.85, daylightHours: 13.4, avgTemp: 32.8, avgCloudOpacity: 42, dniGhiRatio: 0.51 },
    { date: '2025-06-05', peakGhi: 895, dailyInsolationKwh: 6.40, dailyGtiInsolationKwh: 6.91, daylightHours: 13.4, avgTemp: 35.4, avgCloudOpacity: 15, dniGhiRatio: 0.72 },
    { date: '2025-06-06', peakGhi: 860, dailyInsolationKwh: 6.05, dailyGtiInsolationKwh: 6.53, daylightHours: 13.4, avgTemp: 34.2, avgCloudOpacity: 25, dniGhiRatio: 0.64 },
    { date: '2025-06-07', peakGhi: 835, dailyInsolationKwh: 5.71, dailyGtiInsolationKwh: 6.17, daylightHours: 13.4, avgTemp: 33.1, avgCloudOpacity: 35, dniGhiRatio: 0.55 },
  ],
  Jaisalmer: [
    { date: '2025-06-01', peakGhi: 1008, dailyInsolationKwh: 7.92, dailyGtiInsolationKwh: 8.55, daylightHours: 13.9, avgTemp: 41.5, avgCloudOpacity: 2, dniGhiRatio: 0.88 },
    { date: '2025-06-02', peakGhi: 1015, dailyInsolationKwh: 8.04, dailyGtiInsolationKwh: 8.68, daylightHours: 13.9, avgTemp: 42.1, avgCloudOpacity: 1, dniGhiRatio: 0.89 },
    { date: '2025-06-03', peakGhi: 996,  dailyInsolationKwh: 7.85, dailyGtiInsolationKwh: 8.48, daylightHours: 13.9, avgTemp: 41.2, avgCloudOpacity: 4, dniGhiRatio: 0.86 },
    { date: '2025-06-04', peakGhi: 1012, dailyInsolationKwh: 8.01, dailyGtiInsolationKwh: 8.65, daylightHours: 13.9, avgTemp: 42.4, avgCloudOpacity: 2, dniGhiRatio: 0.88 },
    { date: '2025-06-05', peakGhi: 1022, dailyInsolationKwh: 8.12, dailyGtiInsolationKwh: 8.77, daylightHours: 13.9, avgTemp: 43.0, avgCloudOpacity: 0, dniGhiRatio: 0.90 },
    { date: '2025-06-06', peakGhi: 1018, dailyInsolationKwh: 8.08, dailyGtiInsolationKwh: 8.73, daylightHours: 13.9, avgTemp: 42.7, avgCloudOpacity: 1, dniGhiRatio: 0.89 },
    { date: '2025-06-07', peakGhi: 985,  dailyInsolationKwh: 7.68, dailyGtiInsolationKwh: 8.29, daylightHours: 13.9, avgTemp: 40.8, avgCloudOpacity: 8, dniGhiRatio: 0.83 },
  ],
};

// Summary KPIs for current view
export const getLocationKpis = (location: LocationId, dateStr: string = '2025-06-03'): LocationKpis => {
  const readings = generateDiurnalReadings(location, dateStr);
  const noonReading = readings[50] || readings[48];
  const peak = Math.max(...readings.map(r => r.ghi));
  
  // Insolation = integral(GHI * 0.25h) / 1000
  const totalInsolation = Math.round(
    (readings.reduce((acc, curr) => acc + curr.ghi * 0.25, 0) / 1000) * 100
  ) / 100;

  return {
    currentGhi: noonReading.ghi,
    peakGhiToday: peak,
    dailyInsolation: totalInsolation,
    cloudOpacity: noonReading.cloud_opacity,
    airTemp: noonReading.air_temp,
    relativeHumidity: noonReading.relative_humidity,
    windSpeed: noonReading.wind_speed_10m,
    dni: noonReading.dni,
    dhi: noonReading.dhi,
  };
};

// Cloud Opacity vs GHI Regression Data from Project Context EDA
// Slope: -6.93, Intercept: 574.54, r = -0.530, R² = 0.281, p = 2.684e-25
export const getCloudOpacityScatterData = (): ScatterPoint[] => {
  // Generate representative daylight observations matching the -6.93 slope and r = -0.530 scatter
  const data: ScatterPoint[] = [];
  const slope = -6.93;
  const intercept = 574.54;

  // Cloud opacity bins across 0% to 100%
  const sampleOpacities = [
    0, 2, 4, 5, 8, 10, 12, 15, 18, 20, 22, 25, 28, 30, 32, 35, 
    38, 40, 42, 45, 50, 52, 55, 60, 65, 70, 75, 80, 85, 90, 95
  ];

  sampleOpacities.forEach((opacity, index) => {
    const regValue = Math.max(0, Math.round(intercept + slope * opacity));
    
    // Multiple readings per opacity bin with realistic solar elevation variability
    [-140, -70, 0, 75, 160].forEach((noise, subIdx) => {
      // Irradiance must be non-negative
      const pseudoRandom = Math.sin(index * 7 + subIdx * 13) * 60;
      const observedGhi = Math.max(0, Math.min(1050, Math.round(regValue + noise + pseudoRandom)));
      
      data.push({
        cloud_opacity: opacity,
        ghi: observedGhi,
        regression_ghi: regValue,
      });
    });
  });

  return data.sort((a, b) => a.cloud_opacity - b.cloud_opacity);
};

// Daylight Correlation Matrix from Project Context EDA
export const DAYLIGHT_CORRELATION_MATRIX: CorrelationMatrixItem[] = [
  { feature: 'GHI',            ghi: 1.00,  dni: 0.89,  dhi: 0.64,  gti: 0.99,  cloud_opacity: -0.53, air_temp: 0.48,  relative_humidity: -0.61 },
  { feature: 'DNI',            ghi: 0.89,  dni: 1.00,  dhi: 0.25,  gti: 0.92,  cloud_opacity: -0.74, air_temp: 0.44,  relative_humidity: -0.59 },
  { feature: 'DHI',            ghi: 0.64,  dni: 0.25,  dhi: 1.00,  gti: 0.58,  cloud_opacity: 0.12,  air_temp: 0.22,  relative_humidity: -0.25 },
  { feature: 'GTI',            ghi: 0.99,  dni: 0.92,  dhi: 0.58,  gti: 1.00,  cloud_opacity: -0.56, air_temp: 0.49,  relative_humidity: -0.63 },
  { feature: 'Cloud Opacity',  ghi: -0.53, dni: -0.74, dhi: 0.12,  gti: -0.56, cloud_opacity: 1.00,  air_temp: -0.32, relative_humidity: 0.58 },
  { feature: 'Air Temp',       ghi: 0.48,  dni: 0.44,  dhi: 0.22,  gti: 0.49,  cloud_opacity: -0.32, air_temp: 1.00,  relative_humidity: -0.72 },
  { feature: 'Relative Hum.',  ghi: -0.61, dni: -0.59, dhi: -0.25, gti: -0.63, cloud_opacity: 0.58,  air_temp: -0.72, relative_humidity: 1.00 },
];
