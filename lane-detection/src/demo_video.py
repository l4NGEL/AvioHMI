"""Video ya da kamera akışı üzerinde gerçek zamanlı şerit tespiti demosu."""
import argparse
import time

import cv2
import numpy as np
import tensorflow as tf

from postprocess import process_frame


def preprocess_frame(frame, img_size):
    resized = cv2.resize(frame, img_size)
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
    normalized = rgb.astype(np.float32) / 255.0
    return np.expand_dims(normalized, axis=0)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--video", required=True, help="Video dosya yolu veya kamera index (0)")
    parser.add_argument("--output", default=None, help="Sonuç video dosyası (opsiyonel)")
    parser.add_argument("--img-size", type=int, nargs=2, default=[256, 256])
    args = parser.parse_args()

    model = tf.keras.models.load_model(args.model, compile=False)
    img_size = tuple(args.img_size)

    source = int(args.video) if args.video.isdigit() else args.video
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        raise RuntimeError(f"Video açılamadı: {args.video}")

    writer = None
    if args.output:
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(args.output, fourcc, fps, (width, height))

    frame_count = 0
    start_time = time.time()

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        model_input = preprocess_frame(frame, img_size)
        pred = model.predict(model_input, verbose=0)[0, :, :, 0]
        pred_resized = cv2.resize(pred, (frame.shape[1], frame.shape[0]))

        result, _ = process_frame(frame, pred_resized)

        frame_count += 1
        elapsed = time.time() - start_time
        fps_text = f"FPS: {frame_count / elapsed:.1f}" if elapsed > 0 else "FPS: --"
        cv2.putText(result, fps_text, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)

        if writer:
            writer.write(result)
        else:
            cv2.imshow("Serit Tespiti", result)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    cap.release()
    if writer:
        writer.release()
    cv2.destroyAllWindows()
    print(f"Toplam {frame_count} kare işlendi.")


if __name__ == "__main__":
    main()
