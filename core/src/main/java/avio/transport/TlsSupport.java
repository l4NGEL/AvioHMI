package avio.transport;

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import java.io.File;
import java.io.FileInputStream;
import java.security.KeyStore;

// loads core/certs/dev-keystore.p12 for WSS/HTTPS (phone sensors need a secure context). regenerate:
//   keytool -genkeypair -alias aviohmi -keyalg RSA -keysize 2048 -validity 3650 \
//     -keystore core/certs/dev-keystore.p12 -storetype PKCS12 -storepass aviohmi \
//     -dname "CN=AvioHMI Dev, OU=Dev, O=AvioHMI, L=Local, ST=Local, C=TR" \
//     -ext "SAN=dns:localhost,ip:127.0.0.1,ip:<your-lan-ip>"
public final class TlsSupport {

    private static final String KEYSTORE_PATH = "certs/dev-keystore.p12";
    private static final String KEYSTORE_PASSWORD = "aviohmi";

    private TlsSupport() {
    }

    /** Returns an SSLContext built from the dev keystore, or null if it isn't present. */
    public static SSLContext loadDevContext() {
        File keystoreFile = new File(KEYSTORE_PATH);
        if (!keystoreFile.exists()) {
            return null;
        }
        try (FileInputStream in = new FileInputStream(keystoreFile)) {
            KeyStore keyStore = KeyStore.getInstance("PKCS12");
            keyStore.load(in, KEYSTORE_PASSWORD.toCharArray());

            KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
            kmf.init(keyStore, KEYSTORE_PASSWORD.toCharArray());

            SSLContext context = SSLContext.getInstance("TLS");
            context.init(kmf.getKeyManagers(), null, null);
            return context;
        } catch (Exception e) {
            System.err.println("Failed to load TLS keystore (" + KEYSTORE_PATH + "): " + e.getMessage());
            return null;
        }
    }
}
