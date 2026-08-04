#pragma once

#include "RgbImage.h"

// Draws the green HUD overlay (heading tape, speed/altitude bars, boresight
// reticle) onto an already-composited RGB frame, using live telemetry
// values passed in from Core.
class HudCompositor {
public:
    void draw(RgbImage& image, double headingDeg, double speedKts, double altitudeMeters) const;
};
