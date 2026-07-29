import type { FlightData, Route, TelemetryTick, Waypoint } from '../types/telemetry';

// Offline fallback used by App.tsx when the Core WebSocket server isn't
// reachable. Mirrors core/src/main/java/avio/domain and avio/service (same
// sample route, same great-circle interpolation) so the demo mode looks like
// a real feed even without the Java server running.
export const SAMPLE_ROUTE: Route = {
  id: 'RT-1',
  name: 'Ankara-Istanbul-Izmir-Antalya',
  waypoints: [
    { name: 'Ankara Esenboga', lat: 40.1281, lon: 32.9951, altitudeMeters: 950 },
    { name: 'Istanbul', lat: 41.0082, lon: 28.9784, altitudeMeters: 1200 },
    { name: 'Izmir', lat: 38.4192, lon: 27.1287, altitudeMeters: 1100 },
    { name: 'Antalya', lat: 36.8969, lon: 30.7133, altitudeMeters: 900 },
  ],
};

const EARTH_RADIUS_METERS = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function distanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function bearingDeg(a: Waypoint, b: Waypoint): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

export class TelemetrySimulator {
  private readonly aircraftId: string;
  private readonly callsign: string;
  private readonly route: Route;
  private readonly speedKts: number;
  private readonly progressPerTick: number;

  private legIndex = 0;
  private legProgress = 0;
  private finished = false;

  constructor(aircraftId: string, callsign: string, route: Route, speedKts: number, progressPerTick: number) {
    this.aircraftId = aircraftId;
    this.callsign = callsign;
    this.route = route;
    this.speedKts = speedKts;
    this.progressPerTick = progressPerTick;
  }

  isFinished(): boolean {
    return this.finished;
  }

  reset(): void {
    this.legIndex = 0;
    this.legProgress = 0;
    this.finished = false;
  }

  private currentTarget(): Waypoint {
    const idx = Math.min(this.legIndex + 1, this.route.waypoints.length - 1);
    return this.route.waypoints[idx];
  }

  tick(): TelemetryTick {
    if (this.finished) this.reset();

    const waypoints = this.route.waypoints;
    const lastLeg = waypoints.length - 2;

    this.legProgress += this.progressPerTick;
    while (this.legProgress >= 1 && this.legIndex < lastLeg) {
      this.legProgress -= 1;
      this.legIndex += 1;
    }
    if (this.legIndex >= lastLeg && this.legProgress >= 1) {
      this.legProgress = 1;
      this.finished = true;
    }

    const from = waypoints[this.legIndex];
    const to = waypoints[this.legIndex + 1];
    const t = this.legProgress;

    const data: FlightData = {
      timestamp: new Date().toISOString(),
      lat: from.lat + (to.lat - from.lat) * t,
      lon: from.lon + (to.lon - from.lon) * t,
      altitudeMeters: from.altitudeMeters + (to.altitudeMeters - from.altitudeMeters) * t,
      speedKts: this.speedKts,
      headingDeg: bearingDeg(from, to),
    };

    const next = this.currentTarget();
    const distanceMetersToNext = distanceMeters(data, next);
    const speedMs = this.speedKts * 0.514444;
    const totalProgress = (this.legIndex + this.legProgress) / (waypoints.length - 1);

    return {
      aircraftId: this.aircraftId,
      callsign: this.callsign,
      data,
      nextWaypoint: next,
      distanceToNextKm: distanceMetersToNext / 1000,
      etaMinutes: speedMs > 0 ? distanceMetersToNext / speedMs / 60 : Infinity,
      fuelPercent: Math.max(2, 100 * (1 - totalProgress)),
    };
  }
}
