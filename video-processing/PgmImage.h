#pragma once

#include <cstdio>
#include <cstdlib>
#include <cctype>
#include <utility>

// Move-only, so nothing double-frees the buffer we hand to cudaMemcpy.
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
