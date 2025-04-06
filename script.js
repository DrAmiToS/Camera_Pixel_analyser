import { ImageProcessor } from '@pixelanalyzer/ImageProcessor.js';

class PixelAnalyzer {
    constructor() {
        this.imageData = null;
        this.threshold = 30;
        this.clusterSize = 2;
        this.mode = 'hot';
        this.originalImageData = null;
        
        this.setupEventListeners();
        this.setupControls();
        this.setupDragAndDrop();
        this.setupModalViewer();
    }

    setupControls() {
        document.getElementById('thresholdValue').addEventListener('input', (e) => {
            this.threshold = parseInt(e.target.value);
            document.getElementById('thresholdDisplay').textContent = this.threshold;
        });

        document.getElementById('clusterSize').addEventListener('input', (e) => {
            this.clusterSize = parseInt(e.target.value);
            document.getElementById('clusterDisplay').textContent = this.clusterSize;
        });

        document.getElementById('analysisMode').addEventListener('change', (e) => {
            this.mode = e.target.value;
        });

        document.getElementById('analyzeButton').addEventListener('click', () => this.analyze());
        document.getElementById('downloadReport').addEventListener('click', () => this.downloadReport());

        document.getElementById('hotPixelHelp').addEventListener('click', () => this.showHotPixelHelp());
        document.getElementById('deadPixelHelp').addEventListener('click', () => this.showDeadPixelHelp());
    }

    setupDragAndDrop() {
        const uploadZone = document.getElementById('uploadZone');
        const acceptedFormats = ['.jpg', '.jpeg', '.png'];
        
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            
            const file = e.dataTransfer.files[0];
            const extension = '.' + file.name.split('.').pop().toLowerCase();
            
            if (file && acceptedFormats.includes(extension)) {
                this.handleImageUpload(file);
            } else {
                alert('Неподдерживаемый формат файла. Поддерживаемые форматы: ' + 
                      acceptedFormats.join(', '));
            }
        });

        document.getElementById('imageInput').setAttribute('accept', '.jpg,.jpeg,.png');
        document.getElementById('imageInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const extension = '.' + file.name.split('.').pop().toLowerCase();
                if (acceptedFormats.includes(extension)) {
                    this.handleImageUpload(file);
                } else {
                    alert('Неподдерживаемый формат файла. Поддерживаемые форматы: ' + 
                          acceptedFormats.join(', '));
                }
            }
        });
    }

    setupEventListeners() {
    }

    setupModalViewer() {
        const modal = document.getElementById('imageModal');
        const closeBtn = document.querySelector('.close');
        const downloadBtn = document.getElementById('downloadImage');
        const modalImage = document.getElementById('modalImage');
        const container = document.getElementById('panzoomContainer');
        
        let panzoom = null;

        const initPanzoom = () => {
            if (panzoom) panzoom.destroy();
            
            panzoom = Panzoom(container, {
                maxScale: 5,
                minScale: 0.5
            });

            // Enable mouse wheel zoom
            container.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY;
                if (delta > 0) {
                    panzoom.zoomOut();
                } else {
                    panzoom.zoomIn();
                }
            });
        };

        closeBtn.onclick = () => {
            modal.style.display = "none";
            if (panzoom) panzoom.reset();
        };

        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.download = 'annotated-image.png';
            link.href = modalImage.src;
            link.click();
        };

        window.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = "none";
                if (panzoom) panzoom.reset();
            }
        };

        // Initialize panzoom when image is loaded
        modalImage.onload = initPanzoom;
    }

    showHotPixelHelp() {
        alert(
            'Инструкция по поиску горячих пикселей:\n\n' +
            '1. Сделайте фотографию в полной темноте с закрытой крышкой объектива\n' +
            '2. Используйте длительную выдержку (30 сек)\n' +
            '3. Установите ISO 1600 или выше\n' +
            '4. Загрузите полученное изображение\n' +
            '5. Выберите режим "Поиск горячих пикселей"\n' +
            '6. Нажмите "Выполнить анализ"'
        );
    }

    showDeadPixelHelp() {
        alert(
            'Инструкция по поиску битых пикселей:\n\n' +
            '1. Сделайте фотографию равномерно освещённой белой поверхности\n' +
            '2. Используйте короткую выдержку\n' +
            '3. Установите ISO 100\n' +
            '4. Загрузите полученное изображение\n' +
            '5. Выберите режим "Поиск битых пикселей"\n' +
            '6. Нажмите "Выполнить анализ"'
        );
    }

    async handleImageUpload(file) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.style.display = 'flex';
        document.getElementById('loadingText').textContent = 'Обработка изображения...';

        try {
            const imageData = await ImageProcessor.processImage(file);
            const previewElement = document.getElementById('imagePreview');

            this.originalImageData = imageData;
            this.imageData = {
                imageData,
                totalPixels: imageData.width * imageData.height,
                defectCount: 0
            };

            this.displayPreview(imageData.canvas, previewElement);
            await this.analyze(); // Wait for analysis to complete
        } catch (error) {
            alert('Ошибка при обработке изображения: ' + error.message);
        } finally {
            // Loading overlay will be hidden after analysis is complete
        }
    }

    async analyze() {
        if (!this.imageData) {
            alert('Пожалуйста, загрузите изображение для анализа');
            return;
        }

        const loadingOverlay = document.getElementById('loadingOverlay');
        document.getElementById('loadingText').textContent = 'Идет анализ...';

        try {
            const analysis = this.analyzePixels(this.originalImageData.imageData);
            this.displayStats(analysis);
            this.imageData = analysis;
            this.createAnnotatedImage(analysis.clusters);
            document.getElementById('downloadReport').disabled = false;
            
            document.getElementById('loadingText').textContent = 'Анализ окончен';
            // Show "Analysis complete" message for 1 second before hiding
            await new Promise(resolve => setTimeout(resolve, 1000));
        } finally {
            loadingOverlay.style.display = 'none';
        }
    }

    createAnnotatedImage(clusters) {
        const canvas = document.createElement('canvas');
        canvas.width = this.originalImageData.width;
        canvas.height = this.originalImageData.height;
        const ctx = canvas.getContext('2d');

        // Draw original image
        ctx.drawImage(this.originalImageData.canvas, 0, 0);

        // Set circle style based on analysis mode
        ctx.strokeStyle = this.mode === 'hot' ? '#ffffff' : '#000000';
        ctx.lineWidth = 5;

        const imgData = this.originalImageData.imageData;
        const fontSize = 50;
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw circles and text for detected clusters
        clusters.forEach(cluster => {
            const idx = (cluster.y * imgData.width + cluster.x) * 4;
            const r = imgData.data[idx];
            const g = imgData.data[idx + 1];
            const b = imgData.data[idx + 2];

            // Draw circle
            ctx.beginPath();
            ctx.arc(cluster.x, cluster.y, 50, 0, Math.PI * 2);
            ctx.stroke();

            // RGB values text
            const rgbText = `${r},${g},${b}`;

            // Calculate text position
            let textX = cluster.x;
            let textY = cluster.y + 70; // Default position below circle

            // Check if text would go outside canvas bounds
            if (textY + fontSize > canvas.height) {
                textY = cluster.y - 70; // Move text above circle
            }
            if (textX - ctx.measureText(rgbText).width/2 < 0) {
                textX = ctx.measureText(rgbText).width/2;
            } else if (textX + ctx.measureText(rgbText).width/2 > canvas.width) {
                textX = canvas.width - ctx.measureText(rgbText).width/2;
            }

            // Draw text with contrasting color
            ctx.fillStyle = this.mode === 'hot' ? '#ffffff' : '#000000';
            ctx.fillText(rgbText, textX, textY);
        });

        // Add explanatory text at the top
        const explanation = this.mode === 'hot' 
            ? 'На фото обведены горячие пиксели с указанием их цветов в RGB'
            : 'На фото обведены битые пиксели с указанием их цветов в RGB';
        
        ctx.font = '24px Arial';
        ctx.fillStyle = this.mode === 'hot' ? '#ffffff' : '#000000';
        ctx.fillText(explanation, canvas.width / 2, 30);

        // Add watermark
        ctx.font = '36px Arial';
        ctx.fillStyle = this.mode === 'hot' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
        
        // Find a suitable position for watermark (bottom right corner if no clusters there)
        let watermarkX = canvas.width - 150;
        let watermarkY = canvas.height - 30;
        
        ctx.fillText('https://dramitos.github.io/Camera_Pixel_analyser', watermarkX, watermarkY);

        // Display annotated image
        const annotatedPreview = document.getElementById('annotatedPreview');
        annotatedPreview.innerHTML = '';
        annotatedPreview.appendChild(canvas);

        // Setup modal viewer
        canvas.onclick = () => {
            const modal = document.getElementById('imageModal');
            const modalImage = document.getElementById('modalImage');
            modalImage.src = canvas.toDataURL();
            modal.style.display = "block";
            modalImage.style.transform = 'scale(1)';
        };
    }

    analyzePixels(imageData) {
        const clusters = new Set();
        const data = imageData.data;
        const width = imageData.width;
        const visited = new Set();

        for (let i = 0; i < data.length; i += 4) {
            if (visited.has(i)) continue;

            const x = (i/4) % width;
            const y = Math.floor((i/4) / width);
            
            if (this.isDefectivePixel(data[i], data[i+1], data[i+2])) {
                const cluster = this.findCluster(data, x, y, width, imageData.height);
                if (cluster.size >= this.clusterSize) {
                    clusters.add(JSON.stringify({x, y}));
                }
                cluster.forEach(pos => visited.add(pos * 4));
            }
        }

        return {
            clusters: Array.from(clusters).map(c => JSON.parse(c)),
            totalPixels: (imageData.width * imageData.height),
            defectCount: clusters.size,
            imageData
        };
    }

    isDefectivePixel(r, g, b) {
        if (this.mode === 'hot') {
            // For hot pixels on black background, look for bright spots
            return (r > this.threshold || g > this.threshold || b > this.threshold);
        } else {
            // For dead pixels on white background, look for dark spots
            return (r < 255 - this.threshold || g < 255 - this.threshold || b < 255 - this.threshold);
        }
    }

    findCluster(data, startX, startY, width, height) {
        const cluster = new Set();
        const queue = [[startX, startY]];
        
        while (queue.length > 0) {
            const [x, y] = queue.pop();
            const idx = (y * width + x) * 4;
            
            if (cluster.has(y * width + x)) continue;
            
            if (this.isDefectivePixel(data[idx], data[idx+1], data[idx+2])) {
                cluster.add(y * width + x);
                
                // Check neighbors
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const newX = x + dx;
                        const newY = y + dy;
                        if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                            queue.push([newX, newY]);
                        }
                    }
                }
            }
        }
        
        return cluster;
    }

    getDominantColor(imageData) {
        const data = imageData.data;
        let r = 0, g = 0, b = 0;
        const totalPixels = imageData.width * imageData.height;
        
        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
        }
        
        r = Math.round(r / totalPixels);
        g = Math.round(g / totalPixels);
        b = Math.round(b / totalPixels);
        
        const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        
        return {
            rgb: `${r}, ${g}, ${b}`,
            hex: hex
        };
    }

    downloadReport() {
        const dominantColor = this.getDominantColor(this.originalImageData.imageData);
        
        let report = 'Отчёт об анализе пикселей\n';
        report += '=====================================\n\n';
        report += `Режим анализа: ${this.mode === 'hot' ? 'Горячие пиксели' : 'Битые пиксели'}\n`;
        report += `Порог чувствительности: ${this.threshold}\n`;
        report += `Минимальный размер кластера: ${this.clusterSize}\n\n`;

        report += 'Изображение:\n';
        report += `Размер: ${this.originalImageData.width}x${this.originalImageData.height} пикселей\n`;
        report += `Основной цвет: RGB(${dominantColor.rgb}) / ${dominantColor.hex}\n`;
        report += `Всего пикселей: ${this.imageData.totalPixels}\n`;
        report += `Дефектных областей: ${this.imageData.defectCount}\n\n`;

        report += 'Отчёт сгенерирован: https://dramitos.github.io/Camera_Pixel_analyser';

        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pixel-analysis-report.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    displayPreview(canvas, container) {
        container.innerHTML = '';
        container.appendChild(canvas);
    }

    displayStats(data) {
        const resultsElement = document.getElementById('results');
        resultsElement.innerHTML = `
            <div class="pixel-count">
                <p>Всего пикселей: ${data.totalPixels}</p>
                <p>Дефектных областей: ${data.defectCount}</p>
                <p>Процент дефектов: ${((data.defectCount / data.totalPixels) * 100).toFixed(4)}%</p>
            </div>
        `;
    }

    compareResults() {
    }

}

document.addEventListener('DOMContentLoaded', () => {
    new PixelAnalyzer();
});
