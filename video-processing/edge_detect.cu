// usage: edge_detect.exe [headingDeg] [speedKts] [altitudeMeters] [outPath] [inputPgmPath]
// all args optional. same pipeline also runs in-process via hud_native.dll (see HudNativeBridge.cpp)

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
