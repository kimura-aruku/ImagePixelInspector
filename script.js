// DOM Elements
const uploadSection = document.getElementById('uploadSection');
const viewerSection = document.getElementById('viewerSection');
const uploadArea = document.getElementById('uploadArea');
const uploadButton = document.getElementById('uploadButton');
const fileInput = document.getElementById('fileInput');
const resetButton = document.getElementById('resetButton');
const canvas = document.getElementById('imageCanvas');
const canvasContainer = document.getElementById('canvasContainer');
const pixelCoords = document.getElementById('pixelCoords');
const percentCoords = document.getElementById('percentCoords');
const imageSize = document.getElementById('imageSize');
const zoomLevel = document.getElementById('zoomLevel');
const rgbColor = document.getElementById('rgbColor');
const hexColor = document.getElementById('hexColor');
const colorPreview = document.getElementById('colorPreview');

const ctx = canvas.getContext('2d', { willReadFrequently: true });

// State
let currentImage = null;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isPanning = false;
let startPanX = 0;
let startPanY = 0;

// Upload functionality
uploadButton.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
});

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
});

// Load image
function loadImage(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            currentImage = img;

            // Reset view
            scale = 1;
            offsetX = 0;
            offsetY = 0;

            // Show viewer, hide upload
            uploadSection.style.display = 'none';
            viewerSection.style.display = 'flex';

            // Update info
            imageSize.textContent = `${img.width} × ${img.height}px`;

            // Render
            render();
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
}

// Render canvas
function render() {
    if (!currentImage) return;

    // Border width (complete outside of image)
    const borderWidth = 2;
    const padding = borderWidth;

    // Resize canvas to include border completely outside the image
    canvas.width = currentImage.width + padding * 2;
    canvas.height = currentImage.height + padding * 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image with offset for border
    ctx.drawImage(currentImage, padding, padding);

    // Draw border completely outside the image pixels
    // The border goes from -borderWidth to 0 on the outside edge
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = borderWidth;
    // Stroke is centered on the path, so we offset by half the border width
    // to make it completely outside
    ctx.strokeRect(
        padding - borderWidth / 2,
        padding - borderWidth / 2,
        currentImage.width + borderWidth,
        currentImage.height + borderWidth
    );

    // Update canvas transform
    const centerX = canvasContainer.clientWidth / 2;
    const centerY = canvasContainer.clientHeight / 2;

    canvas.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${scale})`;

    // Update zoom display
    zoomLevel.textContent = `${Math.round(scale * 100)}%`;
}

// Mouse wheel zoom
canvasContainer.addEventListener('wheel', (e) => {
    e.preventDefault();

    const delta = -Math.sign(e.deltaY);
    const zoomFactor = 1.1;
    const oldScale = scale;

    if (delta > 0) {
        scale *= zoomFactor;
    } else {
        scale /= zoomFactor;
    }

    // Limit zoom range
    scale = Math.max(0.1, Math.min(10, scale));

    // Zoom towards mouse position
    const rect = canvasContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const centerX = canvasContainer.clientWidth / 2;
    const centerY = canvasContainer.clientHeight / 2;

    const scaleChange = scale / oldScale;
    offsetX = mouseX + (offsetX - mouseX) * scaleChange - (mouseX - centerX) * (scaleChange - 1);
    offsetY = mouseY + (offsetY - mouseY) * scaleChange - (mouseY - centerY) * (scaleChange - 1);

    render();
});

// Middle click pan
canvasContainer.addEventListener('mousedown', (e) => {
    if (e.button === 1) { // Middle button
        e.preventDefault();
        isPanning = true;
        startPanX = e.clientX - offsetX;
        startPanY = e.clientY - offsetY;
        canvasContainer.classList.add('panning');
    }
});

document.addEventListener('mousemove', (e) => {
    if (isPanning) {
        offsetX = e.clientX - startPanX;
        offsetY = e.clientY - startPanY;
        render();
    }

    // Update cursor position
    if (currentImage) {
        const rect = canvasContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check if mouse is over container
        if (mouseX >= 0 && mouseX < rect.width && mouseY >= 0 && mouseY < rect.height) {
            // Convert screen coordinates to canvas coordinates
            const centerX = canvasContainer.clientWidth / 2;
            const centerY = canvasContainer.clientHeight / 2;

            const borderWidth = 2;
            const canvasX = (mouseX - centerX - offsetX) / scale + canvas.width / 2 - borderWidth;
            const canvasY = (mouseY - centerY - offsetY) / scale + canvas.height / 2 - borderWidth;

            // Check if within image bounds
            if (canvasX >= 0 && canvasX < currentImage.width && canvasY >= 0 && canvasY < currentImage.height) {
                const x = Math.floor(canvasX);
                const y = Math.floor(canvasY);
                const percentX = ((canvasX / currentImage.width) * 100).toFixed(2);
                const percentY = ((canvasY / currentImage.height) * 100).toFixed(2);

                pixelCoords.textContent = `X: ${x}, Y: ${y}`;
                percentCoords.textContent = `X: ${percentX}%, Y: ${percentY}%`;

                // Get pixel color
                const imageData = ctx.getImageData(x + borderWidth, y + borderWidth, 1, 1);
                const pixel = imageData.data;
                const r = pixel[0];
                const g = pixel[1];
                const b = pixel[2];
                const a = pixel[3];

                // Display RGB
                rgbColor.textContent = `R:${r}, G:${g}, B:${b}, A:${a}`;

                // Convert to hex
                const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
                hexColor.textContent = hex;

                // Show color preview
                colorPreview.style.background = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
                colorPreview.style.visibility = 'visible';
            } else {
                pixelCoords.textContent = '-';
                percentCoords.textContent = '-';
                rgbColor.textContent = '-';
                hexColor.textContent = '-';
                colorPreview.style.visibility = 'hidden';
            }
        } else {
            pixelCoords.textContent = '-';
            percentCoords.textContent = '-';
            rgbColor.textContent = '-';
            hexColor.textContent = '-';
            colorPreview.style.visibility = 'hidden';
        }
    }
});

document.addEventListener('mouseup', (e) => {
    if (e.button === 1) {
        isPanning = false;
        canvasContainer.classList.remove('panning');
    }
});

// Prevent context menu on middle click
canvasContainer.addEventListener('contextmenu', (e) => {
    if (e.button === 1) {
        e.preventDefault();
    }
});

// Reset button
resetButton.addEventListener('click', () => {
    currentImage = null;
    uploadSection.style.display = 'flex';
    viewerSection.style.display = 'none';
    fileInput.value = '';
    pixelCoords.textContent = '-';
    percentCoords.textContent = '-';
    imageSize.textContent = '-';
    zoomLevel.textContent = '100%';
    rgbColor.textContent = '-';
    hexColor.textContent = '-';
    colorPreview.style.visibility = 'hidden';
});

// Handle window resize
window.addEventListener('resize', () => {
    if (currentImage) {
        render();
    }
});
