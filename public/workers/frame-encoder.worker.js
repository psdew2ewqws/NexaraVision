/**
 * Web Worker for frame encoding
 * Offloads CPU-intensive canvas operations from the main thread
 * Addresses GAP-PERF-003: Frame encoding blocking main thread
 */

// OffscreenCanvas for encoding frames
let canvas = null;
let ctx = null;

/**
 * Initialize the offscreen canvas
 */
function initCanvas(width, height) {
  canvas = new OffscreenCanvas(width, height);
  ctx = canvas.getContext('2d', { willReadFrequently: true });
  return { success: true, width, height };
}

/**
 * Encode ImageBitmap to base64 JPEG
 */
async function encodeFrame(imageBitmap, quality = 0.85) {
  if (!canvas || !ctx) {
    throw new Error('Canvas not initialized. Call initCanvas first.');
  }

  // Draw the image bitmap to the canvas
  ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);

  // Convert to blob
  const blob = await canvas.convertToBlob({
    type: 'image/jpeg',
    quality: quality
  });

  // Convert blob to base64
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);

  // Close the ImageBitmap to free memory
  imageBitmap.close();

  return base64;
}

/**
 * Encode multiple frames in batch
 */
async function encodeBatch(imageBitmaps, quality = 0.85) {
  const results = [];
  for (const bitmap of imageBitmaps) {
    const base64 = await encodeFrame(bitmap, quality);
    results.push(base64);
  }
  return results;
}

/**
 * Get canvas image data for analysis
 */
function getImageData() {
  if (!canvas || !ctx) {
    throw new Error('Canvas not initialized');
  }
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// Message handler
self.onmessage = async (event) => {
  const { type, id, payload } = event.data;

  try {
    let result;

    switch (type) {
      case 'init':
        result = initCanvas(payload.width, payload.height);
        break;

      case 'encode':
        result = await encodeFrame(payload.imageBitmap, payload.quality);
        break;

      case 'encodeBatch':
        result = await encodeBatch(payload.imageBitmaps, payload.quality);
        break;

      case 'getImageData':
        result = getImageData();
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    self.postMessage({ type: 'success', id, result });
  } catch (error) {
    self.postMessage({ type: 'error', id, error: error.message });
  }
};

// Signal that worker is ready
self.postMessage({ type: 'ready' });
