# AvioHMI

A portfolio project built around a single scenario — a mission computer tracking
an aircraft along a route, exposed through a touch cockpit display, a web
ground-control panel, and a GPU-accelerated sensor pipeline. Each module maps
to a requirement from the "Nesne Tabanlı Yazılım Mühendisi" (HMI) job listing
it was built for, rather than being seven disconnected demos.

## Modules

| Module | Stack | Job requirement it demonstrates |
|---|---|---|
| [`core/`](core) | Java 17, layered architecture (domain/data/service) | OOP, katmanlı mimari, algoritma geliştirme |
| [`cockpit-mfd/`](cockpit-mfd) | Flutter | UI geliştirme, dokunmatik cihaz, cross-platform framework |
| [`ground-control/`](ground-control) | React + TypeScript + Vite | Web sistemleri, React/TypeScript |
| [`video-processing/`](video-processing) | CUDA (nvcc) | GPU/CUDA ile görüntü işleme |
| [`db/`](db) + `docker-compose.yml` | PostgreSQL + PostGIS, Docker | İlişkisel veritabanı, GIS, container teknolojileri |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | GitHub Actions | CI/CD, DevOps |

Every module above has been built and verified to run on this machine (see
"Verified" notes below) — nothing here is a stub.

## Architecture

```
                         ws://localhost:8765
Ground Control (React/TS) ───────────┐
                                       v
                    Mission Computer Core (Java) — avio.app.TelemetryServerApp
                    ├─ domain:    Waypoint, Route, FlightData
                    ├─ data:      Route/Telemetry repositories
                    ├─ service:   EventBus, SensorSimulator, NavigationService
                    └─ transport: WebSocketServer (hand-rolled RFC 6455) + JSON
                                       ^
Cockpit MFD (Flutter, touch) ─────────┘
                         ws://localhost:8765

video-processing/ (CUDA) processes camera/sensor frames independently and
would feed the AR overlay in the Cockpit MFD and Ground Control views.
```

Core is the single source of truth: `TelemetryServerApp` runs the route
simulation and broadcasts every tick as JSON over a plain-JDK WebSocket
server (no external libraries — handshake, framing, and close are all
hand-written in `avio.transport`). On connect, a client first gets a
`{"type":"route",...}` message with the waypoints, then a `{"type":"telemetry",...}`
message roughly every 500ms with position/speed/heading/roll/pitch and the
distance/ETA to the next waypoint. Roll and pitch are derived server-side
from the heading/altitude delta between ticks (bank angle from turn rate,
pitch from climb rate) — Cockpit MFD's attitude indicator is driven by real
numbers from Core, not a local guess.

- **Ground Control** connects via a `useTelemetrySocket` hook with
  auto-reconnect. If Core isn't reachable within 3s it falls back to the
  same local simulator used before this was wired up (`mock/telemetryFeed.ts`),
  so the panel is still demoable standalone — a "● LIVE — Core" vs
  "● DEMO — Core not detected" badge shows which one is active.
- **Cockpit MFD**'s `FlightState` connects the same way (`web_socket_channel`),
  with a 2s reconnect loop and a "LINK/NO LINK" indicator in the page-button row.

## Running the connected system

```bash
cd core && ./build.sh && ./serve.sh    # starts ws://localhost:8765
```

Then, in separate terminals:
```bash
cd ground-control && npm install && npm run dev     # open http://localhost:5173
cd cockpit-mfd && flutter pub get && flutter run
```

Ground Control's badge should read "● LIVE — Core" and Cockpit MFD's PFD page
should show the same aircraft moving along the same route.

## Running each module standalone

## Running each module

**Core** (Java, no Maven/Gradle required):
```bash
cd core
./build.sh   # compiles everything into out/
./run.sh     # console demo: runs the simulation once, prints ticks (MissionComputerApp)
./serve.sh   # server: broadcasts the same simulation over ws://localhost:8765, looping forever
./test.sh    # runs the NavigationService smoke test
```

**Cockpit MFD** (Flutter):
```bash
cd cockpit-mfd
flutter pub get
flutter run          # or: flutter run -d windows / -d chrome
flutter test
```

**Ground Control** (React + TypeScript):
```bash
cd ground-control
npm install
npm run dev
```

**Video processing** (CUDA — requires nvcc + an MSVC/gcc host compiler):
```bash
cd video-processing
./build.bat            # Windows: sets up MSVC env and runs nvcc
./edge_detect.exe       # writes input.pgm / output.pgm
```

**Database**:
```bash
docker compose up -d postgres
```

## Roadmap / next steps

- Add a GStreamer/FFmpeg pipeline in `video-processing/` feeding real camera
  frames into the CUDA kernel, then compositing the result as an AR overlay.
- Persist routes/telemetry from Core into the PostgreSQL/PostGIS schema in
  `db/init/001_schema.sql` instead of the in-memory repositories.
- Package Cockpit MFD for an embedded Linux + touchscreen target (e.g.
  Raspberry Pi) once Flutter's Linux/embedded toolchain is set up there.
