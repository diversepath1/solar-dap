import React, { useState } from 'react';
import type { NavTab, LocationId } from './types';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewPage } from './components/pages/OverviewPage';
import { SolarAnalyticsPage } from './components/pages/SolarAnalyticsPage';
import { ForecastingPage } from './components/pages/ForecastingPage';
import { AnomalyMonitoringPage } from './components/pages/AnomalyMonitoringPage';
import { ModelInsightsPage } from './components/pages/ModelInsightsPage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [selectedLocation, setSelectedLocation] = useState<LocationId>('Delhi');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedDate] = useState('2025-06-03');

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return <OverviewPage selectedLocation={selectedLocation} />;
      case 'analytics':
        return <SolarAnalyticsPage selectedLocation={selectedLocation} />;
      case 'forecasting':
        return <ForecastingPage selectedLocation={selectedLocation} />;
      case 'anomalies':
        return <AnomalyMonitoringPage selectedLocation={selectedLocation} />;
      case 'insights':
        return <ModelInsightsPage selectedLocation={selectedLocation} />;
      default:
        return <OverviewPage selectedLocation={selectedLocation} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-slate-100">
      {/* Collapsible Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          selectedDate={selectedDate}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>

        {/* Platform Footer */}
        <footer className="h-10 border-t border-surface-border bg-surface px-6 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-3">
            <span>SOLAR DAP v0.1.0</span>
            <span>•</span>
            <span>Solcast 15-min Solar Radiation Dataset</span>
            <span>•</span>
            <span className="text-amber-500/80">Delhi • Raipur • Jaisalmer</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Timestamps in IST (+05:30)</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
