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
const cameraButton = document.getElementById('cameraButton');
const cameraModal = document.getElementById('cameraModal');
const cameraVideo = document.getElementById('cameraVideo');
const cameraCanvas = document.getElementById('cameraCanvas');

// Kamera için değişkenler
let stream = null;
let facingMode = 'environment'; // 'environment' arka kamera, 'user' ön kamera

// Görüntüyü düzelt (mobil cihazlarda orientasyon sorunlarını çözmek için)
function fixImageOrientation(file, callback) {
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = function(e) {
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob(function(blob) {
                if (blob) {
                    const fixedFile = new File([blob], file.name, { 
                        type: file.type, 
                        lastModified: Date.now() 
                    });
                    callback(fixedFile);
                } else {
                    callback(file);
                }
            }, file.type, 0.92);
        };
        
        img.onerror = function() {
            callback(file);
        };
        
        img.src = e.target.result;
    };
    
    reader.onerror = function() {
        callback(file);
    };
    
    reader.readAsDataURL(file);
}

// Kamera açma fonksiyonu
async function openCamera() {
    try {
        // Kamera erişim izni iste
        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraVideo.srcObject = stream;
        cameraModal.style.display = 'flex';
        
        // Kamera değiştirme butonunu göster (çoklu kamera varsa)
        if (navigator.mediaDevices.enumerateDevices) {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            if (videoDevices.length > 1) {
                document.getElementById('switchCameraButton').style.display = 'flex';
            }
        }
    } catch (error) {
        console.error('Kamera hatası:', error);
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            showError('Kamera erişim izni verilmedi. Lütfen tarayıcı ayarlarından izin verin.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            showError('Kamera bulunamadı. Lütfen cihazınızda kamera olduğundan emin olun.');
        } else {
            showError('Kamera açılırken bir hata oluştu: ' + error.message);
        }
    }
}

// Kamera kapatma fonksiyonu
function closeCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    cameraModal.style.display = 'none';
    cameraVideo.srcObject = null;
}

// Kamerayı değiştir (ön/arka)
async function switchCamera() {
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    
    try {
        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraVideo.srcObject = stream;
    } catch (error) {
        console.error('Kamera değiştirme hatası:', error);
        showError('Kamera değiştirilemedi.');
    }
}

// Fotoğraf çekme fonksiyonu
function capturePhoto() {
    const video = cameraVideo;
    const canvas = cameraCanvas;
    const ctx = canvas.getContext('2d');
    
    // Canvas boyutlarını video boyutlarına ayarla
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Video'dan görüntüyü canvas'a çiz
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Canvas'ı blob'a çevir
    canvas.toBlob(function(blob) {
        if (blob) {
            const file = new File([blob], 'camera-capture.jpg', { 
                type: 'image/jpeg',
                lastModified: Date.now() 
            });
            
            // Kamerayı kapat
            closeCamera();
            
            // Dosyayı işle
            handleFile(file);
        }
    }, 'image/jpeg', 0.92);
}

// Modal dışına tıklanınca kapat
cameraModal.addEventListener('click', function(e) {
    if (e.target === cameraModal) {
        closeCamera();
    }
});

// ESC tuşu ile modal'ı kapat
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && cameraModal.style.display === 'flex') {
        closeCamera();
    }
});

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
    if (e.target.files && e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    hideError();
    
    // Dosya boyutu kontrolü (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showError('Dosya boyutu çok büyük. Lütfen 10MB\'dan küçük bir dosya seçin.');
        fileInput.value = '';
        return;
    }

    // Dosya tipi kontrolü
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
        showError('Lütfen geçerli bir görüntü dosyası seçin (JPG, JPEG veya PNG).');
        fileInput.value = '';
        return;
    }

    // Mobil cihazlarda görüntüyü düzelt
    fixImageOrientation(file, (fixedFile) => {
        processImageFile(fixedFile);
    });
}

function processImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        uploadBox.style.display = 'none';
        imagePreview.style.display = 'block';
        
        setTimeout(() => {
            predictImage(file);
        }, 100);
    };
    reader.onerror = () => {
        showError('Dosya okunamadı. Lütfen başka bir dosya deneyin.');
        fileInput.value = '';
    };
    reader.readAsDataURL(file);
}

function clearImage() {
    uploadBox.style.display = 'block';
    imagePreview.style.display = 'none';
    resultsSection.style.display = 'none';
    
    fileInput.value = '';
    previewImg.src = '';
    
    hideError();
    
    // Loading steps'i sıfırla
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach((step, index) => {
        if (index > 1) {
            step.classList.remove('active');
        }
    });
}

async function predictImage(file) {
    if (!file) {
        showError('Dosya bulunamadı. Lütfen tekrar deneyin.');
        return;
    }

    // Loading göster
    resultsSection.style.display = 'block';
    loading.style.display = 'block';
    resultsContent.style.display = 'none';
    hideError();

    // Loading steps animasyonu
    const steps = document.querySelectorAll('.progress-step');
    let currentStep = 1;
    
    const stepInterval = setInterval(() => {
        if (currentStep < steps.length) {
            steps[currentStep].classList.add('active');
            currentStep++;
        }
    }, 500);

    // FormData oluştur
    const formData = new FormData();
    formData.append('file', file, file.name);

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            body: formData
        });

        clearInterval(stepInterval);
        
        // Tüm step'leri aktif yap
        steps.forEach(step => step.classList.add('active'));

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Sunucu hatası oluştu.' }));
            throw new Error(errorData.detail || 'Tahmin yapılırken bir hata oluştu.');
        }

        const results = await response.json();
        
        setTimeout(() => {
            displayResults(results);
        }, 300);
        
    } catch (error) {
        clearInterval(stepInterval);
        console.error('Prediction error:', error);
        showError(error.message || 'Tahmin yapılırken bir hata oluştu.');
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
        
        // Animasyon
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
    
    setTimeout(() => {
        hideError();
    }, 10000);
}

function hideError() {
    errorMessage.style.display = 'none';
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    console.log('DermAI Dermatoloji Analiz Sistemi hazır');
    
    // Kamera desteğini kontrol et
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Kamera desteği yoksa butonu gizle veya devre dışı bırak
        if (cameraButton) {
            cameraButton.style.display = 'none';
        }
    }
});