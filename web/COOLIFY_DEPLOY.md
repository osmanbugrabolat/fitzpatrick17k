# Coolify Deploy Kılavuzu

## Hazırlık

1. Git repository'nizi hazırlayın (tüm dosyalar commit edilmiş olmalı)

## Coolify'da Yeni Uygulama Oluşturma

### 1. Repository Ayarları
- **Source**: Git repository URL'iniz
- **Branch**: `main` veya `master`

### 2. Build Ayarları
- **Build Pack**: Dockerfile
- **Dockerfile Path**: `web/Dockerfile`
- **Build Context**: `.` (root directory - parent directory)
- **Dockerfile Location**: `web/Dockerfile`

### 3. Port Ayarları
- **Port**: `8000`
- **Port Mapping**: `8000:8000`

### 4. Environment Variables
Aşağıdaki environment variable'ları ekleyin:
```
PYTHONUNBUFFERED=1
```

### 5. Resource Limits (Opsiyonel)
- **Memory Limit**: 4GB (önerilen)
- **CPU**: 2 core (önerilen)

## Deploy Süreci

1. "Deploy" butonuna tıklayın
2. İlk build biraz uzun sürebilir (model dosyası ~450MB)
3. Build tamamlandıktan sonra uygulama otomatik başlayacak
4. Health check endpoint'i `/health` çalışıyor mu kontrol edin

## Kontrol

Deploy sonrası kontrol edin:
```bash
curl https://your-domain.com/health
```

Beklenen yanıt:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "device": "cpu"
}
```

## Sorun Giderme

### Model Dosyası Bulunamadı Hatası
- Build context'in root directory olduğundan emin olun
- Git repository'de `models/checkpoints/experiment_20251211_162141/` klasörünün olduğunu kontrol edin

### Memory Hatası
- Memory limit'i 4GB'a çıkarın
- Model yüklenirken geçici olarak daha fazla memory gerekebilir

### Build Çok Uzun Sürüyor
- Model dosyası büyük (~450MB), bu normal
- İlk build 10-15 dakika sürebilir

## Önemli Notlar

- Model dosyası container içine dahil edilmiştir
- İlk başlangıçta model yükleme 30-60 saniye sürebilir
- Health check 60 saniye start period'a sahiptir (model yükleme için)

