import type { CSSProperties } from 'react';
import { modelPhoto } from '../lib/models';
import type { ModelEntry, ModelView } from '../lib/models';

/** Photographic model, full body. Height drives size; width follows the photo (2:3). */
export const PHOTO_RATIO = 848 / 1264;

export default function ModelPhoto({ model, view = 'front', h, flip, style, alt }: { model: ModelEntry; view?: ModelView; h: number; flip?: boolean; style?: CSSProperties; alt?: string }) {
  return (
    <img
      src={modelPhoto(model, view)}
      alt={alt ?? `${model.name}, ${model.bodyShape.toLowerCase()}, UK size ${model.ukSize}, ${view} view`}
      draggable={false}
      style={{ height: h, width: Math.round(h * PHOTO_RATIO), objectFit: 'cover', borderRadius: 14, display: 'block', transform: flip ? 'scaleX(-1)' : undefined, userSelect: 'none', ...style }}
    />
  );
}
