"""U-Net şerit segmentasyon modelini eğitir."""
import argparse
import os

import tensorflow as tf
from tensorflow.keras import callbacks, optimizers

from dataset import build_dataset
from model import build_unet


def dice_loss(y_true, y_pred, smooth=1.0):
    y_true_f = tf.reshape(y_true, [-1])
    y_pred_f = tf.reshape(y_pred, [-1])
    intersection = tf.reduce_sum(y_true_f * y_pred_f)
    return 1 - (2.0 * intersection + smooth) / (
        tf.reduce_sum(y_true_f) + tf.reduce_sum(y_pred_f) + smooth
    )


def bce_dice_loss(y_true, y_pred):
    bce = tf.keras.losses.binary_crossentropy(y_true, y_pred)
    return tf.reduce_mean(bce) + dice_loss(y_true, y_pred)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--img-size", type=int, nargs=2, default=[256, 256])
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--model-out", default="models/lane_unet.h5")
    args = parser.parse_args()

    img_size = tuple(args.img_size)
    train_ds = build_dataset(args.data_dir, img_size=img_size, batch_size=args.batch_size)

    model = build_unet(input_shape=(*img_size, 3))
    model.compile(optimizer=optimizers.Adam(args.lr), loss=bce_dice_loss, metrics=["accuracy"])
    model.summary()

    os.makedirs(os.path.dirname(args.model_out), exist_ok=True)
    cbs = [
        callbacks.ModelCheckpoint(args.model_out, save_best_only=True, monitor="loss"),
        callbacks.ReduceLROnPlateau(monitor="loss", factor=0.5, patience=3),
        callbacks.EarlyStopping(monitor="loss", patience=8, restore_best_weights=True),
    ]

    model.fit(train_ds, epochs=args.epochs, callbacks=cbs)
    print(f"Model kaydedildi: {args.model_out}")


if __name__ == "__main__":
    main()
