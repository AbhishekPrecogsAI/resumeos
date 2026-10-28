import { apiFetch } from './client.js';

export const PHOTO_KEY = ['profile', 'photo'];

export const photoApi = {
  get: () => apiFetch('/api/v1/profile/photo').then((r) => r.photo),
  put: (dataUrl) =>
    apiFetch('/api/v1/profile/photo', { method: 'PUT', body: { dataUrl } }).then((r) => r.photo),
  remove: () => apiFetch('/api/v1/profile/photo', { method: 'DELETE' }),
};

const MAX_INPUT_BYTES = 15 * 1024 * 1024;

/**
 * Centre-crop an image file to a square and re-encode it as a 400×400 JPEG in the browser, so
 * uploads are small and any metadata (e.g. GPS location in EXIF) is dropped.
 */
export async function prepareProfilePhoto(file, size = 400) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Choose a JPEG, PNG or WebP image.');
  if (file.size > MAX_INPUT_BYTES)
    throw new Error('That image is larger than 15 MB. Choose a smaller one.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That image couldn't be read."));
      el.src = url;
    });
    if (img.naturalWidth < 64 || img.naturalHeight < 64)
      throw new Error('Use an image at least 64 pixels on each side.');
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );
    return canvas.toDataURL('image/jpeg', 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}
