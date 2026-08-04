# Şerit Takip Mini-Projesi

TuSimple veya CULane veri seti üzerinde U-Net tabanlı şerit segmentasyonu, OpenCV ile post-processing ve video üzerinde gerçek zamanlı demo.

## Kurulum

```bash
pip install -r requirements.txt
```

## Veri Seti

`data/` klasörü altına TuSimple ya da CULane veri setini indirip aşağıdaki yapıda yerleştirin:

```
data/
  images/       # ham görüntüler (.jpg)
  masks/        # ikili şerit maskeleri (.png), images ile aynı dosya adları
```

TuSimple'ın JSON tabanlı etiketlerini (`label_data_*.json`) ikili maskeye çevirmek için:

```bash
python src/prepare_tusimple.py --dataset-dir /path/to/tusimple --out-dir data
```

## Eğitim

```bash
python src/train.py --data-dir data --epochs 30 --batch-size 8 --img-size 256 256
```

En iyi ağırlıklar `models/lane_unet.h5` içine kaydedilir.

## Video Demo (gerçek zamanlı)

```bash
python src/demo_video.py --model models/lane_unet.h5 --video input.mp4 --output output/result.mp4
```

`--video 0` verilirse canlı kamera akışı kullanılır.

## Boru Hattı

1. **Model**: Hafif U-Net (encoder-decoder + skip connections), ikili segmentasyon (şerit / arka plan).
2. **Post-processing** (OpenCV): Gürültü temizleme (morfolojik açma/kapama) → kontur/Hough tabanlı çizgi uydurma → sol/sağ şerit ayrımı → sonuçların orijinal kare üzerine bindirilmesi.
3. **Demo**: Kare kare model çıkarımı + post-processing, FPS ölçümü, video dosyasına yazma.

## Dosyalar

- `src/model.py` — U-Net mimarisi
- `src/dataset.py` — tf.data pipeline, augmentasyon
- `src/prepare_tusimple.py` — TuSimple JSON → ikili maske dönüştürücü
- `src/train.py` — eğitim döngüsü
- `src/postprocess.py` — OpenCV tabanlı şerit son işleme
- `src/demo_video.py` — video/kamera üzerinde gerçek zamanlı demo
