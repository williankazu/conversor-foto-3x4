
        let currentImage = null;
        let processedImage = null;
        let croppedImageData = null;
        let scale = 1;
        let offsetY = 0;
        let removeBg = false;
        let tolerance = 50;
        let currentPhotoSize = { width: 3, height: 4, name: '3x4 cm' };

        // Tamanhos de foto em cm
        const photoSizes = {
            '3x4': { width: 3, height: 4, name: '3x4 cm' },
            '5x7': { width: 5, height: 7, name: '5x7 cm' },
            '2x2': { width: 2, height: 2, name: '2x2 cm' },
            '10x15': { width: 10, height: 15, name: '10x15 cm' },
            'custom': { width: 3, height: 4, name: 'Personalizado' }
        };

        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        const uploadSection = document.getElementById('upload-section');
        const editorSection = document.getElementById('editor-section');
        const resultSection = document.getElementById('result-section');
        const previewImage = document.getElementById('preview-image');
        const zoomSlider = document.getElementById('zoom-slider');
        const positionSlider = document.getElementById('position-slider');
        const removeBgToggle = document.getElementById('remove-bg-toggle');
        const toleranceSlider = document.getElementById('tolerance-slider');
        const toleranceField = document.getElementById('tolerance-field');
        const processingIndicator = document.getElementById('processing-indicator');
        const photoSizeSelect = document.getElementById('photo-size-select');
        const customSizeFields = document.getElementById('custom-size-fields');
        const customWidth = document.getElementById('custom-width');
        const customHeight = document.getElementById('custom-height');
        const applyCustomSizeBtn = document.getElementById('apply-custom-size');
        const currentSizeDisplay = document.getElementById('current-size-display');
        const confirmBtn = document.getElementById('confirm-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        const photoCount = document.getElementById('photo-count');
        const updateGridBtn = document.getElementById('update-grid');
        const photoGrid = document.getElementById('photo-grid');
        const printContainer = document.getElementById('print-container');
        const printBtn = document.getElementById('print-btn');
        const downloadBtn = document.getElementById('download-btn');
        const newPhotoBtn = document.getElementById('new-photo-btn');
        const resultSizeDisplay = document.getElementById('result-size-display');
        const photosPerPageDisplay = document.getElementById('photos-per-page-display');

        // Upload handlers
        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                loadImage(file);
            }
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                loadImage(file);
            }
        });

        function loadImage(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                currentImage = new Image();
                currentImage.onload = () => {
                    processedImage = currentImage;
                    previewImage.src = e.target.result;
                    uploadSection.style.display = 'none';
                    editorSection.style.display = 'block';
                    updatePreview();
                };
                currentImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function removeBackground(img, tolerance) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Amostra de cores apenas das bordas externas
            const samples = [];
            const borderSize = 5; // Pixels das bordas para amostrar
            
            // Amostrar borda superior
            for (let y = 0; y < borderSize; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const idx = (y * canvas.width + x) * 4;
                    samples.push([data[idx], data[idx + 1], data[idx + 2]]);
                }
            }
            
            // Amostrar borda inferior
            for (let y = canvas.height - borderSize; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const idx = (y * canvas.width + x) * 4;
                    samples.push([data[idx], data[idx + 1], data[idx + 2]]);
                }
            }
            
            // Amostrar borda esquerda
            for (let y = borderSize; y < canvas.height - borderSize; y++) {
                for (let x = 0; x < borderSize; x++) {
                    const idx = (y * canvas.width + x) * 4;
                    samples.push([data[idx], data[idx + 1], data[idx + 2]]);
                }
            }
            
            // Amostrar borda direita
            for (let y = borderSize; y < canvas.height - borderSize; y++) {
                for (let x = canvas.width - borderSize; x < canvas.width; x++) {
                    const idx = (y * canvas.width + x) * 4;
                    samples.push([data[idx], data[idx + 1], data[idx + 2]]);
                }
            }

            // Calcular cor média do fundo
            let avgR = 0, avgG = 0, avgB = 0;
            samples.forEach(sample => {
                avgR += sample[0];
                avgG += sample[1];
                avgB += sample[2];
            });
            avgR = Math.floor(avgR / samples.length);
            avgG = Math.floor(avgG / samples.length);
            avgB = Math.floor(avgB / samples.length);

            // Criar mapa de distâncias para detecção inteligente
            const distanceMap = new Array(canvas.width * canvas.height);
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Calcular diferença de cor
                const diff = Math.sqrt(
                    Math.pow(r - avgR, 2) +
                    Math.pow(g - avgG, 2) +
                    Math.pow(b - avgB, 2)
                );

                const pixelIndex = i / 4;
                distanceMap[pixelIndex] = diff;
            }

            // Substituir pixels do fundo por branco usando flood fill das bordas
            const width = canvas.width;
            const height = canvas.height;
            const visited = new Array(width * height).fill(false);
            const queue = [];

            // Adicionar pixels das bordas que são similares ao fundo
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (y < borderSize || y >= height - borderSize || 
                        x < borderSize || x >= width - borderSize) {
                        const idx = y * width + x;
                        if (distanceMap[idx] < tolerance) {
                            queue.push({x, y});
                            visited[idx] = true;
                        }
                    }
                }
            }

            // Flood fill para marcar todo o fundo
            while (queue.length > 0) {
                const {x, y} = queue.shift();
                const pixelIdx = (y * width + x) * 4;
                
                // Marcar como branco
                data[pixelIdx] = 255;     // R
                data[pixelIdx + 1] = 255; // G
                data[pixelIdx + 2] = 255; // B

                // Verificar vizinhos (4-conectividade)
                const neighbors = [
                    {x: x + 1, y: y},
                    {x: x - 1, y: y},
                    {x: x, y: y + 1},
                    {x: x, y: y - 1}
                ];

                for (const neighbor of neighbors) {
                    if (neighbor.x >= 0 && neighbor.x < width && 
                        neighbor.y >= 0 && neighbor.y < height) {
                        const nIdx = neighbor.y * width + neighbor.x;
                        
                        if (!visited[nIdx] && distanceMap[nIdx] < tolerance) {
                            visited[nIdx] = true;
                            queue.push(neighbor);
                        }
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
            
            const result = new Image();
            result.src = canvas.toDataURL();
            return result;
        }

        function updatePreview() {
            if (!currentImage) return;

            const imgToUse = removeBg ? processedImage : currentImage;

            scale = zoomSlider.value / 100;
            offsetY = (positionSlider.value - 50) / 100;

            const canvas = document.getElementById('crop-canvas');
            const ctx = canvas.getContext('2d');

            // Calcular tamanho do canvas baseado na proporção do tamanho selecionado
            // Usar 100 pixels por cm como base
            const pixelsPerCm = 100;
            const targetWidth = currentPhotoSize.width * pixelsPerCm;
            const targetHeight = currentPhotoSize.height * pixelsPerCm;
            
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // Calcular dimensões da imagem com zoom
            const imgRatio = imgToUse.width / imgToUse.height;
            const targetRatio = currentPhotoSize.width / currentPhotoSize.height;

            let drawWidth, drawHeight, drawX, drawY;

            if (imgRatio > targetRatio) {
                // Imagem mais larga
                drawHeight = targetHeight * scale;
                drawWidth = drawHeight * imgRatio;
                drawX = (targetWidth - drawWidth) / 2;
                drawY = (targetHeight - drawHeight) / 2 + (offsetY * drawHeight * 0.5);
            } else {
                // Imagem mais alta
                drawWidth = targetWidth * scale;
                drawHeight = drawWidth / imgRatio;
                drawX = (targetWidth - drawWidth) / 2;
                drawY = (targetHeight - drawHeight) / 2 + (offsetY * drawHeight * 0.5);
            }

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
            ctx.drawImage(imgToUse, drawX, drawY, drawWidth, drawHeight);

            previewImage.src = canvas.toDataURL('image/jpeg', 0.9);
            
            // Atualizar display do tamanho atual
            currentSizeDisplay.innerHTML = `<strong>Tamanho: ${currentPhotoSize.name}</strong>`;
        }

        zoomSlider.addEventListener('input', updatePreview);
        positionSlider.addEventListener('input', updatePreview);

        // Seletor de tamanho de foto
        photoSizeSelect.addEventListener('change', function() {
            const selectedSize = this.value;
            
            if (selectedSize === 'custom') {
                customSizeFields.style.display = 'block';
            } else {
                customSizeFields.style.display = 'none';
                currentPhotoSize = { ...photoSizes[selectedSize] };
                updatePreview();
            }
        });

        // Aplicar tamanho personalizado
        applyCustomSizeBtn.addEventListener('click', function() {
            const width = parseFloat(customWidth.value) || 3;
            const height = parseFloat(customHeight.value) || 4;
            
            currentPhotoSize = {
                width: width,
                height: height,
                name: `${width}x${height} cm`
            };
            
            updatePreview();
        });

        // Atualizar ao digitar nos campos personalizados
        customWidth.addEventListener('input', function() {
            if (photoSizeSelect.value === 'custom') {
                let width = parseFloat(this.value);
                if (width < 1) width = 1;
                if (width > 20) width = 20;
                
                const height = parseFloat(customHeight.value) || 4;
                currentPhotoSize = {
                    width: width,
                    height: height,
                    name: `${width}x${height} cm`
                };
                updatePreview();
            }
        });

        customHeight.addEventListener('input', function() {
            if (photoSizeSelect.value === 'custom') {
                const width = parseFloat(customWidth.value) || 3;
                
                let height = parseFloat(this.value);
                if (height < 1) height = 1;
                if (height > 30) height = 30;
                
                currentPhotoSize = {
                    width: width,
                    height: height,
                    name: `${width}x${height} cm`
                };
                updatePreview();
            }
        });

        removeBgToggle.addEventListener('change', function() {
            removeBg = this.checked;
            toleranceField.style.display = removeBg ? 'block' : 'none';
            
            if (removeBg && currentImage) {
                processingIndicator.style.display = 'block';
                tolerance = parseInt(toleranceSlider.value);
                
                setTimeout(() => {
                    processedImage = removeBackground(currentImage, tolerance);
                    processedImage.onload = () => {
                        updatePreview();
                        processingIndicator.style.display = 'none';
                    };
                }, 100);
            } else {
                processingIndicator.style.display = 'none';
                updatePreview();
            }
        });

        toleranceSlider.addEventListener('input', function() {
            if (removeBg && currentImage) {
                processingIndicator.style.display = 'block';
                tolerance = parseInt(this.value);
                
                setTimeout(() => {
                    processedImage = removeBackground(currentImage, tolerance);
                    processedImage.onload = () => {
                        updatePreview();
                        processingIndicator.style.display = 'none';
                    };
                }, 100);
            }
        });

        confirmBtn.addEventListener('click', () => {
            const canvas = document.getElementById('crop-canvas');
            croppedImageData = canvas.toDataURL('image/jpeg', 0.9);
            editorSection.style.display = 'none';
            resultSection.style.display = 'block';
            generatePhotoGrid();
        });

        cancelBtn.addEventListener('click', () => {
            editorSection.style.display = 'none';
            uploadSection.style.display = 'block';
            fileInput.value = '';
            zoomSlider.value = 100;
            positionSlider.value = 50;
            removeBgToggle.checked = false;
            toleranceSlider.value = 50;
            toleranceField.style.display = 'none';
            photoSizeSelect.value = '3x4';
            customSizeFields.style.display = 'none';
            customWidth.value = 3;
            customHeight.value = 4;
            currentPhotoSize = { width: 3, height: 4, name: '3x4 cm' };
            removeBg = false;
            tolerance = 50;
            currentImage = null;
            processedImage = null;
        });

        function generatePhotoGrid() {
            const count = parseInt(photoCount.value) || 6;
            
            // Calcular quantas fotos cabem por página baseado no tamanho
            // Tamanho da página A4: 210mm x 297mm (com margens de 10mm = 190mm x 277mm)
            const pageWidth = 190; // mm
            const pageHeight = 277; // mm
            const photoWidthMm = currentPhotoSize.width * 10; // cm para mm
            const photoHeightMm = currentPhotoSize.height * 10; // cm para mm
            const gapMm = 3; // espaço entre fotos
            
            const photosPerRow = Math.floor((pageWidth + gapMm) / (photoWidthMm + gapMm));
            const photosPerCol = Math.floor((pageHeight + gapMm) / (photoHeightMm + gapMm));
            const maxPerPage = photosPerRow * photosPerCol;
            
            // Limpa os grids
            photoGrid.innerHTML = '';
            printContainer.innerHTML = '';

            // Preenche o grid de visualização
            for (let i = 0; i < count; i++) {
                const photoItem = document.createElement('div');
                photoItem.className = 'photo-item';
                photoItem.style.aspectRatio = `${currentPhotoSize.width}/${currentPhotoSize.height}`;
                const img = document.createElement('img');
                img.src = croppedImageData;
                img.alt = `Foto ${i + 1}`;
                photoItem.appendChild(img);
                photoGrid.appendChild(photoItem);
            }
            
            // Cria páginas para impressão
            const totalPages = Math.ceil(count / maxPerPage);
            
            for (let page = 0; page < totalPages; page++) {
                const pageDiv = document.createElement('div');
                pageDiv.className = 'print-page-item';
                
                const gridDiv = document.createElement('div');
                gridDiv.className = 'print-grid';
                gridDiv.style.gridTemplateColumns = `repeat(${photosPerRow}, 1fr)`;
                
                const startIdx = page * maxPerPage;
                const endIdx = Math.min(startIdx + maxPerPage, count);
                
                for (let i = startIdx; i < endIdx; i++) {
                    const photoItem = document.createElement('div');
                    photoItem.className = 'photo-item';
                    photoItem.style.width = `${photoWidthMm}mm`;
                    photoItem.style.height = `${photoHeightMm}mm`;
                    const img = document.createElement('img');
                    img.src = croppedImageData;
                    img.alt = `Foto ${i + 1}`;
                    photoItem.appendChild(img);
                    gridDiv.appendChild(photoItem);
                }
                
                pageDiv.appendChild(gridDiv);
                printContainer.appendChild(pageDiv);
            }
            
            // Atualizar a mensagem de ajuda
            const helpText = document.querySelector('.help.is-info');
            if (helpText) {
                helpText.textContent = `Máx. ${maxPerPage} fotos por página A4 (${photosPerRow}×${photosPerCol})`;
            }
            
            // Atualizar displays de informação
            if (resultSizeDisplay) {
                resultSizeDisplay.textContent = currentPhotoSize.name;
            }
            if (photosPerPageDisplay) {
                photosPerPageDisplay.textContent = `${maxPerPage} (${photosPerRow}×${photosPerCol})`;
            }
        }

        updateGridBtn.addEventListener('click', generatePhotoGrid);

        printBtn.addEventListener('click', () => {
            const count = parseInt(photoCount.value) || 6;
            
            // Calcular quantas fotos cabem por página
            const pageWidth = 190; // mm
            const pageHeight = 277; // mm
            const photoWidthMm = currentPhotoSize.width * 10;
            const photoHeightMm = currentPhotoSize.height * 10;
            const gapMm = 3;
            
            const photosPerRow = Math.floor((pageWidth + gapMm) / (photoWidthMm + gapMm));
            const photosPerCol = Math.floor((pageHeight + gapMm) / (photoHeightMm + gapMm));
            const maxPerPage = photosPerRow * photosPerCol;
            const pages = Math.ceil(count / maxPerPage);
            
            if (pages > 1) {
                const confirmPrint = confirm(
                    `Você tem ${count} fotos (${currentPhotoSize.name}) que serão impressas em ${pages} páginas A4.\n\n` +
                    `Cada página terá até ${maxPerPage} fotos (${photosPerRow} colunas x ${photosPerCol} linhas).\n\n` +
                    `Deseja continuar com a impressão?`
                );
                if (!confirmPrint) return;
            }
            
            window.print();
        });

        downloadBtn.addEventListener('click', () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const cols = 4;
            const count = parseInt(photoCount.value) || 6;
            const rows = Math.ceil(count / cols);
            
            // Usar 100 pixels por cm
            const pixelsPerCm = 100;
            const photoWidth = currentPhotoSize.width * pixelsPerCm;
            const photoHeight = currentPhotoSize.height * pixelsPerCm;
            
            canvas.width = photoWidth * cols;
            canvas.height = photoHeight * rows;
            
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            const img = new Image();
            img.onload = () => {
                for (let i = 0; i < count; i++) {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    ctx.drawImage(img, col * photoWidth, row * photoHeight, photoWidth, photoHeight);
                }
                
                const link = document.createElement('a');
                link.download = `fotos-${currentPhotoSize.width}x${currentPhotoSize.height}.jpg`;
                link.href = canvas.toDataURL('image/jpeg', 0.95);
                link.click();
            };
            img.src = croppedImageData;
        });

        newPhotoBtn.addEventListener('click', () => {
            resultSection.style.display = 'none';
            uploadSection.style.display = 'block';
            fileInput.value = '';
            currentImage = null;
            processedImage = null;
            croppedImageData = null;
            zoomSlider.value = 100;
            positionSlider.value = 50;
            removeBgToggle.checked = false;
            toleranceSlider.value = 50;
            toleranceField.style.display = 'none';
            photoSizeSelect.value = '3x4';
            customSizeFields.style.display = 'none';
            customWidth.value = 3;
            customHeight.value = 4;
            currentPhotoSize = { width: 3, height: 4, name: '3x4 cm' };
            removeBg = false;
            tolerance = 50;
            photoCount.value = 6;
        });
    