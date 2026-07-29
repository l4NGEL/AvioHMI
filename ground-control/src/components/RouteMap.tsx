import type { Route, FlightData, Waypoint } from '../types/telemetry';
import { TURKEY_COASTLINE } from '../data/turkeyCoastline';

export interface AircraftMarker {
  aircraftId: string;
  callsign: string;
  data: FlightData;
}

interface Props {
  route: Route;
  aircraftList: AircraftMarker[];
  selectedAircraftId?: string | null;
  trail?: FlightData[];
  onWaypointClick?: (waypoint: Waypoint) => void;
  onAircraftClick?: (aircraftId: string) => void;
}

const PADDING = 24;
const WIDTH = 480;
const HEIGHT = 320;

export function RouteMap({ route, aircraftList, selectedAircraftId, trail = [], onWaypointClick, onAircraftClick }: Props) {
  const lats = [...route.waypoints.map((w) => w.lat), ...TURKEY_COASTLINE.map((p) => p.lat)];
  const lons = [...route.waypoints.map((w) => w.lon), ...TURKEY_COASTLINE.map((p) => p.lon)];
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const project = (lat: number, lon: number) => {
    const x = PADDING + ((lon - minLon) / (maxLon - minLon || 1)) * (WIDTH - 2 * PADDING);
    const y = HEIGHT - PADDING - ((lat - minLat) / (maxLat - minLat || 1)) * (HEIGHT - 2 * PADDING);
    return [x, y];
  };

  const routePoints = route.waypoints.map((w) => project(w.lat, w.lon));
  const coastlinePoints = TURKEY_COASTLINE.map((p) => project(p.lat, p.lon));
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

      <polygon
        points={coastlinePoints.map((p) => p.join(',')).join(' ')}
        fill="#141d29"
        stroke="#2a3d52"
        strokeWidth={1.5}
      />

      <polyline
        points={routePoints.map((p) => p.join(',')).join(' ')}
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
        const [x, y] = routePoints[i];
        return (
          <g
            key={w.name}
            onClick={() => onWaypointClick?.(w)}
            style={{ cursor: onWaypointClick ? 'pointer' : 'default' }}
          >
            <circle cx={x} cy={y} r={6} fill="#57b894" />
            <text x={x + 8} y={y + 4} fill="#9fb8ac" fontSize={11}>
              {w.name}
            </text>
          </g>
        );
      })}

      {aircraftList.map((a) => {
        const [x, y] = project(a.data.lat, a.data.lon);
        const isSelected = a.aircraftId === selectedAircraftId;
        return (
          <g
            key={a.aircraftId}
            transform={`translate(${x}, ${y}) rotate(${a.data.headingDeg})`}
            onClick={() => onAircraftClick?.(a.aircraftId)}
            style={{ cursor: onAircraftClick ? 'pointer' : 'default' }}
          >
            {isSelected && <circle r={12} fill="none" stroke="#ffd166" strokeWidth={1} opacity={0.5} />}
            <polygon points="0,-9 6,7 0,3 -6,7" fill={isSelected ? '#ffd166' : '#8fa6ba'} stroke="#12161c" strokeWidth={1} />
          </g>
        );
      })}
    </svg>
  );
}
