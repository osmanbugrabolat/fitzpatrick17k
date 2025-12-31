#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Inference fonksiyonları
"""

import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms
from typing import Dict, List
import numpy as np

# Inference için transform (validation/test transform'u ile aynı)
def get_transform():
    """Inference için transform"""
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

def predict_image(model, image: Image.Image, device: torch.device, label_mapping: Dict[str, int], top_k: int = 5) -> Dict:
    """
    Tek bir görüntü için tahmin yap
    
    Args:
        model: PyTorch model
        image: PIL Image
        device: Torch device
        label_mapping: Label to index mapping
        top_k: Top K sonuç sayısı
        
    Returns:
        Prediction results dictionary
    """
    # Transform uygula
    transform = get_transform()
    image_tensor = transform(image).unsqueeze(0).to(device)
    
    # Tahmin yap
    with torch.no_grad():
        outputs = model(image_tensor)
        
        # Softmax uygula
        disease_probs = F.softmax(outputs['disease'], dim=1)
        fitzpatrick_probs = F.softmax(outputs['fitzpatrick'], dim=1)
        
        # Top K al
        disease_top_probs, disease_top_indices = torch.topk(disease_probs, k=min(top_k, disease_probs.size(1)), dim=1)
        fitzpatrick_top_probs, fitzpatrick_top_indices = torch.topk(fitzpatrick_probs, k=7, dim=1)
        
        # Index'ten label'a çevir
        idx_to_label = {idx: label for label, idx in label_mapping.items()}
        
        # Disease sonuçları
        disease_results = []
        for prob, idx in zip(disease_top_probs[0], disease_top_indices[0]):
            idx_int = idx.item()
            prob_float = prob.item()
            if idx_int in idx_to_label:
                disease_results.append({
                    "label": idx_to_label[idx_int],
                    "confidence": round(prob_float * 100, 2)
                })
        
        # Fitzpatrick sonuçları
        # Mapping: index 0 -> -1 (Unknown), index 1 -> 1 (I), index 2 -> 2 (II), ...
        fitzpatrick_scale_map = {-1: "Unknown", 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI"}
        fitzpatrick_results = []
        for prob, idx in zip(fitzpatrick_top_probs[0], fitzpatrick_top_indices[0]):
            idx_int = idx.item()
            prob_float = prob.item()
            # Index'ten gerçek scale değerine çevir: 0 -> -1, 1 -> 1, 2 -> 2, ...
            scale_value = -1 if idx_int == 0 else idx_int
            fitzpatrick_results.append({
                "scale": fitzpatrick_scale_map.get(scale_value, "Unknown"),
                "value": scale_value,
                "confidence": round(prob_float * 100, 2)
            })
        
        # En yüksek tahminleri al
        top_disease = disease_results[0] if disease_results else None
        top_fitzpatrick = fitzpatrick_results[0] if fitzpatrick_results else None
    
    return {
        "disease": {
            "top_prediction": top_disease,
            "top_k": disease_results
        },
        "fitzpatrick": {
            "top_prediction": top_fitzpatrick,
            "all_scales": fitzpatrick_results
        }
    }

