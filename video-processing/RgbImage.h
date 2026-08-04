#pragma once

#include "PgmImage.h"

class RgbImage {
public:
    RgbImage() = default;
    explicit RgbImage(const PgmImage& grayscale); // replicates gray into R=G=B
    ~RgbImage();

    RgbImage(const RgbImage&) = delete;
    RgbImage& operator=(const RgbImage&) = delete;
    RgbImage(RgbImage&& other) noexcept;
    RgbImage& operator=(RgbImage&& other) noexcept;

    void setPixel(int x, int y, unsigned char r, unsigned char g, unsigned char b);
    void drawFilledRect(int x0, int y0, int x1, int y1, unsigned char r, unsigned char g, unsigned char b);
    void drawRectOutline(int x0, int y0, int x1, int y1, unsigned char r, unsigned char g, unsigned char b);
    void drawHLine(int x0, int x1, int y, unsigned char r, unsigned char g, unsigned char b);
    void drawVLine(int x, int y0, int y1, unsigned char r, unsigned char g, unsigned char b);

    const unsigned char* data() const { return data_; }
    int width() const { return width_; }
    int height() const { return height_; }

private:
    unsigned char* data_ = nullptr;
    int width_ = 0;
    int height_ = 0;
};
