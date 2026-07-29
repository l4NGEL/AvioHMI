# AvioHMI Ground Control

Live web dashboard for the AvioHMI mission computer. See the
[repository root README](../README.md) for the full picture, architecture,
and screenshots.

```bash
npm install
npm run dev      # open http://localhost:5173
```

Connects to Core's telemetry WebSocket at `ws://localhost:8765` (see
`src/hooks/useTelemetrySocket.ts`). If Core isn't reachable within 3
seconds, the panel falls back to a local simulator (`src/mock/telemetryFeed.ts`)
so it stays demoable on its own — an "● LIVE" vs "● OFFLINE PREVIEW" badge
in the header shows which one is active.
