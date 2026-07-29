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
Ground Control (React/TS) ── HTTP/WebSocket (planned) ──┐
                                                          v
                                        Mission Computer Core (Java)
                                        ├─ domain: Waypoint, Route, FlightData
                                        ├─ data:   Route/Telemetry repositories
                                        └─ service: EventBus, SensorSimulator,
                                                     NavigationService
                                                          ^
                              Cockpit MFD (Flutter, touch) ── same telemetry shape

video-processing/ (CUDA) processes camera/sensor frames independently and
would feed the AR overlay in the Cockpit MFD and Ground Control views.
```

The Core, Cockpit MFD, and Ground Control currently each run their own local
simulation of the same sample route (Ankara → Istanbul → Izmir → Antalya) so
every module can be demoed standalone. Wiring them together over a real
WebSocket/gRPC link is the natural next step (see below).

## Running each module

**Core** (Java, no Maven/Gradle required):
```bash
cd core
./build.sh   # compiles everything into out/
./run.sh     # runs the mission computer simulation
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

- Replace each module's local simulator with a shared telemetry feed from
  Core over WebSocket, so Cockpit MFD and Ground Control show the same
  live aircraft.
- Add a GStreamer/FFmpeg pipeline in `video-processing/` feeding real camera
  frames into the CUDA kernel, then compositing the result as an AR overlay.
- Persist routes/telemetry from Core into the PostgreSQL/PostGIS schema in
  `db/init/001_schema.sql` instead of the in-memory repositories.
- Package Cockpit MFD for an embedded Linux + touchscreen target (e.g.
  Raspberry Pi) once Flutter's Linux/embedded toolchain is set up there.
