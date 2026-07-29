import type { TelemetryTick } from '../types/telemetry';

interface Props {
  ticks: TelemetryTick[];
}

export function MissionLog({ ticks }: Props) {
  const recent = ticks.slice(-8).reverse();
  return (
    <div className="mission-log">
      <h3>Mission Log</h3>
      <ul>
        {recent.map((tick) => (
          <li key={tick.data.timestamp}>
            <span className="log-time">{new Date(tick.data.timestamp).toLocaleTimeString()}</span>
            <span>
              {tick.data.lat.toFixed(3)}, {tick.data.lon.toFixed(3)} · {tick.data.speedKts.toFixed(0)}kt · alt{' '}
              {tick.data.altitudeMeters.toFixed(0)}m
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
