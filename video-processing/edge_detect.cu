// CUDA image-processing + HUD overlay demo for the AvioHMI sensor pipeline.
//
// Thin CLI driver over HudPipeline (frame -> GPU Sobel edge detection ->
// HUD compositing -> BMP write); see PgmImage/RgbImage/SobelProcessor/
// HudCompositor/BmpWriter for the actual class-based implementation. This
// same pipeline is also reachable in-process from Java via HudNativeBridge
// (hud_native.dll) — see core/src/main/java/avio/service/NativeHudRenderer.java.
//
// Usage: edge_detect.exe [headingDeg] [speedKts] [altitudeMeters] [outPath] [inputPgmPath]
// All arguments are optional; run with none for the original standalone demo.
// If inputPgmPath is given, that frame (P5 binary PGM, any size) is processed
// instead of the synthetic disc — this is how Core's HUD thread feeds it a
// real frame decoded from video-processing/assets/sample_sensor_feed.mp4 via
// ffmpeg, rather than a hardcoded test pattern.

#include <cstdio>
#include <cstdlib>
#include "HudPipeline.h"

int main(int argc, char** argv) {
    double headingDeg = argc > 1 ? atof(argv[1]) : 90.0;
    double speedKts = argc > 2 ? atof(argv[2]) : 420.0;
    double altitudeM = argc > 3 ? atof(argv[3]) : 1000.0;
    const char* outPath = argc > 4 ? argv[4] : "hud_overlay.bmp";
    const char* inputPgmPath = argc > 5 ? argv[5] : nullptr;

    long edgePixels = HudPipeline::run(headingDeg, speedKts, altitudeM, outPath, inputPgmPath);

    printf("Sobel edge detection complete, %ld edge pixels detected.\n", edgePixels);
    printf("Wrote input.pgm, output.pgm, and %s (hdg=%.0f spd=%.0fkt alt=%.0fm)\n",
           outPath, headingDeg, speedKts, altitudeM);
    return 0;
}
