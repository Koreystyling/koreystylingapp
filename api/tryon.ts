// Vercel serverless function: POST /api/tryon
// Keeps the fal.ai key on the server. Set FAL_KEY in the Vercel project settings.
//
// Main model: Nano Banana Pro (image edit). Given the person photo, the drawn garment and a
// silhouette-aware prompt, it keeps mermaid flares, sleeves and length far better than
// classic try-on models. Backups, in order: Seedream v4 edit, then FASHN try-on.

// Node runtime (not edge): image models take 10-30s each, and a fallback may run after a failure.
export const maxDuration = 120;

const FAL = 'https://fal.run';

interface Body { personImage?: string; garmentImage?: string; description?: string; prompt?: string }
type Step = { model: string; body: (b: Required<Body>) => Record<string, unknown> };

const STEPS: Step[] = [
  { model: 'fal-ai/nano-banana-pro/edit', body: (b) => ({ prompt: b.prompt, image_urls: [b.personImage, b.garmentImage], num_images: 1 }) },
  { model: 'fal-ai/bytedance/seedream/v4/edit', body: (b) => ({ prompt: b.prompt, image_urls: [b.personImage, b.garmentImage], num_images: 1, image_size: 'portrait_16_9' }) },
  { model: 'fal-ai/fashn/tryon/v1.6', body: (b) => ({ model_image: b.personImage, garment_image: b.garmentImage, category: 'one-pieces', garment_photo_type: 'flat-lay', mode: 'quality' }) },
];

export async function POST(req: Request): Promise<Response> {
  const key = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env.FAL_KEY;
  if (!key) return new Response('FAL_KEY is not set on the server', { status: 500 });

  const { personImage, garmentImage, description = '', prompt } = (await req.json()) as Body;
  if (!personImage || !garmentImage) return new Response('personImage and garmentImage are required', { status: 400 });
  const b = { personImage, garmentImage, description, prompt: prompt || `Dress the woman in the first image in the exact outfit drawn in the second image. ${description}. Keep her face, body and pose unchanged. Realistic full-body fashion photo.` };

  let lastErr = '';
  for (const step of STEPS) {
    try {
      const r = await fetch(`${FAL}/${step.model}`, {
        method: 'POST',
        headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(step.body(b)),
      });
      if (r.ok) {
        const j = await r.json();
        const image = j.images?.[0]?.url ?? j.image?.url;
        if (image) return Response.json({ image, model: step.model });
        lastErr = 'no image in response';
      } else {
        lastErr = `${step.model}: ${await r.text()}`;
      }
    } catch (e) {
      lastErr = `${step.model}: ${(e as Error).message}`;
    }
  }
  return new Response(`Try-on failed: ${lastErr}`, { status: 502 });
}
