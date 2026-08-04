"""Hafif U-Net mimarisi: ikili şerit segmentasyonu için."""
from tensorflow.keras import layers, models


def conv_block(x, filters):
    x = layers.Conv2D(filters, 3, padding="same", activation="relu")(x)
    x = layers.BatchNormalization()(x)
    x = layers.Conv2D(filters, 3, padding="same", activation="relu")(x)
    x = layers.BatchNormalization()(x)
    return x


def build_unet(input_shape=(256, 256, 3), base_filters=32):
    inputs = layers.Input(shape=input_shape)

    c1 = conv_block(inputs, base_filters)
    p1 = layers.MaxPooling2D()(c1)

    c2 = conv_block(p1, base_filters * 2)
    p2 = layers.MaxPooling2D()(c2)

    c3 = conv_block(p2, base_filters * 4)
    p3 = layers.MaxPooling2D()(c3)

    c4 = conv_block(p3, base_filters * 8)
    p4 = layers.MaxPooling2D()(c4)

    bottleneck = conv_block(p4, base_filters * 16)

    u4 = layers.Conv2DTranspose(base_filters * 8, 2, strides=2, padding="same")(bottleneck)
    u4 = layers.Concatenate()([u4, c4])
    d4 = conv_block(u4, base_filters * 8)

    u3 = layers.Conv2DTranspose(base_filters * 4, 2, strides=2, padding="same")(d4)
    u3 = layers.Concatenate()([u3, c3])
    d3 = conv_block(u3, base_filters * 4)

    u2 = layers.Conv2DTranspose(base_filters * 2, 2, strides=2, padding="same")(d3)
    u2 = layers.Concatenate()([u2, c2])
    d2 = conv_block(u2, base_filters * 2)

    u1 = layers.Conv2DTranspose(base_filters, 2, strides=2, padding="same")(d2)
    u1 = layers.Concatenate()([u1, c1])
    d1 = conv_block(u1, base_filters)

    outputs = layers.Conv2D(1, 1, activation="sigmoid")(d1)

    return models.Model(inputs, outputs, name="lane_unet")
