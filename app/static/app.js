function init() {
    // DOM Selectors
    const form = document.getElementById('upscale-form');
    const modelSelect = document.getElementById('model-select');
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.loader');

    const filePreviewContainer = document.getElementById('file-preview-container');
    const dropZonePrompt = dropZone.querySelector('.drop-zone-prompt');
    const localPreview = document.getElementById('local-preview');
    const fileNameSpan = document.getElementById('file-name');
    const fileSizeSpan = document.getElementById('file-size');
    const removeFileBtn = document.getElementById('remove-file-btn');

    const viewerPlaceholder = document.getElementById('viewer-placeholder');
    const processingState = document.getElementById('processing-state');
    const sliderContainer = document.getElementById('slider-container');
    const imgOriginal = document.getElementById('img-original');
    const imgUpscaled = document.getElementById('img-upscaled');
    const sliderBar = sliderContainer.querySelector('.slider-bar');

    const resolutionBadge = document.getElementById('resolution-badge');
    const resOriginalSpan = document.getElementById('res-original');
    const resUpscaledSpan = document.getElementById('res-upscaled');
    const viewerFooter = document.getElementById('viewer-footer');
    const downloadBtn = document.getElementById('download-btn');

    const zoomControls = document.getElementById('zoom-controls');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomResetBtn = document.getElementById('zoom-reset-btn');
    const zoomLevelText = document.getElementById('zoom-level-text');
    const sampleCards = document.querySelectorAll('.sample-card');

    let activeFile = null;
    let upscaledImageBlobUrl = null;

    let zoomLevel = 1;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let sliderPosition = 50;

    // Automatically align container aspect ratio to image boundaries
    imgOriginal.onload = () => {
        const width = imgOriginal.naturalWidth;
        const height = imgOriginal.naturalHeight;
        if (width && height) {
            sliderContainer.style.aspectRatio = `${width} / ${height}`;
        }
    };

    // --- Drag & Drop & File Input Event Listeners ---

    // Open file selection on click of drop zone (if empty)
    dropZone.addEventListener('click', (e) => {
        // Prevent opening picker if the user clicks the remove button
        if (e.target === removeFileBtn || removeFileBtn.contains(e.target)) {
            return;
        }
        if (!activeFile) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleSelectedFile(e.target.files[0]);
        }
    });

    // Drag Over state
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
        }, false);
    });

    // Drag Leave state
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
        }, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt.files.length > 0) {
            handleSelectedFile(dt.files[0]);
        }
    });

    // Remove selected file
    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetUploadState();
    });

    // --- Sample Image Selection Logic ---
    sampleCards.forEach(card => {
        card.addEventListener('click', async () => {
            const sampleName = card.dataset.sample;
            
            // Visually highlight the active sample card
            sampleCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            // Set loading state for the preview
            dropZonePrompt.style.display = 'none';
            filePreviewContainer.style.display = 'flex';
            fileNameSpan.textContent = `Loading ${sampleName}...`;
            fileSizeSpan.textContent = 'Sample image';
            localPreview.src = `samples/${sampleName}.jpg`; // Set visual preview immediately

            try {
                const response = await fetch(`samples/${sampleName}.jpg`);
                if (!response.ok) throw new Error('Could not load sample.');
                const blob = await response.blob();
                
                // Create file-like object
                const file = new File([blob], `${sampleName}.jpg`, { type: 'image/jpeg' });
                
                // Set standard active file
                activeFile = file;
                
                // Programmatically update the file input so the browser validation passes
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;
                
                // Update final display sizes & preview
                fileNameSpan.textContent = file.name;
                fileSizeSpan.textContent = formatBytes(file.size);
            } catch (err) {
                showErrorDialog(`Failed to load sample: ${err.message}`);
                resetUploadState();
            }
        });
    });

    function handleSelectedFile(file) {
        // Validation: type check (allow-list)
        const allowedExtensions = ['.png', '.jpg', '.jpeg'];
        const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!allowedExtensions.includes(extension) || !file.type.startsWith('image/')) {
            showErrorDialog('Unsupported file type. Please upload a PNG, JPG or JPEG image.');
            return;
        }

        // Validation: size check (10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            showErrorDialog('File size exceeds the 10MB limit. Please upload a smaller image.');
            return;
        }

        activeFile = file;
        sampleCards.forEach(c => c.classList.remove('active')); // clear any active samples if user uploaded custom image
        fileNameSpan.textContent = file.name;
        fileSizeSpan.textContent = formatBytes(file.size);

        // Show local preview
        const reader = new FileReader();
        reader.onload = (e) => {
            localPreview.setAttribute('src', e.target.result);
            dropZonePrompt.style.display = 'none';
            filePreviewContainer.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }

    function resetUploadState() {
        activeFile = null;
        fileInput.value = '';
        sampleCards.forEach(c => c.classList.remove('active')); // clear sample highlights
        localPreview.removeAttribute('src');
        fileNameSpan.textContent = '';
        fileSizeSpan.textContent = '';
        filePreviewContainer.style.display = 'none';
        dropZonePrompt.style.display = 'flex';
        sliderContainer.style.aspectRatio = '';
        resetZoom();
    }

    function resetZoom() {
        zoomLevel = 1;
        panX = 0;
        panY = 0;
        zoomLevelText.textContent = '100%';
        updateImageTransforms(true);
    }

    function updateClipPath() {
        const rect = sliderContainer.getBoundingClientRect();
        const containerWidth = rect.width || 400;
        
        // Calculate the precise split percentage relative to the scaled/panned image coordinates
        let clipPercentage = ((sliderPosition / 100 - 0.5 - panX / containerWidth) / zoomLevel + 0.5) * 100;
        
        if (clipPercentage < 0) clipPercentage = 0;
        if (clipPercentage > 100) clipPercentage = 100;
        
        imgUpscaled.style.clipPath = `polygon(${clipPercentage}% 0, 100% 0, 100% 100%, ${clipPercentage}% 100%)`;
    }

    function updateImageTransforms(smooth = false) {
        const transition = smooth ? 'transform 0.2s ease-out' : 'none';
        imgOriginal.style.transition = transition;
        imgUpscaled.style.transition = transition;
        
        const transformStr = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
        imgOriginal.style.transform = transformStr;
        imgUpscaled.style.transform = transformStr;
        
        // Recalculate and synchronize the clipping path position
        updateClipPath();
    }

    // --- Form Submission & API Request ---

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!activeFile) {
            showErrorDialog('Please upload an image first.');
            return;
        }

        // Set UI Loading States
        setFormLoading(true);
        showViewState('processing');

        const formData = new FormData();
        formData.append('image', activeFile);
        formData.append('scale', form.querySelector('input[name="scale"]:checked').value);
        formData.append('model', modelSelect.value);

        try {
            const response = await fetch('/api/upscale', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Server failed to process upscaling.');
            }

            const result = await response.json();
            handleUpscaleSuccess(result);
        } catch (err) {
            showViewState('placeholder');
            showErrorDialog(err.message || 'Upscaling failed. Please try again.');
        } finally {
            setFormLoading(false);
        }
    });

    function setFormLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
        } else {
            submitBtn.disabled = false;
            btnText.style.display = 'inline-block';
            btnLoader.style.display = 'none';
        }
    }

    function showViewState(state) {
        // state can be: 'placeholder', 'processing', 'viewer'
        viewerPlaceholder.style.display = state === 'placeholder' ? 'block' : 'none';
        processingState.style.display = state === 'processing' ? 'block' : 'none';
        sliderContainer.style.display = state === 'viewer' ? 'flex' : 'none';
        viewerFooter.style.display = state === 'viewer' ? 'flex' : 'none';
        resolutionBadge.style.display = state === 'viewer' ? 'block' : 'none';
        zoomControls.style.display = state === 'viewer' ? 'flex' : 'none';
        if (state !== 'viewer') {
            resetZoom();
        }
    }

    async function handleUpscaleSuccess(data) {
        // Update resolution labels
        resOriginalSpan.textContent = data.original_dimensions;
        resUpscaledSpan.textContent = data.upscaled_dimensions;

        // Display input image as "Before"
        const originalReader = new FileReader();
        originalReader.onload = (e) => {
            imgOriginal.setAttribute('src', e.target.result);
        };
        originalReader.readAsDataURL(activeFile);

        // Display upscaled image as "After"
        imgUpscaled.setAttribute('src', data.upscaled_image_url);

        // Save blob URL for downloading
        const res = await fetch(data.upscaled_image_url);
        const blob = await res.blob();
        
        if (upscaledImageBlobUrl) {
            URL.revokeObjectURL(upscaledImageBlobUrl);
        }
        upscaledImageBlobUrl = URL.createObjectURL(blob);

        // Initialize Slider interaction
        showViewState('viewer');
        initSlider();
    }

    // Download Trigger
    downloadBtn.addEventListener('click', () => {
        if (upscaledImageBlobUrl) {
            const link = document.createElement('a');
            link.href = upscaledImageBlobUrl;
            // Generate clean filename
            const originalName = activeFile.name.substring(0, activeFile.name.lastIndexOf('.'));
            const extension = activeFile.name.substring(activeFile.name.lastIndexOf('.'));
            const scaleFactor = form.querySelector('input[name="scale"]:checked').value;
            
            link.download = `${originalName}_enhanced_${scaleFactor}${extension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });

    // --- Interactive Before/After Slider Logic ---

    let isSliding = false;

    function initSlider() {
        // Start at 50% split
        updateSliderPosition(50);
    }

    function updateSliderPosition(percentage) {
        if (percentage < 0) percentage = 0;
        if (percentage > 100) percentage = 100;

        sliderPosition = percentage;

        // Move separation bar
        sliderBar.style.left = `${sliderPosition}%`;

        // Adjust upscaled image clip-path relative to scale and pan
        updateClipPath();
    }

    // Mouse & Touch Event Handlers for Slider Bar
    function getPositionX(e) {
        const rect = sliderContainer.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const positionX = clientX - rect.left;
        const percentage = (positionX / rect.width) * 100;
        return percentage;
    }

    function startSlide(e) {
        isSliding = true;
        e.preventDefault();
    }

    function stopSlide() {
        isSliding = false;
        if (isPanning) {
            isPanning = false;
            sliderContainer.style.cursor = 'default';
        }
    }

    function moveSlide(e) {
        if (isSliding) {
            const percentage = getPositionX(e);
            updateSliderPosition(percentage);
        } else if (isPanning) {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            panX = clientX - startX;
            panY = clientY - startY;
            
            // Apply boundaries based on zoom level and container dimensions
            const rect = sliderContainer.getBoundingClientRect();
            const maxPanX = (rect.width * (zoomLevel - 1)) / 2;
            const maxPanY = (rect.height * (zoomLevel - 1)) / 2;
            
            if (panX > maxPanX) panX = maxPanX;
            if (panX < -maxPanX) panX = -maxPanX;
            if (panY > maxPanY) panY = maxPanY;
            if (panY < -maxPanY) panY = -maxPanY;
            
            updateImageTransforms(false);
        }
    }

    // Attach Listeners
    sliderBar.addEventListener('mousedown', startSlide);
    window.addEventListener('mouseup', stopSlide);
    window.addEventListener('mousemove', moveSlide);

    sliderBar.addEventListener('touchstart', startSlide);
    window.addEventListener('touchend', stopSlide);
    window.addEventListener('touchmove', moveSlide);

    // Support clicking anywhere on container to move slider
    sliderContainer.addEventListener('click', (e) => {
        if (e.target === sliderBar || sliderBar.contains(e.target)) {
            return; // Already handled by drag
        }
        if (zoomLevel > 1) {
            return; // Don't snap click when zoomed in to prevent collision with pan dragging
        }
        const percentage = getPositionX(e);
        // Smoothly animate to position
        sliderBar.style.transition = 'left 0.2s ease-out';
        imgUpscaled.style.transition = 'clip-path 0.2s ease-out';
        updateSliderPosition(percentage);
        
        // Remove transitions after animation finishes to keep dragging responsive
        setTimeout(() => {
            sliderBar.style.transition = 'none';
            imgUpscaled.style.transition = 'none';
        }, 200);
    });

    // Zoom In / Out / Reset button interactions
    zoomInBtn.addEventListener('click', () => {
        if (zoomLevel < 4) {
            zoomLevel += 0.5;
            zoomLevelText.textContent = `${Math.round(zoomLevel * 100)}%`;
            updateImageTransforms(true);
        }
    });

    zoomOutBtn.addEventListener('click', () => {
        if (zoomLevel > 1) {
            zoomLevel -= 0.5;
            // Restrict panning bounds when zooming out
            const rect = sliderContainer.getBoundingClientRect();
            const maxPanX = (rect.width * (zoomLevel - 1)) / 2;
            const maxPanY = (rect.height * (zoomLevel - 1)) / 2;
            if (panX > maxPanX) panX = maxPanX;
            if (panX < -maxPanX) panX = -maxPanX;
            if (panY > maxPanY) panY = maxPanY;
            if (panY < -maxPanY) panY = -maxPanY;
            
            zoomLevelText.textContent = `${Math.round(zoomLevel * 100)}%`;
            updateImageTransforms(true);
        }
    });

    zoomResetBtn.addEventListener('click', () => {
        resetZoom();
    });

    // Panning logic for sliderContainer when zoomed in
    sliderContainer.addEventListener('mousedown', (e) => {
        if (e.target === sliderBar || sliderBar.contains(e.target)) {
            return; // Slider dragging handled separately
        }
        if (zoomLevel > 1) {
            isPanning = true;
            startX = e.clientX - panX;
            startY = e.clientY - panY;
            sliderContainer.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });

    sliderContainer.addEventListener('touchstart', (e) => {
        if (e.target === sliderBar || sliderBar.contains(e.target)) {
            return;
        }
        if (zoomLevel > 1 && e.touches.length === 1) {
            isPanning = true;
            startX = e.touches[0].clientX - panX;
            startY = e.touches[0].clientY - panY;
            e.preventDefault();
        }
    });

    // --- Helper Functions ---

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function showErrorDialog(message) {
        // Use modern, custom overlay warning instead of native blocking alert()
        // as mandated by production security policies.
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'error-dialog card';
        
        const title = document.createElement('h3');
        title.textContent = 'Error';
        title.style.color = 'var(--color-error)';
        title.style.marginBottom = '12px';
        
        const text = document.createElement('p');
        text.textContent = message;
        text.style.marginBottom = '20px';
        text.style.lineHeight = '1.5';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn-primary';
        closeBtn.textContent = 'Dismiss';
        closeBtn.style.padding = '10px 24px';
        closeBtn.style.fontSize = '0.95rem';
        
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        dialog.appendChild(title);
        dialog.appendChild(text);
        dialog.appendChild(closeBtn);
        overlay.appendChild(dialog);
        
        // Style error dialog dynamically in JS using separate modal properties
        Object.assign(overlay.style, {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(6px)'
        });
        
        Object.assign(dialog.style, {
            maxWidth: '400px',
            width: '90%',
            padding: '24px',
            backgroundColor: 'var(--bg-secondary)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        });

        document.body.appendChild(overlay);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
