import type { FlightData, Route } from '../types/telemetry';
import { minCrossTrackToRouteKm } from './geo';

export const OVERSPEED_THRESHOLD_KTS = 430;
export const OFF_COURSE_THRESHOLD_KM = 4;
export const LOW_FUEL_THRESHOLD_PERCENT = 20;

export type AlertKind = 'OVERSPEED' | 'OFF_COURSE' | 'LOW_FUEL';

export interface Alert {
  aircraftId: string;
  kind: AlertKind;
  message: string;
}

export function computeAlerts(aircraftId: string, callsign: string, data: FlightData,
                               fuelPercent: number, route: Route): Alert[] {
  const alerts: Alert[] = [];

  if (data.speedKts > OVERSPEED_THRESHOLD_KTS) {
    alerts.push({ aircraftId, kind: 'OVERSPEED', message: `${callsign}: OVERSPEED ${data.speedKts.toFixed(0)}kt` });
  }

  const crossTrackKm = minCrossTrackToRouteKm(data, route.waypoints);
  if (crossTrackKm > OFF_COURSE_THRESHOLD_KM) {
    alerts.push({ aircraftId, kind: 'OFF_COURSE', message: `${callsign}: OFF COURSE ${crossTrackKm.toFixed(1)}km` });
  }

  if (fuelPercent < LOW_FUEL_THRESHOLD_PERCENT) {
    alerts.push({ aircraftId, kind: 'LOW_FUEL', message: `${callsign}: LOW FUEL ${fuelPercent.toFixed(0)}%` });
  }

  return alerts;
}
