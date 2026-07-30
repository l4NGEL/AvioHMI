# Sprint history

AvioHMI wasn't planned as one big spec — it was built iteratively, each
sprint ending with a working, demoable increment (a real Scrum principle:
ship something runnable every sprint, not partial pieces of everything at
once). This document reconstructs those sprints from the actual commit
history in `git log`, since no separate issue tracker was used for a
one-person project — the git log *is* the backlog.

| Sprint | Commit | Theme |
|---|---|---|
| 0 | `0d9ca75` | Foundations — four modules, each running standalone |
| 1 | `93ebb1d` | Integration — one WebSocket, one source of truth |
| 2 | `51f1363` | Productization — README, screenshots, licensing |
| 3 | `ff6221d` | Fleet ops — multi-aircraft, alerts, playback, CUDA bridge |
| 4 | `7749013` | Real map & visual polish |
| 5 | `8ea3f43` | Layout & reliability fixes (user-reported bugs) |
| 6 | `58c4621` | Cockpit MFD depth — NAV compass, SYS status panel |
| 7 | *(current)* | Full requirement coverage — real video pipeline, CI variety |

## Sprint 0 — Foundations

**Goal:** every module builds and runs on its own before anything talks to
anything else.

**Backlog:**
- Core (Java): domain/data/service layers, a route simulation, a console demo.
- Cockpit MFD (Flutter): PFD/NAV/SYS pages against a local timer-driven fake feed.
- Ground Control (React): a static route map against the same kind of fake feed.
- CUDA edge-detection demo, PostgreSQL/PostGIS schema, Docker Compose, CI skeleton.

**Definition of done:** `core/run.sh`, `flutter run`, `npm run dev`, and
`video-processing/edge_detect.exe` each work in isolation.

**Retro:** no Maven/Gradle in this environment — Core's build had to be a
plain `javac` script from day one instead of a "normal" Java project layout.

## Sprint 1 — Integration

**Goal:** replace every module's local fake feed with one real telemetry
source.

**Backlog:**
- Hand-rolled WebSocket server in Core (no dependency available for it).
- `useTelemetrySocket` hook in Ground Control; `FlightState` in Flutter.
- Reconnect + offline-fallback behavior on both clients.

**Retro:** widget tests that call `.start()` on `FlightState` opened a real
socket and left a pending timer after the test tore down the widget tree —
fixed by making `FlightState` injectable so tests can skip `start()`.

## Sprint 2 — Productization

**Goal:** make the repo readable to someone who has never seen it, since
this stopped being just a local demo.

**Backlog:** README rewrite, real screenshots (not mockups), MIT license,
package metadata, custom favicon.

**Retro:** screenshotting a live app needed the actual system running, not a
static description — screenshots were captured via headless Chrome + CDP
against the real running Core/Ground Control/Cockpit MFD.

## Sprint 3 — Fleet ops

**Goal:** go from "one simulated aircraft" to something that reads like a
real ops center.

**Backlog:** three aircraft with distinct behavior profiles, cross-track/overspeed/fuel
alerts, PostgreSQL-backed history playback, a CUDA-generated HUD frame
served over HTTP, a demo login gate.

**Retro:** this machine already runs a native Postgres on port 5432 for
another project — AvioHMI's container was moved to 5433 rather than fighting
over the port.

## Sprint 4 — Real map & visual polish

**Goal:** replace the placeholder SVG map with something that looks like a
real ops dashboard.

**Backlog:** react-leaflet + CARTO dark tiles, native map popups/tooltips,
a general CSS pass (shadows, spacing, transitions).

## Sprint 5 — Layout & reliability fixes

**Goal:** fix real usability bugs surfaced by actually using the app, not by
re-reading the code.

**Backlog:**
- Ground Control needed page-level scrolling to see everything — fixed by
  making `.app` a true `100vh` with `overflow: hidden` instead of `min-height`.
- Login sometimes rejected a visibly-correct autofilled password — root
  cause was browser autofill not always firing the input events React's
  controlled state relies on; fixed by reading `FormData` at submit time.
- Cockpit MFD's PFD letterboxed instead of filling the window — fixed by
  sizing gauges directly off `LayoutBuilder` constraints instead of scaling
  a fixed-size cluster with `FittedBox`.

**Retro:** all three were reported as "it doesn't work" from the outside;
each turned out to have a specific, fixable root cause once reproduced.

## Sprint 6 — Cockpit MFD depth

**Goal:** NAV and SYS pages were placeholders next to a fully-built PFD —
bring them to the same bar.

**Backlog:** heading-up compass rose (HSI-style) on NAV, a real status panel
(connection health, telemetry, derived alerts) on SYS.

## Sprint 7 — Full requirement coverage *(current)*

**Goal:** round out the toolchain breadth the project set out to demonstrate.

**Backlog:** a real ffmpeg → CUDA video pipeline (decoding an actual sample
video instead of a synthetic still frame), GitLab CI and Jenkins pipelines
alongside the existing GitHub Actions one, this document.
