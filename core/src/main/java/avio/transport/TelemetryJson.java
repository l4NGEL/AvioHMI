package avio.transport;

import avio.domain.FlightData;
import avio.domain.Route;
import avio.domain.Waypoint;

import java.util.List;
import java.util.Locale;

/**
 * Hand-rolled JSON encoding for the fixed telemetry wire format, since this
 * project has no Maven/Gradle available to pull in Jackson/Gson.
 */
public final class TelemetryJson {

    private TelemetryJson() {
    }

    public static String route(Route route, String mode) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"type\":\"route\",\"mode\":\"").append(escape(mode))
                .append("\",\"route\":{\"id\":\"").append(escape(route.getId()))
                .append("\",\"name\":\"").append(escape(route.getName()))
                .append("\",\"waypoints\":[");
        List<Waypoint> waypoints = route.getWaypoints();
        for (int i = 0; i < waypoints.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append(waypoint(waypoints.get(i)));
        }
        sb.append("]}}");
        return sb.toString();
    }

    public static String telemetryTick(String aircraftId, String callsign, FlightData data,
                                        Waypoint nextWaypoint, double distanceToNextKm,
                                        double etaMinutes, double rollDeg, double pitchDeg,
                                        double fuelPercent) {
        return String.format(Locale.US,
                "{\"type\":\"telemetry\",\"aircraftId\":\"%s\",\"callsign\":\"%s\","
                        + "\"data\":{\"timestamp\":\"%s\",\"lat\":%.6f,\"lon\":%.6f,"
                        + "\"altitudeMeters\":%.1f,\"speedKts\":%.1f,\"headingDeg\":%.1f,"
                        + "\"rollDeg\":%.1f,\"pitchDeg\":%.1f},"
                        + "\"nextWaypoint\":%s,\"distanceToNextKm\":%.2f,\"etaMinutes\":%s,"
                        + "\"fuelPercent\":%.1f}",
                escape(aircraftId), escape(callsign), data.getTimestamp().toString(),
                data.getLatitude(), data.getLongitude(), data.getAltitudeMeters(),
                data.getSpeedKts(), data.getHeadingDeg(), rollDeg, pitchDeg,
                waypoint(nextWaypoint), distanceToNextKm, numberOrNull(etaMinutes), fuelPercent);
    }

    public static String historyArray(List<FlightData> history) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < history.size(); i++) {
            if (i > 0) sb.append(',');
            FlightData d = history.get(i);
            sb.append(String.format(Locale.US,
                    "{\"timestamp\":\"%s\",\"lat\":%.6f,\"lon\":%.6f,\"altitudeMeters\":%.1f,"
                            + "\"speedKts\":%.1f,\"headingDeg\":%.1f}",
                    d.getTimestamp().toString(), d.getLatitude(), d.getLongitude(),
                    d.getAltitudeMeters(), d.getSpeedKts(), d.getHeadingDeg()));
        }
        sb.append(']');
        return sb.toString();
    }

    public static String stringArray(List<String> values) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append('"').append(escape(values.get(i))).append('"');
        }
        sb.append(']');
        return sb.toString();
    }

    private static String waypoint(Waypoint w) {
        return String.format(Locale.US,
                "{\"name\":\"%s\",\"lat\":%.6f,\"lon\":%.6f,\"altitudeMeters\":%.1f}",
                escape(w.getName()), w.getLatitude(), w.getLongitude(), w.getAltitudeMeters());
    }

    private static String numberOrNull(double value) {
        return Double.isFinite(value) ? String.format(Locale.US, "%.2f", value) : "null";
    }

    private static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
