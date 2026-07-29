import type { Route, FlightData } from '../types/telemetry';

interface Props {
  route: Route;
  current: FlightData;
  trail?: FlightData[];
}

const PADDING = 34;
const WIDTH = 480;
const HEIGHT = 320;

export function RouteMap({ route, current, trail = [] }: Props) {
  const lats = route.waypoints.map((w) => w.lat);
  const lons = route.waypoints.map((w) => w.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const project = (lat: number, lon: number) => {
    const x = PADDING + ((lon - minLon) / (maxLon - minLon || 1)) * (WIDTH - 2 * PADDING);
    const y = HEIGHT - PADDING - ((lat - minLat) / (maxLat - minLat || 1)) * (HEIGHT - 2 * PADDING);
    return [x, y];
  };

  const points = route.waypoints.map((w) => project(w.lat, w.lon));
  const [acX, acY] = project(current.lat, current.lon);
  const trailPoints = trail.map((t) => project(t.lat, t.lon));

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height="100%"
      className="route-map"
      role="img"
      aria-label="Route map"
    >
      <defs>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1c2530" strokeWidth={1} />
        </pattern>
      </defs>
      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="url(#grid)" />

      <polyline
        points={points.map((p) => p.join(',')).join(' ')}
        fill="none"
        stroke="#2f6f4f"
        strokeWidth={2}
        strokeDasharray="6 4"
      />

      {trailPoints.length > 1 && (
        <polyline
          points={trailPoints.map((p) => p.join(',')).join(' ')}
          fill="none"
          stroke="#ffd166"
          strokeWidth={1.5}
          opacity={0.5}
        />
      )}

      {route.waypoints.map((w, i) => {
        const [x, y] = points[i];
        return (
          <g key={w.name}>
            <circle cx={x} cy={y} r={5} fill="#57b894" />
            <text x={x + 8} y={y + 4} fill="#9fb8ac" fontSize={11}>
              {w.name}
            </text>
          </g>
        );
      })}

      <g transform={`translate(${acX}, ${acY}) rotate(${current.headingDeg})`}>
        <circle r={12} fill="none" stroke="#ffd166" strokeWidth={1} opacity={0.4} />
        <polygon points="0,-9 6,7 0,3 -6,7" fill="#ffd166" stroke="#402d00" strokeWidth={1} />
      </g>
    </svg>
  );
}
