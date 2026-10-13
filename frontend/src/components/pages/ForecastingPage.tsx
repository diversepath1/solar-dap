import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  AlertCircle, 
  Calendar, 
  Layers, 
  BarChart2, 
  CheckCircle2
} from 'lucide-react';
import { 
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
import type { LocationId } from '../../types';
import type { 
  AggregateMetricsResponse, 
  CityWiseMetricItem, 
  FeatureImportanceItem, 
  PredictionRecord 
} from '../../api/types';
import { api } from '../../api/client';
import { LOCATIONS } from '../../data/sampleSolarData';
import { KpiCard } from '../common/KpiCard';
import { LoadingState, ErrorState, EmptyState } from '../common/StateViews';

interface ForecastingPageProps {
  selectedLocation: LocationId;
}

export const ForecastingPage: React.FC<ForecastingPageProps> = ({ selectedLocation }) => {
  const [selectedDate, setSelectedDate] = useState<string>('2025-10-30');
  const [showPersistence, setShowPersistence] = useState<boolean>(true);

  // Data states from FastAPI
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [metricsData, setMetricsData] = useState<AggregateMetricsResponse | null>(null);
  const [cityMetrics, setCityMetrics] = useState<CityWiseMetricItem[]>([]);
  const [featureImportance, setFeatureImportance] = useState<FeatureImportanceItem[]>([]);
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);

  const locationMeta = LOCATIONS[selectedLocation];

  const fetchForecastData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, cityMetricsRes, fiRes, predsRes] = await Promise.all([
        api.getMlMetrics(),
        api.getCityMetrics(),
        api.getFeatureImportance(),
        api.getPredictions(selectedLocation, selectedDate, 150),
      ]);

      setMetricsData(metricsRes);
      setCityMetrics(cityMetricsRes.city_metrics);
      setFeatureImportance(fiRes.features);
      setPredictions(predsRes.predictions);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [selectedLocation, selectedDate]);

  useEffect(() => {
    fetchForecastData();
  }, [fetchForecastData]);

  // Active city metric
  const currentCityMetric = cityMetrics.find(
    (c) => c.location.toLowerCase() === selectedLocation.toLowerCase()
  );

  // Custom Dark Tooltip
  const ForecastTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const rec = payload[0].payload as PredictionRecord;
      return (
        <div className="bg-surface-card border border-surface-border p-3.5 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[220px]">
          <p className="font-semibold text-slate-200 border-b border-surface-border pb-1 mb-1 flex items-center justify-between">
            <span>Target Time: {label} (IST)</span>
            <span className="text-[10px] text-solar-amber font-mono">1h Horizon</span>
          </p>
          <div className="flex items-center justify-between gap-3 text-emerald-400">
            <span>Actual GHI:</span>
            <span className="font-mono font-bold">{rec.actual_ghi} W/m²</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-solar-amber">
            <span>Predicted GHI:</span>
            <span className="font-mono font-bold">{rec.predicted_ghi} W/m²</span>
          </div>
          {showPersistence && (
            <div className="flex items-center justify-between gap-3 text-sky-400">
              <span>Persistence (GHI t):</span>
              <span className="font-mono">{rec.persistence_ghi} W/m²</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-surface-border text-slate-400">
            <span>Forecast Error:</span>
            <span className={`font-mono ${rec.forecast_error >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
              {rec.forecast_error > 0 ? `+${rec.forecast_error}` : rec.forecast_error} W/m²
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-xl bg-surface-card border border-surface-border">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="h-5 w-5 text-solar-amber" />
            <span>1-Hour Ahead GHI Forecast Evaluation — {locationMeta.name}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-solar-amber border border-amber-500/20 font-normal">
              Holdout Split (Oct 19 – Dec 31, 2025)
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Offline machine learning evaluation: Random Forest regressor benchmarked against persistence baseline
          </p>
        </div>

        {/* Date Selector within Test Range */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface border border-surface-border rounded-lg px-3 py-1.5 text-xs text-slate-300">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400">Test Date:</span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="2025-10-30" className="bg-surface text-slate-200">Oct 30, 2025 (High Shading / Overcast)</option>
              <option value="2025-10-21" className="bg-surface text-slate-200">Oct 21, 2025 (Clear Holdout Day)</option>
              <option value="2025-10-27" className="bg-surface text-slate-200">Oct 27, 2025 (Afternoon Cloud Event)</option>
              <option value="2025-11-07" className="bg-surface text-slate-200">Nov 07, 2025 (Convective Transition)</option>
              <option value="2025-12-06" className="bg-surface text-slate-200">Dec 06, 2025 (Winter Clear Sky)</option>
              <option value="2025-12-28" className="bg-surface text-slate-200">Dec 28, 2025 (Winter Anomaly Event)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Evaluation Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-solar-amber shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white block mb-0.5">
            Scientific Evaluation Disclosure (Chronological Holdout)
          </span>
          These metrics represent offline evaluation across <strong>20,962 holdout intervals</strong> (October 19 to December 31, 2025) using the 80th-percentile chronological cutoff. 
          Reported metrics include nighttime intervals (GHI = 0 W/m²), which compress overall error. 
          <strong> These are not live operational forecasts.</strong>
          {metricsData && (
            <div className="mt-2 pt-2 border-t border-amber-500/20 flex flex-wrap items-center gap-4 text-[11px] font-mono text-amber-300/90">
              <span>Overall 3-City Holdout (N={metricsData.metadata.test_rows.toLocaleString()}):</span>
              <span>RF MAE = {metricsData.metrics.find(m => m.model_name === 'Random Forest')?.mae} W/m²</span>
              <span>RF RMSE = {metricsData.metrics.find(m => m.model_name === 'Random Forest')?.rmse} W/m²</span>
              <span>RF R² = {metricsData.metrics.find(m => m.model_name === 'Random Forest')?.r2}</span>
            </div>
          )}
        </div>
      </div>

      {/* Loading or Error State */}
      {loading ? (
        <LoadingState message={`Fetching ML forecast evaluation for ${locationMeta.name}...`} />
      ) : error ? (
        <ErrorState error={error} onRetry={fetchForecastData} />
      ) : (
        <>
          {/* Holdout Metrics KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Random Forest MAE"
              value={currentCityMetric ? `${currentCityMetric.rf_mae} W/m²` : '10.60 W/m²'}
              icon={TrendingUp}
              helperText={currentCityMetric ? `Persistence: ${currentCityMetric.persistence_mae} W/m²` : 'Persistence: 56.34 W/m²'}
              badge="-75% to -87% error"
              accent="amber"
            />
            <KpiCard
              label="Random Forest RMSE"
              value={currentCityMetric ? `${currentCityMetric.rf_rmse} W/m²` : '25.00 W/m²'}
              icon={BarChart2}
              helperText={currentCityMetric ? `Persistence: ${currentCityMetric.persistence_rmse} W/m²` : 'Persistence: 92.50 W/m²'}
              accent="yellow"
            />
            <KpiCard
              label="Holdout R² Score"
              value={currentCityMetric ? currentCityMetric.rf_r2.toFixed(3) : '0.990'}
              icon={CheckCircle2}
              helperText={currentCityMetric ? `Persistence R²: ${currentCityMetric.persistence_r2.toFixed(3)}` : 'Persistence R²: 0.862'}
              accent="lime"
            />
            <KpiCard
              label="Evaluation Test Rows"
              value={currentCityMetric ? currentCityMetric.observations.toLocaleString() : '20,962'}
              unit="intervals"
              icon={Layers}
              helperText="15-minute, Oct 19 - Dec 31"
              accent="slate"
            />
          </div>

          {/* Actual vs Predicted vs Persistence Primary Chart */}
          <div className="bg-surface-card border border-surface-border rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-surface-border gap-3 mb-4">
              <div>
                <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-solar-amber" />
                  <span>Actual vs. 1-Hour Forecast vs. Persistence Baseline ({selectedDate})</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Target: GHI(t+4) • Predictor features measured at time t (1-hour lookahead)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-surface-subtle px-3 py-1.5 rounded-lg border border-surface-border hover:border-slate-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={showPersistence}
                    onChange={(e) => setShowPersistence(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/20 bg-surface-card"
                  />
                  <span>Show Persistence Baseline (GHI at time t)</span>
                </label>
              </div>
            </div>

            {!predictions.length ? (
              <EmptyState message={`No predictions found for ${selectedDate}. Select a date in the holdout period.`} />
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={predictions} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
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
                    <Tooltip content={<ForecastTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                    {/* Actual GHI */}
                    <Line
                      type="monotone"
                      dataKey="actual_ghi"
                      name="Actual GHI (Observed)"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      dot={false}
                    />

                    {/* Predicted GHI */}
                    <Line
                      type="monotone"
                      dataKey="predicted_ghi"
                      name="Random Forest Forecast (1h Ahead)"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={false}
                    />

                    {/* Persistence Baseline */}
                    {showPersistence && (
                      <Line
                        type="monotone"
                        dataKey="persistence_ghi"
                        name="Persistence Baseline (GHI at t)"
                        stroke="#38BDF8"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        dot={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Grid: City-Wise Comparison & Feature Importance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* City-Wise Comparison Table */}
            <div className="bg-surface-card border border-surface-border rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="border-b border-surface-border pb-3 mb-3">
                  <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                    <Layers className="h-4 w-4 text-solar-amber" />
                    City-Wise Holdout Benchmark (RF vs. Persistence)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Exact holdout metrics exported from Colab experiment across all 3 cities
                  </p>
                </div>

                <div className="overflow-x-auto border border-surface-border rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface text-slate-400 border-b border-surface-border font-medium">
                      <tr>
                        <th className="py-2.5 px-3">City</th>
                        <th className="py-2.5 px-3">Test Rows</th>
                        <th className="py-2.5 px-3">RF MAE</th>
                        <th className="py-2.5 px-3">Pers. MAE</th>
                        <th className="py-2.5 px-3">RF R²</th>
                        <th className="py-2.5 px-3">Pers. R²</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border font-mono text-slate-300">
                      {cityMetrics.map((c) => (
                        <tr 
                          key={c.location} 
                          className={`hover:bg-surface-hover/50 ${
                            c.location.toLowerCase() === selectedLocation.toLowerCase()
                              ? 'bg-amber-500/10 font-semibold'
                              : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-sans text-slate-200">{c.location}</td>
                          <td className="py-2.5 px-3">{c.observations.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-solar-amber">{c.rf_mae.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-slate-400">{c.persistence_mae.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-emerald-400">{c.rf_r2.toFixed(3)}</td>
                          <td className="py-2.5 px-3 text-slate-400">{c.persistence_r2.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pt-3 border-t border-surface-border/60">
                * Random Forest consistently cuts prediction error by &gt;75% compared to simple persistence across all three climatic zones.
              </div>
            </div>

            {/* Feature Importance Chart */}
            <div className="bg-surface-card border border-surface-border rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="border-b border-surface-border pb-3 mb-3">
                  <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-solar-yellow" />
                    Top Feature Importances (Gini Importance)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Contribution of predictors in the trained Random Forest model
                  </p>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={featureImportance.slice(0, 6)} 
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                      <XAxis type="number" stroke="#64748B" tick={{ fontSize: 10 }} unit="%" />
                      <YAxis 
                        type="category" 
                        dataKey="feature" 
                        stroke="#94A3B8" 
                        tick={{ fontSize: 11 }} 
                        width={90}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload as FeatureImportanceItem;
                            return (
                              <div className="bg-surface-card border border-surface-border p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                                <p className="font-semibold text-slate-200 font-mono">{data.feature}</p>
                                <p className="text-solar-amber">Importance: {data.percentage}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="percentage" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pt-3 border-t border-surface-border/60">
                * Current GHI (79.0%) and solar zenith geometry (17.3%) represent 96% of predictive power for 1-hour horizon.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
