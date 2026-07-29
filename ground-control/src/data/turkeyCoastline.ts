import type { LatLon } from '../lib/geo';

/**
 * Heavily simplified outline of Turkey used as a map backdrop — a few dozen
 * hand-picked vertices, not a surveyed boundary. Good enough to give the
 * route map geographic context without pulling in a mapping/tile library.
 */
export const TURKEY_COASTLINE: LatLon[] = [
  { lat: 41.7, lon: 26.6 },
  { lat: 41.6, lon: 28.0 },
  { lat: 41.3, lon: 29.1 },
  { lat: 41.6, lon: 31.4 },
  { lat: 41.9, lon: 33.8 },
  { lat: 41.6, lon: 36.0 },
  { lat: 41.1, lon: 38.4 },
  { lat: 41.5, lon: 41.5 },
  { lat: 40.0, lon: 43.6 },
  { lat: 39.2, lon: 44.4 },
  { lat: 37.2, lon: 44.8 },
  { lat: 37.1, lon: 42.4 },
  { lat: 36.6, lon: 40.0 },
  { lat: 36.2, lon: 37.2 },
  { lat: 36.6, lon: 35.8 },
  { lat: 36.8, lon: 34.6 },
  { lat: 36.2, lon: 32.6 },
  { lat: 36.0, lon: 30.5 },
  { lat: 36.3, lon: 29.7 },
  { lat: 36.9, lon: 28.2 },
  { lat: 37.0, lon: 27.2 },
  { lat: 38.4, lon: 26.7 },
  { lat: 39.1, lon: 26.2 },
  { lat: 40.0, lon: 26.0 },
  { lat: 40.4, lon: 26.7 },
  { lat: 41.0, lon: 26.6 },
];
