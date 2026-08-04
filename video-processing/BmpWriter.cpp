#include "BmpWriter.h"
#include <cstdio>
#include <cstdlib>
#include <cstring>

#pragma pack(push, 1)
struct BmpFileHeader { unsigned short type; unsigned int size; unsigned short r1, r2; unsigned int offset; };
struct BmpInfoHeader {
    unsigned int size; int width; int height; unsigned short planes; unsigned short bpp;
    unsigned int compression; unsigned int imageSize; int xppm; int yppm; unsigned int colors; unsigned int importantColors;
};
#pragma pack(pop)

void BmpWriter::write(const char* path, const RgbImage& image) {
    const int width = image.width();
    const int height = image.height();
    const unsigned char* rgbTopDown = image.data();

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
    if (!f) { fprintf(stderr, "Failed to open %s for writing\n", path); return; }
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
