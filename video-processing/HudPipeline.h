#pragma once

// shared by the CLI (edge_detect.exe) and the JNI bridge (hud_native.dll) so they can't drift apart
class HudPipeline {
public:
    // inputPgmPath null -> synthetic test frame. returns edge pixel count.
    static long run(double headingDeg, double speedKts, double altitudeMeters,
                     const char* outPath, const char* inputPgmPath);
};
