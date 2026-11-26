// Korey model library: photographic default models that replace the drawn figure.
//
// Assets live in public/models/<id>/ as front.webp, side.webp, back.webp and thumb.webp
// (see public/models/README.md for the photo spec). Every entry has a stable id that
// looks save, so swapping a photo for a better one never breaks saved looks.

import type { Look } from './types';
import type { PersonalizationProfile } from './profile';
import { blobToDataUrl, getImage } from './privateImages';

export type ModelView = 'front' | 'side' | 'back';
export type SkinTone = 'Deep' | 'Dark brown' | 'Medium-dark' | 'Medium brown' | 'Light brown';
export type BodyShape = 'Slim' | 'Petite' | 'Average' | 'Pear' | 'Full-figured';
export type AssetSource = 'ai-pilot' | 'photoshoot' | 'licensed';

export interface ModelEntry {
  id: string;
  name: string;
  skinTone: SkinTone;
  skinHex: string; // swatch colour for filters and chips
  bodyShape: BodyShape;
  ukSize: number;
  hair: string;
  drawingSize: number; // index into SIZES, keeps the garment sketch in proportion
  views: Partial<Record<ModelView, string>>;
  thumb: string;
  source: AssetSource; // where the photos came from, so pilot assets are easy to find and replace
  credit: string;
}

const base = import.meta.env.BASE_URL || '/';
const asset = (id: string, file: string) => `${base}models/${id}/${file}.webp`;
const entry = (e: Omit<ModelEntry, 'views' | 'thumb'>, views: ModelView[] = ['front', 'side', 'back']): ModelEntry => ({
  ...e,
  views: Object.fromEntries(views.map((v) => [v, asset(e.id, v)])),
  thumb: asset(e.id, 'thumb'),
});

const PILOT = { source: 'ai-pilot' as const, credit: 'Korey pilot model (AI-generated, fictional person). Replace with a released photoshoot before launch.' };

/** Pilot: five models. The full library (~20) adds entries here with the same structure. */
export const MODELS: ModelEntry[] = [
  entry({ id: 'adaeze', name: 'Adaeze', skinTone: 'Deep', skinHex: '#4A2E22', bodyShape: 'Slim', ukSize: 10, hair: 'Short natural crop', drawingSize: 0, ...PILOT }),
  entry({ id: 'temi', name: 'Temi', skinTone: 'Medium-dark', skinHex: '#7A4A30', bodyShape: 'Petite', ukSize: 8, hair: 'Shoulder-length twists', drawingSize: 0, ...PILOT }),
  entry({ id: 'halima', name: 'Halima', skinTone: 'Light brown', skinHex: '#A8754F', bodyShape: 'Average', ukSize: 12, hair: 'Cornrows', drawingSize: 1, ...PILOT }),
  entry({ id: 'ifeoma', name: 'Ifeoma', skinTone: 'Medium brown', skinHex: '#8A5A3C', bodyShape: 'Pear', ukSize: 16, hair: 'Afro puff', drawingSize: 3, ...PILOT }),
  entry({ id: 'bisola', name: 'Bisola', skinTone: 'Dark brown', skinHex: '#5E3A26', bodyShape: 'Full-figured', ukSize: 20, hair: 'Braids in a low bun', drawingSize: 5, ...PILOT }),
];

export const DEFAULT_MODEL_ID = 'halima';
export const modelById = (id?: string | null) => MODELS.find((m) => m.id === id);

/** The model a look is dressing. Older looks only have a size index, so map that to the closest model. */
export const modelFor = (look: Pick<Look, 'modelId' | 'model'>): ModelEntry =>
  modelById(look.modelId)
  ?? MODELS.reduce((best, m) => (Math.abs(m.drawingSize - look.model) < Math.abs(best.drawingSize - look.model) ? m : best), modelById(DEFAULT_MODEL_ID)!);

/** Best available photo for a view: the asked view, else the front. */
export const modelPhoto = (m: ModelEntry, view: ModelView) => m.views[view] ?? m.views.front!;

const toDataUrl = async (url: string) => blobToDataUrl(await (await fetch(url)).blob());

/** The base model a look dresses: the person's profile decides when there is one. */
export const baseModelFor = (look: Pick<Look, 'modelId' | 'model'>, profile?: PersonalizationProfile | null): ModelEntry =>
  modelById(profile?.baseModelId) ?? modelFor(look);

/**
 * The person image for the try-on pipeline: the personalised model's view when one is
 * completed and up to date, otherwise the base model's photo for that view. Uploaded face
 * and body photos are references for personalisation and are never sent as the body.
 * Sent as a data URL so it works the same on localhost, previews and production.
 */
export const personImageFor = async (look: Look, view: ModelView, profile?: PersonalizationProfile | null): Promise<string> => {
  const pm = profile?.personalizationStatus === 'completed' ? profile.personalizedModel : null;
  const ref = pm?.views[view] ?? pm?.views.front;
  if (ref) {
    const blob = await getImage(ref.id);
    if (blob) return blobToDataUrl(blob);
  }
  return toDataUrl(new URL(modelPhoto(baseModelFor(look, profile), view), window.location.href).href);
};
