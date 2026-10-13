import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Filter, 
  Info, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search,
  Gauge,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import type { LocationId } from '../../types';
import type { AnomaliesResponse } from '../../api/types';
import { api } from '../../api/client';
import { LOCATIONS } from '../../data/sampleSolarData';
import { KpiCard } from '../common/KpiCard';
import { LoadingState, ErrorState, EmptyState } from '../common/StateViews';

interface AnomalyMonitoringPageProps {
  selectedLocation: LocationId;
}

export const AnomalyMonitoringPage: React.FC<AnomalyMonitoringPageProps> = ({ selectedLocation }) => {
  // Filter states
  const [locationFilter, setLocationFilter] = useState<string>(selectedLocation);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data states from FastAPI
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [anomalyData, setAnomalyData] = useState<AnomaliesResponse | null>(null);

  // Sync filter when selectedLocation prop changes
  useEffect(() => {
    setLocationFilter(selectedLocation);
  }, [selectedLocation]);

  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const locParam = locationFilter === 'all' ? undefined : locationFilter;
      const sevParam = severityFilter === 'all' ? undefined : severityFilter;
      const data = await api.getAnomalies(locParam, sevParam, 300);
      setAnomalyData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [locationFilter, severityFilter]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  const anomalies = anomalyData?.anomalies || [];
  const thresholds = anomalyData?.thresholds || {
    Delhi: 120.72,
    Jaisalmer: 81.46,
    Raipur: 136.32
  };

  // Client-side text search filter (by date, time, or location)
  const filteredAnomalies = anomalies.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.target_time.toLowerCase().includes(query) ||
      item.date_ist.toLowerCase().includes(query) ||
      item.time_ist.toLowerCase().includes(query) ||
      item.location.toLowerCase().includes(query)
    );
  });

  // Summary KPI Calculations
  const criticalCount = filteredAnomalies.filter((a) => a.severity === 'Critical').length;
  const highCount = filteredAnomalies.filter((a) => a.severity === 'High').length;
  const maxResidualRecord = filteredAnomalies.length > 0 
    ? [...filteredAnomalies].sort((a, b) => b.abs_residual - a.abs_residual)[0] 
    : null;

  // Active location threshold display
  const activeThreshold = locationFilter !== 'all' 
    ? thresholds[locationFilter] ?? 0 
    : null;

  // Top 15 anomalies for chart visualization
  const top15Anomalies = [...filteredAnomalies]
    .sort((a, b) => b.abs_residual - a.abs_residual)
    .slice(0, 15)
    .map((item) => ({
      name: `${item.location.slice(0, 3)} ${item.date_ist.slice(5)} ${item.time_ist}`,
      actual: item.actual_ghi,
      predicted: item.predicted_ghi,
      abs_residual: item.abs_residual,
      residual: item.residual,
      direction: item.residual < 0 ? 'Overprediction' : 'Underprediction',
      location: item.location,
      time: `${item.date_ist} ${item.time_ist}`,
      severity: item.severity,
      threshold: item.threshold
    }));

  const AnomalyChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface-card border border-surface-border p-3.5 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[220px]">
          <p className="font-semibold text-slate-200 border-b border-surface-border pb-1 mb-1 flex items-center justify-between">
            <span>{data.location} ({data.time} IST)</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
              data.severity === 'Critical' 
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {data.severity}
            </span>
          </p>
          <div className="flex items-center justify-between gap-3 text-emerald-400">
            <span>Actual GHI:</span>
            <span className="font-mono font-bold">{data.actual} W/m²</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-solar-amber">
            <span>Predicted GHI:</span>
            <span className="font-mono font-bold">{data.predicted} W/m²</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-rose-400 font-semibold border-t border-surface-border/60 pt-1">
            <span>Residual (Error):</span>
            <span className="font-mono">{data.residual > 0 ? `+${data.residual}` : data.residual} W/m²</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-slate-400 text-[11px]">
            <span>City Threshold:</span>
            <span className="font-mono">{data.threshold} W/m²</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">Anomaly Monitoring</h1>
                <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-[10px] font-mono text-rose-400 font-semibold uppercase tracking-wider">
                  99th Percentile Holdout Outliers
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Statistical residual tracking on holdout evaluation intervals (Oct 19 – Dec 31, 2025) across Delhi, Raipur, and Jaisalmer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Current Scope:</span>
            <span className="px-2.5 py-1 rounded-md bg-surface text-xs font-mono text-slate-200 border border-surface-border font-medium">
              {locationFilter === 'all' ? 'All Locations' : `${locationFilter} (${LOCATIONS[locationFilter as LocationId]?.state})`}
            </span>
          </div>
        </div>

        {/* Scientific Methodology Notice */}
        <div className="mt-5 p-3.5 rounded-lg bg-surface border border-surface-border/80 flex items-start gap-3">
          <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-sky-300">Methodology & Interpretation Notice: </span>
            Anomaly flags are defined mathematically as holdout test predictions where the absolute error |actual - predicted| &gt; &tau;<sub>99th</sub>.
            These represent <strong>unusual forecast errors</strong> driven by rapid meteorological changes (e.g., sudden cloud formation, monsoon squalls, dense winter fog), 
            <strong> NOT confirmed physical equipment faults or hardware sensor failures</strong>.
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && <LoadingState message="Fetching flagged model residuals from FastAPI..." />}
      {error && <ErrorState error={error} onRetry={fetchAnomalies} />}

      {!loading && !error && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Flagged Outliers"
              value={filteredAnomalies.length}
              unit="intervals"
              icon={AlertTriangle}
              accent="amber"
              helperText={`~1.0% of chronological test split`}
              badge="99th %tile"
            />
            <KpiCard
              label={locationFilter === 'all' ? "Mean Threshold" : `${locationFilter} Threshold`}
              value={activeThreshold !== null ? activeThreshold.toFixed(1) : "112.8"}
              unit="W/m²"
              icon={Gauge}
              accent="yellow"
              helperText={locationFilter === 'all' ? "City thresholds: 81.5 – 136.3 W/m²" : `Strict 99th percentile cutoff`}
              badge="τ_99th"
            />
            <KpiCard
              label="Critical Severities"
              value={criticalCount}
              unit="cases"
              icon={ShieldAlert}
              accent="amber"
              helperText={`|residual| ≥ 200 W/m² (${highCount} high severity)`}
              badge="Severe"
            />
            <KpiCard
              label="Peak Absolute Error"
              value={maxResidualRecord ? maxResidualRecord.abs_residual.toFixed(1) : "0.0"}
              unit="W/m²"
              icon={Activity}
              accent="slate"
              helperText={maxResidualRecord ? `${maxResidualRecord.location} (${maxResidualRecord.date_ist} ${maxResidualRecord.time_ist})` : "No outliers"}
              badge="Max Residual"
            />
          </div>

          {/* City-Specific Anomaly Threshold Benchmarks */}
          <div className="bg-surface-card border border-surface-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Location-Specific Anomaly Thresholds (τ_99th)</h3>
                <p className="text-xs text-slate-400">
                  Calibrated to the 99th percentile of absolute 1-hour forecast errors in each climate zone
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-surface px-2.5 py-1 rounded border border-surface-border">
                Total Holdout Flags: 210 (70 per city)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Delhi */}
              <div className={`p-4 rounded-xl border transition-all ${
                locationFilter === 'Delhi' 
                  ? 'bg-amber-500/10 border-solar-amber/40 shadow-lg' 
                  : 'bg-surface border-surface-border hover:border-slate-600'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="text-sm font-semibold text-white">Delhi</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Composite / Subtropical</span>
                </div>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-xs text-slate-400">Residual Threshold:</span>
                  <span className="text-lg font-mono font-bold text-amber-300">
                    {(thresholds.Delhi ?? 120.72).toFixed(2)} <span className="text-xs font-normal text-slate-400">W/m²</span>
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-surface-border/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Holdout Flags: 70 / 6,986</span>
                  <span className="text-amber-400/90 font-mono">1.00%</span>
                </div>
              </div>

              {/* Raipur */}
              <div className={`p-4 rounded-xl border transition-all ${
                locationFilter === 'Raipur' 
                  ? 'bg-amber-500/10 border-solar-amber/40 shadow-lg' 
                  : 'bg-surface border-surface-border hover:border-slate-600'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <span className="text-sm font-semibold text-white">Raipur</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Tropical Wet/Dry</span>
                </div>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-xs text-slate-400">Residual Threshold:</span>
                  <span className="text-lg font-mono font-bold text-emerald-300">
                    {(thresholds.Raipur ?? 136.32).toFixed(2)} <span className="text-xs font-normal text-slate-400">W/m²</span>
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-surface-border/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Holdout Flags: 70 / 6,986</span>
                  <span className="text-emerald-400/90 font-mono">1.00%</span>
                </div>
              </div>

              {/* Jaisalmer */}
              <div className={`p-4 rounded-xl border transition-all ${
                locationFilter === 'Jaisalmer' 
                  ? 'bg-amber-500/10 border-solar-amber/40 shadow-lg' 
                  : 'bg-surface border-surface-border hover:border-slate-600'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                    <span className="text-sm font-semibold text-white">Jaisalmer</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Hot Arid / Desert</span>
                </div>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-xs text-slate-400">Residual Threshold:</span>
                  <span className="text-lg font-mono font-bold text-yellow-300">
                    {(thresholds.Jaisalmer ?? 81.46).toFixed(2)} <span className="text-xs font-normal text-slate-400">W/m²</span>
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-surface-border/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Holdout Flags: 70 / 6,990</span>
                  <span className="text-yellow-400/90 font-mono">1.00%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Top Residuals Bar Chart */}
          {top15Anomalies.length > 0 && (
            <div className="bg-surface-card border border-surface-border rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Top 15 Peak Model Prediction Residuals</h3>
                  <p className="text-xs text-slate-400">
                    Comparison between observed GHI and model forecast during severe mismatch intervals
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span>
                    <span>Actual GHI</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-solar-amber"></span>
                    <span>Predicted GHI</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={top15Anomalies}
                    margin={{ top: 10, right: 20, left: -10, bottom: 35 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#233252" opacity={0.6} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748B" 
                      fontSize={11} 
                      angle={-30} 
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis 
                      stroke="#64748B" 
                      fontSize={11} 
                      unit=" W/m²"
                    />
                    <Tooltip content={<AnomalyChartTooltip />} />
                    <Bar dataKey="actual" fill="#34D399" radius={[4, 4, 0, 0]} name="Actual GHI" />
                    <Bar dataKey="predicted" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Predicted GHI" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Filters and Search Bar */}
          <div className="bg-surface-card border border-surface-border rounded-xl p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Location Selector Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1 mr-1">
                  <Filter className="h-3.5 w-3.5" />
                  City:
                </span>
                {(['all', 'Delhi', 'Raipur', 'Jaisalmer'] as const).map((loc) => {
                  const isActive = locationFilter === loc;
                  return (
                    <button
                      key={loc}
                      onClick={() => setLocationFilter(loc)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-solar-amber text-slate-950 font-semibold shadow-md shadow-amber-500/10'
                          : 'bg-surface text-slate-300 hover:text-white hover:bg-surface-hover border border-surface-border'
                      }`}
                    >
                      {loc === 'all' ? 'All Locations (210)' : loc}
                    </button>
                  );
                })}
              </div>

              {/* Severity & Search Controls */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-400">Severity:</span>
                  {(['all', 'Critical', 'High'] as const).map((sev) => {
                    const isActive = severityFilter === sev;
                    return (
                      <button
                        key={sev}
                        onClick={() => setSeverityFilter(sev)}
                        className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                          isActive
                            ? 'bg-surface-hover text-white border border-solar-amber/40 font-semibold'
                            : 'bg-surface text-slate-400 hover:text-slate-200 border border-surface-border'
                        }`}
                      >
                        {sev === 'all' ? 'All' : sev}
                      </button>
                    );
                  })}
                </div>

                <div className="relative min-w-[180px]">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search time / date..."
                    className="w-full bg-surface border border-surface-border rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-solar-amber transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Flagged Anomalies Table */}
          <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-surface-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Flagged Residual Records</h3>
                <p className="text-xs text-slate-400">
                  Showing {filteredAnomalies.length} outliers exceeding 99th percentile threshold
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Sorted chronologically by test timestamp
              </span>
            </div>

            {filteredAnomalies.length === 0 ? (
              <EmptyState message="No flagged anomaly records match the selected filter criteria." />
            ) : (
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface sticky top-0 z-10 border-b border-surface-border text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Target Time (IST)</th>
                      <th className="py-3 px-3">Location</th>
                      <th className="py-3 px-3 text-right">Actual GHI</th>
                      <th className="py-3 px-3 text-right">Predicted GHI</th>
                      <th className="py-3 px-3 text-right">Residual</th>
                      <th className="py-3 px-3 text-right">Abs Residual</th>
                      <th className="py-3 px-3 text-right">Threshold</th>
                      <th className="py-3 px-3 text-center">Direction</th>
                      <th className="py-3 px-4 text-center">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/60 font-mono text-slate-300">
                    {filteredAnomalies.map((item, idx) => {
                      const isOverpredicted = item.residual < 0;
                      return (
                        <tr 
                          key={`${item.location}-${item.target_time}-${idx}`}
                          className="hover:bg-surface-hover/60 transition-colors"
                        >
                          <td className="py-2.5 px-4 text-white font-medium whitespace-nowrap">
                            {item.date_ist} <span className="text-slate-400 font-normal">{item.time_ist}</span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium ${
                              item.location === 'Delhi' 
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : item.location === 'Raipur'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20'
                            }`}>
                              {item.location}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-bold whitespace-nowrap">
                            {item.actual_ghi.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">W/m²</span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-solar-amber font-bold whitespace-nowrap">
                            {item.predicted_ghi.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">W/m²</span>
                          </td>
                          <td className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
                            item.residual > 0 ? 'text-sky-400' : 'text-rose-400'
                          }`}>
                            {item.residual > 0 ? `+${item.residual.toFixed(1)}` : item.residual.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-200 font-semibold whitespace-nowrap">
                            {item.abs_residual.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400 whitespace-nowrap">
                            {item.threshold.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded ${
                              isOverpredicted 
                                ? 'text-rose-300 bg-rose-500/10' 
                                : 'text-sky-300 bg-sky-500/10'
                            }`}>
                              {isOverpredicted ? (
                                <>
                                  <ArrowDownRight className="h-3 w-3 text-rose-400" />
                                  <span>Overpredicted</span>
                                </>
                              ) : (
                                <>
                                  <ArrowUpRight className="h-3 w-3 text-sky-400" />
                                  <span>Underpredicted</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase font-mono ${
                              item.severity === 'Critical'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {item.severity}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
