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

Connects to Core's telemetry WebSocket at `ws://localhost:8765` for all
three simulated aircraft (see `src/hooks/useTelemetrySocket.ts`), and to
`http://localhost:8766` for history playback (`/history`) and the CUDA HUD
sensor feed (`/overlay.bmp`). If Core isn't reachable within 3 seconds, the
panel falls back to a local simulator (`src/mock/telemetryFeed.ts`) so it
stays demoable on its own — an "● LIVE" vs "● OFFLINE PREVIEW" badge in the
header shows which one is active.

Click an aircraft (map or fleet list) to inspect it, click a waypoint for
its coordinates, and use the LIVE/PLAYBACK toggle to scrub through its
persisted flight history.
