package avio.service;

import java.io.File;

/**
 * JNI bridge into video-processing's native C++/CUDA HUD pipeline
 * (video-processing/hud_native.dll, built by video-processing/build.bat) —
 * calls the same Sobel edge-detection + HUD compositing pipeline in-process
 * instead of spawning edge_detect.exe as a subprocess on every frame.
 * Falls back gracefully to the subprocess path (see TelemetryServerApp) if
 * the native library wasn't built for this platform, matching the project's
 * other optional-capability degradation (Postgres, ffmpeg, TLS).
 */
public final class NativeHudRenderer {
    private static final boolean AVAILABLE;

    static {
        boolean loaded;
        try {
            System.load(new File("../video-processing/hud_native.dll").getAbsolutePath());
            loaded = true;
        } catch (Throwable t) {
            loaded = false;
        }
        AVAILABLE = loaded;
    }

    private NativeHudRenderer() {
    }

    public static boolean isAvailable() {
        return AVAILABLE;
    }

    /** Renders the HUD overlay natively. Only call when isAvailable() is true. */
    public static native boolean render(double headingDeg, double speedKts, double altitudeMeters,
                                         String outPath, String inputPgmPath);
}
