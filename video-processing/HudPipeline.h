#pragma once

// Orchestrates the full frame -> Sobel -> HUD -> BMP pipeline, shared by
// both the standalone CLI (edge_detect.exe, invoked as a subprocess) and
// the JNI bridge (hud_native.dll, called in-process from Java) so the two
// entry points can't drift apart.
class HudPipeline {
public:
    // inputPgmPath may be null, in which case a synthetic test frame is used.
    // Returns the number of edge pixels detected (>40 intensity), for logging.
    static long run(double headingDeg, double speedKts, double altitudeMeters,
                     const char* outPath, const char* inputPgmPath);
};
