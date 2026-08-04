#pragma once

#include "PgmImage.h"

// Encapsulates the GPU Sobel edge-detection pass: device memory allocation,
// host<->device transfer, kernel launch, and cleanup are all owned by run(),
// so callers never touch CUDA directly.
class SobelProcessor {
public:
    PgmImage run(const PgmImage& input) const;
};
