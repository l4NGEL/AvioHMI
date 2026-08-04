#pragma once

#include "RgbImage.h"

// Writes a 24-bit uncompressed BMP — the one image format a browser can
// render with zero decoding libraries, which matters here since there's no
// PNG/zlib available without a package manager.
class BmpWriter {
public:
    static void write(const char* path, const RgbImage& image);
};
