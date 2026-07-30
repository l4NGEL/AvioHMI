# AvioHMI Ground Control

Live web dashboard for the AvioHMI mission computer. See the
[repository root README](../README.md) for the full picture, architecture,
and screenshots.

```bash
npm install
npm run dev      # open http://localhost:5173
```

Sign in with the demo credentials `operator` / `aviohmi` (see the security
note in the root README — it's a UX-only gate, not real auth).

## Pages

A sidebar (React Router) switches between:

- **Dashboard** — fleet KPIs, an altitude/speed chart, a fleet-status donut,
  and recent alerts/fleet snapshot cards.
- **Fleet & Map** — the live Leaflet map, fleet list, telemetry panel, chart,
  and mission log for the selected aircraft.
- **Playback** — scrub through any aircraft's PostgreSQL-persisted history.
- **Alerts** — active alerts plus a full session history table.
- **Sensor Feed** — the CUDA-generated HUD frame (see the root README's
  ffmpeg → CUDA pipeline).
- **AR View** — a live camera feed with a real-time HUD composited via
  canvas; needs camera permission.
- **Reports** — aggregate stats (distance/time/alerts) computed per aircraft.
- **Settings** — connection info and sign-out.

All pages share one `TelemetryContext` (`src/context/TelemetryContext.tsx`),
so the selected aircraft and alert history stay consistent across navigation.

Connects to Core's telemetry WebSocket at `ws://localhost:8765` for all
three simulated aircraft (see `src/hooks/useTelemetrySocket.ts`), and to
`http://localhost:8766` for history playback (`/history`) and the CUDA HUD
sensor feed (`/overlay.bmp`). If Core isn't reachable within 3 seconds, the
dashboard falls back to a local simulator (`src/mock/telemetryFeed.ts`) so
it stays demoable on its own — an "● LIVE" vs "● OFFLINE PREVIEW" badge in
the topbar shows which one is active.
