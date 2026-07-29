package avio.domain;

import java.time.Instant;
import java.util.Locale;

public final class FlightData {
    private final Instant timestamp;
    private final double latitude;
    private final double longitude;
    private final double altitudeMeters;
    private final double speedKts;
    private final double headingDeg;

    public FlightData(Instant timestamp, double latitude, double longitude,
                       double altitudeMeters, double speedKts, double headingDeg) {
        this.timestamp = timestamp;
        this.latitude = latitude;
        this.longitude = longitude;
        this.altitudeMeters = altitudeMeters;
        this.speedKts = speedKts;
        this.headingDeg = headingDeg;
    }

    public Instant getTimestamp() { return timestamp; }
    public double getLatitude() { return latitude; }
    public double getLongitude() { return longitude; }
    public double getAltitudeMeters() { return altitudeMeters; }
    public double getSpeedKts() { return speedKts; }
    public double getHeadingDeg() { return headingDeg; }

    @Override
    public String toString() {
        return String.format(Locale.US, "FlightData[t=%s lat=%.4f lon=%.4f alt=%.0fm spd=%.0fkt hdg=%.0f°]",
                timestamp, latitude, longitude, altitudeMeters, speedKts, headingDeg);
    }
}
