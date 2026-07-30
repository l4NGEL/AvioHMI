import { Routes, Route } from 'react-router-dom';
import { TelemetryProvider } from './context/TelemetryContext';
import { AppLayout } from './layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import FleetPage from './pages/FleetPage';
import PlaybackPage from './pages/PlaybackPage';
import AlertsPage from './pages/AlertsPage';
import SensorFeedPage from './pages/SensorFeedPage';
import ArViewPage from './pages/ArViewPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import './index.css';

function App() {
  return (
    <TelemetryProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/fleet" element={<FleetPage />} />
          <Route path="/playback" element={<PlaybackPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/sensor-feed" element={<SensorFeedPage />} />
          <Route path="/ar-view" element={<ArViewPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </TelemetryProvider>
  );
}

export default App;
