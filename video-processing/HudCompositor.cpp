#include "HudCompositor.h"

void HudCompositor::draw(RgbImage& img, double headingDeg, double speedKts, double altitudeM) const {
    const unsigned char R = 60, G = 230, B = 120; // HUD green
    const int width = img.width();
    const int height = img.height();

    // Frame border
    img.drawRectOutline(2, 2, width - 3, height - 3, R, G, B);

    // Heading tape across the top, with a bug marker at the current heading
    int tapeY = 24;
    img.drawHLine(20, width - 20, tapeY, R, G, B);
    for (int i = -4; i <= 4; i++) {
        int x = width / 2 + (int)(i * 40);
        if (x < 20 || x > width - 20) continue;
        img.drawVLine(x, tapeY - 6, tapeY, R, G, B);
    }
    // Bug marker (small triangle) fixed at center — the tape ticks move relative to it in a real HUD
    for (int i = 0; i < 6; i++) img.drawHLine(width / 2 - i, width / 2 + i, tapeY + 8 + i, R, G, B);

    // Speed bar (left) — filled proportionally to speedKts / 500kt
    int barTop = height / 2 - 100, barBottom = height / 2 + 100;
    int speedX0 = 24, speedX1 = 44;
    img.drawRectOutline(speedX0, barTop, speedX1, barBottom, R, G, B);
    double speedFrac = speedKts / 500.0;
    if (speedFrac < 0) speedFrac = 0; if (speedFrac > 1) speedFrac = 1;
    int speedFillY = barBottom - (int)(speedFrac * (barBottom - barTop));
    img.drawFilledRect(speedX0 + 2, speedFillY, speedX1 - 2, barBottom - 2, R, G, B);

    // Altitude bar (right) — filled proportionally to altitudeMeters / 2000m
    int altX0 = width - 44, altX1 = width - 24;
    img.drawRectOutline(altX0, barTop, altX1, barBottom, R, G, B);
    double altFrac = altitudeM / 2000.0;
    if (altFrac < 0) altFrac = 0; if (altFrac > 1) altFrac = 1;
    int altFillY = barBottom - (int)(altFrac * (barBottom - barTop));
    img.drawFilledRect(altX0 + 2, altFillY, altX1 - 2, barBottom - 2, R, G, B);

    // Center reticle (boresight cross)
    int cx = width / 2, cy = height / 2;
    img.drawHLine(cx - 14, cx + 14, cy, R, G, B);
    img.drawVLine(cx, cy - 14, cy + 14, R, G, B);
}
