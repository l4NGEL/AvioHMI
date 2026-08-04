#include "SobelProcessor.h"
#include <cstdio>
#include <cstdlib>
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

namespace {

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

// frees itself on scope exit, no manual cudaFree needed in run()
class DeviceBuffer {
public:
    explicit DeviceBuffer(size_t bytes) {
        CUDA_CHECK(cudaMalloc(&ptr_, bytes));
    }
    ~DeviceBuffer() {
        if (ptr_) cudaFree(ptr_);
    }
    DeviceBuffer(const DeviceBuffer&) = delete;
    DeviceBuffer& operator=(const DeviceBuffer&) = delete;

    unsigned char* get() const { return ptr_; }

private:
    unsigned char* ptr_ = nullptr;
};

} // namespace

PgmImage SobelProcessor::run(const PgmImage& input) const {
    const int width = input.width();
    const int height = input.height();
    const size_t bytes = input.byteCount();

    DeviceBuffer dInput(bytes);
    DeviceBuffer dOutput(bytes);
    CUDA_CHECK(cudaMemcpy(dInput.get(), input.data(), bytes, cudaMemcpyHostToDevice));

    dim3 block(16, 16);
    dim3 grid((width + block.x - 1) / block.x, (height + block.y - 1) / block.y);
    sobelKernel<<<grid, block>>>(dInput.get(), dOutput.get(), width, height);
    CUDA_CHECK(cudaGetLastError());
    CUDA_CHECK(cudaDeviceSynchronize());

    PgmImage output(width, height);
    CUDA_CHECK(cudaMemcpy(output.data(), dOutput.get(), bytes, cudaMemcpyDeviceToHost));
    return output;
}
