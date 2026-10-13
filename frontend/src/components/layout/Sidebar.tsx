import React from 'react';
import { 
  Sun, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Cpu, 
  ChevronLeft, 
  ChevronRight,
  Layers
} from 'lucide-react';
import type { NavTab } from '../../types';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: Sun },
  { id: 'analytics', label: 'Solar Analytics', icon: BarChart3 },
  { id: 'forecasting', label: 'Forecasting', icon: TrendingUp, badge: 'ML' },
  { id: 'anomalies', label: 'Anomaly Monitoring', icon: AlertTriangle },
  { id: 'insights', label: 'Model Insights', icon: Cpu },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
}) => {
  return (
    <aside
      className={`relative flex flex-col border-r border-surface-border bg-surface transition-all duration-300 ease-in-out z-20 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-surface-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-solar-amber">
            <Sun className="h-5 w-5 text-solar-amber animate-pulse" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                SOLAR <span className="text-solar-amber">DAP</span>
              </span>
              <span className="text-[11px] font-medium text-slate-400 truncate">
                Irradiance Analytics
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1.5">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {!collapsed ? 'Modules' : '•••'}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-amber-500/15 text-solar-amber border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-card border border-transparent'
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-solar-amber' : 'text-slate-400'}`} />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-surface-subtle text-amber-400 border border-amber-500/20">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Dataset Metadata Box */}
      {!collapsed && (
        <div className="p-3 mx-3 mb-3 rounded-lg bg-surface-card border border-surface-border text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-semibold mb-1">
            <Layers className="h-3.5 w-3.5 text-solar-amber" />
            <span>Solcast Data Scope</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            104,832 records across Delhi, Raipur, and Jaisalmer. 15-minute sampling frequency.
          </p>
        </div>
      )}

      {/* Collapse Toggle Button */}
      <div className="p-3 border-t border-surface-border flex justify-end">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-surface-card transition-colors w-full flex items-center justify-center gap-2"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs text-slate-400">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
