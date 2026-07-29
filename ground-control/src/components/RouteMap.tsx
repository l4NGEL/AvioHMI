import type { Route, FlightData } from '../types/telemetry';

interface Props {
  route: Route;
  current: FlightData;
}

const PADDING = 30;
const WIDTH = 480;
const HEIGHT = 300;

export function RouteMap({ route, current }: Props) {
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

  return (
    <svg width={WIDTH} height={HEIGHT} className="route-map" role="img" aria-label="Route map">
      <polyline
        points={points.map((p) => p.join(',')).join(' ')}
        fill="none"
        stroke="#2f6f4f"
        strokeWidth={2}
        strokeDasharray="6 4"
      />
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
        <polygon points="0,-9 6,7 0,3 -6,7" fill="#ffd166" stroke="#402d00" strokeWidth={1} />
      </g>
    </svg>
  );
}
