# Fitzpatrick17k Web API

Dermatoloji görüntü sınıflandırması için FastAPI tabanlı web uygulaması.

## Özellikler

- 🏥 **Hastalık Sınıflandırması**: 114 farklı dermatoloji hastalığını tanıma
- 🌍 **Fitzpatrick Scale**: Cilt tipi analizi (7 sınıf)
- 🎨 **Modern Web Arayüzü**: Drag & drop görüntü yükleme
- 🚀 **FastAPI Backend**: Hızlı ve ölçeklenebilir API
- 🐳 **Docker Desteği**: Coolify ile kolay deploy

## Kurulum

### Yerel Geliştirme

1. Bağımlılıkları yükleyin:
```bash
pip install -r requirements.txt
```

2. Uygulamayı başlatın:
```bash
python app.py
```

3. Tarayıcıda açın: `http://localhost:8000`

### Docker ile Çalıştırma

#### Seçenek 1: Build Context Parent Directory

```bash
cd /Volumes/bugra/fitzpatrick
docker build -f web/Dockerfile -t fitzpatrick-api .
docker run -p 8000:8000 fitzpatrick-api
```

#### Seçenek 2: Model Dosyalarını Kopyala

Model dosyalarını web klasörüne kopyalayın:
```bash
mkdir -p web/models/checkpoints/experiment_20251211_162141
cp -r models/checkpoints/experiment_20251211_162141/* web/models/checkpoints/experiment_20251211_162141/
```

Sonra Dockerfile'daki COPY satırını kaldırın ve şunu ekleyin:
```dockerfile
COPY models ./models
```

## Coolify ile Deploy

### Hazırlık

1. Model dosyalarını Docker image'a dahil etmek için:
   - Build context'i parent directory olarak ayarlayın
   - VEYA model dosyalarını web/models/ altına kopyalayın

2. Coolify'da yeni bir uygulama oluşturun:
   - **Repository**: Git repository URL'iniz
   - **Dockerfile Path**: `web/Dockerfile`
   - **Build Context**: `web` (eğer model dosyaları web/models/ altındaysa)
   - **Build Context**: `.` (root, eğer parent directory ise)

3. Port: `8000`

4. Environment Variables (isteğe bağlı):
   - `PYTHONUNBUFFERED=1`

### Volume Mount (Alternatif)

Model dosyalarını volume olarak mount edebilirsiniz:

1. Coolify'da Storage/Volume oluşturun
2. Volume'u container'a mount edin: `/app/models`
3. Dockerfile'dan model COPY satırını kaldırın

## API Endpoints

- `GET /`: Ana sayfa (HTML)
- `GET /health`: Sağlık kontrolü
- `POST /predict`: Görüntü tahmini
  - Body: `multipart/form-data` with `file` field
  - Response: JSON with disease and fitzpatrick predictions
- `GET /api/labels`: Tüm label'ları listele

## Model Yapısı

- **Backbone**: EfficientNet-B3
- **Disease Classes**: 114
- **Fitzpatrick Classes**: 7 (-1, I, II, III, IV, V, VI)

## Geliştirme Notları

- Model dosyaları `models/checkpoints/experiment_20251211_162141/` altında bulunmalı
- GPU desteği için CUDA kurulu olmalı (opsiyonel)
- CPU üzerinde de çalışır, ancak tahminler daha yavaş olabilir

## Lisans

Proje içindeki model ve kodlar için uygun lisansı kontrol edin.

