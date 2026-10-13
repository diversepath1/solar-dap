import React from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ElementType;
  helperText?: string;
  badge?: string;
  accent?: 'amber' | 'yellow' | 'lime' | 'sky' | 'slate';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  icon: Icon,
  helperText,
  badge,
  accent = 'amber',
}) => {
  const accentStyles = {
    amber: 'text-solar-amber bg-amber-500/10 border-amber-500/20',
    yellow: 'text-solar-yellow bg-yellow-500/10 border-yellow-500/20',
    lime: 'text-solar-lime bg-lime-500/10 border-lime-500/20',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    slate: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  };

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5 hover:border-surface-hover transition-colors flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <div className={`p-2 rounded-lg border ${accentStyles[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-2xl font-bold tracking-tight text-white font-mono">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-medium text-slate-400">
            {unit}
          </span>
        )}
      </div>

      {(helperText || badge) && (
        <div className="flex items-center justify-between pt-2 border-t border-surface-border/60 text-xs text-slate-400">
          <span>{helperText}</span>
          {badge && (
            <span className="px-1.5 py-0.5 rounded bg-surface-subtle text-[11px] font-mono text-slate-300">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
