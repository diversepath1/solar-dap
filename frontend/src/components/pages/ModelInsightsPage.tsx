import React from 'react';
import { Cpu } from 'lucide-react';
import type { LocationId } from '../../types';

interface ModelInsightsPageProps {
  selectedLocation: LocationId;
}

export const ModelInsightsPage: React.FC<ModelInsightsPageProps> = ({ selectedLocation: _selectedLocation }) => {
  return (
    <div className="space-y-6">
      <div className="bg-surface-card border border-surface-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Model Insights & Evaluation</h1>
            <p className="text-xs text-slate-400">
              Evaluation metrics, error distribution across irradiance bands, and feature importance
            </p>
          </div>
        </div>

        {/* Existing Baseline Metrics Summary (From EDA/ML phase) */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface p-4 rounded-lg border border-surface-border">
            <span className="text-xs text-slate-400 font-medium">Contemporaneous RF R²</span>
            <div className="text-2xl font-bold text-white font-mono mt-1">0.967</div>
            <span className="text-[11px] text-emerald-400">vs Dummy Baseline (-0.028)</span>
          </div>
          <div className="bg-surface p-4 rounded-lg border border-surface-border">
            <span className="text-xs text-slate-400 font-medium">Contemporaneous MAE</span>
            <div className="text-2xl font-bold text-white font-mono mt-1">23.64 <span className="text-xs font-normal text-slate-400">W/m²</span></div>
            <span className="text-[11px] text-slate-400">Baseline MAE: 228.40 W/m²</span>
          </div>
          <div className="bg-surface p-4 rounded-lg border border-surface-border">
            <span className="text-xs text-slate-400 font-medium">Contemporaneous RMSE</span>
            <div className="text-2xl font-bold text-white font-mono mt-1">44.95 <span className="text-xs font-normal text-slate-400">W/m²</span></div>
            <span className="text-[11px] text-slate-400">Baseline RMSE: 252.02 W/m²</span>
          </div>
        </div>

        {/* Error Band Table from Context */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">Contemporaneous Model Error by GHI Band</h3>
          <div className="overflow-x-auto border border-surface-border rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface text-slate-400 border-b border-surface-border font-medium">
                <tr>
                  <th className="py-2.5 px-4">Actual GHI Band</th>
                  <th className="py-2.5 px-4">Mean Error (Pred - Actual)</th>
                  <th className="py-2.5 px-4">MAE (W/m²)</th>
                  <th className="py-2.5 px-4 text-right">Observation Count</th>
                </tr>
              </thead>
              <tbody className="divide-y border-surface-border font-mono text-slate-300">
                <tr className="hover:bg-surface-hover/50">
                  <td className="py-2 px-4 font-sans text-slate-200">0–50 W/m²</td>
                  <td className="py-2 px-4 text-emerald-400">+1.96</td>
                  <td className="py-2 px-4">2.72</td>
                  <td className="py-2 px-4 text-right">12,486</td>
                </tr>
                <tr className="hover:bg-surface-hover/50">
                  <td className="py-2 px-4 font-sans text-slate-200">50–200 W/m²</td>
                  <td className="py-2 px-4 text-amber-400">+26.50</td>
                  <td className="py-2 px-4">49.21</td>
                  <td className="py-2 px-4 text-right">1,721</td>
                </tr>
                <tr className="hover:bg-surface-hover/50">
                  <td className="py-2 px-4 font-sans text-slate-200">200–400 W/m²</td>
                  <td className="py-2 px-4 text-amber-400">+35.86</td>
                  <td className="py-2 px-4">60.52</td>
                  <td className="py-2 px-4 text-right">1,993</td>
                </tr>
                <tr className="hover:bg-surface-hover/50">
                  <td className="py-2 px-4 font-sans text-slate-200">400–600 W/m²</td>
                  <td className="py-2 px-4 text-rose-400">+48.38</td>
                  <td className="py-2 px-4">66.03</td>
                  <td className="py-2 px-4 text-right">2,486</td>
                </tr>
                <tr className="hover:bg-surface-hover/50">
                  <td className="py-2 px-4 font-sans text-slate-200">600+ W/m²</td>
                  <td className="py-2 px-4 text-amber-400">+23.10</td>
                  <td className="py-2 px-4">40.39</td>
                  <td className="py-2 px-4 text-right">2,282</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            * Note: Overprediction bias is observed in daylight intervals above 50 W/m². To be investigated with future forecasting models.
          </p>
        </div>
      </div>
    </div>
  );
};
