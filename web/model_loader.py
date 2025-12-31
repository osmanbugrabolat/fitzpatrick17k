#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Model yükleme fonksiyonları
"""

import json
import pandas as pd
import torch
import torch.nn as nn
from torchvision import models
from torchvision.models import (
    EfficientNet_B3_Weights,
)
from typing import Dict

# Model sınıfını buraya kopyalıyoruz
class MultiTaskModel(nn.Module):
    """
    Multi-task learning model
    - Shared backbone: EfficientNet
    - Disease classification head
    - Fitzpatrick scale classification head
    """
    
    def __init__(self, backbone_name='efficientnet_b3', pretrained=True,
                 num_disease_classes=114, num_fitzpatrick_classes=7, dropout=0.5):
        super(MultiTaskModel, self).__init__()
        
        self.backbone_name = backbone_name
        
        if backbone_name == 'efficientnet_b3':
            weights = EfficientNet_B3_Weights.DEFAULT if pretrained else None
            self.backbone = models.efficientnet_b3(weights=weights)
            feature_dim = 1536
        else:
            raise ValueError(f"Desteklenmeyen backbone: {backbone_name}")
        
        # Classification head'ini kaldır
        self.backbone.classifier = nn.Identity()
        
        # Shared feature extractor
        self.feature_dim = feature_dim
        self.shared_features = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(feature_dim, 512),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(512, 256),
            nn.ReLU()
        )
        
        # Disease classification head
        self.disease_head = nn.Sequential(
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(dropout * 0.5),
            nn.Linear(128, num_disease_classes)
        )
        
        # Fitzpatrick scale classification head
        self.fitzpatrick_head = nn.Sequential(
            nn.Linear(256, 64),
            nn.ReLU(),
            nn.Dropout(dropout * 0.5),
            nn.Linear(64, num_fitzpatrick_classes)
        )
        
    def forward(self, x):
        # Backbone features
        features = self.backbone(x)
        
        # Shared features
        shared = self.shared_features(features)
        
        # Task-specific heads
        disease_logits = self.disease_head(shared)
        fitzpatrick_logits = self.fitzpatrick_head(shared)
        
        return {
            'disease': disease_logits,
            'fitzpatrick': fitzpatrick_logits
        }

def load_config(config_path: str) -> Dict:
    """Config dosyasını yükle"""
    with open(config_path, 'r') as f:
        config = json.load(f)
    return config

def get_label_mapping(label_mapping_path: str) -> Dict[str, int]:
    """Label mapping CSV'yi yükle"""
    df = pd.read_csv(label_mapping_path)
    label_mapping = {row['label']: row['idx'] for _, row in df.iterrows()}
    return label_mapping

def load_model(checkpoint_path: str, config_path: str, device: torch.device) -> MultiTaskModel:
    """
    Model checkpoint'ini yükle
    
    Args:
        checkpoint_path: Model checkpoint dosya yolu
        config_path: Config JSON dosya yolu
        device: Torch device
        
    Returns:
        Yüklenmiş model
    """
    # Config yükle
    config = load_config(config_path)
    
    # Model oluştur
    model = MultiTaskModel(
        backbone_name=config['backbone'],
        pretrained=False,  # Checkpoint zaten eğitilmiş
        num_disease_classes=config['num_disease_classes'],
        num_fitzpatrick_classes=config['num_fitzpatrick_classes']
    )
    
    # Checkpoint yükle
    checkpoint = torch.load(checkpoint_path, map_location=device)
    
    # State dict'i yükle
    if isinstance(checkpoint, dict):
        if 'model_state_dict' in checkpoint:
            model.load_state_dict(checkpoint['model_state_dict'])
        elif 'state_dict' in checkpoint:
            model.load_state_dict(checkpoint['state_dict'])
        else:
            model.load_state_dict(checkpoint)
    else:
        model.load_state_dict(checkpoint)
    
    model.to(device)
    model.eval()
    
    return model

