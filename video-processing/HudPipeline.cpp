#include "HudPipeline.h"
#include "PgmImage.h"
#include "RgbImage.h"
#include "SobelProcessor.h"
#include "HudCompositor.h"
#include "BmpWriter.h"
#include <cstdio>

long HudPipeline::run(double headingDeg, double speedKts, double altitudeMeters,
                       const char* outPath, const char* inputPgmPath) {
    PgmImage input;
    if (inputPgmPath) {
        input = PgmImage::load(inputPgmPath);
        if (!input.valid()) {
            fprintf(stderr, "Failed to read %s, falling back to the synthetic test frame\n", inputPgmPath);
        }
    }
    if (!input.valid()) {
        input = PgmImage::syntheticTestPattern(512, 512);
    }
    input.writeTo("input.pgm");

    SobelProcessor sobel;
    PgmImage edges = sobel.run(input);
    edges.writeTo("output.pgm");

    long edgePixels = 0;
    const unsigned char* edgeData = edges.data();
    for (size_t i = 0; i < edges.byteCount(); i++) {
        if (edgeData[i] > 40) edgePixels++;
    }

    RgbImage composite(edges);
    HudCompositor hud;
    hud.draw(composite, headingDeg, speedKts, altitudeMeters);
    BmpWriter::write(outPath, composite);

    return edgePixels;
}
