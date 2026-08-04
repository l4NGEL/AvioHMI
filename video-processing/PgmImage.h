#pragma once

#include <cstdio>
#include <cstdlib>
#include <cctype>
#include <utility>

// RAII owner of a single-channel (grayscale) pixel buffer, loaded from or
// written to the binary PGM (P5) format. Move-only, since it owns a raw
// heap buffer sized for the GPU pipeline (no std::vector here, to keep the
// same malloc'd-buffer shape SobelProcessor hands to cudaMemcpy).
class PgmImage {
public:
    PgmImage() = default;
    PgmImage(int width, int height);
    ~PgmImage();

    PgmImage(const PgmImage&) = delete;
    PgmImage& operator=(const PgmImage&) = delete;
    PgmImage(PgmImage&& other) noexcept;
    PgmImage& operator=(PgmImage&& other) noexcept;

    static PgmImage load(const char* path);
    static PgmImage syntheticTestPattern(int width, int height);
    void writeTo(const char* path) const;

    unsigned char* data() { return data_; }
    const unsigned char* data() const { return data_; }
    int width() const { return width_; }
    int height() const { return height_; }
    size_t byteCount() const { return (size_t)width_ * height_; }
    bool valid() const { return data_ != nullptr; }

private:
    unsigned char* data_ = nullptr;
    int width_ = 0;
    int height_ = 0;
};
