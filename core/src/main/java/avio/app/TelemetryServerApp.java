package avio.app;

import avio.data.InMemoryTelemetryRepository;
import avio.data.PostgresTelemetryRepository;
import avio.data.TelemetryRepository;
import avio.domain.FlightData;
import avio.domain.Route;
import avio.domain.Waypoint;
import avio.service.NavigationService;
import avio.service.NativeHudRenderer;
import avio.service.OpenSkyClient;
import avio.service.SensorSimulator;
import avio.transport.FfmpegLocator;
import avio.transport.TelemetryHttpServer;
import avio.transport.TelemetryJson;
import avio.transport.TlsSupport;
import avio.transport.WebSocketServer;

import javax.net.ssl.SSLContext;
import java.io.File;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

/**
 * Runs the same route simulation as MissionComputerApp, but for multiple
 * aircraft at once, broadcasting every tick over WebSocket and exposing an
 * HTTP endpoint for history playback and the CUDA HUD overlay frame, so
 * Ground Control (React) and Cockpit MFD (Flutter) can connect as live
 * clients — see README.md for the full picture.
 *
 * Two data sources, chosen at startup with AVIO_MODE (default "sim"):
 *   AVIO_MODE=sim  — three synthetic aircraft flown along a fixed route (default).
 *   AVIO_MODE=live — real ADS-B aircraft over Turkey from the free, anonymous
 *                    OpenSky Network REST API (see avio.service.OpenSkyClient).
 */
public final class TelemetryServerApp {

    private static final int WS_PORT = 8765;
    private static final int HTTP_PORT = 8766;
    private static final long TICK_MILLIS = 500;
    // Overridable via env vars so the same jar works unchanged both on the host (where Postgres
    // is published on 5433 to dodge this machine's native Postgres on 5432, see docker-compose.yml)
    // and inside Docker Compose's own network (where it's the "postgres" service on its default 5432).
    private static final String DB_URL =
            System.getenv().getOrDefault("DB_URL", "jdbc:postgresql://localhost:5433/aviohmi");
    private static final String DB_USER = System.getenv().getOrDefault("DB_USER", "aviohmi");
    private static final String DB_PASSWORD = System.getenv().getOrDefault("DB_PASSWORD", "aviohmi");

    private static final double TURKEY_LAMIN = 35.5;
    private static final double TURKEY_LOMIN = 25.5;
    private static final double TURKEY_LAMAX = 42.5;
    private static final double TURKEY_LOMAX = 45.0;
    private static final long LIVE_POLL_INTERVAL_MS = 60_000;
    private static final int LIVE_MAX_AIRCRAFT = 30;

    /** Per-aircraft profile: nominal speed plus how much it drifts off nominal, to give each a distinct personality on the map. */
    private static final class AircraftProfile {
        final String id;
        final String callsign;
        final double baseSpeedKts;
        final double speedAmplitudeKts;
        final int speedPeriodTicks;
        final double lateralAmplitudeKm;
        final int lateralPeriodTicks;
        final int seekLegIndex;
        final double seekLegProgress;

        AircraftProfile(String id, String callsign, double baseSpeedKts, double speedAmplitudeKts,
                         int speedPeriodTicks, double lateralAmplitudeKm, int lateralPeriodTicks,
                         int seekLegIndex, double seekLegProgress) {
            this.id = id;
            this.callsign = callsign;
            this.baseSpeedKts = baseSpeedKts;
            this.speedAmplitudeKts = speedAmplitudeKts;
            this.speedPeriodTicks = speedPeriodTicks;
            this.lateralAmplitudeKm = lateralAmplitudeKm;
            this.lateralPeriodTicks = lateralPeriodTicks;
            this.seekLegIndex = seekLegIndex;
            this.seekLegProgress = seekLegProgress;
        }
    }

    private static final class AircraftRuntime {
        final AircraftProfile profile;
        final SensorSimulator simulator;
        volatile int tickCount = 0;
        volatile double prevHeading = Double.NaN;
        volatile double prevAltitude = Double.NaN;

        AircraftRuntime(AircraftProfile profile, Route route) {
            this.profile = profile;
            this.simulator = new SensorSimulator(route, profile.baseSpeedKts);
            this.simulator.seek(profile.seekLegIndex, profile.seekLegProgress);
        }
    }

    /** The two servers plus the TLS/scheme info every mode needs after bringing them up. */
    private record ServerBundle(WebSocketServer ws, TelemetryHttpServer http) {
    }

    public static void main(String[] args) throws Exception {
        String mode = System.getenv().getOrDefault("AVIO_MODE", "sim").trim().toLowerCase(Locale.ROOT);
        if (mode.equals("live") || mode.equals("opensky")) {
            runLiveMode();
        } else {
            runSimMode();
        }
    }

    /** Brings up the WebSocket + HTTP servers identically for both modes; only the route/mode label and aircraft-id source differ. */
    private static ServerBundle bringUpServers(PostgresTelemetryRepository postgresRepo,
                                                Supplier<List<String>> aircraftIdsSupplier, File overlayFile,
                                                Route routeForNewClients, String modeLabel) throws Exception {
        SSLContext tls = TlsSupport.loadDevContext();
        String scheme = tls != null ? "wss" : "ws";
        String httpScheme = tls != null ? "https" : "http";
        if (tls != null) {
            System.out.println("Loaded core/certs/dev-keystore.p12 — serving " + scheme + "/" + httpScheme
                    + " so a phone loading Ground Control over HTTPS doesn't hit mixed-content blocking.");
        } else {
            System.out.println("No core/certs/dev-keystore.p12 — serving plain ws/http (fine for desktop; "
                    + "a phone needs HTTPS for camera/GPS/compass, see README).");
        }

        WebSocketServer wsServer = new WebSocketServer(WS_PORT, tls);
        wsServer.onClientConnected(client -> {
            try {
                client.sendText(TelemetryJson.route(routeForNewClients, modeLabel));
            } catch (Exception e) {
                System.err.println("Failed to send route to new client: " + e.getMessage());
            }
        });
        wsServer.start();
        System.out.println("Telemetry WebSocket server listening on " + scheme + "://localhost:" + WS_PORT);

        TelemetryHttpServer httpServer =
                new TelemetryHttpServer(HTTP_PORT, postgresRepo, aircraftIdsSupplier, () -> overlayFile, tls);
        httpServer.start();
        System.out.println("Telemetry HTTP server (history + HUD overlay) listening on "
                + httpScheme + "://localhost:" + HTTP_PORT);

        return new ServerBundle(wsServer, httpServer);
    }

    private static void runSimMode() throws Exception {
        Route route = new Route("RT-1", "Ankara-Istanbul-Izmir-Antalya", List.of(
                new Waypoint("Ankara Esenboga", 40.1281, 32.9951, 950),
                new Waypoint("Istanbul", 41.0082, 28.9784, 1200),
                new Waypoint("Izmir", 38.4192, 27.1287, 1100),
                new Waypoint("Antalya", 36.8969, 30.7133, 900)
        ));

        List<AircraftProfile> profiles = List.of(
                // Well-behaved baseline: flat speed, stays exactly on the planned track.
                new AircraftProfile("AC-101", "AVIO101", 420, 0, 1, 0, 1, 0, 0.0),
                // Periodically drifts off-course and blips over the speed limit.
                new AircraftProfile("AC-102", "AVIO102", 380, 60, 24, 6.0, 30, 1, 0.3),
                // Chronically over the speed limit, but tracks the route precisely.
                new AircraftProfile("AC-103", "AVIO103", 460, 0, 1, 0, 1, 2, 0.1)
        );

        NavigationService navigationService = new NavigationService();
        List<AircraftRuntime> aircraft = new ArrayList<>();
        for (AircraftProfile p : profiles) aircraft.add(new AircraftRuntime(p, route));
        List<String> aircraftIds = profiles.stream().map(p -> p.id).toList();

        PostgresTelemetryRepository postgresRepo = tryConnectPostgres();
        TelemetryRepository telemetryRepository = postgresRepo != null ? postgresRepo : new InMemoryTelemetryRepository();
        if (postgresRepo != null) {
            System.out.println("Connected to Postgres — telemetry history will persist and /history will serve real playback.");
        } else {
            System.out.println("Postgres not reachable (docker compose up -d postgres) — using in-memory history; /history will be empty.");
        }

        File overlayFile = new File("../video-processing/live_overlay.bmp");
        ServerBundle servers = bringUpServers(postgresRepo, () -> aircraftIds, overlayFile, route, "SIM");
        WebSocketServer wsServer = servers.ws();

        startHudOverlayThread(aircraft.get(0), overlayFile);

        while (true) {
            for (AircraftRuntime rt : aircraft) {
                if (rt.simulator.isFinished()) rt.simulator.reset();

                FlightData baseData = rt.simulator.step(0.03);
                rt.tickCount++;

                FlightData broadcastData = applyProfileNoise(baseData, rt);
                Waypoint next = rt.simulator.getCurrentTarget();
                double distanceKm = navigationService.distanceToMeters(broadcastData, next) / 1000.0;
                double etaMinutes = navigationService.etaMinutes(broadcastData, next);
                double fuelPercent = Math.max(2.0, 100.0 * (1.0 - rt.simulator.totalProgress()));

                double rollDeg = 0, pitchDeg = 0;
                if (!Double.isNaN(rt.prevHeading)) {
                    rollDeg = clamp(angleDiffDeg(rt.prevHeading, broadcastData.getHeadingDeg()) * 6.0, -30, 30);
                }
                if (!Double.isNaN(rt.prevAltitude)) {
                    pitchDeg = clamp((broadcastData.getAltitudeMeters() - rt.prevAltitude) * 0.05, -15, 15);
                }
                rt.prevHeading = broadcastData.getHeadingDeg();
                rt.prevAltitude = broadcastData.getAltitudeMeters();

                telemetryRepository.record(rt.profile.id, broadcastData);
                if (wsServer.clientCount() > 0) {
                    wsServer.broadcast(TelemetryJson.telemetryTick(rt.profile.id, rt.profile.callsign, broadcastData,
                            next, distanceKm, etaMinutes, rollDeg, pitchDeg, fuelPercent));
                }
            }
            Thread.sleep(TICK_MILLIS);
        }
    }

    /**
     * Real-world data source: polls OpenSky Network's free, anonymous states/all
     * endpoint for actual ADS-B traffic over Turkey and broadcasts it exactly like
     * the simulator does, so Ground Control needs no separate code path to render
     * it. No flight plan exists for real aircraft, so "next waypoint" is reported
     * as the aircraft's own current position (distance 0) and fuel is unknown
     * (reported as a fixed 100% so it never trips the LOW_FUEL alert); the
     * frontend also skips the OFF_COURSE alert and the fixed-route overlay when
     * mode is "LIVE" (see TelemetryContext.tsx / RouteMap.tsx).
     */
    private static void runLiveMode() throws Exception {
        boolean hasOpenSkyCredentials = System.getenv("OPENSKY_CLIENT_ID") != null
                && System.getenv("OPENSKY_CLIENT_SECRET") != null;
        System.out.println("AVIO_MODE=live — using real ADS-B data from OpenSky Network "
                + (hasOpenSkyCredentials
                        ? "(authenticated via OPENSKY_CLIENT_ID/SECRET — higher rate limit)"
                        : "(anonymous — low daily rate limit; set OPENSKY_CLIENT_ID/OPENSKY_CLIENT_SECRET for more)")
                + " instead of the simulator. Set AVIO_MODE=sim (or unset) to go back to the simulated fleet.");

        Route liveRoute = new Route("RT-LIVE", "Live Turkish Airspace (OpenSky Network)", List.of(
                new Waypoint("Coverage SW", TURKEY_LAMIN, TURKEY_LOMIN, 0),
                new Waypoint("Coverage NE", TURKEY_LAMAX, TURKEY_LOMAX, 0)
        ));

        PostgresTelemetryRepository postgresRepo = tryConnectPostgres();
        TelemetryRepository telemetryRepository = postgresRepo != null ? postgresRepo : new InMemoryTelemetryRepository();
        if (postgresRepo != null) {
            System.out.println("Connected to Postgres — live telemetry history will persist.");
        } else {
            System.out.println("Postgres not reachable (docker compose up -d postgres) — using in-memory history; /history will be empty.");
        }

        AtomicReference<List<String>> liveAircraftIds = new AtomicReference<>(List.of());
        File overlayFile = new File("../video-processing/live_overlay.bmp");
        ServerBundle servers = bringUpServers(postgresRepo, liveAircraftIds::get, overlayFile, liveRoute, "LIVE");
        System.out.println("HUD overlay is disabled in live mode (no fixed lead aircraft to sample video against).");

        OpenSkyClient openSky = new OpenSkyClient();
        Map<String, Double> prevHeadingByAircraft = new ConcurrentHashMap<>();
        Map<String, Double> prevAltitudeByAircraft = new ConcurrentHashMap<>();

        while (true) {
            if (servers.ws().clientCount() > 0) {
                try {
                    List<OpenSkyClient.RealAircraftState> states =
                            openSky.fetchStates(TURKEY_LAMIN, TURKEY_LOMIN, TURKEY_LAMAX, TURKEY_LOMAX);
                    if (states.size() > LIVE_MAX_AIRCRAFT) {
                        states = states.subList(0, LIVE_MAX_AIRCRAFT);
                    }

                    List<String> ids = new ArrayList<>();
                    for (OpenSkyClient.RealAircraftState state : states) {
                        ids.add(state.icao24());

                        FlightData data = new FlightData(Instant.now(), state.latitude(), state.longitude(),
                                state.altitudeMeters(), state.speedKts(), state.headingDeg());

                        double prevHeading = prevHeadingByAircraft.getOrDefault(state.icao24(), Double.NaN);
                        double prevAltitude = prevAltitudeByAircraft.getOrDefault(state.icao24(), Double.NaN);
                        double rollDeg = 0, pitchDeg = 0;
                        if (!Double.isNaN(prevHeading)) {
                            rollDeg = clamp(angleDiffDeg(prevHeading, state.headingDeg()) * 6.0, -30, 30);
                        }
                        if (!Double.isNaN(prevAltitude)) {
                            pitchDeg = clamp((state.altitudeMeters() - prevAltitude) * 0.05, -15, 15);
                        }
                        prevHeadingByAircraft.put(state.icao24(), state.headingDeg());
                        prevAltitudeByAircraft.put(state.icao24(), state.altitudeMeters());

                        Waypoint selfWaypoint = new Waypoint("Live position", state.latitude(), state.longitude(),
                                state.altitudeMeters());

                        telemetryRepository.record(state.icao24(), data);
                        servers.ws().broadcast(TelemetryJson.telemetryTick(state.icao24(), state.callsign(), data,
                                selfWaypoint, 0.0, Double.NaN, rollDeg, pitchDeg, 100.0));
                    }
                    liveAircraftIds.set(ids);
                    System.out.println("OpenSky: broadcasting " + ids.size() + " real aircraft in Turkish airspace.");
                } catch (Exception e) {
                    System.err.println("OpenSky fetch failed: " + e.getMessage());
                }
            }
            Thread.sleep(LIVE_POLL_INTERVAL_MS);
        }
    }

    /** Applies the aircraft's speed oscillation and lateral course weave on top of the clean simulated position. */
    private static FlightData applyProfileNoise(FlightData base, AircraftRuntime rt) {
        AircraftProfile p = rt.profile;
        double speedKts = p.baseSpeedKts + p.speedAmplitudeKts
                * Math.sin(2 * Math.PI * rt.tickCount / p.speedPeriodTicks);

        double lateralKm = p.lateralAmplitudeKm
                * Math.sin(2 * Math.PI * rt.tickCount / p.lateralPeriodTicks);

        double perpBearingRad = Math.toRadians(base.getHeadingDeg() + 90);
        double latRad = Math.toRadians(base.getLatitude());
        double dLatDeg = (lateralKm / 111.32) * Math.cos(perpBearingRad);
        double dLonDeg = (lateralKm / (111.32 * Math.cos(latRad))) * Math.sin(perpBearingRad);

        return new FlightData(base.getTimestamp(), base.getLatitude() + dLatDeg, base.getLongitude() + dLonDeg,
                base.getAltitudeMeters(), speedKts, base.getHeadingDeg());
    }

    private static final double SAMPLE_VIDEO_DURATION_SECONDS = 8.0;

    /**
     * Periodically re-invokes the CUDA HUD demo with the lead aircraft's live telemetry,
     * feeding Ground Control's Sensor Feed panel. When ffmpeg is available, it first
     * decodes the current frame of video-processing/assets/sample_sensor_feed.mp4 (looping
     * on a timer) into a PGM and hands that to the CUDA program instead of a synthetic
     * still image, so the "sensor" the HUD is drawn over is a real decoded video frame.
     */
    private static void startHudOverlayThread(AircraftRuntime leadAircraft, File overlayFile) {
        Thread thread = new Thread(() -> {
            File videoProcessingDir = new File("../video-processing");
            File exe = new File(videoProcessingDir, "edge_detect.exe");
            boolean useNative = NativeHudRenderer.isAvailable();
            if (useNative) {
                System.out.println("video-processing/hud_native.dll loaded — HUD pipeline runs in-process via JNI "
                        + "instead of spawning edge_detect.exe per frame.");
            } else if (!exe.exists()) {
                System.out.println("Neither video-processing/hud_native.dll nor edge_detect.exe found — "
                        + "Sensor Feed overlay disabled (build with video-processing/build.bat).");
                return;
            } else {
                System.out.println("video-processing/hud_native.dll not found — falling back to spawning "
                        + "edge_detect.exe per frame (build both with video-processing/build.bat).");
            }

            File sampleVideo = new File(videoProcessingDir, "assets/sample_sensor_feed.mp4");
            File currentFrame = new File(videoProcessingDir, "current_frame.pgm");
            String ffmpegPath = FfmpegLocator.resolve();
            if (ffmpegPath == null) {
                System.out.println("ffmpeg not found — Sensor Feed will use the synthetic test frame "
                        + "instead of decoding video-processing/assets/sample_sensor_feed.mp4.");
            } else if (!sampleVideo.exists()) {
                System.out.println("video-processing/assets/sample_sensor_feed.mp4 not found — "
                        + "Sensor Feed will use the synthetic test frame.");
            }

            long startMillis = System.currentTimeMillis();

            while (true) {
                boolean haveRealFrame = false;
                if (ffmpegPath != null && sampleVideo.exists()) {
                    double elapsedSeconds = (System.currentTimeMillis() - startMillis) / 1000.0;
                    double offset = elapsedSeconds % SAMPLE_VIDEO_DURATION_SECONDS;
                    try {
                        ProcessBuilder ffmpegPb = new ProcessBuilder(
                                ffmpegPath, "-y",
                                "-ss", String.format(Locale.US, "%.2f", offset),
                                "-i", sampleVideo.getAbsolutePath(),
                                "-vframes", "1", "-pix_fmt", "gray",
                                currentFrame.getAbsolutePath());
                        ffmpegPb.directory(videoProcessingDir);
                        ffmpegPb.redirectOutput(ProcessBuilder.Redirect.DISCARD);
                        ffmpegPb.redirectError(ProcessBuilder.Redirect.DISCARD);
                        haveRealFrame = ffmpegPb.start().waitFor() == 0 && currentFrame.exists();
                    } catch (Exception e) {
                        System.err.println("ffmpeg frame extraction failed: " + e.getMessage());
                    }
                }

                String inputPgmPath = haveRealFrame ? currentFrame.getAbsolutePath() : null;
                if (useNative) {
                    try {
                        NativeHudRenderer.render(leadAircraft.prevHeading, leadAircraft.profile.baseSpeedKts,
                                leadAircraft.prevAltitude, overlayFile.getAbsolutePath(), inputPgmPath);
                    } catch (Throwable t) {
                        System.err.println("Native HUD render failed: " + t.getMessage());
                    }
                } else {
                    try {
                        List<String> command = new ArrayList<>(List.of(
                                exe.getAbsolutePath(),
                                String.valueOf(leadAircraft.prevHeading),
                                String.valueOf(leadAircraft.profile.baseSpeedKts),
                                String.valueOf(leadAircraft.prevAltitude),
                                overlayFile.getAbsolutePath()));
                        if (haveRealFrame) command.add(currentFrame.getAbsolutePath());

                        ProcessBuilder pb = new ProcessBuilder(command);
                        pb.directory(videoProcessingDir);
                        pb.redirectOutput(ProcessBuilder.Redirect.DISCARD);
                        pb.redirectError(ProcessBuilder.Redirect.DISCARD);
                        pb.start().waitFor();
                    } catch (Exception e) {
                        System.err.println("HUD overlay generation failed: " + e.getMessage());
                    }
                }
                try {
                    Thread.sleep(3000);
                } catch (InterruptedException e) {
                    return;
                }
            }
        }, "hud-overlay");
        thread.setDaemon(true);
        thread.start();
    }

    private static PostgresTelemetryRepository tryConnectPostgres() {
        try {
            return new PostgresTelemetryRepository(DB_URL, DB_USER, DB_PASSWORD);
        } catch (SQLException e) {
            System.out.println("Postgres connection failed: " + e.getMessage());
            return null;
        }
    }

    private static double angleDiffDeg(double fromDeg, double toDeg) {
        return ((toDeg - fromDeg + 540) % 360) - 180;
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
