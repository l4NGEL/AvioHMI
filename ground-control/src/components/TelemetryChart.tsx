import type { FlightData } from '../types/telemetry';

interface Props {
  history: FlightData[];
}

const WIDTH = 460;
const HEIGHT = 130;
const PADDING = 20;
const MAX_POINTS = 40;

export function TelemetryChart({ history }: Props) {
  const recent = history.slice(-MAX_POINTS);

  if (recent.length < 2) {
    return (
      <div className="telemetry-chart-card">
        <h3>Altitude / Speed</h3>
        <div className="chart-empty">Gathering data…</div>
      </div>
    );
  }

  const altitudes = recent.map((d) => d.altitudeMeters);
  const speeds = recent.map((d) => d.speedKts);
  const minAlt = Math.min(...altitudes);
  const maxAlt = Math.max(...altitudes);
  const minSpd = Math.min(...speeds);
  const maxSpd = Math.max(...speeds);

  const xFor = (i: number) => PADDING + (i / (recent.length - 1)) * (WIDTH - 2 * PADDING);
  const yForAlt = (v: number) => HEIGHT - PADDING - ((v - minAlt) / (maxAlt - minAlt || 1)) * (HEIGHT - 2 * PADDING);
  const yForSpd = (v: number) => HEIGHT - PADDING - ((v - minSpd) / (maxSpd - minSpd || 1)) * (HEIGHT - 2 * PADDING);

  const altPoints = recent.map((d, i) => `${xFor(i)},${yForAlt(d.altitudeMeters)}`).join(' ');
  const spdPoints = recent.map((d, i) => `${xFor(i)},${yForSpd(d.speedKts)}`).join(' ');

  return (
    <div className="telemetry-chart-card">
      <h3>
        Altitude / Speed <span className="chart-legend-alt">■ ALT</span> <span className="chart-legend-spd">■ SPD</span>
      </h3>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} className="telemetry-chart">
        <polyline points={altPoints} fill="none" stroke="#57b894" strokeWidth={2} />
        <polyline points={spdPoints} fill="none" stroke="#ffd166" strokeWidth={2} />
      </svg>
    </div>
  );
}
