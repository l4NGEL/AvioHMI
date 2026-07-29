// Minimal CUDA image-processing demo for the AvioHMI HUD/sensor pipeline.
//
// Generates a synthetic grayscale frame (simulating a camera/sensor tile),
// runs a Sobel edge-detection kernel on the GPU, and writes both the
// synthetic input and the GPU-processed output as PGM files so the result
// can be inspected without any external imaging library.
//
// In the full system this kernel would run on frames decoded by
// GStreamer/FFmpeg before being composited into the AR HUD overlay.

#include <cstdio>
#include <cstdlib>
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
    if (!f) {
        fprintf(stderr, "Failed to open %s for writing\n", path);
        exit(1);
    }
    fprintf(f, "P5\n%d %d\n255\n", width, height);
    fwrite(data, 1, (size_t)width * height, f);
    fclose(f);
}

int main() {
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
    printf("Sobel edge detection complete: %dx%d, %ld edge pixels detected.\n", width, height, edgePixels);
    printf("Wrote input.pgm and output.pgm\n");

    cudaFree(dInput);
    cudaFree(dOutput);
    free(hInput);
    free(hOutput);
    return 0;
}
