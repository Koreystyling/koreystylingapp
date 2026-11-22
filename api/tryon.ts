// Vercel serverless function: POST /api/tryon
// Keeps the fal.ai key on the server. Set FAL_KEY in the Vercel project settings.
// Main model: FASHN try-on. Backup: Kling Kolors. See the PRD "try-on pipeline" section.

export const config = { runtime: 'edge' };

const FAL = 'https://fal.run';
const MODELS = ['fal-ai/fashn/tryon/v1.6', 'fal-ai/kling/v1-5/kolors-virtual-try-on'];

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const key = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env.FAL_KEY;
  if (!key) return new Response('FAL_KEY is not set on the server', { status: 500 });

  const { personImage, garmentImage, description } = await req.json();
  if (!personImage || !garmentImage) return new Response('personImage and garmentImage are required', { status: 400 });

  let lastErr = '';
  for (const model of MODELS) {
    const body = model.includes('fashn')
      ? { model_image: personImage, garment_image: garmentImage, category: 'one-pieces', garment_photo_type: 'flat-lay', mode: 'quality', prompt: description }
      : { human_image_url: personImage, garment_image_url: garmentImage };
    const r = await fetch(`${FAL}/${model}`, {
      method: 'POST',
      headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      const j = await r.json();
      const image = j.images?.[0]?.url ?? j.image?.url;
      if (image) return Response.json({ image, model });
      lastErr = 'no image in response';
    } else {
      lastErr = await r.text();
    }
  }
  return new Response(`Try-on failed: ${lastErr}`, { status: 502 });
}
