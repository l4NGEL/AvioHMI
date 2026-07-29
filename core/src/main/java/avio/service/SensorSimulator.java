package avio.service;

import avio.domain.FlightData;
import avio.domain.Route;
import avio.domain.Waypoint;

import java.time.Instant;
import java.util.List;

/**
 * Interpolates a straight line between consecutive waypoints of a route and
 * emits a FlightData tick each time step() is called, simulating a sensor feed.
 * Pure physics/geometry only — recording history and publishing ticks is the
 * caller's responsibility (see MissionComputerApp, TelemetryServerApp).
 */
public final class SensorSimulator {
    private final Route route;
    private final double speedKts;

    private int legIndex = 0;
    private double legProgress = 0.0;
    private boolean finished = false;

    public SensorSimulator(Route route, double speedKts) {
        this.route = route;
        this.speedKts = speedKts;
    }

    public boolean isFinished() {
        return finished;
    }

    /** Rewinds to the start of the route so the same simulator can loop indefinitely. */
    public void reset() {
        legIndex = 0;
        legProgress = 0.0;
        finished = false;
    }

    /** Jumps to an arbitrary point on the route, e.g. to stagger multiple aircraft. */
    public void seek(int legIndex, double legProgress) {
        int lastLeg = route.getWaypoints().size() - 2;
        this.legIndex = Math.max(0, Math.min(legIndex, lastLeg));
        this.legProgress = legProgress;
        this.finished = false;
    }

    /** Fraction of the whole route flown so far, 0 (start) to 1 (finished). */
    public double totalProgress() {
        int legs = route.getWaypoints().size() - 1;
        return (legIndex + legProgress) / legs;
    }

    /** The waypoint the aircraft is currently flying toward. */
    public Waypoint getCurrentTarget() {
        List<Waypoint> waypoints = route.getWaypoints();
        return waypoints.get(Math.min(legIndex + 1, waypoints.size() - 1));
    }

    public FlightData step(double progressIncrement) {
        if (finished) {
            throw new IllegalStateException("Route already completed");
        }
        List<Waypoint> waypoints = route.getWaypoints();
        int lastLeg = waypoints.size() - 2;

        legProgress += progressIncrement;
        while (legProgress >= 1.0 && legIndex < lastLeg) {
            legProgress -= 1.0;
            legIndex++;
        }
        if (legIndex >= lastLeg && legProgress >= 1.0) {
            legProgress = 1.0;
            finished = true;
        }

        Waypoint from = waypoints.get(legIndex);
        Waypoint to = waypoints.get(legIndex + 1);
        double t = legProgress;
        double lat = from.getLatitude() + (to.getLatitude() - from.getLatitude()) * t;
        double lon = from.getLongitude() + (to.getLongitude() - from.getLongitude()) * t;
        double alt = from.getAltitudeMeters() + (to.getAltitudeMeters() - from.getAltitudeMeters()) * t;
        double heading = bearingDeg(from, to);

        return new FlightData(Instant.now(), lat, lon, alt, speedKts, heading);
    }

    private double bearingDeg(Waypoint from, Waypoint to) {
        double lat1 = Math.toRadians(from.getLatitude());
        double lat2 = Math.toRadians(to.getLatitude());
        double dLon = Math.toRadians(to.getLongitude() - from.getLongitude());

        double y = Math.sin(dLon) * Math.cos(lat2);
        double x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        double bearing = Math.toDegrees(Math.atan2(y, x));
        return (bearing + 360.0) % 360.0;
    }
}
