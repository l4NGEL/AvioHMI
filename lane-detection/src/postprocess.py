"""OpenCV tabanlı şerit post-processing: gürültü temizleme, çizgi uydurma, sol/sağ ayrımı."""
import cv2
import numpy as np


def clean_mask(prob_mask, threshold=0.5, kernel_size=5):
    """Model çıktısını (0-1 olasılık) ikili maskeye çevirir ve morfolojik temizlik yapar."""
    binary = (prob_mask > threshold).astype(np.uint8) * 255
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    return binary


def fit_lane_lines(binary_mask, img_width):
    """Maskedeki noktaları sol/sağ şeride ayırıp her biri için ikinci derece polinom uydurur."""
    ys, xs = np.nonzero(binary_mask)
    if len(xs) == 0:
        return None, None

    mid_x = img_width / 2
    left_mask = xs < mid_x
    right_mask = ~left_mask

    left_fit = None
    right_fit = None
    if left_mask.sum() > 50:
        left_fit = np.polyfit(ys[left_mask], xs[left_mask], deg=2)
    if right_mask.sum() > 50:
        right_fit = np.polyfit(ys[right_mask], xs[right_mask], deg=2)

    return left_fit, right_fit


def draw_lanes(frame, left_fit, right_fit, color_left=(0, 255, 0), color_right=(0, 0, 255)):
    """Uydurulmuş polinomları orijinal kare üzerine çizer."""
    h = frame.shape[0]
    ys = np.linspace(int(h * 0.4), h - 1, num=50).astype(int)
    overlay = frame.copy()

    for fit, color in ((left_fit, color_left), (right_fit, color_right)):
        if fit is None:
            continue
        xs = np.polyval(fit, ys).astype(int)
        points = np.stack([xs, ys], axis=1)
        points = points[(points[:, 0] >= 0) & (points[:, 0] < frame.shape[1])]
        for i in range(len(points) - 1):
            cv2.line(overlay, tuple(points[i]), tuple(points[i + 1]), color, thickness=6)

    return cv2.addWeighted(overlay, 0.6, frame, 0.4, 0)


def process_frame(frame, prob_mask):
    """Tek bir kare için tam post-processing zinciri: temizle -> uydur -> çiz."""
    binary = clean_mask(prob_mask)
    left_fit, right_fit = fit_lane_lines(binary, img_width=frame.shape[1])
    return draw_lanes(frame, left_fit, right_fit), binary
