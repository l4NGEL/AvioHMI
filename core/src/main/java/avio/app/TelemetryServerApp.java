package avio.app;

import avio.data.InMemoryTelemetryRepository;
import avio.data.PostgresTelemetryRepository;
import avio.data.TelemetryRepository;
import avio.domain.FlightData;
import avio.domain.Route;
import avio.domain.Waypoint;
import avio.service.NavigationService;
import avio.service.SensorSimulator;
import avio.transport.FfmpegLocator;
import avio.transport.TelemetryHttpServer;
import avio.transport.TelemetryJson;
import avio.transport.WebSocketServer;

import java.io.File;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Runs the same route simulation as MissionComputerApp, but for multiple
 * aircraft at once, broadcasting every tick over WebSocket and exposing an
 * HTTP endpoint for history playback and the CUDA HUD overlay frame, so
 * Ground Control (React) and Cockpit MFD (Flutter) can connect as live
 * clients — see README.md for the full picture.
 */
public final class TelemetryServerApp {

    private static final int WS_PORT = 8765;
    private static final int HTTP_PORT = 8766;
    private static final long TICK_MILLIS = 500;
    private static final String DB_URL = "jdbc:postgresql://localhost:5433/aviohmi";
    private static final String DB_USER = "aviohmi";
    private static final String DB_PASSWORD = "aviohmi";

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

    public static void main(String[] args) throws Exception {
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

        WebSocketServer wsServer = new WebSocketServer(WS_PORT);
        wsServer.onClientConnected(client -> {
            try {
                client.sendText(TelemetryJson.route(route));
            } catch (Exception e) {
                System.err.println("Failed to send route to new client: " + e.getMessage());
            }
        });
        wsServer.start();
        System.out.println("Telemetry WebSocket server listening on ws://localhost:" + WS_PORT);

        File overlayFile = new File("../video-processing/live_overlay.bmp");
        TelemetryHttpServer httpServer = new TelemetryHttpServer(HTTP_PORT, postgresRepo, aircraftIds, () -> overlayFile);
        httpServer.start();
        System.out.println("Telemetry HTTP server (history + HUD overlay) listening on http://localhost:" + HTTP_PORT);

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
            if (!exe.exists()) {
                System.out.println("video-processing/edge_detect.exe not found — Sensor Feed overlay disabled "
                        + "(build it with video-processing/build.bat).");
                return;
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
