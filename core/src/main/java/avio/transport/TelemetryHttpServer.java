package avio.transport;

import avio.data.PostgresTelemetryRepository;
import avio.domain.FlightData;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpsConfigurator;
import com.sun.net.httpserver.HttpsServer;

import javax.net.ssl.SSLContext;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/**
 * Small JDK-only HTTP server (com.sun.net.httpserver, no extra dependency)
 * that exposes what a WebSocket broadcast can't: on-demand history queries
 * for playback, and the CUDA-generated HUD overlay frame. Serves HTTPS
 * instead of HTTP when constructed with an SSLContext — needed so a Ground
 * Control page loaded over HTTPS (required for camera/GPS/compass on a real
 * phone) doesn't hit mixed-content blocking fetching from Core.
 */
public final class TelemetryHttpServer {
    private final HttpServer server;

    public TelemetryHttpServer(int port, PostgresTelemetryRepository postgres,
                                Supplier<List<String>> aircraftIdsSupplier, Supplier<File> overlayFileSupplier) throws IOException {
        this(port, postgres, aircraftIdsSupplier, overlayFileSupplier, null);
    }

    public TelemetryHttpServer(int port, PostgresTelemetryRepository postgres, Supplier<List<String>> aircraftIdsSupplier,
                                Supplier<File> overlayFileSupplier, SSLContext sslContext) throws IOException {
        if (sslContext != null) {
            HttpsServer httpsServer = HttpsServer.create(new InetSocketAddress(port), 0);
            httpsServer.setHttpsConfigurator(new HttpsConfigurator(sslContext));
            server = httpsServer;
        } else {
            server = HttpServer.create(new InetSocketAddress(port), 0);
        }

        server.createContext("/aircraft", exchange -> {
            withCors(exchange);
            writeJson(exchange, TelemetryJson.stringArray(aircraftIdsSupplier.get()));
        });

        server.createContext("/history", exchange -> {
            withCors(exchange);
            if (postgres == null) {
                writeJson(exchange, "[]");
                return;
            }
            List<String> aircraftIds = aircraftIdsSupplier.get();
            Map<String, String> query = parseQuery(exchange.getRequestURI().getRawQuery());
            String aircraftId = query.getOrDefault("aircraftId", aircraftIds.isEmpty() ? "" : aircraftIds.get(0));
            int limit = Integer.parseInt(query.getOrDefault("limit", "300"));
            List<FlightData> history = postgres.history(aircraftId, limit);
            writeJson(exchange, TelemetryJson.historyArray(history));
        });

        server.createContext("/overlay.bmp", exchange -> {
            withCors(exchange);
            File file = overlayFileSupplier.get();
            if (file == null || !file.exists()) {
                exchange.sendResponseHeaders(404, -1);
                exchange.close();
                return;
            }
            byte[] bytes = Files.readAllBytes(file.toPath());
            exchange.getResponseHeaders().add("Content-Type", "image/bmp");
            exchange.getResponseHeaders().add("Cache-Control", "no-store");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(bytes);
            }
        });

        server.setExecutor(null);
    }

    public void start() {
        server.start();
    }

    private static void withCors(HttpExchange exchange) {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
    }

    private static void writeJson(HttpExchange exchange, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }

    private static Map<String, String> parseQuery(String rawQuery) {
        Map<String, String> result = new java.util.HashMap<>();
        if (rawQuery == null || rawQuery.isEmpty()) return result;
        for (String pair : rawQuery.split("&")) {
            int eq = pair.indexOf('=');
            if (eq < 0) continue;
            String key = java.net.URLDecoder.decode(pair.substring(0, eq), StandardCharsets.UTF_8);
            String value = java.net.URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
            result.put(key, value);
        }
        return result;
    }
}
