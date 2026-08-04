package avio.transport;

import javax.net.ServerSocketFactory;
import javax.net.ssl.SSLContext;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

// hand-rolled RFC 6455 server, broadcast-only (no Maven means no netty/jetty). WSS if built with an SSLContext.
public final class WebSocketServer {
    private static final String HANDSHAKE_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

    private final int port;
    private final SSLContext sslContext;
    private final List<ClientConnection> clients = new CopyOnWriteArrayList<>();
    private Consumer<ClientConnection> onClientConnected;
    private ServerSocket serverSocket;
    private volatile boolean running = false;

    public WebSocketServer(int port) {
        this(port, null);
    }

    public WebSocketServer(int port, SSLContext sslContext) {
        this.port = port;
        this.sslContext = sslContext;
    }

    public void onClientConnected(Consumer<ClientConnection> handler) {
        this.onClientConnected = handler;
    }

    public void start() throws IOException {
        ServerSocketFactory factory = sslContext != null
                ? sslContext.getServerSocketFactory()
                : ServerSocketFactory.getDefault();
        serverSocket = factory.createServerSocket(port);
        running = true;
        Thread acceptThread = new Thread(this::acceptLoop, "ws-accept");
        acceptThread.setDaemon(true);
        acceptThread.start();
    }

    public void stop() throws IOException {
        running = false;
        if (serverSocket != null) serverSocket.close();
    }

    public int clientCount() {
        return clients.size();
    }

    public void broadcast(String message) {
        byte[] payload = message.getBytes(StandardCharsets.UTF_8);
        for (ClientConnection client : clients) {
            try {
                client.sendText(payload);
            } catch (IOException e) {
                clients.remove(client);
            }
        }
    }

    private void acceptLoop() {
        while (running) {
            try {
                Socket socket = serverSocket.accept();
                Thread clientThread = new Thread(() -> handleClient(socket), "ws-client");
                clientThread.setDaemon(true);
                clientThread.start();
            } catch (IOException e) {
                if (running) {
                    System.err.println("WebSocketServer accept failed: " + e.getMessage());
                }
            }
        }
    }

    private void handleClient(Socket socket) {
        ClientConnection connection = null;
        try {
            InputStream in = socket.getInputStream();
            String key = readHandshakeKey(in);
            if (key == null) {
                socket.close();
                return;
            }

            String accept = acceptKeyFor(key);
            OutputStream out = socket.getOutputStream();
            String response = "HTTP/1.1 101 Switching Protocols\r\n"
                    + "Upgrade: websocket\r\n"
                    + "Connection: Upgrade\r\n"
                    + "Sec-WebSocket-Accept: " + accept + "\r\n\r\n";
            out.write(response.getBytes(StandardCharsets.US_ASCII));
            out.flush();

            connection = new ClientConnection(socket, out);
            clients.add(connection);
            if (onClientConnected != null) onClientConnected.accept(connection);

            // This server only broadcasts; incoming client frames are discarded
            // except for close frames, which get a proper closing handshake reply.
            while (running) {
                int opcode = readFrameDiscardingPayload(in);
                if (opcode == -1) break;
                if (opcode == 0x8) {
                    connection.sendCloseFrame();
                    break;
                }
            }
        } catch (IOException | NoSuchAlgorithmException e) {
            // Handshake failed or connection dropped; fall through to cleanup.
        } finally {
            if (connection != null) clients.remove(connection);
            try {
                socket.close();
            } catch (IOException ignored) {
                // socket already gone
            }
        }
    }

    /** Reads HTTP request lines up to the blank line, returning Sec-WebSocket-Key. */
    private String readHandshakeKey(InputStream in) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.US_ASCII));
        String line;
        String key = null;
        while ((line = reader.readLine()) != null && !line.isEmpty()) {
            int sep = line.indexOf(':');
            if (sep > 0 && line.substring(0, sep).equalsIgnoreCase("Sec-WebSocket-Key")) {
                key = line.substring(sep + 1).trim();
            }
        }
        return key;
    }

    private String acceptKeyFor(String key) throws NoSuchAlgorithmException {
        MessageDigest sha1 = MessageDigest.getInstance("SHA-1");
        byte[] hash = sha1.digest((key + HANDSHAKE_MAGIC).getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(hash);
    }

    /** Reads and discards one WebSocket frame's payload; returns its opcode, or -1 on EOF. */
    private int readFrameDiscardingPayload(InputStream in) throws IOException {
        int b0 = in.read();
        if (b0 == -1) return -1;
        int opcode = b0 & 0x0F;

        int b1 = in.read();
        if (b1 == -1) return -1;
        boolean masked = (b1 & 0x80) != 0;
        long len = b1 & 0x7F;
        if (len == 126) {
            len = (readByte(in) << 8) | readByte(in);
        } else if (len == 127) {
            len = 0;
            for (int i = 0; i < 8; i++) len = (len << 8) | readByte(in);
        }

        byte[] mask = new byte[4];
        if (masked && readFully(in, mask, 4) < 4) return -1;

        byte[] payload = new byte[(int) len];
        if (readFully(in, payload, payload.length) < payload.length) return -1;

        return opcode;
    }

    private int readByte(InputStream in) throws IOException {
        int b = in.read();
        if (b == -1) throw new IOException("Unexpected end of stream");
        return b;
    }

    private int readFully(InputStream in, byte[] buffer, int length) throws IOException {
        int total = 0;
        while (total < length) {
            int r = in.read(buffer, total, length - total);
            if (r == -1) break;
            total += r;
        }
        return total;
    }

    public static final class ClientConnection {
        private final Socket socket;
        private final OutputStream out;

        ClientConnection(Socket socket, OutputStream out) {
            this.socket = socket;
            this.out = out;
        }

        public synchronized void sendText(String message) throws IOException {
            sendText(message.getBytes(StandardCharsets.UTF_8));
        }

        public synchronized void sendCloseFrame() throws IOException {
            out.write(0x88); // FIN + close-frame opcode
            out.write(0);    // zero-length payload
            out.flush();
        }

        public synchronized void sendText(byte[] payload) throws IOException {
            out.write(0x81); // FIN + text-frame opcode
            int len = payload.length;
            if (len <= 125) {
                out.write(len);
            } else if (len <= 65535) {
                out.write(126);
                out.write((len >> 8) & 0xFF);
                out.write(len & 0xFF);
            } else {
                out.write(127);
                for (int i = 7; i >= 0; i--) out.write((int) ((len >> (8 * i)) & 0xFF));
            }
            out.write(payload);
            out.flush();
        }
    }
}
