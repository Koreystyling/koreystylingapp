// Body measurements (cm) for each base model, used to turn the customer's measurements into
// a warp. Pilot values are UK high-street size-chart figures for each model's dress size and
// an assumed height, because the pilot models are AI-generated. Replace with values measured
// on the day of a real photoshoot.
import type { BodyCm } from './core';

export const BASE_BODY: Record<string, BodyCm & { source: 'uk-size-chart' | 'measured' }> = {
  temi: { bust: 82, waist: 65, hips: 90, height: 168, source: 'uk-size-chart' }, // UK 8
  adaeze: { bust: 87, waist: 70, hips: 95, height: 168, source: 'uk-size-chart' }, // UK 10
  halima: { bust: 92, waist: 75, hips: 100, height: 168, source: 'uk-size-chart' }, // UK 12
  ifeoma: { bust: 102, waist: 85, hips: 110, height: 168, source: 'uk-size-chart' }, // UK 16
  bisola: { bust: 115, waist: 98, hips: 123, height: 168, source: 'uk-size-chart' }, // UK 20
};

/** The base model whose calibration is closest to these measurements (for the "pick a closer model" hint). */
export const nearestBase = (t: Pick<BodyCm, 'bust' | 'waist' | 'hips'>) =>
  Object.entries(BASE_BODY).reduce((best, [id, b]) => {
    const d = Math.abs(b.bust - t.bust) + Math.abs(b.waist - t.waist) + Math.abs(b.hips - t.hips);
    return d < best.d ? { id, d } : best;
  }, { id: 'halima', d: Infinity }).id;
