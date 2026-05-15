// Resize and compress an image File into a JPEG data URL small enough to
// store directly on a Firestore document (the doc limit is ~1 MiB; we keep
// the encoded string comfortably under that).
const MAX_DATA_URL_LEN = 700_000; // ~525 KB once base64-encoded

export async function compressImage(file, { maxDim = 1000, quality = 0.6 } = {}) {
  const img = await loadImage(file);
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (Math.max(width, height) > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);

  let q = quality;
  let dataUrl = canvas.toDataURL('image/jpeg', q);
  while (dataUrl.length > MAX_DATA_URL_LEN && q > 0.3) {
    q -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', q);
  }
  return dataUrl;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
    img.src = url;
  });
}
