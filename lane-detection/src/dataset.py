"""images/ ve masks/ klasörlerinden tf.data pipeline oluşturur."""
import glob
import os

import tensorflow as tf


def _load_pair(img_path, mask_path, img_size):
    img = tf.io.read_file(img_path)
    img = tf.image.decode_jpeg(img, channels=3)
    img = tf.image.resize(img, img_size)
    img = tf.cast(img, tf.float32) / 255.0

    mask = tf.io.read_file(mask_path)
    mask = tf.image.decode_png(mask, channels=1)
    mask = tf.image.resize(mask, img_size, method="nearest")
    mask = tf.cast(mask > 127, tf.float32)

    return img, mask


def build_dataset(data_dir, img_size=(256, 256), batch_size=8, shuffle=True):
    images = sorted(glob.glob(os.path.join(data_dir, "images", "*.jpg")))
    masks = sorted(glob.glob(os.path.join(data_dir, "masks", "*.png")))
    if not images:
        raise FileNotFoundError(f"{data_dir}/images altında .jpg bulunamadı")
    if len(images) != len(masks):
        raise ValueError(f"images ({len(images)}) ve masks ({len(masks)}) sayıları eşleşmiyor")

    ds = tf.data.Dataset.from_tensor_slices((images, masks))
    if shuffle:
        ds = ds.shuffle(buffer_size=len(images))
    ds = ds.map(
        lambda i, m: _load_pair(i, m, img_size),
        num_parallel_calls=tf.data.AUTOTUNE,
    )
    ds = ds.batch(batch_size).prefetch(tf.data.AUTOTUNE)
    return ds
