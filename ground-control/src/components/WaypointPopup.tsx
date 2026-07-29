import type { Waypoint } from '../types/telemetry';

interface Props {
  waypoint: Waypoint;
  onClose: () => void;
}

export function WaypointPopup({ waypoint, onClose }: Props) {
  return (
    <div className="waypoint-popup">
      <button className="waypoint-popup-close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <div className="waypoint-popup-name">{waypoint.name}</div>
      <div className="waypoint-popup-row">
        {waypoint.lat.toFixed(4)}, {waypoint.lon.toFixed(4)}
      </div>
      <div className="waypoint-popup-row">Altitude: {waypoint.altitudeMeters.toFixed(0)} m</div>
    </div>
  );
}
