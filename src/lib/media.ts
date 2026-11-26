// Image helpers: downscale uploads so they fit in browser storage, and export the preview as PNG.

export const fileToDataUrl = (file: File, max = 640, quality = 0.82): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Not an image'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext('2d');
        if (!ctx) return resolve(String(reader.result));
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

/**
 * Re-encode a photo as JPEG at a sensible size. Re-drawing through a canvas also drops
 * EXIF metadata such as GPS location, which matters for customer photos.
 */
export const fileToJpegBlob = (file: Blob, max = 1600, quality = 0.9): Promise<{ blob: Blob; width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Not an image')); };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      const ctx = c.getContext('2d');
      if (!ctx) return reject(new Error('No canvas'));
      ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve({ blob: b, width: c.width, height: c.height }) : reject(new Error('Could not encode'))), 'image/jpeg', quality);
    };
    img.src = url;
  });

/** Average colour of an image, used as the base colour behind an uploaded fabric. */
export const averageColor = (src: string): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 16; c.height = 16;
      const ctx = c.getContext('2d');
      if (!ctx) return resolve('#888888');
      ctx.drawImage(img, 0, 0, 16, 16);
      const d = ctx.getImageData(0, 0, 16, 16).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4;
      const hx = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
      resolve(`#${hx(r)}${hx(g)}${hx(b)}`);
    };
    img.onerror = () => resolve('#888888');
    img.src = src;
  });

/** Draw several SVG elements side by side onto a canvas and download as PNG. */
export const downloadSvgs = async (svgs: SVGSVGElement[], filename: string, opts: { bg?: string; title?: string; brand?: string } = {}) => {
  const W = 400 * svgs.length, H = 1120;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = opts.bg ?? '#F6F4F1';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < svgs.length; i++) {
    const clone = svgs[i].cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', '400');
    clone.setAttribute('height', '1040');
    const xml = new XMLSerializer().serializeToString(clone);
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    await new Promise<void>((res) => {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, i * 400, 20, 400, 1040); res(); };
      img.onerror = () => res();
      img.src = url;
    });
  }
  ctx.fillStyle = '#16121A';
  ctx.font = '600 28px Fraunces, Georgia, serif';
  if (opts.title) ctx.fillText(opts.title, 24, H - 28);
  ctx.font = '500 18px "DM Sans", sans-serif';
  ctx.fillStyle = '#6B6170';
  const tag = opts.brand ? `${opts.brand} · made with korey` : 'made with korey';
  ctx.fillText(tag, W - ctx.measureText(tag).width - 24, H - 30);
  const a = document.createElement('a');
  a.download = filename;
  a.href = c.toDataURL('image/png');
  a.click();
};
