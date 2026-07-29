// CUDA image-processing + HUD overlay demo for the AvioHMI sensor pipeline.
//
// Generates a synthetic grayscale frame (simulating a camera/sensor tile),
// runs a Sobel edge-detection kernel on the GPU, then composites a simple
// green HUD (heading tape, speed/altitude bars, center reticle) on the CPU
// using live telemetry values passed in from Core, and writes the result as
// an uncompressed 24-bit BMP — the one image format a browser can render
// with zero decoding libraries, which matters here since there's no PNG/zlib
// available without a package manager.
//
// Usage: edge_detect.exe [headingDeg] [speedKts] [altitudeMeters] [outPath]
// All arguments are optional; run with none for the original standalone demo.

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cmath>
#include <cuda_runtime.h>

#define CUDA_CHECK(call)                                                          \
    do {                                                                         \
        cudaError_t err = (call);                                                \
        if (err != cudaSuccess) {                                                \
            fprintf(stderr, "CUDA error %s at %s:%d\n", cudaGetErrorString(err),  \
                    __FILE__, __LINE__);                                         \
            exit(1);                                                             \
        }                                                                        \
    } while (0)

__global__ void sobelKernel(const unsigned char* input, unsigned char* output, int width, int height) {
    int x = blockIdx.x * blockDim.x + threadIdx.x;
    int y = blockIdx.y * blockDim.y + threadIdx.y;
    if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) {
        if (x < width && y < height) output[y * width + x] = 0;
        return;
    }

    int gx =
        -1 * input[(y - 1) * width + (x - 1)] + 1 * input[(y - 1) * width + (x + 1)] +
        -2 * input[y * width + (x - 1)]       + 2 * input[y * width + (x + 1)] +
        -1 * input[(y + 1) * width + (x - 1)] + 1 * input[(y + 1) * width + (x + 1)];

    int gy =
        -1 * input[(y - 1) * width + (x - 1)] - 2 * input[(y - 1) * width + x] - 1 * input[(y - 1) * width + (x + 1)] +
         1 * input[(y + 1) * width + (x - 1)] + 2 * input[(y + 1) * width + x] + 1 * input[(y + 1) * width + (x + 1)];

    int magnitude = (int)sqrtf((float)(gx * gx + gy * gy));
    output[y * width + x] = (unsigned char)(magnitude > 255 ? 255 : magnitude);
}

static void writePgm(const char* path, const unsigned char* data, int width, int height) {
    FILE* f = fopen(path, "wb");
    if (!f) { fprintf(stderr, "Failed to open %s for writing\n", path); exit(1); }
    fprintf(f, "P5\n%d %d\n255\n", width, height);
    fwrite(data, 1, (size_t)width * height, f);
    fclose(f);
}

// --- Minimal RGB canvas + HUD drawing (host-side; no CUDA needed for this part) ---

static void setPixel(unsigned char* rgb, int width, int height, int x, int y,
                      unsigned char r, unsigned char g, unsigned char b) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    int idx = (y * width + x) * 3;
    rgb[idx] = r; rgb[idx + 1] = g; rgb[idx + 2] = b;
}

static void drawFilledRect(unsigned char* rgb, int width, int height, int x0, int y0, int x1, int y1,
                            unsigned char r, unsigned char g, unsigned char b) {
    for (int y = y0; y <= y1; y++)
        for (int x = x0; x <= x1; x++)
            setPixel(rgb, width, height, x, y, r, g, b);
}

static void drawRectOutline(unsigned char* rgb, int width, int height, int x0, int y0, int x1, int y1,
                             unsigned char r, unsigned char g, unsigned char b) {
    for (int x = x0; x <= x1; x++) { setPixel(rgb, width, height, x, y0, r, g, b); setPixel(rgb, width, height, x, y1, r, g, b); }
    for (int y = y0; y <= y1; y++) { setPixel(rgb, width, height, x0, y, r, g, b); setPixel(rgb, width, height, x1, y, r, g, b); }
}

static void drawHLine(unsigned char* rgb, int width, int height, int x0, int x1, int y,
                       unsigned char r, unsigned char g, unsigned char b) {
    for (int x = x0; x <= x1; x++) setPixel(rgb, width, height, x, y, r, g, b);
}

static void drawVLine(unsigned char* rgb, int width, int height, int x, int y0, int y1,
                       unsigned char r, unsigned char g, unsigned char b) {
    for (int y = y0; y <= y1; y++) setPixel(rgb, width, height, x, y, r, g, b);
}

static void drawHud(unsigned char* rgb, int width, int height, double headingDeg, double speedKts, double altitudeM) {
    const unsigned char R = 60, G = 230, B = 120; // HUD green

    // Frame border
    drawRectOutline(rgb, width, height, 2, 2, width - 3, height - 3, R, G, B);

    // Heading tape across the top, with a bug marker at the current heading
    int tapeY = 24;
    drawHLine(rgb, width, height, 20, width - 20, tapeY, R, G, B);
    for (int i = -4; i <= 4; i++) {
        double tickHeading = headingDeg + i * 15.0;
        int x = width / 2 + (int)(i * 40);
        if (x < 20 || x > width - 20) continue;
        drawVLine(rgb, width, height, x, tapeY - 6, tapeY, R, G, B);
        (void)tickHeading; // tick spacing represents heading; no font available to label it
    }
    // Bug marker (small triangle) fixed at center — the tape ticks move relative to it in a real HUD
    for (int i = 0; i < 6; i++) drawHLine(rgb, width, height, width / 2 - i, width / 2 + i, tapeY + 8 + i, R, G, B);

    // Speed bar (left) — filled proportionally to speedKts / 500kt
    int barTop = height / 2 - 100, barBottom = height / 2 + 100;
    int speedX0 = 24, speedX1 = 44;
    drawRectOutline(rgb, width, height, speedX0, barTop, speedX1, barBottom, R, G, B);
    double speedFrac = speedKts / 500.0;
    if (speedFrac < 0) speedFrac = 0; if (speedFrac > 1) speedFrac = 1;
    int speedFillY = barBottom - (int)(speedFrac * (barBottom - barTop));
    drawFilledRect(rgb, width, height, speedX0 + 2, speedFillY, speedX1 - 2, barBottom - 2, R, G, B);

    // Altitude bar (right) — filled proportionally to altitudeMeters / 2000m
    int altX0 = width - 44, altX1 = width - 24;
    drawRectOutline(rgb, width, height, altX0, barTop, altX1, barBottom, R, G, B);
    double altFrac = altitudeM / 2000.0;
    if (altFrac < 0) altFrac = 0; if (altFrac > 1) altFrac = 1;
    int altFillY = barBottom - (int)(altFrac * (barBottom - barTop));
    drawFilledRect(rgb, width, height, altX0 + 2, altFillY, altX1 - 2, barBottom - 2, R, G, B);

    // Center reticle (boresight cross)
    int cx = width / 2, cy = height / 2;
    drawHLine(rgb, width, height, cx - 14, cx + 14, cy, R, G, B);
    drawVLine(rgb, width, height, cx, cy - 14, cy + 14, R, G, B);
}

#pragma pack(push, 1)
struct BmpFileHeader { unsigned short type; unsigned int size; unsigned short r1, r2; unsigned int offset; };
struct BmpInfoHeader {
    unsigned int size; int width; int height; unsigned short planes; unsigned short bpp;
    unsigned int compression; unsigned int imageSize; int xppm; int yppm; unsigned int colors; unsigned int importantColors;
};
#pragma pack(pop)

static void writeBmp24(const char* path, const unsigned char* rgbTopDown, int width, int height) {
    int rowSize = (width * 3 + 3) & ~3;
    int imageSize = rowSize * height;

    BmpFileHeader fh{};
    fh.type = 0x4D42; // 'BM'
    fh.offset = sizeof(BmpFileHeader) + sizeof(BmpInfoHeader);
    fh.size = fh.offset + imageSize;

    BmpInfoHeader ih{};
    ih.size = sizeof(BmpInfoHeader);
    ih.width = width;
    ih.height = height; // positive => bottom-up row order expected on write
    ih.planes = 1;
    ih.bpp = 24;
    ih.imageSize = imageSize;

    FILE* f = fopen(path, "wb");
    if (!f) { fprintf(stderr, "Failed to open %s for writing\n", path); exit(1); }
    fwrite(&fh, sizeof(fh), 1, f);
    fwrite(&ih, sizeof(ih), 1, f);

    unsigned char* row = (unsigned char*)malloc(rowSize);
    memset(row, 0, rowSize);
    for (int y = height - 1; y >= 0; y--) { // BMP stores rows bottom-up
        for (int x = 0; x < width; x++) {
            int srcIdx = (y * width + x) * 3;
            row[x * 3 + 0] = rgbTopDown[srcIdx + 2]; // BMP pixel order is B,G,R
            row[x * 3 + 1] = rgbTopDown[srcIdx + 1];
            row[x * 3 + 2] = rgbTopDown[srcIdx + 0];
        }
        fwrite(row, 1, rowSize, f);
    }
    free(row);
    fclose(f);
}

int main(int argc, char** argv) {
    double headingDeg = argc > 1 ? atof(argv[1]) : 90.0;
    double speedKts = argc > 2 ? atof(argv[2]) : 420.0;
    double altitudeM = argc > 3 ? atof(argv[3]) : 1000.0;
    const char* outPath = argc > 4 ? argv[4] : "hud_overlay.bmp";

    const int width = 512;
    const int height = 512;
    const size_t bytes = (size_t)width * height;

    unsigned char* hInput = (unsigned char*)malloc(bytes);
    unsigned char* hOutput = (unsigned char*)malloc(bytes);

    // Synthetic sensor tile: a bright disc (a simulated target) over a gradient sky.
    int cx = width / 2, cy = height / 2, r = width / 5;
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int dx = x - cx, dy = y - cy;
            bool inDisc = (dx * dx + dy * dy) <= (r * r);
            unsigned char gradient = (unsigned char)((x * 255) / width);
            hInput[y * width + x] = inDisc ? 230 : gradient / 3;
        }
    }
    writePgm("input.pgm", hInput, width, height);

    unsigned char *dInput, *dOutput;
    CUDA_CHECK(cudaMalloc(&dInput, bytes));
    CUDA_CHECK(cudaMalloc(&dOutput, bytes));
    CUDA_CHECK(cudaMemcpy(dInput, hInput, bytes, cudaMemcpyHostToDevice));

    dim3 block(16, 16);
    dim3 grid((width + block.x - 1) / block.x, (height + block.y - 1) / block.y);
    sobelKernel<<<grid, block>>>(dInput, dOutput, width, height);
    CUDA_CHECK(cudaGetLastError());
    CUDA_CHECK(cudaDeviceSynchronize());

    CUDA_CHECK(cudaMemcpy(hOutput, dOutput, bytes, cudaMemcpyDeviceToHost));
    writePgm("output.pgm", hOutput, width, height);

    long edgePixels = 0;
    for (size_t i = 0; i < bytes; i++) if (hOutput[i] > 40) edgePixels++;

    // Composite: grayscale edge frame as the base, HUD elements drawn in green on top.
    unsigned char* rgb = (unsigned char*)malloc(bytes * 3);
    for (size_t i = 0; i < bytes; i++) {
        rgb[i * 3 + 0] = hOutput[i];
        rgb[i * 3 + 1] = hOutput[i];
        rgb[i * 3 + 2] = hOutput[i];
    }
    drawHud(rgb, width, height, headingDeg, speedKts, altitudeM);
    writeBmp24(outPath, rgb, width, height);

    printf("Sobel edge detection complete: %dx%d, %ld edge pixels detected.\n", width, height, edgePixels);
    printf("Wrote input.pgm, output.pgm, and %s (hdg=%.0f spd=%.0fkt alt=%.0fm)\n",
           outPath, headingDeg, speedKts, altitudeM);

    free(rgb);
    cudaFree(dInput);
    cudaFree(dOutput);
    free(hInput);
    free(hOutput);
    return 0;
}
