import type { TelemetryTick } from '../types/telemetry';

interface Props {
  tick: TelemetryTick;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

export function TelemetryPanel({ tick }: Props) {
  const { data, callsign, nextWaypoint, distanceToNextKm, etaMinutes } = tick;
  return (
    <div className="telemetry-panel">
      <h2>{callsign}</h2>
      <div className="stat-grid">
        <Stat label="Speed" value={`${data.speedKts.toFixed(0)} kt`} />
        <Stat label="Altitude" value={`${data.altitudeMeters.toFixed(0)} m`} />
        <Stat label="Heading" value={`${data.headingDeg.toFixed(0)}°`} />
        <Stat label="Position" value={`${data.lat.toFixed(3)}, ${data.lon.toFixed(3)}`} />
      </div>
      <div className="next-waypoint">
        Next: <strong>{nextWaypoint.name}</strong> · {distanceToNextKm.toFixed(1)} km · ETA{' '}
        {Number.isFinite(etaMinutes) ? `${etaMinutes.toFixed(1)} min` : '—'}
      </div>
    </div>
  );
}
