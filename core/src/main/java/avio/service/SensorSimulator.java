package avio.service;

import avio.data.TelemetryRepository;
import avio.domain.FlightData;
import avio.domain.Route;
import avio.domain.Waypoint;

import java.time.Instant;
import java.util.List;

/**
 * Interpolates a straight line between consecutive waypoints of a route and
 * emits a FlightData tick each time step() is called, simulating a sensor feed.
 */
public final class SensorSimulator {
    private final String aircraftId;
    private final Route route;
    private final EventBus eventBus;
    private final TelemetryRepository telemetryRepository;
    private final double speedKts;

    private int legIndex = 0;
    private double legProgress = 0.0;
    private boolean finished = false;

    public SensorSimulator(String aircraftId, Route route, EventBus eventBus,
                            TelemetryRepository telemetryRepository, double speedKts) {
        this.aircraftId = aircraftId;
        this.route = route;
        this.eventBus = eventBus;
        this.telemetryRepository = telemetryRepository;
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

        FlightData data = new FlightData(Instant.now(), lat, lon, alt, speedKts, heading);
        telemetryRepository.record(aircraftId, data);
        eventBus.publish(aircraftId, data);
        return data;
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
