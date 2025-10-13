
        let currentImage = null;
        let croppedImageData = null;
        let scale = 1;
        let offsetY = 0;

        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        const uploadSection = document.getElementById('upload-section');
        const editorSection = document.getElementById('editor-section');
        const resultSection = document.getElementById('result-section');
        const previewImage = document.getElementById('preview-image');
        const zoomSlider = document.getElementById('zoom-slider');
        const positionSlider = document.getElementById('position-slider');
        const confirmBtn = document.getElementById('confirm-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        const photoCount = document.getElementById('photo-count');
        const updateGridBtn = document.getElementById('update-grid');
        const photoGrid = document.getElementById('photo-grid');
        const printContainer = document.getElementById('print-container');
        const printBtn = document.getElementById('print-btn');
        const downloadBtn = document.getElementById('download-btn');
        const newPhotoBtn = document.getElementById('new-photo-btn');

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
                    previewImage.src = e.target.result;
                    uploadSection.style.display = 'none';
                    editorSection.style.display = 'block';
                    updatePreview();
                };
                currentImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function updatePreview() {
            if (!currentImage) return;

            scale = zoomSlider.value / 100;
            offsetY = (positionSlider.value - 50) / 100;

            const canvas = document.getElementById('crop-canvas');
            const ctx = canvas.getContext('2d');

            // Tamanho do canvas (proporção 3:4)
            const targetWidth = 300;
            const targetHeight = 400;
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // Calcular dimensões da imagem com zoom
            const imgRatio = currentImage.width / currentImage.height;
            const targetRatio = 3 / 4;

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

            ctx.fillStyle = '#f5f5f5';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
            ctx.drawImage(currentImage, drawX, drawY, drawWidth, drawHeight);

            previewImage.src = canvas.toDataURL('image/jpeg', 0.9);
        }

        zoomSlider.addEventListener('input', updatePreview);
        positionSlider.addEventListener('input', updatePreview);

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
        });

        function generatePhotoGrid() {
            const count = parseInt(photoCount.value) || 6;
            const maxPerPage = 30; // 5 colunas x 6 linhas em A4
            
            // Limpa os grids
            photoGrid.innerHTML = '';
            printContainer.innerHTML = '';

            // Preenche o grid de visualização
            for (let i = 0; i < count; i++) {
                const photoItem = document.createElement('div');
                photoItem.className = 'photo-item';
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
                
                const startIdx = page * maxPerPage;
                const endIdx = Math.min(startIdx + maxPerPage, count);
                
                for (let i = startIdx; i < endIdx; i++) {
                    const photoItem = document.createElement('div');
                    photoItem.className = 'photo-item';
                    const img = document.createElement('img');
                    img.src = croppedImageData;
                    img.alt = `Foto ${i + 1}`;
                    photoItem.appendChild(img);
                    gridDiv.appendChild(photoItem);
                }
                
                pageDiv.appendChild(gridDiv);
                printContainer.appendChild(pageDiv);
            }
        }

        updateGridBtn.addEventListener('click', generatePhotoGrid);

        printBtn.addEventListener('click', () => {
            const count = parseInt(photoCount.value) || 6;
            const maxPerPage = 30;
            const pages = Math.ceil(count / maxPerPage);
            
            if (pages > 1) {
                const confirmPrint = confirm(
                    `Você tem ${count} fotos que serão impressas em ${pages} páginas A4.\n\n` +
                    `Cada página terá até ${maxPerPage} fotos (5 colunas x 6 linhas).\n\n` +
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
            const photoWidth = 300;
            const photoHeight = 400;
            
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
                link.download = 'fotos-3x4.jpg';
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
            croppedImageData = null;
            zoomSlider.value = 100;
            positionSlider.value = 50;
            photoCount.value = 6;
        });
    