FROM python:3.10-slim

# Sistem bağımlılıkları ve Git LFS (model dosyaları için)
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    curl \
    git \
    git-lfs \
    && rm -rf /var/lib/apt/lists/* \
    && git lfs install

# Çalışma dizini
WORKDIR /app

# Python bağımlılıklarını kopyala ve yükle
COPY web/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Uygulama dosyalarını kopyala
COPY web/ ./

# Model dosyalarını kopyala (build context parent directory olmalı)
COPY models/checkpoints/experiment_20251211_162141/ ./models/checkpoints/experiment_20251211_162141/

# Model dosyalarının varlığını kontrol et
RUN if [ -f "models/checkpoints/experiment_20251211_162141/checkpoints/best_model.pt" ]; then \
        echo "✓ Model dosyası bulundu"; \
        ls -lh models/checkpoints/experiment_20251211_162141/checkpoints/best_model.pt; \
    else \
        echo "✗ HATA: Model dosyası bulunamadı!"; \
        exit 1; \
    fi

# Port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Uygulamayı başlat
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
