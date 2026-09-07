const MAX_DIM = 1440;
const QUALITY = 0.72;

/** Resizes/compresses an image file client-side before it goes to the server —
 * keeps journal photo rows small since they're stored directly in Postgres. */
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
      resolve({ mime: 'image/jpeg', data: dataUrl.split(',')[1] });
    };
    img.onerror = reject;
    img.src = url;
  });
}
