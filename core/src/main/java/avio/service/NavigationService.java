package avio.service;

import avio.domain.FlightData;
import avio.domain.Waypoint;

public final class NavigationService {
    private static final double EARTH_RADIUS_METERS = 6_371_000.0;

    public double distanceToMeters(FlightData from, Waypoint to) {
        double lat1 = Math.toRadians(from.getLatitude());
        double lat2 = Math.toRadians(to.getLatitude());
        double dLat = Math.toRadians(to.getLatitude() - from.getLatitude());
        double dLon = Math.toRadians(to.getLongitude() - from.getLongitude());

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_METERS * c;
    }

    public double etaMinutes(FlightData from, Waypoint to) {
        double distanceMeters = distanceToMeters(from, to);
        double speedMs = from.getSpeedKts() * 0.514444;
        if (speedMs <= 0.0) return Double.POSITIVE_INFINITY;
        return (distanceMeters / speedMs) / 60.0;
    }
}
