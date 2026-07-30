import { useNavigate } from 'react-router-dom';
import { useTelemetry } from '../context/TelemetryContext';
import { KpiCard } from '../components/KpiCard';
import { DonutChart, type DonutSegment } from '../components/DonutChart';
import { TelemetryChart } from '../components/TelemetryChart';
import { PlaneIcon, AlertIcon, FuelIcon, SpeedIcon } from '../components/icons';

const TREND_LOOKBACK_TICKS = 10;

export default function DashboardPage() {
  const { aircraftIds, aircraftSummaries, histories, activeAlerts, alertLog, selectedHistory, setSelectedAircraftId } =
    useTelemetry();
  const navigate = useNavigate();

  const fleetSize = aircraftIds.length;
  const avgFuel = aircraftSummaries.length
    ? aircraftSummaries.reduce((sum, a) => sum + a.fuelPercent, 0) / aircraftSummaries.length
    : 0;
  const avgSpeed = aircraftSummaries.length
    ? aircraftSummaries.reduce((sum, a) => sum + a.speedKts, 0) / aircraftSummaries.length
    : 0;

  const avgFuelPrev = aircraftIds.length
    ? aircraftIds.reduce((sum, id) => {
        const h = histories[id];
        const idx = Math.max(0, h.length - 1 - TREND_LOOKBACK_TICKS);
        return sum + (h[idx]?.fuelPercent ?? h[h.length - 1].fuelPercent);
      }, 0) / aircraftIds.length
    : 0;
  const fuelDelta = avgFuel - avgFuelPrev;

  const alertKindByAircraft = new Map<string, string>();
  activeAlerts.forEach((a) => {
    if (!alertKindByAircraft.has(a.aircraftId)) alertKindByAircraft.set(a.aircraftId, a.kind);
  });
  const categoryCounts = { NOMINAL: 0, OVERSPEED: 0, OFF_COURSE: 0, LOW_FUEL: 0 };
  aircraftIds.forEach((id) => {
    const kind = alertKindByAircraft.get(id);
    if (kind === 'OVERSPEED') categoryCounts.OVERSPEED++;
    else if (kind === 'OFF_COURSE') categoryCounts.OFF_COURSE++;
    else if (kind === 'LOW_FUEL') categoryCounts.LOW_FUEL++;
    else categoryCounts.NOMINAL++;
  });

  const donutSegments: DonutSegment[] = [
    { label: 'Nominal', value: categoryCounts.NOMINAL, color: '#57b894' },
    { label: 'Overspeed', value: categoryCounts.OVERSPEED, color: '#ff5a5a' },
    { label: 'Off course', value: categoryCounts.OFF_COURSE, color: '#e0a458' },
    { label: 'Low fuel', value: categoryCounts.LOW_FUEL, color: '#ffd166' },
  ];
  const donutTotal = fleetSize || 1;

  function goToAircraft(aircraftId: string) {
    setSelectedAircraftId(aircraftId);
    navigate('/fleet');
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">Fleet overview and recent activity</p>
      </div>

      <div className="kpi-grid">
        <KpiCard
          icon={<PlaneIcon stroke="#fff" />}
          iconColor="#3b6ef0"
          value={String(fleetSize)}
          label="Aircraft Tracked"
        />
        <KpiCard
          icon={<AlertIcon stroke="#fff" />}
          iconColor={activeAlerts.length > 0 ? '#d9534f' : '#57b894'}
          value={String(activeAlerts.length)}
          label="Active Alerts"
          trend={activeAlerts.length > 0 ? 'Attention needed' : 'All nominal'}
          trendDirection={activeAlerts.length > 0 ? 'down' : 'up'}
        />
        <KpiCard
          icon={<FuelIcon stroke="#fff" />}
          iconColor="#8a5cf6"
          value={`${avgFuel.toFixed(0)}%`}
          label="Avg Fleet Fuel"
          trend={`${fuelDelta >= 0 ? '+' : ''}${fuelDelta.toFixed(1)}pt`}
          trendDirection={fuelDelta >= 0 ? 'up' : 'down'}
        />
        <KpiCard
          icon={<SpeedIcon stroke="#fff" />}
          iconColor="#2fa8a3"
          value={`${avgSpeed.toFixed(0)} kt`}
          label="Avg Fleet Speed"
        />
      </div>

      <div className="dashboard-mid-row">
        <div className="card chart-card-wide">
          <TelemetryChart history={selectedHistory.map((t) => t.data)} />
        </div>
        <div className="card donut-card">
          <h3 className="section-title">Fleet Status</h3>
          <p className="card-subtitle">By aircraft</p>
          <div className="donut-row">
            <DonutChart segments={donutSegments} />
            <ul className="donut-legend">
              {donutSegments.map((s) => (
                <li key={s.label}>
                  <span className="legend-dot" style={{ background: s.color }} />
                  <span className="legend-label">{s.label}</span>
                  <span className="legend-value">{Math.round((s.value / donutTotal) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="dashboard-bottom-row">
        <div className="card">
          <div className="card-header-row">
            <h3 className="section-title">Recent Alerts</h3>
            <button className="link-button" onClick={() => navigate('/alerts')}>
              See all →
            </button>
          </div>
          {alertLog.length === 0 ? (
            <p className="empty-hint">No alerts logged yet</p>
          ) : (
            <ul className="simple-list">
              {alertLog.slice(0, 5).map((entry, i) => (
                <li key={i}>
                  <span className="simple-list-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  <span>{entry.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="card-header-row">
            <h3 className="section-title">Fleet Snapshot</h3>
            <button className="link-button" onClick={() => navigate('/fleet')}>
              Open map →
            </button>
          </div>
          <ul className="simple-list">
            {aircraftSummaries.map((a) => (
              <li key={a.aircraftId} className="clickable" onClick={() => goToAircraft(a.aircraftId)}>
                <span className="simple-list-callsign">{a.callsign}</span>
                <span>
                  {a.speedKts.toFixed(0)}kt · {a.altitudeMeters.toFixed(0)}m · fuel {a.fuelPercent.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
