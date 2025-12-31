#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fitzpatrick17k Model Inference API
FastAPI uygulaması - Dermatoloji görüntü sınıflandırması
"""

import os
import sys
import io
from pathlib import Path
from typing import Optional
import json

import torch
import torch.nn.functional as F
from PIL import Image
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from torchvision import transforms
import uvicorn

# Model ve utility import'ları
from model_loader import load_model, get_label_mapping
from inference import predict_image

# FastAPI uygulaması
app = FastAPI(
    title="Fitzpatrick17k Dermatoloji Sınıflandırma API",
    description="Dermatoloji görüntüleri için hastalık ve Fitzpatrick scale sınıflandırması",
    version="1.0.0"
)

# CORS middleware (geliştirme için)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static dosyalar
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Global değişkenler
MODEL = None
DEVICE = None
LABEL_MAPPING = None
FITZPATRICK_SCALES = {-1: "Unknown", 0: "Unknown", 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI"}

@app.on_event("startup")
async def startup_event():
    """Uygulama başlatıldığında modeli yükle"""
    global MODEL, DEVICE, LABEL_MAPPING
    
    print("Model yükleniyor...")
    
    # Model checkpoint yolu - Docker içinde /app/models/ altında olacak
    # Local test için parent directory'den, Docker için /app/models/ altından
    base_path = Path(__file__).parent
    if (base_path.parent / "models").exists():
        # Local development - parent directory'den
        model_base = base_path.parent / "models" / "checkpoints" / "experiment_20251211_162141"
    else:
        # Docker - /app/models/ altında
        model_base = base_path / "models" / "checkpoints" / "experiment_20251211_162141"
    
    checkpoint_path = model_base / "checkpoints" / "best_model.pt"
    config_path = model_base / "config.json"
    label_mapping_path = model_base / "label_mapping.csv"
    
    if not checkpoint_path.exists():
        raise FileNotFoundError(f"Model checkpoint bulunamadı: {checkpoint_path}")
    
    # Device belirleme
    if torch.cuda.is_available():
        DEVICE = torch.device("cuda")
        print(f"GPU kullanılıyor: {torch.cuda.get_device_name(0)}")
    elif torch.backends.mps.is_available():
        DEVICE = torch.device("mps")
        print("MPS (Apple Silicon) kullanılıyor")
    else:
        DEVICE = torch.device("cpu")
        print("CPU kullanılıyor")
    
    # Model yükle
    MODEL = load_model(str(checkpoint_path), str(config_path), device=DEVICE)
    MODEL.eval()
    
    # Label mapping yükle
    LABEL_MAPPING = get_label_mapping(str(label_mapping_path))
    
    print(f"Model başarıyla yüklendi!")
    print(f"  - Hastalık sınıfı sayısı: {len(LABEL_MAPPING)}")
    print(f"  - Fitzpatrick sınıfı sayısı: 7")

@app.get("/", response_class=HTMLResponse)
async def root():
    """Ana sayfa"""
    html_file = static_dir / "index.html"
    if html_file.exists():
        with open(html_file, "r", encoding="utf-8") as f:
            return f.read()
    return """
    <html>
        <head><title>Fitzpatrick17k API</title></head>
        <body>
            <h1>Fitzpatrick17k Dermatoloji Sınıflandırma API</h1>
            <p>API çalışıyor! <a href="/docs">API Dokümantasyonu</a></p>
        </body>
    </html>
    """

@app.get("/health")
async def health_check():
    """Sağlık kontrolü"""
    return {
        "status": "healthy",
        "model_loaded": MODEL is not None,
        "device": str(DEVICE) if DEVICE else None
    }

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Görüntü yükleyip tahmin yap
    
    Args:
        file: Yüklenecek görüntü dosyası
        
    Returns:
        JSON response with predictions
    """
    if MODEL is None:
        raise HTTPException(status_code=503, detail="Model yüklenmedi")
    
    # Dosya tipini kontrol et
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Lütfen geçerli bir görüntü dosyası yükleyin")
    
    try:
        # Görüntüyü oku
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Tahmin yap
        results = predict_image(MODEL, image, DEVICE, LABEL_MAPPING)
        
        return JSONResponse(content=results)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tahmin sırasında hata oluştu: {str(e)}")

@app.get("/api/labels")
async def get_labels():
    """Tüm label'ları döndür"""
    if LABEL_MAPPING is None:
        raise HTTPException(status_code=503, detail="Label mapping yüklenmedi")
    
    labels = [{"idx": idx, "label": label} for label, idx in sorted(LABEL_MAPPING.items(), key=lambda x: x[1])]
    return {"labels": labels, "fitzpatrick_scales": FITZPATRICK_SCALES}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

