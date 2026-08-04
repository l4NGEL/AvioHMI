#pragma once

#include "PgmImage.h"

class SobelProcessor {
public:
    PgmImage run(const PgmImage& input) const;
};
