import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { SAMPLE_ROUTE, TelemetrySimulator } from '../mock/telemetryFeed';
import type { Route, TelemetryTick } from '../types/telemetry';
import { useTelemetrySocket } from '../hooks/useTelemetrySocket';
import { computeAlerts, type Alert } from '../lib/alerts';

const CORE_WS_URL = 'ws://localhost:8765';
const DEMO_FALLBACK_DELAY_MS = 3000;
const DEMO_AIRCRAFT_ID = 'AC-101';
const MAX_ALERT_LOG = 100;

export interface AlertLogEntry extends Alert {
  timestamp: string;
  callsign: string;
}

export interface AircraftSummary {
  aircraftId: string;
  callsign: string;
  speedKts: number;
  altitudeMeters: number;
  fuelPercent: number;
}

interface TelemetryContextValue {
  route: Route;
  usingLive: boolean;
  histories: Record<string, TelemetryTick[]>;
  aircraftIds: string[];
  aircraftSummaries: AircraftSummary[];
  selectedAircraftId: string | null;
  setSelectedAircraftId: (id: string) => void;
  selectedHistory: TelemetryTick[];
  selectedLatest: TelemetryTick | undefined;
  activeAlerts: Alert[];
  alertLog: AlertLogEntry[];
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const { route: liveRoute, historiesByAircraft, status } = useTelemetrySocket(CORE_WS_URL);

  const simulatorRef = useRef(new TelemetrySimulator(DEMO_AIRCRAFT_ID, 'AVIO101', SAMPLE_ROUTE, 420, 0.03));
  const [demoTicks, setDemoTicks] = useState<TelemetryTick[]>([]);
  const [demoMode, setDemoMode] = useState(false);

  const usingLive = status === 'live' && Object.keys(historiesByAircraft).length > 0;

  useEffect(() => {
    if (usingLive) {
      setDemoMode(false);
      return;
    }
    const timer = setTimeout(() => setDemoMode(true), DEMO_FALLBACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [usingLive]);

  useEffect(() => {
    if (!demoMode) return;
    const interval = setInterval(() => {
      setDemoTicks((prev) => [...prev, simulatorRef.current.tick()].slice(-200));
    }, 500);
    return () => clearInterval(interval);
  }, [demoMode]);

  const route = usingLive ? liveRoute ?? SAMPLE_ROUTE : SAMPLE_ROUTE;
  const histories: Record<string, TelemetryTick[]> = usingLive
    ? historiesByAircraft
    : demoTicks.length > 0
      ? { [DEMO_AIRCRAFT_ID]: demoTicks }
      : {};
  const aircraftIds = Object.keys(histories);

  const [selectedAircraftId, setSelectedAircraftIdState] = useState<string | null>(null);
  useEffect(() => {
    if ((!selectedAircraftId || !histories[selectedAircraftId]) && aircraftIds.length > 0) {
      setSelectedAircraftIdState(aircraftIds[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aircraftIds.join(','), selectedAircraftId]);

  const selectedHistory = selectedAircraftId ? histories[selectedAircraftId] ?? [] : [];
  const selectedLatest = selectedHistory[selectedHistory.length - 1];

  const activeAlerts = aircraftIds.flatMap((id) => {
    const h = histories[id];
    const latest = h[h.length - 1];
    return computeAlerts(id, latest.callsign, latest.data, latest.fuelPercent, route);
  });

  const aircraftSummaries: AircraftSummary[] = aircraftIds.map((id) => {
    const latest = histories[id][histories[id].length - 1];
    return {
      aircraftId: id,
      callsign: latest.callsign,
      speedKts: latest.data.speedKts,
      altitudeMeters: latest.data.altitudeMeters,
      fuelPercent: latest.fuelPercent,
    };
  });

  // Rolling log of alert *transitions* (a new alert appearing), for the Alerts page's history view.
  const [alertLog, setAlertLog] = useState<AlertLogEntry[]>([]);
  const activeAlertKeysRef = useRef<Set<string>>(new Set());
  const alertKeysJoined = activeAlerts.map((a) => `${a.aircraftId}:${a.kind}`).join(',');
  useEffect(() => {
    const currentKeys = new Set(alertKeysJoined ? alertKeysJoined.split(',') : []);
    const newlyActive = activeAlerts.filter((a) => !activeAlertKeysRef.current.has(`${a.aircraftId}:${a.kind}`));
    if (newlyActive.length > 0) {
      const callsignFor = (id: string) => histories[id]?.[histories[id].length - 1]?.callsign ?? id;
      setAlertLog((prev) =>
        [
          ...newlyActive.map((a) => ({ ...a, timestamp: new Date().toISOString(), callsign: callsignFor(a.aircraftId) })),
          ...prev,
        ].slice(0, MAX_ALERT_LOG),
      );
    }
    activeAlertKeysRef.current = currentKeys;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertKeysJoined]);

  const value: TelemetryContextValue = {
    route,
    usingLive,
    histories,
    aircraftIds,
    aircraftSummaries,
    selectedAircraftId,
    setSelectedAircraftId: setSelectedAircraftIdState,
    selectedHistory,
    selectedLatest,
    activeAlerts,
    alertLog,
  };

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry(): TelemetryContextValue {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error('useTelemetry must be used within a TelemetryProvider');
  return ctx;
}
