import { useTelemetry } from '../context/TelemetryContext';

const SESSION_KEY = 'aviohmi.demoAuthenticated';

export default function SettingsPage() {
  const { usingLive } = useTelemetry();

  function handleSignOut() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.reload();
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="page-subtitle">Connection info and session</p>
      </div>

      <div className="card">
        <h3 className="section-title">Connection</h3>
        <div className="settings-row">
          <span>Telemetry WebSocket</span>
          <span className="mono">ws://localhost:8765</span>
        </div>
        <div className="settings-row">
          <span>History / Sensor Feed HTTP</span>
          <span className="mono">http://localhost:8766</span>
        </div>
        <div className="settings-row">
          <span>Status</span>
          <span className={usingLive ? 'status-live' : 'status-demo'}>
            {usingLive ? '● LIVE — connected to Core' : '● OFFLINE PREVIEW — local simulator'}
          </span>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Session</h3>
        <p className="empty-hint">
          Signed in as <strong>operator</strong>. This login is a UX-only demo gate (fixed credentials, no backend
          check, no session token) — see the README's security note.
        </p>
        <button className="danger-button" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
