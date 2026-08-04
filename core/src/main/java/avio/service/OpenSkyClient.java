package avio.service;

import avio.transport.MiniJson;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

// Polls OpenSky's states/all REST endpoint. Anonymous by default (low rate limit);
// uses OAuth2 client-credentials if OPENSKY_CLIENT_ID/SECRET are set.
public final class OpenSkyClient {
    private static final String STATES_URL = "https://opensky-network.org/api/states/all";
    private static final String TOKEN_URL =
            "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
    private static final double MPS_TO_KTS = 1.94384;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final String clientId = System.getenv("OPENSKY_CLIENT_ID");
    private final String clientSecret = System.getenv("OPENSKY_CLIENT_SECRET");
    private String accessToken;
    private Instant tokenExpiry = Instant.EPOCH;

    public record RealAircraftState(String icao24, String callsign, double latitude, double longitude,
                                     double altitudeMeters, double speedKts, double headingDeg) {
    }

    /** Fetches current state vectors within [lamin,lomin,lamax,lomax], skipping aircraft with no position or on the ground. */
    public List<RealAircraftState> fetchStates(double lamin, double lomin, double lamax, double lomax) throws Exception {
        String url = String.format(Locale.US, "%s?lamin=%.4f&lomin=%.4f&lamax=%.4f&lomax=%.4f",
                STATES_URL, lamin, lomin, lamax, lomax);
        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .GET();

        String token = authenticatedToken();
        if (token != null) {
            requestBuilder.header("Authorization", "Bearer " + token);
        }

        HttpResponse<String> response = httpClient.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IllegalStateException("OpenSky returned HTTP " + response.statusCode());
        }

        Map<String, Object> root = MiniJson.asObject(MiniJson.parse(response.body()));
        Object statesRaw = root.get("states");
        if (statesRaw == null) return List.of();

        List<RealAircraftState> result = new ArrayList<>();
        for (Object rowObj : MiniJson.asArray(statesRaw)) {
            List<Object> row = MiniJson.asArray(rowObj);

            Boolean onGround = (Boolean) row.get(8);
            Double lon = (Double) row.get(5);
            Double lat = (Double) row.get(6);
            if (Boolean.TRUE.equals(onGround) || lat == null || lon == null) continue;

            Double baroAlt = (Double) row.get(7);
            Double geoAlt = (Double) row.get(13);
            double altitudeMeters = baroAlt != null ? baroAlt : (geoAlt != null ? geoAlt : 0.0);

            Double velocityMs = (Double) row.get(9);
            double speedKts = velocityMs != null ? velocityMs * MPS_TO_KTS : 0.0;

            Double trueTrack = (Double) row.get(10);
            double headingDeg = trueTrack != null ? trueTrack : 0.0;

            String icao24 = String.valueOf(row.get(0)).toUpperCase(Locale.ROOT);
            String callsignRaw = row.get(1) != null ? row.get(1).toString().trim() : "";
            String callsign = callsignRaw.isEmpty() ? icao24 : callsignRaw;

            result.add(new RealAircraftState(icao24, callsign, lat, lon, altitudeMeters, speedKts, headingDeg));
        }
        return result;
    }

    /** Returns a cached OAuth2 bearer token, refreshing it if missing/expired; null if no credentials are configured. */
    private String authenticatedToken() {
        if (clientId == null || clientSecret == null || clientId.isBlank() || clientSecret.isBlank()) {
            return null;
        }
        if (accessToken != null && Instant.now().isBefore(tokenExpiry)) {
            return accessToken;
        }
        try {
            String form = "grant_type=client_credentials&client_id=" + urlEncode(clientId)
                    + "&client_secret=" + urlEncode(clientSecret);
            HttpRequest request = HttpRequest.newBuilder(URI.create(TOKEN_URL))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                System.err.println("OpenSky OAuth2 token request failed: HTTP " + response.statusCode()
                        + " — falling back to anonymous access.");
                accessToken = null;
                return null;
            }
            Map<String, Object> body = MiniJson.asObject(MiniJson.parse(response.body()));
            accessToken = (String) body.get("access_token");
            double expiresInSeconds = ((Double) body.getOrDefault("expires_in", 1800.0));
            tokenExpiry = Instant.now().plusSeconds((long) expiresInSeconds - 60); // refresh a minute early
            return accessToken;
        } catch (Exception e) {
            System.err.println("OpenSky OAuth2 token request failed: " + e.getMessage()
                    + " — falling back to anonymous access.");
            accessToken = null;
            return null;
        }
    }

    private static String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
