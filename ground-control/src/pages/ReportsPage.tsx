import { useTelemetry } from '../context/TelemetryContext';
import { haversineKm } from '../lib/geo';

const TICK_SECONDS = 0.5;

export default function ReportsPage() {
  const { aircraftIds, histories, alertLog } = useTelemetry();

  const rows = aircraftIds.map((id) => {
    const history = histories[id];
    const latest = history[history.length - 1];

    let distanceKm = 0;
    for (let i = 1; i < history.length; i++) {
      distanceKm += haversineKm(history[i - 1].data, history[i].data);
    }

    const flightSeconds = history.length * TICK_SECONDS;
    const alertCount = alertLog.filter((a) => a.aircraftId === id).length;

    return {
      aircraftId: id,
      callsign: latest.callsign,
      distanceKm,
      flightMinutes: flightSeconds / 60,
      samples: history.length,
      alertCount,
    };
  });

  const totalDistance = rows.reduce((sum, r) => sum + r.distanceKm, 0);
  const totalAlerts = alertLog.length;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Reports</h1>
        <p className="page-subtitle">Aggregate stats computed from this session's telemetry history</p>
      </div>

      <div className="kpi-grid kpi-grid-compact">
        <div className="card report-stat">
          <div className="kpi-value">{totalDistance.toFixed(0)} km</div>
          <div className="kpi-label">Total distance tracked (session)</div>
        </div>
        <div className="card report-stat">
          <div className="kpi-value">{totalAlerts}</div>
          <div className="kpi-label">Total alerts logged (session)</div>
        </div>
        <div className="card report-stat">
          <div className="kpi-value">{rows.length}</div>
          <div className="kpi-label">Aircraft observed</div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Per-aircraft breakdown</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Callsign</th>
              <th>Distance tracked</th>
              <th>Time tracked</th>
              <th>Samples</th>
              <th>Alerts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.aircraftId}>
                <td>{r.callsign}</td>
                <td>{r.distanceKm.toFixed(1)} km</td>
                <td>{r.flightMinutes.toFixed(1)} min</td>
                <td>{r.samples}</td>
                <td>{r.alertCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
