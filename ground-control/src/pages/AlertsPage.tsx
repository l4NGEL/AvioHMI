import { useTelemetry } from '../context/TelemetryContext';

export default function AlertsPage() {
  const { activeAlerts, alertLog } = useTelemetry();

  return (
    <div className="page">
      <div className="page-header">
        <h1>Alerts</h1>
        <p className="page-subtitle">Live warnings and a rolling history of everything that has fired</p>
      </div>

      <div className="card">
        <h3 className="section-title">Active Now ({activeAlerts.length})</h3>
        {activeAlerts.length === 0 ? (
          <p className="empty-hint">No active alerts — fleet is nominal.</p>
        ) : (
          <div className="alert-banner">
            {activeAlerts.map((a, i) => (
              <span key={i} className={`alert-chip alert-${a.kind.toLowerCase()}`}>
                {a.message}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="section-title">History ({alertLog.length})</h3>
        {alertLog.length === 0 ? (
          <p className="empty-hint">No alerts logged yet this session.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Aircraft</th>
                <th>Type</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {alertLog.map((entry, i) => (
                <tr key={i}>
                  <td>{new Date(entry.timestamp).toLocaleTimeString()}</td>
                  <td>{entry.callsign}</td>
                  <td>
                    <span className={`alert-chip alert-${entry.kind.toLowerCase()}`}>{entry.kind.replace('_', ' ')}</span>
                  </td>
                  <td>{entry.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
