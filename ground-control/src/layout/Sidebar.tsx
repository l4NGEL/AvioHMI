import { NavLink } from 'react-router-dom';
import {
  GridIcon,
  PlaneIcon,
  HistoryIcon,
  AlertIcon,
  CameraIcon,
  LayersIcon,
  VrIcon,
  ReportIcon,
  SettingsIcon,
} from '../components/icons';
import { useTelemetry } from '../context/TelemetryContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: GridIcon, end: true },
  { to: '/fleet', label: 'Fleet & Map', icon: PlaneIcon, end: false },
  { to: '/playback', label: 'Playback', icon: HistoryIcon, end: false },
  { to: '/alerts', label: 'Alerts', icon: AlertIcon, end: false },
  { to: '/sensor-feed', label: 'Sensor Feed', icon: CameraIcon, end: false },
  { to: '/ar-view', label: 'AR View', icon: LayersIcon, end: false },
  { to: '/vr-view', label: 'VR View', icon: VrIcon, end: false },
  { to: '/reports', label: 'Reports', icon: ReportIcon, end: false },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false },
] as const;

export function Sidebar() {
  const { activeAlerts } = useTelemetry();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon">◈</span>
        <span className="sidebar-brand-name">AvioHMI</span>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <Icon className="sidebar-link-icon" />
              <span>{item.label}</span>
              {item.to === '/alerts' && activeAlerts.length > 0 && (
                <span className="sidebar-badge">{activeAlerts.length}</span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
