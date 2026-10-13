import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { LocationId } from '../../types';
import { LOCATIONS } from '../../data/sampleSolarData';
import { api } from '../../api/client';

interface HeaderProps {
  selectedLocation: LocationId;
  onLocationChange: (loc: LocationId) => void;
  selectedDate: string;
}

export const Header: React.FC<HeaderProps> = ({
  selectedLocation,
  onLocationChange,
  selectedDate,
}) => {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const meta = LOCATIONS[selectedLocation];

  useEffect(() => {
    let mounted = true;
    api.getHealth()
      .then((res) => {
        if (mounted) {
          setBackendOnline(res.status === 'ok');
        }
      })
      .catch(() => {
        if (mounted) {
          setBackendOnline(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header className="h-16 border-b border-surface-border bg-surface px-6 flex items-center justify-between sticky top-0 z-10">
      {/* Location Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-surface-card border border-surface-border rounded-lg p-1">
          {(Object.keys(LOCATIONS) as LocationId[]).map((loc) => {
            const isSelected = selectedLocation === loc;
            return (
              <button
                key={loc}
                onClick={() => onLocationChange(loc)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-solar-amber text-slate-950 font-semibold shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
                }`}
              >
                {loc}
              </button>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
          <MapPin className="h-3.5 w-3.5 text-solar-amber" />
          <span>{meta.coordinates}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 font-medium">{meta.climateZone}</span>
        </div>
      </div>

      {/* Right side status indicators */}
      <div className="flex items-center gap-3">
        {/* Backend API Connection Status Badge */}
        {backendOnline === true ? (
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium"
            title="Connected to FastAPI backend at http://localhost:8000"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>FastAPI Connected</span>
          </div>
        ) : backendOnline === false ? (
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium"
            title="Cannot reach FastAPI at http://localhost:8000. Ensure uvicorn is running."
          >
            <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
            <span>API Offline</span>
          </div>
        ) : (
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-solar-amber text-xs font-medium"
            title="Checking FastAPI backend status..."
          >
            <span className="w-2 h-2 rounded-full bg-solar-amber animate-pulse" />
            <span>Connecting...</span>
          </div>
        )}

        {/* Date Selector Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card border border-surface-border text-xs text-slate-300">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span>{selectedDate}</span>
        </div>

        {/* Timezone Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card border border-surface-border text-xs text-slate-400">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>IST (+05:30)</span>
        </div>
      </div>
    </header>
  );
};
