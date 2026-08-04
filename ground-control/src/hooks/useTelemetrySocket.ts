import { useEffect, useState } from 'react';
import type { Route, TelemetryTick } from '../types/telemetry';

type ServerMessage =
  | { type: 'route'; route: Route; mode?: 'SIM' | 'LIVE' }
  | ({ type: 'telemetry' } & TelemetryTick);

export type ConnectionStatus = 'connecting' | 'live' | 'offline';
export type DataMode = 'SIM' | 'LIVE';

const RECONNECT_DELAY_MS = 2000;
const MAX_BUFFERED_TICKS = 200;

/**
 * Connects to the Mission Computer Core's telemetry WebSocket and auto-reconnects
 * on drop. Core can broadcast multiple aircraft at once, so history is keyed by
 * aircraftId rather than being a single flat array.
 */
export function useTelemetrySocket(url: string) {
  const [route, setRoute] = useState<Route | null>(null);
  const [dataMode, setDataMode] = useState<DataMode>('SIM');
  const [historiesByAircraft, setHistoriesByAircraft] = useState<Record<string, TelemetryTick[]>>({});
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      socket = new WebSocket(url);

      socket.onopen = () => {
        if (!cancelled) setStatus('live');
      };

      socket.onmessage = (event) => {
        if (cancelled) return;
        const msg = JSON.parse(event.data as string) as ServerMessage;
        if (msg.type === 'route') {
          setRoute(msg.route);
          if (msg.mode) setDataMode(msg.mode);
        } else if (msg.type === 'telemetry') {
          setHistoriesByAircraft((prev) => {
            const existing = prev[msg.aircraftId] ?? [];
            return { ...prev, [msg.aircraftId]: [...existing, msg].slice(-MAX_BUFFERED_TICKS) };
          });
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        setStatus('offline');
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      socket.onerror = () => {
        socket?.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [url]);

  return { route, dataMode, historiesByAircraft, status };
}
