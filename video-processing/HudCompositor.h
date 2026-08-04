#pragma once

#include "RgbImage.h"

class HudCompositor {
public:
    void draw(RgbImage& image, double headingDeg, double speedKts, double altitudeMeters) const;
};
