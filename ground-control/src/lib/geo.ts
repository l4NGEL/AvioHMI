export interface LatLon {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance (km) between two points. */
export function haversineKm(a: LatLon, b: LatLon): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Cross-track distance (km) of point P from the segment A->B, using a flat
 * equirectangular approximation around A. Accurate enough at route scale
 * (tens to low hundreds of km) and much simpler than full spherical
 * cross-track math.
 */
export function crossTrackDistanceKm(p: LatLon, a: LatLon, b: LatLon): number {
  const kmPerDegLat = 111.32;
  const kmPerDegLon = 111.32 * Math.cos((a.lat * Math.PI) / 180);

  const toXY = (pt: LatLon) => ({
    x: (pt.lon - a.lon) * kmPerDegLon,
    y: (pt.lat - a.lat) * kmPerDegLat,
  });

  const A = { x: 0, y: 0 };
  const B = toXY(b);
  const P = toXY(p);

  const abx = B.x - A.x;
  const aby = B.y - A.y;
  const abLenSq = abx * abx + aby * aby;
  let t = abLenSq === 0 ? 0 : (P.x * abx + P.y * aby) / abLenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = A.x + t * abx;
  const closestY = A.y + t * aby;
  const dx = P.x - closestX;
  const dy = P.y - closestY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function minCrossTrackToRouteKm(p: LatLon, waypoints: LatLon[]): number {
  let min = Infinity;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const d = crossTrackDistanceKm(p, waypoints[i], waypoints[i + 1]);
    if (d < min) min = d;
  }
  return min;
}
