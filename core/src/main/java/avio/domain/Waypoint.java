package avio.domain;

public final class Waypoint {
    private final String name;
    private final double latitude;
    private final double longitude;
    private final double altitudeMeters;

    public Waypoint(String name, double latitude, double longitude, double altitudeMeters) {
        this.name = name;
        this.latitude = latitude;
        this.longitude = longitude;
        this.altitudeMeters = altitudeMeters;
    }

    public String getName() { return name; }
    public double getLatitude() { return latitude; }
    public double getLongitude() { return longitude; }
    public double getAltitudeMeters() { return altitudeMeters; }

    @Override
    public String toString() {
        return String.format("Waypoint[%s @ %.4f,%.4f alt=%.0fm]", name, latitude, longitude, altitudeMeters);
    }
}
