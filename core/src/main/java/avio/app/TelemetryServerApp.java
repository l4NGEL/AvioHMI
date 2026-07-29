package avio.app;

import avio.data.InMemoryTelemetryRepository;
import avio.data.TelemetryRepository;
import avio.domain.FlightData;
import avio.domain.Route;
import avio.domain.Waypoint;
import avio.service.EventBus;
import avio.service.NavigationService;
import avio.service.SensorSimulator;
import avio.transport.TelemetryJson;
import avio.transport.WebSocketServer;

import java.util.List;

/**
 * Runs the same route simulation as MissionComputerApp, but broadcasts every
 * tick over a WebSocket instead of printing to the console, so Ground Control
 * (React) and Cockpit MFD (Flutter) can connect as live clients.
 */
public final class TelemetryServerApp {

    private static final int PORT = 8765;
    private static final double PROGRESS_PER_TICK = 0.03;
    private static final long TICK_MILLIS = 500;

    public static void main(String[] args) throws Exception {
        Route route = new Route("RT-1", "Ankara-Istanbul-Izmir-Antalya", List.of(
                new Waypoint("Ankara Esenboga", 40.1281, 32.9951, 950),
                new Waypoint("Istanbul", 41.0082, 28.9784, 1200),
                new Waypoint("Izmir", 38.4192, 27.1287, 1100),
                new Waypoint("Antalya", 36.8969, 30.7133, 900)
        ));

        String aircraftId = "AC-101";
        String callsign = "AVIO101";
        NavigationService navigationService = new NavigationService();
        TelemetryRepository telemetryRepository = new InMemoryTelemetryRepository();
        EventBus eventBus = new EventBus();
        SensorSimulator simulator = new SensorSimulator(aircraftId, route, eventBus, telemetryRepository, 420.0);

        WebSocketServer server = new WebSocketServer(PORT);
        server.onClientConnected(client -> {
            try {
                client.sendText(TelemetryJson.route(route));
            } catch (Exception e) {
                System.err.println("Failed to send route to new client: " + e.getMessage());
            }
        });
        server.start();
        System.out.println("Telemetry WebSocket server listening on ws://localhost:" + PORT);

        double prevHeading = Double.NaN;
        double prevAltitude = Double.NaN;

        while (true) {
            if (simulator.isFinished()) {
                simulator.reset();
            }
            FlightData data = simulator.step(PROGRESS_PER_TICK);
            Waypoint next = simulator.getCurrentTarget();
            double distanceKm = navigationService.distanceToMeters(data, next) / 1000.0;
            double etaMinutes = navigationService.etaMinutes(data, next);

            double rollDeg = 0;
            double pitchDeg = 0;
            if (!Double.isNaN(prevHeading)) {
                rollDeg = clamp(angleDiffDeg(prevHeading, data.getHeadingDeg()) * 6.0, -30, 30);
            }
            if (!Double.isNaN(prevAltitude)) {
                pitchDeg = clamp((data.getAltitudeMeters() - prevAltitude) * 0.05, -15, 15);
            }
            prevHeading = data.getHeadingDeg();
            prevAltitude = data.getAltitudeMeters();

            if (server.clientCount() > 0) {
                server.broadcast(TelemetryJson.telemetryTick(
                        aircraftId, callsign, data, next, distanceKm, etaMinutes, rollDeg, pitchDeg));
            }

            Thread.sleep(TICK_MILLIS);
        }
    }

    private static double angleDiffDeg(double fromDeg, double toDeg) {
        return ((toDeg - fromDeg + 540) % 360) - 180;
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
