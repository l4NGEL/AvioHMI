export interface Waypoint {
  name: string;
  lat: number;
  lon: number;
  altitudeMeters: number;
}

export interface Route {
  id: string;
  name: string;
  waypoints: Waypoint[];
}

export interface FlightData {
  timestamp: string;
  lat: number;
  lon: number;
  altitudeMeters: number;
  speedKts: number;
  headingDeg: number;
}

export interface TelemetryTick {
  aircraftId: string;
  callsign: string;
  data: FlightData;
  nextWaypoint: Waypoint;
  distanceToNextKm: number;
  etaMinutes: number;
}
