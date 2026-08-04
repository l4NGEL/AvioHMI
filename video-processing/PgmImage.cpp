#include "PgmImage.h"

PgmImage::PgmImage(int width, int height) : width_(width), height_(height) {
    data_ = (unsigned char*)malloc((size_t)width * height);
}

PgmImage::~PgmImage() {
    free(data_);
}

PgmImage::PgmImage(PgmImage&& other) noexcept
    : data_(other.data_), width_(other.width_), height_(other.height_) {
    other.data_ = nullptr;
    other.width_ = 0;
    other.height_ = 0;
}

PgmImage& PgmImage::operator=(PgmImage&& other) noexcept {
    if (this != &other) {
        free(data_);
        data_ = other.data_;
        width_ = other.width_;
        height_ = other.height_;
        other.data_ = nullptr;
        other.width_ = 0;
        other.height_ = 0;
    }
    return *this;
}

// Reads a binary (P5) PGM of any size, e.g. a frame ffmpeg extracted from a real video.
PgmImage PgmImage::load(const char* path) {
    FILE* f = fopen(path, "rb");
    if (!f) return PgmImage();

    char magic[2];
    if (fread(magic, 1, 2, f) != 2 || magic[0] != 'P' || magic[1] != '5') { fclose(f); return PgmImage(); }

    int values[3]; // width, height, maxval
    int count = 0;
    while (count < 3) {
        int ch = fgetc(f);
        if (ch == EOF) { fclose(f); return PgmImage(); }
        if (ch == '#') { while (ch != '\n' && ch != EOF) ch = fgetc(f); continue; }
        if (isspace(ch)) continue;
        ungetc(ch, f);
        if (fscanf(f, "%d", &values[count]) != 1) { fclose(f); return PgmImage(); }
        count++;
    }
    fgetc(f); // the single whitespace byte separating the header from raw pixel data

    PgmImage image(values[0], values[1]);
    if (fread(image.data_, 1, image.byteCount(), f) != image.byteCount()) {
        fclose(f);
        return PgmImage();
    }
    fclose(f);
    return image;
}

PgmImage PgmImage::syntheticTestPattern(int width, int height) {
    PgmImage image(width, height);
    // A bright disc (a simulated target) over a gradient sky.
    int cx = width / 2, cy = height / 2, r = width / 5;
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int dx = x - cx, dy = y - cy;
            bool inDisc = (dx * dx + dy * dy) <= (r * r);
            unsigned char gradient = (unsigned char)((x * 255) / width);
            image.data_[y * width + x] = inDisc ? 230 : gradient / 3;
        }
    }
    return image;
}

void PgmImage::writeTo(const char* path) const {
    FILE* f = fopen(path, "wb");
    if (!f) { fprintf(stderr, "Failed to open %s for writing\n", path); return; }
    fprintf(f, "P5\n%d %d\n255\n", width_, height_);
    fwrite(data_, 1, byteCount(), f);
    fclose(f);
}
