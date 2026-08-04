"""TuSimple JSON etiketlerini (label_data_*.json) ikili şerit maskesine dönüştürür.

Beklenen TuSimple format:
  {"lanes": [[x1, x2, ...], ...], "h_samples": [y1, y2, ...], "raw_file": "clips/.../20.jpg"}
"""
import argparse
import json
import os

import cv2
import numpy as np
from tqdm import tqdm


def draw_lane_mask(shape, lanes, h_samples, thickness=8):
    mask = np.zeros(shape[:2], dtype=np.uint8)
    for lane in lanes:
        points = [(x, y) for x, y in zip(lane, h_samples) if x >= 0]
        for i in range(len(points) - 1):
            cv2.line(mask, points[i], points[i + 1], color=255, thickness=thickness)
    return mask


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset-dir", required=True, help="TuSimple kök klasörü")
    parser.add_argument("--out-dir", required=True, help="images/ ve masks/ üretilecek klasör")
    args = parser.parse_args()

    out_images = os.path.join(args.out_dir, "images")
    out_masks = os.path.join(args.out_dir, "masks")
    os.makedirs(out_images, exist_ok=True)
    os.makedirs(out_masks, exist_ok=True)

    label_files = [
        f for f in os.listdir(args.dataset_dir)
        if f.startswith("label_data_") and f.endswith(".json")
    ]
    if not label_files:
        raise FileNotFoundError(f"{args.dataset_dir} içinde label_data_*.json bulunamadı")

    count = 0
    for label_file in label_files:
        path = os.path.join(args.dataset_dir, label_file)
        with open(path, "r") as f:
            for line in tqdm(f, desc=label_file):
                entry = json.loads(line)
                raw_file = entry["raw_file"]
                img_path = os.path.join(args.dataset_dir, raw_file)
                img = cv2.imread(img_path)
                if img is None:
                    continue

                mask = draw_lane_mask(img.shape, entry["lanes"], entry["h_samples"])

                name = f"{count:06d}"
                cv2.imwrite(os.path.join(out_images, f"{name}.jpg"), img)
                cv2.imwrite(os.path.join(out_masks, f"{name}.png"), mask)
                count += 1

    print(f"{count} görüntü/maske çifti üretildi -> {args.out_dir}")


if __name__ == "__main__":
    main()
