import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Route, FlightData, Waypoint } from '../types/telemetry';

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
  onAircraftClick?: (aircraftId: string) => void;
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function aircraftIcon(headingDeg: number, selected: boolean) {
  const color = selected ? '#ffd166' : '#8fa6ba';
  const ring = selected
    ? '<circle r="13" fill="none" stroke="#ffd166" stroke-width="1.5" opacity="0.55" />'
    : '';
  return L.divIcon({
    className: 'aircraft-divicon',
    html: `<svg width="30" height="30" viewBox="-15 -15 30 30">
      <g transform="rotate(${headingDeg})">
        ${ring}
        <polygon points="0,-9 6,7 0,3 -6,7" fill="${color}" stroke="#12161c" stroke-width="1.3" />
      </g>
    </svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

/** Fits the map to the route once, so it always opens centered on the mission area. */
function FitRouteBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [40, 40] });
    }
    // Intentionally only re-fit if the number of waypoints changes, not on every position update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions.length]);
  return null;
}

export function RouteMap({ route, aircraftList, selectedAircraftId, trail = [], onAircraftClick }: Props) {
  const routeLatLngs: [number, number][] = route.waypoints.map((w) => [w.lat, w.lon]);
  const trailLatLngs: [number, number][] = trail.map((t) => [t.lat, t.lon]);

  return (
    <MapContainer
      center={[38.5, 29]}
      zoom={6}
      className="route-map-leaflet"
      zoomControl={true}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} subdomains="abcd" maxZoom={19} />
      <FitRouteBounds positions={routeLatLngs} />

      <Polyline positions={routeLatLngs} pathOptions={{ color: '#2f6f4f', weight: 2, dashArray: '6 6' }} />

      {trailLatLngs.length > 1 && (
        <Polyline positions={trailLatLngs} pathOptions={{ color: '#ffd166', weight: 2.5, opacity: 0.65 }} />
      )}

      {route.waypoints.map((w: Waypoint) => (
        <CircleMarker
          key={w.name}
          center={[w.lat, w.lon]}
          radius={6}
          pathOptions={{ color: '#12161c', weight: 1.5, fillColor: '#57b894', fillOpacity: 1 }}
        >
          <Tooltip permanent direction="right" offset={[8, 0]} className="waypoint-tooltip">
            {w.name}
          </Tooltip>
          <Popup className="waypoint-popup-leaflet">
            <div className="waypoint-popup-name">{w.name}</div>
            <div className="waypoint-popup-row">
              {w.lat.toFixed(4)}, {w.lon.toFixed(4)}
            </div>
            <div className="waypoint-popup-row">Altitude: {w.altitudeMeters.toFixed(0)} m</div>
          </Popup>
        </CircleMarker>
      ))}

      {aircraftList.map((a) => (
        <Marker
          key={a.aircraftId}
          position={[a.data.lat, a.data.lon]}
          icon={aircraftIcon(a.data.headingDeg, a.aircraftId === selectedAircraftId)}
          eventHandlers={onAircraftClick ? { click: () => onAircraftClick(a.aircraftId) } : undefined}
        >
          <Tooltip direction="top" offset={[0, -10]}>
            {a.callsign} · {a.data.speedKts.toFixed(0)}kt · {a.data.altitudeMeters.toFixed(0)}m
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
