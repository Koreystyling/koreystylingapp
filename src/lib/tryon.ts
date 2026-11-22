// Virtual try-on adapter. The app talks only to our own endpoint (api/tryon.ts),
// which holds the fal.ai key server side and calls FASHN (main) with Kling Kolors as backup.
//
// Set VITE_TRYON_ENDPOINT at build time (e.g. "/api/tryon") to switch it on.
// Without it, the drawn model stands in and the "Make it realistic" button explains why.

export const TRYON_ENDPOINT: string | undefined = import.meta.env.VITE_TRYON_ENDPOINT;
export const tryOnEnabled = () => Boolean(TRYON_ENDPOINT);

export interface TryOnRequest {
  personImage: string; // data URL of the user's full-body photo
  garmentImage: string; // PNG data URL of the drawn look (front view)
  view: 'front' | 'back' | 'side';
  description: string; // plain text spec, helps the model with fabric and parts
}

export async function requestTryOn(req: TryOnRequest): Promise<string> {
  if (!TRYON_ENDPOINT) throw new Error('Realistic preview is not switched on yet.');
  const r = await fetch(TRYON_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) });
  if (!r.ok) throw new Error((await r.text()) || 'The try-on service did not answer.');
  const j = await r.json();
  if (!j.image) throw new Error('No image came back.');
  return j.image as string;
}

/** Render an on-screen SVG to a PNG data URL (used as the garment reference). */
export const svgToPng = (svg: SVGSVGElement, w = 600, h = 1560): Promise<string> =>
  new Promise((resolve, reject) => {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(w));
    clone.setAttribute('height', String(h));
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return reject(new Error('No canvas'));
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Could not draw the look'));
    img.src = url;
  });
