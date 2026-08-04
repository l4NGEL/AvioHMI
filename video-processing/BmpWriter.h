#pragma once

#include "RgbImage.h"

// uncompressed BMP since there's no PNG/zlib available without a package manager
class BmpWriter {
public:
    static void write(const char* path, const RgbImage& image);
};
