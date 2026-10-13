import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sun, 
  Zap, 
  CloudSun, 
  Thermometer, 
  Wind, 
  Info, 
  Maximize2,
  TrendingUp,
  Database
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import type { LocationId, CityComparisonPoint, DailySummary } from '../../types';
import type { SummaryResponse, TimeseriesRecord } from '../../api/types';
import { api } from '../../api/client';
import { LOCATIONS } from '../../data/sampleSolarData';
import { KpiCard } from '../common/KpiCard';
import { LoadingState, ErrorState, EmptyState } from '../common/StateViews';

interface OverviewPageProps {
  selectedLocation: LocationId;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ selectedLocation }) => {
  const [showDecomposition, setShowDecomposition] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Real backend data states
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [diurnalData, setDiurnalData] = useState<TimeseriesRecord[]>([]);
  const [cityComparisonData, setCityComparisonData] = useState<CityComparisonPoint[]>([]);
  const [sevenDayData, setSevenDayData] = useState<DailySummary[]>([]);

  const locationMeta = LOCATIONS[selectedLocation];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch in parallel: summary, selected city diurnal (June 03), 7-day window (June 01-07), and other cities for comparison
      const [
        summaryRes,
        diurnalRes,
        sevenDayRes,
        delhiDiurnal,
        raipurDiurnal,
        jaisalmerDiurnal,
      ] = await Promise.all([
        api.getSummary(selectedLocation),
        api.getTimeseries(selectedLocation, '2025-06-03', '2025-06-03'),
        api.getTimeseries(selectedLocation, '2025-06-01', '2025-06-07'),
        api.getTimeseries('Delhi', '2025-06-03', '2025-06-03'),
        api.getTimeseries('Raipur', '2025-06-03', '2025-06-03'),
        api.getTimeseries('Jaisalmer', '2025-06-03', '2025-06-03'),
      ]);

      setSummary(summaryRes);
      setDiurnalData(diurnalRes.records);

      // Build real regional comparison curve from all three cities on June 03
      const comparisonPoints: CityComparisonPoint[] = [];
      const minLen = Math.min(
        delhiDiurnal.records.length,
        raipurDiurnal.records.length,
        jaisalmerDiurnal.records.length
      );
      for (let i = 0; i < minLen; i++) {
        comparisonPoints.push({
          time: delhiDiurnal.records[i].time_ist,
          Delhi: delhiDiurnal.records[i].ghi,
          Raipur: raipurDiurnal.records[i].ghi,
          Jaisalmer: jaisalmerDiurnal.records[i].ghi,
        });
      }
      setCityComparisonData(comparisonPoints);

      // Aggregate real 7-day Solcast intervals (June 1 - June 7, 2025)
      const dayGroups: Record<string, TimeseriesRecord[]> = {};
      for (const rec of sevenDayRes.records) {
        if (!dayGroups[rec.date_ist]) {
          dayGroups[rec.date_ist] = [];
        }
        dayGroups[rec.date_ist].push(rec);
      }

      const aggregatedSevenDays: DailySummary[] = Object.keys(dayGroups).sort().map((dateStr) => {
        const records = dayGroups[dateStr];
        const peakGhi = Math.round(Math.max(...records.map((r) => r.ghi)));
        const dailyInsolationKwh = Math.round(
          (records.reduce((acc, r) => acc + r.ghi * 0.25, 0) / 1000) * 100
        ) / 100;
        const daylightHours = Math.round(
          records.filter((r) => r.ghi > 0).length * 0.25 * 10
        ) / 10;
        const avgTemp = Math.round(
          (records.reduce((acc, r) => acc + r.air_temp, 0) / records.length) * 10
        ) / 10;
        const avgCloudOpacity = Math.round(
          records.reduce((acc, r) => acc + r.cloud_opacity, 0) / records.length
        );

        return {
          date: dateStr,
          peakGhi,
          dailyInsolationKwh,
          daylightHours,
          avgTemp,
          avgCloudOpacity,
        };
      });

      setSevenDayData(aggregatedSevenDays);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedLocation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derive KPIs from real diurnal observations and summary
  const kpis = React.useMemo(() => {
    if (!diurnalData.length) {
      return {
        peakGhiToday: 0,
        dailyInsolation: 0,
        cloudOpacity: 0,
        airTemp: 0,
        relativeHumidity: 0,
        windSpeed: 0,
      };
    }

    const peak = Math.round(Math.max(...diurnalData.map((r) => r.ghi)));
    const insolation = Math.round(
      (diurnalData.reduce((acc, r) => acc + r.ghi * 0.25, 0) / 1000) * 100
    ) / 100;

    // Noon reading (~12:00 or 12:30 IST)
    const noonIdx = Math.min(48, diurnalData.length - 1);
    const noonRec = diurnalData[noonIdx] || diurnalData[0];

    return {
      peakGhiToday: peak,
      dailyInsolation: insolation,
      cloudOpacity: Math.round(noonRec.cloud_opacity),
      airTemp: Math.round(noonRec.air_temp * 10) / 10,
      relativeHumidity: Math.round(noonRec.relative_humidity),
      windSpeed: Math.round(noonRec.wind_speed_10m * 10) / 10,
    };
  }, [diurnalData]);

  // Custom Dark Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-card border border-surface-border p-3 rounded-lg shadow-xl text-xs space-y-1.5">
          <p className="font-semibold text-slate-200 border-b border-surface-border pb-1">
            Time: {label} (IST)
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-mono font-medium text-slate-100">
                {entry.value} {entry.unit || 'W/m²'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <LoadingState message={`Fetching Solcast dataset for ${locationMeta.name} from FastAPI...`} />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchData} />;
  }

  if (!diurnalData.length) {
    return <EmptyState message={`No solar observations returned for ${selectedLocation}.`} />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-surface-card border border-surface-border">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>{locationMeta.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-subtle text-solar-amber border border-amber-500/20 font-normal">
              {locationMeta.climateZone}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live API</span>
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Solcast 15-minute radiation profile & atmospheric parameters • Target date: June 03, 2025
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Info className="h-4 w-4 text-solar-amber shrink-0" />
          <span>Interval-end timestamps normalized to Indian Standard Time (IST)</span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Peak GHI (Jun 3)"
          value={kpis.peakGhiToday}
          unit="W/m²"
          icon={Sun}
          helperText="Solar noon maximum"
          accent="amber"
        />
        <KpiCard
          label="Daily Insolation"
          value={kpis.dailyInsolation}
          unit="kWh/m²"
          icon={Zap}
          helperText="Integral of 15-min GHI"
          badge="Day total"
          accent="yellow"
        />
        <KpiCard
          label="Cloud Opacity"
          value={`${kpis.cloudOpacity}%`}
          icon={CloudSun}
          helperText="Midday cloud cover"
          accent="sky"
        />
        <KpiCard
          label="Ambient Temp"
          value={`${kpis.airTemp}°C`}
          icon={Thermometer}
          helperText={`RH: ${kpis.relativeHumidity}%`}
          accent="slate"
        />
        <KpiCard
          label="Wind Speed (10m)"
          value={`${kpis.windSpeed} m/s`}
          icon={Wind}
          helperText="Boundary layer flow"
          accent="lime"
        />
      </div>

      {/* Annual Summary Quick Strip from GET /api/analytics/summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface p-3 rounded-xl border border-surface-border text-xs">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-solar-amber shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Annual GHI</span>
              <span className="text-white font-mono font-bold">{summary.irradiance.ghi.annual_insolation_kwh_m2} kWh/m²</span>
            </div>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Annual GTI (Tilt Gain)</span>
            <span className="text-emerald-400 font-mono font-bold">{summary.irradiance.gti.annual_insolation_kwh_m2} kWh/m²</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Daily Avg Insolation</span>
            <span className="text-solar-amber font-mono font-bold">{summary.irradiance.ghi.daily_avg_insolation_kwh_m2} kWh/m²/day</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Dataset Records</span>
            <span className="text-slate-200 font-mono font-bold">{summary.total_records.toLocaleString()} intervals (365d)</span>
          </div>
        </div>
      )}

      {/* Primary Chart: Diurnal Solar Profile */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-border gap-3">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <Sun className="h-4 w-4 text-solar-amber" />
              24-Hour Diurnal Solar Irradiance Profile (June 03, 2025)
            </h2>
            <p className="text-xs text-slate-400">
              Real Solcast 15-minute observations retrieved from FastAPI backend
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-surface-subtle px-3 py-1.5 rounded-lg border border-surface-border hover:border-slate-600 transition-colors">
              <input
                type="checkbox"
                checked={showDecomposition}
                onChange={(e) => setShowDecomposition(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/20 bg-surface-card"
              />
              <span>Show DNI / DHI Decomposition</span>
            </label>
          </div>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={diurnalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="ghiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="dniGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis 
                dataKey="time_ist" 
                stroke="#64748B" 
                tick={{ fontSize: 11 }}
                interval={7}
              />
              <YAxis 
                stroke="#64748B" 
                tick={{ fontSize: 11 }}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="ghi"
                name="GHI (Global Horizontal)"
                stroke="#F59E0B"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#ghiGradient)"
              />
              {showDecomposition && (
                <>
                  <Area
                    type="monotone"
                    dataKey="dni"
                    name="DNI (Direct Normal)"
                    stroke="#38BDF8"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#dniGradient)"
                  />
                  <Line
                    type="monotone"
                    dataKey="dhi"
                    name="DHI (Diffuse Horizontal)"
                    stroke="#A78BFA"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: City Comparison & 7-Day Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City Comparison Chart */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5 flex flex-col justify-between">
          <div className="border-b border-surface-border pb-3 mb-4">
            <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-solar-yellow" />
              Regional Solar Resource Comparison (June 03, 2025)
            </h2>
            <p className="text-xs text-slate-400">
              Live multi-city GHI comparison queried from FastAPI backend
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cityComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#64748B" 
                  tick={{ fontSize: 11 }}
                  interval={7}
                />
                <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="Jaisalmer"
                  name="Jaisalmer (Thar Desert)"
                  stroke="#84CC16"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Delhi"
                  name="Delhi NCR"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Raipur"
                  name="Raipur (Central)"
                  stroke="#38BDF8"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] text-slate-400 pt-3 border-t border-surface-border/60">
            * Jaisalmer exhibits the highest peak insolation and clearness index due to arid desert conditions.
          </div>
        </div>

        {/* 7-Day Insolation Trend (June 1 - 7, 2025) */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5 flex flex-col justify-between">
          <div className="border-b border-surface-border pb-3 mb-4">
            <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <Maximize2 className="h-4 w-4 text-solar-lime" />
              7-Day Daily Solar Insolation (June 1–7, 2025)
            </h2>
            <p className="text-xs text-slate-400">
              Daily aggregates computed from actual 15-minute backend Solcast records
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sevenDayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748B" 
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => val.slice(5)}
                />
                <YAxis stroke="#64748B" tick={{ fontSize: 11 }} unit=" kWh" />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-surface-card border border-surface-border p-3 rounded-lg shadow-xl text-xs space-y-1">
                          <p className="font-semibold text-slate-200">{label}</p>
                          <p className="text-solar-amber">Daily Insolation: {data.dailyInsolationKwh} kWh/m²</p>
                          <p className="text-slate-300">Peak GHI: {data.peakGhi} W/m²</p>
                          <p className="text-slate-400">Avg Cloud Opacity: {data.avgCloudOpacity}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="dailyInsolationKwh" 
                  name="Daily Insolation (kWh/m²)" 
                  fill="#F59E0B" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] text-slate-400 pt-3 border-t border-surface-border/60">
            * June 03 shows noticeable insolation dip due to afternoon convective cloud passage.
          </div>
        </div>
      </div>

      {/* Dataset & Methodology Card */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5 text-xs text-slate-400 space-y-3">
        <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
          <Info className="h-4 w-4 text-solar-amber" />
          Technical & Dataset Semantics Note
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-400 leading-relaxed">
          <div className="bg-surface p-3.5 rounded-lg border border-surface-border/80">
            <span className="font-semibold text-slate-300 block mb-1">Interval-End Convention</span>
            Solcast timestamps represent the end of each 15-minute integration period. Insolation is computed as the discrete sum of GHI × 0.25 h.
          </div>
          <div className="bg-surface p-3.5 rounded-lg border border-surface-border/80">
            <span className="font-semibold text-slate-300 block mb-1">Timezone Alignment</span>
            Original Solcast longitudinal offsets (+05:00 for Delhi/Raipur, +04:00 for Jaisalmer) are normalized to Indian Standard Time (Asia/Kolkata, UTC+05:30) without altering observation counts.
          </div>
          <div className="bg-surface p-3.5 rounded-lg border border-surface-border/80">
            <span className="font-semibold text-slate-300 block mb-1">Live Backend Integration</span>
            Observational data and summary metrics are dynamically fetched from the FastAPI backend at http://localhost:8000.
          </div>
        </div>
      </div>
    </div>
  );
};
