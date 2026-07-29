import { useEffect, useRef, useState } from 'react';
import type { Route, TelemetryTick } from '../types/telemetry';

type ServerMessage =
  | { type: 'route'; route: Route }
  | ({ type: 'telemetry' } & TelemetryTick);

export type ConnectionStatus = 'connecting' | 'live' | 'offline';

const RECONNECT_DELAY_MS = 2000;
const MAX_BUFFERED_TICKS = 200;

/** Connects to the Mission Computer Core's telemetry WebSocket and auto-reconnects on drop. */
export function useTelemetrySocket(url: string) {
  const [route, setRoute] = useState<Route | null>(null);
  const [ticks, setTicks] = useState<TelemetryTick[]>([]);
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
        } else if (msg.type === 'telemetry') {
          setTicks((prev) => [...prev, msg].slice(-MAX_BUFFERED_TICKS));
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

  return { route, ticks, status };
}
