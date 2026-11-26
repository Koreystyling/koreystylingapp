// Vercel serverless function: POST /api/personalise
// Face identity step of the personalisation engine. Body and skin are done on the customer's
// device; only this step needs an image model, and it receives only a square crop of the head. Keeps the fal.ai key on the server.
//
// Privacy: the face photo and the base-model view are sent to fal.ai as data (not public links)
// for this one request. The result is downloaded here and returned as data, so the browser
// never receives a provider link. fal may keep request data for a period under its own terms;
// that must be confirmed and minimised before real customers use this.

export const maxDuration = 120;

const MODEL = 'fal-ai/nano-banana-pro/edit';

const PROMPT: Record<'front' | 'side', string> = {
  front: 'Image 1 is a head-and-shoulders crop of a studio fashion photo of a woman facing the camera. Image 2 is a photo of a different woman\'s face. Replace only the face of the woman in image 1 with the face of the woman in image 2, so she is clearly recognisable as the woman in image 2: same face shape, eyes, eyebrows, nose, lips, jawline and skin tone. Keep everything else in image 1 exactly as it is: her hairstyle, head size, head position and angle, neck, shoulders, dress neckline, lighting, backdrop, framing and image size. Photorealistic, natural skin texture.',
  side: 'Image 1 is a head-and-shoulders crop of a studio fashion photo of a woman seen from the side, in profile. Image 2 is a photo of a different woman\'s face. Change only her face so that, seen in this same profile angle, she is clearly recognisable as the woman in image 2: same nose, lips, brow, chin and jawline shape and skin tone. Keep everything else in image 1 exactly as it is: the profile angle, hairstyle, head size and position, neck, shoulders, dress neckline, lighting, backdrop, framing and image size. Photorealistic, natural skin texture.',
};

interface Body { image?: string; face?: string; view?: 'front' | 'side' }

export async function POST(req: Request): Promise<Response> {
  const key = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env.FAL_KEY;
  if (!key) return new Response('FAL_KEY is not set on the server', { status: 500 });
  const { image, face, view = 'front' } = (await req.json()) as Body;
  if (!image?.startsWith('data:image/') || !face?.startsWith('data:image/')) return new Response('image and face must be data URLs', { status: 400 });
  if (view !== 'front' && view !== 'side') return new Response('view must be front or side', { status: 400 });

  const r = await fetch(`https://fal.run/${MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: PROMPT[view], image_urls: [image, face], num_images: 1, aspect_ratio: '1:1', output_format: 'png' }),
  });
  if (!r.ok) return new Response(`Face step failed: ${(await r.text()).slice(0, 300)}`, { status: 502 });
  const j = await r.json();
  const url: string | undefined = j.images?.[0]?.url;
  if (!url) return new Response('Face step failed: no image returned', { status: 502 });
  const img = await fetch(url);
  if (!img.ok) return new Response('Face step failed: could not download the result', { status: 502 });
  const type = img.headers.get('content-type') ?? 'image/png';
  const b64 = Buffer.from(await img.arrayBuffer()).toString('base64');
  return Response.json({ image: `data:${type};base64,${b64}`, model: MODEL });
}
