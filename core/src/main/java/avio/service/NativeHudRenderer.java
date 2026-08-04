package avio.service;

import java.io.File;

// JNI bridge to video-processing/hud_native.dll. Falls back to spawning edge_detect.exe if not built.
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
