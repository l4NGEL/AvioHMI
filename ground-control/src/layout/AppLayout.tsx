import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useTelemetry } from '../context/TelemetryContext';

export function AppLayout() {
  const { selectedLatest } = useTelemetry();

  return (
    <div className="shell">
      <Sidebar />
      <div className="shell-main">
        <Topbar />
        <div className="shell-content">
          {!selectedLatest ? (
            <div className="app-loading">Connecting to Mission Computer Core…</div>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
}
