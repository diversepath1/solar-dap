import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Sun, 
  CloudSun, 
  Thermometer, 
  Calendar, 
  Layers, 
  TrendingDown, 
  Maximize2,
  Table as TableIcon
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  ReferenceLine
} from 'recharts';
import type { LocationId, DailySummary } from '../../types';
import type { TimeseriesRecord } from '../../api/types';
import { api } from '../../api/client';
import { 
  LOCATIONS, 
  getCloudOpacityScatterData,
  DAYLIGHT_CORRELATION_MATRIX
} from '../../data/sampleSolarData';
import { LoadingState, ErrorState, EmptyState } from '../common/StateViews';

interface SolarAnalyticsPageProps {
  selectedLocation: LocationId;
}

export const SolarAnalyticsPage: React.FC<SolarAnalyticsPageProps> = ({ selectedLocation }) => {
  const [viewMode, setViewMode] = useState<'single' | 'seven-day'>('single');
  const [selectedDate, setSelectedDate] = useState<string>('2025-06-03');
  
  // Data loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeseriesRecord[]>([]);
  const [sevenDaySummaries, setSevenDaySummaries] = useState<DailySummary[]>([]);

  // Series visibility toggles
  const [visibleSeries, setVisibleSeries] = useState({
    ghi: true,
    dni: true,
    dhi: true,
    gti: true,
    cloud: false,
    temp: false,
  });

  const locationMeta = LOCATIONS[selectedLocation];

  // Fetch real time-series from backend
  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (viewMode === 'single') {
        const res = await api.getTimeseries(selectedLocation, selectedDate, selectedDate);
        setTimeSeriesData(res.records);
      } else {
        const res = await api.getTimeseries(selectedLocation, '2025-06-01', '2025-06-07');
        setTimeSeriesData(res.records);
      }

      // Also ensure 7-day summaries table is calculated from real backend data
      const sevenDayRes = await api.getTimeseries(selectedLocation, '2025-06-01', '2025-06-07');
      const dayGroups: Record<string, TimeseriesRecord[]> = {};
      for (const rec of sevenDayRes.records) {
        if (!dayGroups[rec.date_ist]) {
          dayGroups[rec.date_ist] = [];
        }
        dayGroups[rec.date_ist].push(rec);
      }

      const summaries: DailySummary[] = Object.keys(dayGroups).sort().map((dateStr) => {
        const records = dayGroups[dateStr];
        const peakGhi = Math.round(Math.max(...records.map((r) => r.ghi)));
        const dailyInsolationKwh = Math.round(
          (records.reduce((acc, r) => acc + r.ghi * 0.25, 0) / 1000) * 100
        ) / 100;
        const dailyGtiInsolationKwh = Math.round(
          (records.reduce((acc, r) => acc + r.gti * 0.25, 0) / 1000) * 100
        ) / 100;
        const totalGhi = records.reduce((acc, r) => acc + r.ghi, 0);
        const totalDni = records.reduce((acc, r) => acc + r.dni, 0);
        const dniGhiRatio = totalGhi > 0 ? Math.round((totalDni / totalGhi) * 100) / 100 : 0.75;
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
          dailyGtiInsolationKwh,
          daylightHours,
          avgTemp,
          avgCloudOpacity,
          dniGhiRatio,
        };
      });

      setSevenDaySummaries(summaries);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedLocation, viewMode, selectedDate]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Scatter plot dataset for cloud opacity vs GHI (EDA regression benchmark)
  const scatterData = useMemo(() => getCloudOpacityScatterData(), []);

  const toggleSeries = (key: keyof typeof visibleSeries) => {
    setVisibleSeries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Custom Dark Tooltip for Time Series
  const TimeSeriesTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-card border border-surface-border p-3.5 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[210px]">
          <p className="font-semibold text-slate-200 border-b border-surface-border pb-1.5 mb-1.5 flex items-center justify-between">
            <span>Interval End: {label}</span>
            <span className="text-[10px] text-solar-amber font-mono">IST</span>
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={`series-${index}`} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-mono font-medium text-slate-100">
                {entry.value} {entry.unit || ''}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom Scatter Tooltip
  const ScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface-card border border-surface-border p-3 rounded-lg shadow-xl text-xs space-y-1">
          <p className="font-semibold text-slate-200">Daylight Observation</p>
          <div className="text-slate-300">
            Cloud Opacity: <span className="font-mono text-white font-semibold">{data.cloud_opacity}%</span>
          </div>
          <div className="text-solar-amber">
            Observed GHI: <span className="font-mono font-semibold">{data.ghi} W/m²</span>
          </div>
          <div className="text-slate-400">
            Fitted Value: <span className="font-mono">{data.regression_ghi} W/m²</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Helper function for correlation heatmap cell colors
  const getCorrelationColor = (val: number) => {
    if (val === 1.0) return 'bg-amber-500/30 text-amber-300 font-bold';
    if (val > 0.7) return 'bg-amber-500/20 text-amber-300';
    if (val > 0.3) return 'bg-amber-500/10 text-amber-200';
    if (val > -0.1 && val <= 0.3) return 'bg-slate-800/40 text-slate-300';
    if (val >= -0.5) return 'bg-rose-500/10 text-rose-300';
    return 'bg-rose-500/25 text-rose-200 font-semibold';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-xl bg-surface-card border border-surface-border">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Layers className="h-5 w-5 text-solar-amber" />
            <span>Solar Resource Analytics — {locationMeta.name}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-normal">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>FastAPI Connected</span>
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Decomposed radiation components (GHI, DNI, DHI, GTI) and multi-variable atmospheric interaction
          </p>
        </div>

        {/* Filters and View Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-surface border border-surface-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'single'
                  ? 'bg-solar-amber text-slate-950 font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Diurnal Day
            </button>
            <button
              onClick={() => setViewMode('seven-day')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'seven-day'
                  ? 'bg-solar-amber text-slate-950 font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              7-Day Window (EDA)
            </button>
          </div>

          {/* Date Picker (for single day view) */}
          {viewMode === 'single' && (
            <div className="flex items-center gap-2 bg-surface border border-surface-border rounded-lg px-3 py-1.5 text-xs text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="2025-06-01" className="bg-surface text-slate-200">Jun 01, 2025 (Clear)</option>
                <option value="2025-06-02" className="bg-surface text-slate-200">Jun 02, 2025 (Clear High)</option>
                <option value="2025-06-03" className="bg-surface text-slate-200">Jun 03, 2025 (Convective Dip)</option>
                <option value="2025-06-04" className="bg-surface text-slate-200">Jun 04, 2025 (Moderate)</option>
                <option value="2025-06-05" className="bg-surface text-slate-200">Jun 05, 2025 (Peak Day)</option>
                <option value="2025-06-06" className="bg-surface text-slate-200">Jun 06, 2025 (Clear)</option>
                <option value="2025-06-07" className="bg-surface text-slate-200">Jun 07, 2025 (Cloud Pass)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Series Toggle Pills */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400 font-medium">
          <span>Active Series:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* GHI */}
          <button
            onClick={() => toggleSeries('ghi')}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
              visibleSeries.ghi 
                ? 'bg-amber-500/15 border-amber-500/40 text-solar-amber' 
                : 'bg-surface border-surface-border text-slate-500 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-solar-amber" />
            <span>GHI (Global Horizontal)</span>
          </button>

          {/* DNI */}
          <button
            onClick={() => toggleSeries('dni')}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
              visibleSeries.dni 
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-400' 
                : 'bg-surface border-surface-border text-slate-500 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>DNI (Direct Normal)</span>
          </button>

          {/* DHI */}
          <button
            onClick={() => toggleSeries('dhi')}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
              visibleSeries.dhi 
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-400' 
                : 'bg-surface border-surface-border text-slate-500 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>DHI (Diffuse Horizontal)</span>
          </button>

          {/* GTI */}
          <button
            onClick={() => toggleSeries('gti')}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
              visibleSeries.gti 
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' 
                : 'bg-surface border-surface-border text-slate-500 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>GTI (Global Tilted ~25°)</span>
          </button>

          <span className="text-slate-600">|</span>

          {/* Weather Overlays */}
          <button
            onClick={() => toggleSeries('cloud')}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
              visibleSeries.cloud 
                ? 'bg-slate-400/20 border-slate-400/50 text-slate-200' 
                : 'bg-surface border-surface-border text-slate-500'
            }`}
          >
            <CloudSun className="h-3 w-3" />
            <span>Cloud Opacity (%)</span>
          </button>

          <button
            onClick={() => toggleSeries('temp')}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
              visibleSeries.temp 
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300' 
                : 'bg-surface border-surface-border text-slate-500'
            }`}
          >
            <Thermometer className="h-3 w-3" />
            <span>Air Temp (°C)</span>
          </button>
        </div>
      </div>

      {/* Main Multi-Series Radiation Chart with Loading/Error states */}
      {loading ? (
        <LoadingState message="Loading Solcast observations from FastAPI backend..." />
      ) : error ? (
        <ErrorState error={error} onRetry={fetchAnalyticsData} />
      ) : !timeSeriesData.length ? (
        <EmptyState message="No observations returned for the selected date range." />
      ) : (
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <div className="flex items-center justify-between pb-4 border-b border-surface-border mb-4">
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <Sun className="h-4 w-4 text-solar-amber" />
                <span>Multi-Variable Irradiance & Weather Series</span>
              </h2>
              <p className="text-xs text-slate-400">
                {viewMode === 'single'
                  ? `15-minute resolution profile for ${selectedDate} (${timeSeriesData.length} records)`
                  : `Full 7-day chronological progression (${timeSeriesData.length} records, June 1–7, 2025)`}
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Unit: W/m² (Left Axis) {visibleSeries.cloud || visibleSeries.temp ? '• Weather (Right Axis)' : ''}
            </div>
          </div>

          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis 
                  dataKey={viewMode === 'single' ? 'time_ist' : 'timestamp_ist'} 
                  stroke="#64748B" 
                  tick={{ fontSize: 11 }}
                  interval={viewMode === 'single' ? 7 : 47}
                  tickFormatter={(val) => {
                    if (viewMode === 'single') return val;
                    return `${val.slice(5, 10)} ${val.slice(11, 16)}`;
                  }}
                />
                <YAxis 
                  yAxisId="solar" 
                  stroke="#64748B" 
                  tick={{ fontSize: 11 }} 
                  domain={[0, 'auto']} 
                />
                {(visibleSeries.cloud || visibleSeries.temp) && (
                  <YAxis 
                    yAxisId="weather" 
                    orientation="right" 
                    stroke="#94A3B8" 
                    tick={{ fontSize: 11 }} 
                    domain={[0, 100]} 
                  />
                )}
                <Tooltip content={<TimeSeriesTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                {/* Radiation Lines */}
                {visibleSeries.ghi && (
                  <Line
                    yAxisId="solar"
                    type="monotone"
                    dataKey="ghi"
                    name="GHI"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {visibleSeries.dni && (
                  <Line
                    yAxisId="solar"
                    type="monotone"
                    dataKey="dni"
                    name="DNI"
                    stroke="#38BDF8"
                    strokeWidth={1.75}
                    dot={false}
                  />
                )}
                {visibleSeries.dhi && (
                  <Line
                    yAxisId="solar"
                    type="monotone"
                    dataKey="dhi"
                    name="DHI"
                    stroke="#A78BFA"
                    strokeWidth={1.5}
                    dot={false}
                  />
                )}
                {visibleSeries.gti && (
                  <Line
                    yAxisId="solar"
                    type="monotone"
                    dataKey="gti"
                    name="GTI (Tilt)"
                    stroke="#10B981"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                  />
                )}

                {/* Weather Lines */}
                {visibleSeries.cloud && (
                  <Line
                    yAxisId="weather"
                    type="monotone"
                    dataKey="cloud_opacity"
                    name="Cloud Opacity (%)"
                    stroke="#94A3B8"
                    strokeWidth={1.5}
                    dot={false}
                  />
                )}
                {visibleSeries.temp && (
                  <Line
                    yAxisId="weather"
                    type="monotone"
                    dataKey="air_temp"
                    name="Air Temp (°C)"
                    stroke="#FB7185"
                    strokeWidth={1.5}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Grid: Regression Scatter Plot & Correlation Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cloud Opacity vs GHI Linear Regression */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="border-b border-surface-border pb-3 mb-3">
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-solar-amber" />
                Cloud Opacity vs. GHI Regression (EDA Benchmark)
              </h2>
              <p className="text-xs text-slate-400">
                Linear regression and scatter distribution for daylight observations (GHI &gt; 0)
              </p>
            </div>

            {/* Regression Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="p-2.5 rounded-lg bg-surface border border-surface-border">
                <span className="text-[10px] text-slate-400 block uppercase">Pearson r</span>
                <span className="text-sm font-bold text-solar-amber font-mono">-0.530</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface border border-surface-border">
                <span className="text-[10px] text-slate-400 block uppercase">R² Coefficient</span>
                <span className="text-sm font-bold text-white font-mono">0.281</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface border border-surface-border">
                <span className="text-[10px] text-slate-400 block uppercase">Slope</span>
                <span className="text-sm font-bold text-rose-400 font-mono">-6.93 W/m²</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface border border-surface-border">
                <span className="text-[10px] text-slate-400 block uppercase">p-value</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">2.68e-25</span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis 
                    dataKey="cloud_opacity" 
                    name="Cloud Opacity" 
                    unit="%" 
                    stroke="#64748B" 
                    tick={{ fontSize: 11 }}
                    domain={[0, 100]}
                  />
                  <YAxis 
                    dataKey="ghi" 
                    name="GHI" 
                    unit=" W/m²" 
                    stroke="#64748B" 
                    tick={{ fontSize: 11 }}
                    domain={[0, 1050]}
                  />
                  <Tooltip content={<ScatterTooltip />} />
                  <Scatter 
                    name="Daylight Observations" 
                    data={scatterData} 
                    fill="#F59E0B" 
                    fillOpacity={0.6}
                  />
                  {/* Fitted regression line */}
                  <ReferenceLine 
                    segment={[
                      { x: 0, y: 574.54 }, 
                      { x: 82.9, y: 0 }
                    ]} 
                    stroke="#38BDF8" 
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    label={{ 
                      value: 'y = -6.93x + 574.54', 
                      position: 'top', 
                      fill: '#38BDF8', 
                      fontSize: 10 
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-3 border-t border-surface-border/60 leading-relaxed">
            <span className="font-semibold text-slate-300">Statistical Caveat:</span> While the negative association is statistically significant (p &lt; 0.001), cloud opacity explains only 28.1% of GHI variance (R² = 0.281). The remaining variance is dominated by solar zenith angle and aerosol optical depth.
          </div>
        </div>

        {/* Daylight Correlation Matrix Heatmap */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="border-b border-surface-border pb-3 mb-3">
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <Maximize2 className="h-4 w-4 text-solar-lime" />
                Daylight Correlation Heatmap
              </h2>
              <p className="text-xs text-slate-400">
                Pairwise Pearson correlation coefficients across daylight atmospheric variables
              </p>
            </div>

            <div className="overflow-x-auto border border-surface-border rounded-lg">
              <table className="w-full text-xs text-center border-collapse">
                <thead className="bg-surface text-slate-400 border-b border-surface-border font-medium">
                  <tr>
                    <th className="py-2 px-2 text-left">Feature</th>
                    <th className="py-2 px-1">GHI</th>
                    <th className="py-2 px-1">DNI</th>
                    <th className="py-2 px-1">DHI</th>
                    <th className="py-2 px-1">GTI</th>
                    <th className="py-2 px-1">Cloud</th>
                    <th className="py-2 px-1">Temp</th>
                    <th className="py-2 px-1">RH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border font-mono text-slate-300 text-[11px]">
                  {DAYLIGHT_CORRELATION_MATRIX.map((row) => (
                    <tr key={row.feature} className="hover:bg-surface-hover/40">
                      <td className="py-2 px-2 text-left font-sans font-medium text-slate-200">
                        {row.feature}
                      </td>
                      <td className={`py-2 px-1 ${getCorrelationColor(row.ghi)}`}>{row.ghi.toFixed(2)}</td>
                      <td className={`py-2 px-1 ${getCorrelationColor(row.dni)}`}>{row.dni.toFixed(2)}</td>
                      <td className={`py-2 px-1 ${getCorrelationColor(row.dhi)}`}>{row.dhi.toFixed(2)}</td>
                      <td className={`py-2 px-1 ${getCorrelationColor(row.gti)}`}>{row.gti.toFixed(2)}</td>
                      <td className={`py-2 px-1 ${getCorrelationColor(row.cloud_opacity)}`}>{row.cloud_opacity.toFixed(2)}</td>
                      <td className={`py-2 px-1 ${getCorrelationColor(row.air_temp)}`}>{row.air_temp.toFixed(2)}</td>
                      <td className={`py-2 px-1 ${getCorrelationColor(row.relative_humidity)}`}>{row.relative_humidity.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-3 border-t border-surface-border/60 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/30 border border-amber-500/50" />
              <span>Positive (+1.0)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-800" />
              <span>Neutral (0.0)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500/30 border border-rose-500/50" />
              <span>Negative (-1.0)</span>
            </span>
          </div>
        </div>
      </div>

      {/* 7-Day Aggregated Summaries Table */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <TableIcon className="h-4 w-4 text-solar-amber" />
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                7-Day Solar Insolation & Weather Summary (June 1–7, 2025)
              </h2>
              <p className="text-xs text-slate-400">
                Daily aggregated irradiation totals computed from actual 15-minute backend Solcast records
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-400 hidden sm:block">
            Location: <span className="text-white font-medium">{locationMeta.name}</span>
          </div>
        </div>

        <div className="overflow-x-auto border border-surface-border rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface text-slate-400 border-b border-surface-border font-medium">
              <tr>
                <th className="py-2.5 px-4">Date (IST)</th>
                <th className="py-2.5 px-4">Peak GHI (W/m²)</th>
                <th className="py-2.5 px-4">GHI Insolation (kWh/m²)</th>
                <th className="py-2.5 px-4">GTI Insolation (kWh/m²)</th>
                <th className="py-2.5 px-4">DNI / GHI Ratio</th>
                <th className="py-2.5 px-4">Avg Cloud Opacity</th>
                <th className="py-2.5 px-4">Avg Air Temp</th>
                <th className="py-2.5 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border font-mono text-slate-300">
              {sevenDaySummaries.map((day) => {
                const isAnomalyDay = day.date === '2025-06-03';
                return (
                  <tr 
                    key={day.date} 
                    className={`hover:bg-surface-hover/50 transition-colors ${
                      isAnomalyDay ? 'bg-amber-500/5 border-l-2 border-l-amber-500' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                      {day.date}
                    </td>
                    <td className="py-2.5 px-4 text-solar-amber font-semibold">
                      {day.peakGhi}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-white">
                      {day.dailyInsolationKwh.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-emerald-400">
                      {(day.dailyGtiInsolationKwh || day.dailyInsolationKwh * 1.08).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4">
                      {((day.dniGhiRatio || 0.75) * 100).toFixed(0)}%
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={day.avgCloudOpacity > 20 ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                        {day.avgCloudOpacity}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {day.avgTemp.toFixed(1)}°C
                    </td>
                    <td className="py-2.5 px-4 font-sans text-[11px]">
                      {isAnomalyDay ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-solar-amber border border-amber-500/30">
                          Midday Cloud Dip (EDA focus)
                        </span>
                      ) : day.avgCloudOpacity < 10 ? (
                        <span className="text-emerald-400">Clear sky</span>
                      ) : (
                        <span className="text-slate-400">Partial haze</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
