package avio.data;

import avio.domain.FlightData;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Persists telemetry to the routes/telemetry PostGIS schema in db/init/001_schema.sql,
 * so history survives restarts and can be replayed (see TelemetryHttpServer's /history).
 * Requires core/lib/postgresql.jar on the classpath (vendored manually — no Maven/Gradle here).
 */
public final class PostgresTelemetryRepository implements TelemetryRepository, AutoCloseable {
    private final Connection connection;

    public PostgresTelemetryRepository(String url, String user, String password) throws SQLException {
        this.connection = DriverManager.getConnection(url, user, password);
    }

    @Override
    public void record(String aircraftId, FlightData data) {
        String sql = "INSERT INTO telemetry (aircraft_id, recorded_at, location, altitude_meters, speed_kts, heading_deg) "
                + "VALUES (?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?, ?, ?)";
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            ps.setString(1, aircraftId);
            ps.setTimestamp(2, Timestamp.from(data.getTimestamp()));
            ps.setDouble(3, data.getLongitude());
            ps.setDouble(4, data.getLatitude());
            ps.setDouble(5, data.getAltitudeMeters());
            ps.setDouble(6, data.getSpeedKts());
            ps.setDouble(7, data.getHeadingDeg());
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to record telemetry", e);
        }
    }

    @Override
    public List<FlightData> history(String aircraftId) {
        return history(aircraftId, 500);
    }

    public List<FlightData> history(String aircraftId, int limit) {
        String sql = "SELECT recorded_at, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon, "
                + "altitude_meters, speed_kts, heading_deg FROM telemetry WHERE aircraft_id = ? "
                + "ORDER BY recorded_at DESC LIMIT ?";
        List<FlightData> result = new ArrayList<>();
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            ps.setString(1, aircraftId);
            ps.setInt(2, limit);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    result.add(new FlightData(
                            rs.getTimestamp("recorded_at").toInstant(),
                            rs.getDouble("lat"), rs.getDouble("lon"),
                            rs.getDouble("altitude_meters"), rs.getDouble("speed_kts"), rs.getDouble("heading_deg")));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to query telemetry history", e);
        }
        Collections.reverse(result); // rows come back newest-first; callers want chronological order
        return result;
    }

    public List<String> listAircraftIds() {
        String sql = "SELECT DISTINCT aircraft_id FROM telemetry ORDER BY aircraft_id";
        List<String> ids = new ArrayList<>();
        try (PreparedStatement ps = connection.prepareStatement(sql); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) ids.add(rs.getString(1));
        } catch (SQLException e) {
            throw new RuntimeException("Failed to list aircraft ids", e);
        }
        return ids;
    }

    @Override
    public FlightData latest(String aircraftId) {
        List<FlightData> recent = history(aircraftId, 1);
        return recent.isEmpty() ? null : recent.get(recent.size() - 1);
    }

    @Override
    public void close() throws SQLException {
        connection.close();
    }
}
