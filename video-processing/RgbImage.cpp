#include "RgbImage.h"
#include <cstdlib>

RgbImage::RgbImage(const PgmImage& grayscale) : width_(grayscale.width()), height_(grayscale.height()) {
    size_t bytes = grayscale.byteCount();
    data_ = (unsigned char*)malloc(bytes * 3);
    const unsigned char* gray = grayscale.data();
    for (size_t i = 0; i < bytes; i++) {
        data_[i * 3 + 0] = gray[i];
        data_[i * 3 + 1] = gray[i];
        data_[i * 3 + 2] = gray[i];
    }
}

RgbImage::~RgbImage() {
    free(data_);
}

RgbImage::RgbImage(RgbImage&& other) noexcept
    : data_(other.data_), width_(other.width_), height_(other.height_) {
    other.data_ = nullptr;
    other.width_ = 0;
    other.height_ = 0;
}

RgbImage& RgbImage::operator=(RgbImage&& other) noexcept {
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

void RgbImage::setPixel(int x, int y, unsigned char r, unsigned char g, unsigned char b) {
    if (x < 0 || y < 0 || x >= width_ || y >= height_) return;
    int idx = (y * width_ + x) * 3;
    data_[idx] = r; data_[idx + 1] = g; data_[idx + 2] = b;
}

void RgbImage::drawFilledRect(int x0, int y0, int x1, int y1, unsigned char r, unsigned char g, unsigned char b) {
    for (int y = y0; y <= y1; y++)
        for (int x = x0; x <= x1; x++)
            setPixel(x, y, r, g, b);
}

void RgbImage::drawRectOutline(int x0, int y0, int x1, int y1, unsigned char r, unsigned char g, unsigned char b) {
    for (int x = x0; x <= x1; x++) { setPixel(x, y0, r, g, b); setPixel(x, y1, r, g, b); }
    for (int y = y0; y <= y1; y++) { setPixel(x0, y, r, g, b); setPixel(x1, y, r, g, b); }
}

void RgbImage::drawHLine(int x0, int x1, int y, unsigned char r, unsigned char g, unsigned char b) {
    for (int x = x0; x <= x1; x++) setPixel(x, y, r, g, b);
}

void RgbImage::drawVLine(int x, int y0, int y1, unsigned char r, unsigned char g, unsigned char b) {
    for (int y = y0; y <= y1; y++) setPixel(x, y, r, g, b);
}
