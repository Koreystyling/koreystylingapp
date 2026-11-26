// Personalisation engine, browser side: loads images, runs body -> skin -> face for each view,
// checks each step, and returns the finished views. Nothing here stores anything; the caller
// saves the result to the private image store and updates the profile.

import { modelById, modelPhoto, type ModelView } from '../models';
import { blobToDataUrl, getImage } from '../privateImages';
import type { PersonalizationProfile } from '../profile';
import { BASE_BODY, nearestBase } from './calibration';
import {
  alignCrop, analyseBody, armSkin, BodyRangeError, checkBody, compositeHead, crop, deltaE, headBox, pasteCrop, planBody, recolourSkin, sampleSkin, warpBody,
  SKIN_MAX_DELTA_E, type Img, type Mask, type PersonalisationChecks,
} from './core';

export const ENGINE_VERSION = 'korey-personalise-1 (measured warp, Lab skin shift, Nano Banana Pro face)';
const VIEWS: ModelView[] = ['front', 'side', 'back'];
const FACE_VIEWS: ModelView[] = ['front', 'side'];
const FACE_MAX_MISALIGN = 22; // mean colour difference allowed around the head after lining the face edit up

export interface EngineResult { views: Partial<Record<ModelView, Blob>>; checks: PersonalisationChecks }

export class EngineError extends Error {}

export type Progress = (step: string) => void;

// ------------------------------------------------------------------ canvas helpers

const loadBitmap = async (src: Blob | string) => {
  const blob = typeof src === 'string' ? await (await fetch(src)).blob() : src;
  return createImageBitmap(blob);
};

const canvas = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

async function toImg(src: Blob | string, w?: number, h?: number): Promise<Img> {
  const bm = await loadBitmap(src);
  const c = canvas(w ?? bm.width, h ?? bm.height);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bm, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  return { width: c.width, height: c.height, data: d.data };
}

async function toMask(src: string, w: number, h: number): Promise<Mask> {
  const img = await toImg(src, w, h);
  const data = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) data[i] = img.data[i * 4];
  return { width: w, height: h, data };
}

const imgCanvas = (img: Img) => {
  const c = canvas(img.width, img.height);
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
  return c;
};

const toBlob = (img: Img, type = 'image/jpeg', q = 0.92) =>
  new Promise<Blob>((res, rej) => imgCanvas(img).toBlob((b) => (b ? res(b) : rej(new Error('Could not encode image'))), type, q));

const toDataUrl = (img: Img) => imgCanvas(img).toDataURL('image/jpeg', 0.92);

// ------------------------------------------------------------------ the run

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

export async function personalise(p: PersonalizationProfile, progress: Progress = () => {}, endpoint = '/api/personalise'): Promise<EngineResult> {
  const model = modelById(p.baseModelId);
  const base = BASE_BODY[p.baseModelId];
  if (!model || !base) throw new EngineError('This base model is not calibrated for personalisation yet.');
  if (!p.faceReference) throw new EngineError('Add a face photo first.');
  const v = p.measurementProfile.valuesCm;
  const bust = num(v.Bust), waist = num(v.Waist), hips = num(v.Hips);
  if (!bust || !waist || !hips) throw new EngineError('Add bust, waist and hip measurements first.');
  const target = { bust, waist, hips, height: num(v.Height) ?? base.height };

  progress('Reading your face photo');
  const faceBlob = await getImage(p.faceReference.id);
  if (!faceBlob) throw new EngineError('Your face photo is missing from this device. Add it again.');
  const faceImg = await toImg(faceBlob);
  const skinTarget = sampleSkin(faceImg);
  if (!skinTarget) throw new EngineError('We could not see enough skin in the face photo. Use a clear, front-facing photo in good light.');

  const checks: PersonalisationChecks = { body: {}, skin: null, face: { views: [], bodyDrift: {}, likeness: 'not_checked' }, heightCm: { requested: num(v.Height), drawn: false } };
  const out: Partial<Record<ModelView, Img>> = {};
  const analyses: Partial<Record<ModelView, { a: ReturnType<typeof analyseBody>; mask: Mask }>> = {};
  let skinFrom: ReturnType<typeof armSkin> = null;

  for (const view of VIEWS) {
    const src = model.views[view];
    if (!src) continue;
    progress(`Shaping the body (${view})`);
    const img = await toImg(modelPhoto(model, view));
    const mask = await toMask(src.replace(/\.webp$/, '-mask.png'), img.width, img.height);
    const a = analyseBody(img, mask, view === 'side' ? 'outline' : 'dress');
    let plan;
    try { plan = planBody(a, base, target, img.height); } catch (e) {
      if (e instanceof BodyRangeError) {
        const near = modelById(nearestBase(target));
        throw new EngineError(e.message + (near && near.id !== model.id ? ` ${near.name} is the closest.` : ''));
      }
      throw e;
    }
    const warped = warpBody(img, mask, a, plan);
    const check = checkBody(a, warped.img, warped.mask, base, target);
    checks.body[view] = check;
    if (!check.passed) throw new EngineError(`The ${view} view came out ${check.maxErrorCm} cm away from your measurements, more than the 3 cm we allow. Nothing was saved.`);

    progress(`Matching skin tone (${view})`);
    if (view === 'front') skinFrom = armSkin(img, mask, a);
    if (!skinFrom) throw new EngineError('Could not read the base model\'s skin tone.');
    out[view] = recolourSkin(warped.img, warped.mask, skinFrom, skinTarget);
    analyses[view] = { a, mask: warped.mask };
  }

  const front = analyses.front!;
  const after = armSkin(out.front!, front.mask, front.a);
  const dE = after ? deltaE(after, skinTarget) : Infinity;
  checks.skin = { targetLab: skinTarget.map((n) => Math.round(n * 10) / 10), deltaE: Math.round(dE * 10) / 10, passed: dE <= SKIN_MAX_DELTA_E };
  if (!checks.skin.passed) throw new EngineError('The skin tone did not match the face photo closely enough. Try a face photo in daylight.');

  const faceData = await blobToDataUrl(faceBlob);
  for (const view of FACE_VIEWS) {
    const cur = out[view], an = analyses[view];
    if (!cur || !an) continue;
    progress(`Adding your face (${view})`);
    // Only a square around the head goes to the face model; the body never leaves this device.
    const box = headBox(an.a, cur.width, cur.height);
    const head = crop(cur, box);
    const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: toDataUrl(head), face: faceData, view }) });
    if (!r.ok) throw new EngineError(`The face step failed: ${(await r.text()).slice(0, 160)}`);
    const { image } = (await r.json()) as { image: string };
    const edited = await toImg(image, box.size, box.size);
    const fit = alignCrop(head, edited);
    checks.face.bodyDrift[view] = Math.round(fit.error * 10) / 10;
    if (fit.error > FACE_MAX_MISALIGN) throw new EngineError(`The new face did not line up with her head in the ${view} view, so we did not use it. Try again.`);
    out[view] = compositeHead(cur, pasteCrop(cur, edited, box, fit), an.mask, an.a);
    checks.face.views.push(view);
  }

  progress('Saving');
  const views: Partial<Record<ModelView, Blob>> = {};
  for (const view of VIEWS) if (out[view]) views[view] = await toBlob(out[view]!);
  return { views, checks };
}
