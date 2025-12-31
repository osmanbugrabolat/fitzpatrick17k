// DOM elementleri
const fileInput = document.getElementById('fileInput');
const uploadBox = document.getElementById('uploadBox');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const resultsSection = document.getElementById('resultsSection');
const loading = document.getElementById('loading');
const resultsContent = document.getElementById('resultsContent');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');

// Drag and drop
uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.add('dragover');
});

uploadBox.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('dragover');
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadBox.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

uploadBox.addEventListener('click', (e) => {
    if (e.target === uploadBox || e.target.closest('.upload-content')) {
        fileInput.click();
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    // Dosya boyutu kontrolü (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showError('Dosya boyutu çok büyük. Lütfen 10MB\'dan küçük bir dosya seçin.');
        return;
    }

    // Dosya tipi kontrolü
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
        showError('Lütfen geçerli bir görüntü dosyası seçin (JPG, JPEG veya PNG).');
        return;
    }

    // Önizleme göster
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        uploadBox.style.display = 'none';
        imagePreview.style.display = 'block';
        
        // Tahmin yap
        predictImage(file);
    };
    reader.onerror = () => {
        showError('Dosya okunamadı. Lütfen başka bir dosya deneyin.');
    };
    reader.readAsDataURL(file);
}

function clearImage() {
    uploadBox.style.display = 'block';
    imagePreview.style.display = 'none';
    resultsSection.style.display = 'none';
    fileInput.value = '';
    hideError();
    
    // Loading steps'i sıfırla
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        if (index > 1) {
            step.classList.remove('active');
        }
    });
}

async function predictImage(file) {
    // Loading göster
    resultsSection.style.display = 'block';
    loading.style.display = 'block';
    resultsContent.style.display = 'none';
    hideError();

    // Loading steps animasyonu
    const steps = document.querySelectorAll('.step');
    let currentStep = 1;
    
    const stepInterval = setInterval(() => {
        if (currentStep < steps.length) {
            steps[currentStep].classList.add('active');
            currentStep++;
        }
    }, 500);

    // FormData oluştur
    const formData = new FormData();
    formData.append('file', file);

    try {
        // API'ye gönder
        const response = await fetch('/predict', {
            method: 'POST',
            body: formData
        });

        clearInterval(stepInterval);
        
        // Tüm step'leri aktif yap
        steps.forEach(step => step.classList.add('active'));

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Tahmin yapılırken bir hata oluştu.');
        }

        const results = await response.json();
        
        // Kısa bir gecikme sonra sonuçları göster (animasyon için)
        setTimeout(() => {
            displayResults(results);
        }, 300);
        
    } catch (error) {
        clearInterval(stepInterval);
        showError(error.message);
        loading.style.display = 'none';
    }
}

function displayResults(results) {
    loading.style.display = 'none';
    resultsContent.style.display = 'block';

    // Smooth scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Hastalık tahmini
    const topDisease = results.disease.top_prediction;
    if (topDisease) {
        const labelElement = document.getElementById('topDiseaseLabel');
        const confidenceElement = document.getElementById('topDiseaseConfidence');
        
        labelElement.textContent = formatLabel(topDisease.label);
        confidenceElement.textContent = `${topDisease.confidence}%`;
        
        // Animasyon için
        requestAnimationFrame(() => {
            confidenceElement.style.transform = 'scale(1.1)';
            setTimeout(() => {
                confidenceElement.style.transform = 'scale(1)';
            }, 300);
        });
    }

    // Hastalık Top-K listesi
    const diseaseTopK = document.getElementById('diseaseTopK');
    diseaseTopK.innerHTML = '';
    
    results.disease.top_k.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'top-k-item';
        itemDiv.style.opacity = '0';
        itemDiv.style.transform = 'translateX(-20px)';
        
        const labelSpan = document.createElement('span');
        labelSpan.className = 'top-k-label';
        labelSpan.textContent = `${index + 1}. ${formatLabel(item.label)}`;
        
        const confidenceSpan = document.createElement('span');
        confidenceSpan.className = 'top-k-confidence';
        confidenceSpan.textContent = `${item.confidence}%`;
        
        const barContainer = document.createElement('div');
        barContainer.className = 'confidence-bar';
        
        const barFill = document.createElement('div');
        barFill.className = 'confidence-fill';
        barFill.style.width = '0%';
        
        barContainer.appendChild(barFill);
        itemDiv.appendChild(labelSpan);
        itemDiv.appendChild(confidenceSpan);
        itemDiv.appendChild(barContainer);
        
        diseaseTopK.appendChild(itemDiv);
        
        // Animasyon
        setTimeout(() => {
            itemDiv.style.transition = 'all 0.4s ease';
            itemDiv.style.opacity = '1';
            itemDiv.style.transform = 'translateX(0)';
            setTimeout(() => {
                barFill.style.width = `${item.confidence}%`;
            }, 100);
        }, index * 100);
    });

    // Fitzpatrick Scale
    const topFitzpatrick = results.fitzpatrick.top_prediction;
    if (topFitzpatrick) {
        const labelElement = document.getElementById('topFitzpatrickLabel');
        const confidenceElement = document.getElementById('topFitzpatrickConfidence');
        const badgeElement = document.getElementById('fitzpatrickScaleBadge');
        
        labelElement.textContent = `Fitzpatrick Scale ${topFitzpatrick.scale}`;
        confidenceElement.textContent = `${topFitzpatrick.confidence}%`;
        badgeElement.textContent = topFitzpatrick.scale;
        
        // Animasyon
        requestAnimationFrame(() => {
            badgeElement.style.transform = 'scale(1.2) rotate(360deg)';
            setTimeout(() => {
                badgeElement.style.transform = 'scale(1) rotate(0deg)';
            }, 500);
        });
    }

    // Fitzpatrick Scale chart
    const fitzpatrickChart = document.getElementById('fitzpatrickChart');
    fitzpatrickChart.innerHTML = '';
    
    results.fitzpatrick.all_scales.forEach((item, index) => {
        const scaleDiv = document.createElement('div');
        scaleDiv.className = 'scale-item';
        scaleDiv.style.opacity = '0';
        
        const labelSpan = document.createElement('span');
        labelSpan.className = 'scale-label';
        labelSpan.textContent = `Scale ${item.scale}`;
        
        const barContainer = document.createElement('div');
        barContainer.className = 'scale-bar-container';
        
        const barFill = document.createElement('div');
        barFill.className = 'scale-bar';
        barFill.style.width = '0%';
        barFill.textContent = `${item.confidence}%`;
        
        barContainer.appendChild(barFill);
        scaleDiv.appendChild(labelSpan);
        scaleDiv.appendChild(barContainer);
        
        fitzpatrickChart.appendChild(scaleDiv);
        
        // Animasyon
        setTimeout(() => {
            scaleDiv.style.transition = 'opacity 0.4s ease';
            scaleDiv.style.opacity = '1';
            setTimeout(() => {
                barFill.style.width = `${item.confidence}%`;
            }, 200);
        }, index * 80);
    });
}

function formatLabel(label) {
    // Label'ı daha okunabilir hale getir
    return label
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function showError(message) {
    if (errorText) {
        errorText.textContent = message;
    }
    errorMessage.style.display = 'flex';
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Otomatik gizleme (10 saniye sonra)
    setTimeout(() => {
        hideError();
    }, 10000);
}

function hideError() {
    errorMessage.style.display = 'none';
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    // Dosya input için max size uyarısı
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                showError('Dosya boyutu çok büyük. Lütfen 10MB\'dan küçük bir dosya seçin.');
                e.target.value = '';
            }
        }
    });
});
