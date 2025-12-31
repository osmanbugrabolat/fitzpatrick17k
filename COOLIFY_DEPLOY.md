# Coolify Deployment Kılavuzu

Bu kılavuz, Fitzpatrick17k projesini Coolify üzerinde GitHub repository URL ile deploy etmek için adım adım talimatlar içerir.

## 🚀 Hızlı Başlangıç

### 1. Coolify'da Yeni Uygulama Oluşturma

1. Coolify dashboard'unuzda **"New Resource"** veya **"Add Application"** butonuna tıklayın
2. **"Git Repository"** seçeneğini seçin
3. GitHub repository URL'inizi girin: `https://github.com/osmanbugrabolat/fitzpatrick17k.git`
4. Branch olarak **`main`** seçin

### 2. Build Ayarları

Coolify'da build ayarlarını şu şekilde yapılandırın:

- **Build Pack**: `Dockerfile`
- **Dockerfile Location**: `web/Dockerfile`
- **Build Context**: `.` (root directory - nokta)
- **Docker Compose**: Kapalı (Dockerfile kullanıyoruz)

**ÖNEMLİ:** Build context mutlaka root directory (`.`) olmalı çünkü model dosyaları `models/` klasöründe ve Dockerfile bu dosyalara erişmek için parent directory'den build edilmeli.

### 3. Port Ayarları

- **Port**: `8000`
- **Port Mapping**: `8000:8000` (otomatik ayarlanır)

### 4. Environment Variables

Aşağıdaki environment variable'ları ekleyin (isteğe bağlı ama önerilir):

```
PYTHONUNBUFFERED=1
```

### 5. Resource Limits

Model dosyası ve PyTorch gereksinimleri nedeniyle:

- **Memory Limit**: Minimum `4GB` (önerilen: 6GB)
- **CPU**: Minimum `2 core` (önerilen: 4 core)

### 6. Health Check (Opsiyonel)

Coolify otomatik health check yapar, ancak manuel olarak eklemek isterseniz:

- **Path**: `/health`
- **Interval**: `30s`
- **Timeout**: `10s`
- **Start Period**: `120s` (model yüklenmesi için ekstra süre)

## 📦 Git LFS Desteği

Model dosyası Git LFS ile yönetilmektedir. Coolify Git LFS'i otomatik olarak destekler, ancak emin olmak için:

1. Coolify'ın Git LFS'i desteklediğinden emin olun (genellikle otomatiktir)
2. Dockerfile'da Git LFS kurulumu zaten mevcuttur
3. Build sırasında LFS dosyaları otomatik olarak çekilir

## 🔄 Deploy Süreci

1. Tüm ayarları yaptıktan sonra **"Deploy"** veya **"Save & Deploy"** butonuna tıklayın
2. Build loglarını takip edin:
   - İlk build 10-15 dakika sürebilir (model dosyası ~141 MB)
   - "✓ Model dosyası bulundu" mesajını görmelisiniz
3. Build tamamlandıktan sonra uygulama otomatik olarak başlayacak
4. Health check başarılı olduğunda uygulama hazırdır

## ✅ Deployment Sonrası Kontrol

Deploy başarılı olduktan sonra:

1. **Health Check:**
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

2. **Ana Sayfa:**
Tarayıcıda `https://your-domain.com` adresini açın

3. **API Dokümantasyonu:**
`https://your-domain.com/docs` adresinde FastAPI Swagger dokümantasyonu mevcut

## 🐛 Sorun Giderme

### Model Dosyası Bulunamadı Hatası

**Hata:** `Model checkpoint bulunamadı: /app/models/...`

**Çözüm:**
1. Build context'in `.` (root) olduğundan emin olun
2. Git repository'de `models/checkpoints/experiment_20251211_162141/` klasörünün olduğunu kontrol edin
3. Git LFS dosyalarının çekildiğinden emin olun (build loglarında kontrol edin)

### Memory Hatası / Out of Memory

**Hata:** Container çöküyor veya OOM (Out of Memory) hatası

**Çözüm:**
1. Memory limit'i en az 4GB'a çıkarın (6GB önerilir)
2. CPU sayısını artırın
3. Model yüklenirken geçici olarak daha fazla memory gerekebilir

### Build Çok Uzun Sürüyor

**Durum:** Build 15 dakikadan fazla sürüyor

**Not:** Bu normaldir! Model dosyası büyük (~141 MB) ve:
- İlk build'de tüm Python paketleri indirilir
- Model dosyası Git LFS'ten çekilir
- Docker image oluşturulur

**Kontrol:**
- Build loglarında ilerleme görüyorsanız bekleyin
- "✓ Model dosyası bulundu" mesajını görmelisiniz
- Hata mesajı yoksa build devam ediyor demektir

### Git LFS Dosyaları Çekilmiyor

**Hata:** Model dosyası pointer olarak görünüyor (birkaç KB)

**Çözüm:**
1. Coolify'ın Git LFS'i desteklediğinden emin olun
2. GitHub repository'de dosyanın LFS ile track edildiğini kontrol edin:
   ```bash
   git lfs ls-files
   ```
3. Manuel olarak LFS pull yapmayı deneyin (Coolify build script'inde)

### Port Hatası

**Hata:** Port 8000 zaten kullanılıyor

**Çözüm:**
1. Coolify'da port ayarlarını kontrol edin
2. Başka bir uygulama 8000 portunu kullanmıyorsa, Coolify otomatik yönetir

### Health Check Başarısız

**Hata:** Health check başarısız oluyor

**Çözüm:**
1. Start period'u 120 saniyeye çıkarın (model yükleme süresi)
2. Model yüklenene kadar bekleme süresini artırın
3. Logları kontrol edin: `docker logs <container-id>`

## 📝 Önemli Notlar

- ✅ Model dosyası Docker image içine dahil edilmiştir
- ✅ İlk başlangıçta model yükleme 30-90 saniye sürebilir
- ✅ CPU üzerinde çalışır (GPU opsiyonel)
- ✅ Health check 60-120 saniye start period önerilir
- ✅ Memory: Minimum 4GB (6GB önerilir)
- ✅ Model dosyası Git LFS ile yönetilir (~141 MB)

## 🔗 Faydalı Linkler

- **API Dokümantasyonu**: `https://your-domain.com/docs`
- **Health Check**: `https://your-domain.com/health`
- **GitHub Repository**: `https://github.com/osmanbugrabolat/fitzpatrick17k`

## 📊 Tahmini Kaynak Kullanımı

- **Disk Space**: ~2-3 GB (image + model)
- **Memory**: 2-4 GB (çalışma zamanı)
- **CPU**: 2-4 core (önerilen)
- **Network**: İlk build için ~500 MB (paketler + model)

## 🎯 Deployment Checklist

Deploy etmeden önce kontrol edin:

- [ ] GitHub repository public veya Coolify'a erişim izni var
- [ ] Build context `.` (root) olarak ayarlanmış
- [ ] Dockerfile path `web/Dockerfile` olarak ayarlanmış
- [ ] Port 8000 açık
- [ ] Memory limit en az 4GB
- [ ] Environment variables eklendi (PYTHONUNBUFFERED=1)
- [ ] Git LFS dosyaları repository'de mevcut

Deploy sonrası kontrol edin:

- [ ] Build başarılı (logları kontrol edin)
- [ ] Health check başarılı (`/health` endpoint)
- [ ] Ana sayfa açılıyor (`/`)
- [ ] API dokümantasyonu erişilebilir (`/docs`)
- [ ] Model yüklendi (health check response'da `model_loaded: true`)

