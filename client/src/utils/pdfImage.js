// ─── Shared PDF image compressor ────────────────────────────────────────────
// Resizes an image to at most maxSizePx × maxSizePx and re-encodes it before
// embedding in jsPDF. Raw logo/stamp embeds (full-resolution WEBP/PNG) were
// producing ~16 MB PDFs; compressed embeds keep the whole PDF in KBs.
//
// format: 'jpeg' (default — smallest, white background) or
//         'png'  (keeps transparency — use for stamps/seals)
export async function loadImgCompressed(src, maxSizePx = 200, format = 'jpeg') {
  if (!src) return null;
  try {
    let dataUrl = src;
    if (!src.startsWith('data:')) {
      const resp = await fetch(src, { cache: 'force-cache' });
      if (!resp.ok) return null;
      const blob = await resp.blob();
      dataUrl = await new Promise((resolve) => {
        const fr = new FileReader();
        fr.onloadend = () => resolve(fr.result);
        fr.onerror = () => resolve(null);
        fr.readAsDataURL(blob);
      });
      if (!dataUrl) return null;
    }
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const s = Math.min(maxSizePx / img.width, maxSizePx / img.height, 1);
        const w = Math.max(1, Math.round(img.width * s));
        const h = Math.max(1, Math.round(img.height * s));
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext('2d');
        if (format === 'jpeg') {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(format === 'png' ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  } catch {
    return null;
  }
}
