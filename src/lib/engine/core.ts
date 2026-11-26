// Personalisation engine, pure image maths (no DOM, no network) so it can be unit tested.
//
// What this does, honestly:
//  - Body: a measured warp. Each base model is calibrated in cm; the customer's bust, waist
//    and hips set a horizontal scale per row of the photo, applied around the body's centre.
//    After warping we measure the dress width at the bust, waist and hip lines again and
//    estimate each value in cm. A result is kept only if every estimate is within tolerance.
//    Estimates come from the picture's widths, calibrated against the base model, not from
//    a 3D body scan, so they are a check that the picture moved the right amount, not a fitting.
//  - Skin: sample the face photo's skin colour, shift the base model's exposed skin towards it
//    in Lab colour space (keeps shading and texture), then check the colour difference.
//  - Height is recorded but not drawn: on a plain backdrop with no scale reference, a taller
//    or shorter body would only look like a different camera distance.

export interface Img { width: number; height: number; data: Uint8ClampedArray } // RGBA
export interface Mask { width: number; height: number; data: Uint8Array } // 0..255 person alpha

export const TOLERANCE_CM = 3; // agreed with Fatimah on 2026-11-26
export const SKIN_MAX_DELTA_E = 6;
export const SCALE_LIMITS = [0.75, 1.35] as const;

// ------------------------------------------------------------------ colour

export type Lab = [number, number, number];

const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const delin = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
const finv = (t: number) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));

export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = lin(r), G = lin(g), B = lin(b);
  const x = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const fy = f(y);
  return [116 * fy - 16, 500 * (f(x) - fy), 200 * (fy - f(z))];
}

export function labToRgb([L, a, b]: Lab): [number, number, number] {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const x = finv(fx) * 0.95047, y = finv(fy), z = finv(fz) * 1.08883;
  const R = 3.2406 * x - 1.5372 * y - 0.4986 * z;
  const G = -0.9689 * x + 1.8758 * y + 0.0415 * z;
  const B = 0.0557 * x - 0.204 * y + 1.057 * z;
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(delin(Math.max(0, v)))));
  return [c(R), c(G), c(B)];
}

export const deltaE = (p: Lab, q: Lab) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); // CIE76

/** Skin-like colour in YCbCr (works across deep to light skin; excludes greys and the backdrop). */
export function isSkin(r: number, g: number, b: number) {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return y > 25 && cb >= 77 && cb <= 127 && cr >= 136 && cr <= 180 && r > b;
}

/** The pilot models wear a charcoal dress: dark and neutral, unlike skin (red > blue). */
export const isDress = (r: number, g: number, b: number) =>
  Math.max(r, g, b) < 135 && Math.abs(r - b) < 16 && Math.abs(r - g) < 16;

const median = (xs: number[]) => { if (!xs.length) return NaN; const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };
export const medianLab = (labs: Lab[]): Lab => [median(labs.map((l) => l[0])), median(labs.map((l) => l[1])), median(labs.map((l) => l[2]))];

// ------------------------------------------------------------------ body analysis

export interface BodyAnalysis {
  top: number; bottom: number; height: number; cx: number;
  halfWidth: number[]; // per row: furthest person pixel from the centre (0 when empty)
  rows: { bust: number; waist: number; hip: number };
  widths: { bust: number; waist: number; hip: number }; // body width in px at those rows
  by: Measure;
}

const px = (img: Img, x: number, y: number) => { const i = (y * img.width + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]] as const; };

/** Width of the dress run through the centre of a row, bridging gaps of a few pixels. */
export type Measure = 'dress' | 'outline';

/**
 * Width of the body through the centre of a row, bridging gaps of a few pixels.
 * 'dress' counts only the dress (front and back views, where the arms hang beside it);
 * 'outline' counts the whole person outline (side view, where the arm hangs in front of the dress).
 */
export function dressWidth(img: Img, mask: Mask, y: number, cx: number, by: Measure = 'dress'): number {
  const ok = (x: number) => { if (x < 0 || x >= img.width || mask.data[y * mask.width + x] < 128) return false; if (by === 'outline') return true; const [r, g, b] = px(img, x, y); return isDress(r, g, b); };
  const run = (dir: number) => { let x = cx, gap = 0, last = cx; while (x >= 0 && x < img.width && gap <= 4) { if (ok(x)) { last = x; gap = 0; } else gap++; x += dir; } return last; };
  if (!ok(cx) && !ok(cx - 2) && !ok(cx + 2)) return 0;
  return run(1) - run(-1) + 1;
}

export function analyseBody(img: Img, mask: Mask, by: Measure = 'dress'): BodyAnalysis {
  const { width: w, height: h } = mask;
  let top = -1, bottom = -1;
  const xs: number[] = [];
  for (let y = 0; y < h; y++) {
    let any = false;
    for (let x = 0; x < w; x++) if (mask.data[y * w + x] >= 128) { any = true; if (y % 4 === 0) xs.push(x); }
    if (any) { if (top < 0) top = y; bottom = y; }
  }
  if (top < 0) throw new Error('No person found in the base model mask');
  const height = bottom - top + 1;
  const cx = Math.round(median(xs));
  const halfWidth = new Array<number>(h).fill(0);
  for (let y = top; y <= bottom; y++) {
    let m = 0;
    for (let x = 0; x < w; x++) if (mask.data[y * w + x] >= 128) m = Math.max(m, Math.abs(x - cx));
    halfWidth[y] = m;
  }
  const band = (a: number, b: number) => { const ys: number[] = []; for (let y = Math.round(top + a * height); y <= Math.round(top + b * height); y++) ys.push(y); return ys; };
  const dw = (y: number) => dressWidth(img, mask, y, cx, by);
  const smooth = (y: number) => (dw(y - 2) + dw(y) + dw(y + 2)) / 3;
  const argBy = (ys: number[], better: (a: number, b: number) => boolean) => ys.reduce((best, y) => { const v = smooth(y); return v > 0 && (best.v < 0 || better(v, best.v)) ? { y, v } : best; }, { y: ys[0], v: -1 });
  const bust = argBy(band(0.2, 0.31), (a, b) => a > b);
  const waist = argBy(band(Math.max(0.33, (bust.y - top) / height + 0.06), 0.45), (a, b) => a < b);
  const hip = argBy(band(Math.max(0.45, (waist.y - top) / height + 0.06), 0.57), (a, b) => a > b);
  if (bust.v <= 0 || waist.v <= 0 || hip.v <= 0) throw new Error('Could not find the bust, waist and hip lines on the base model');
  return { top, bottom, height, cx, halfWidth, rows: { bust: bust.y, waist: waist.y, hip: hip.y }, widths: { bust: bust.v, waist: waist.v, hip: hip.v }, by };
}

// ------------------------------------------------------------------ body warp

export interface BodyCm { bust: number; waist: number; hips: number; height: number }

export interface BodyPlan { scale: { bust: number; waist: number; hip: number }; perRow: Float32Array }

/** Horizontal scale for every row: 1 at the head, the bust/waist/hip ratios on the torso, tapering down the legs. */
export function planBody(a: BodyAnalysis, base: BodyCm, target: BodyCm, rows: number): BodyPlan {
  const scale = { bust: target.bust / base.bust, waist: target.waist / base.waist, hip: target.hips / base.hips };
  const [lo, hi] = SCALE_LIMITS;
  for (const [k, v] of Object.entries(scale)) {
    if (!(v >= lo && v <= hi)) throw new BodyRangeError(k, v);
  }
  const H = a.height, t = a.top;
  const keys: [number, number][] = [
    [t, 1],
    [t + 0.13 * H, 1], // neck
    [a.rows.bust - 0.09 * H, 1 + (scale.bust - 1) * 0.45], // shoulders
    [a.rows.bust, scale.bust],
    [a.rows.waist, scale.waist],
    [a.rows.hip, scale.hip],
    [a.rows.hip + 0.1 * H, 1 + (scale.hip - 1) * 0.85], // thighs
    [t + 0.73 * H, 1 + (scale.hip - 1) * 0.55], // knees
    [t + 0.95 * H, 1 + (scale.hip - 1) * 0.3], // ankles
    [rows, 1 + (scale.hip - 1) * 0.3],
  ];
  const perRow = new Float32Array(rows);
  for (let y = 0; y < rows; y++) {
    if (y <= keys[0][0]) { perRow[y] = 1; continue; }
    let i = 0; while (i < keys.length - 2 && y > keys[i + 1][0]) i++;
    const [y0, s0] = keys[i], [y1, s1] = keys[i + 1];
    const u = y1 > y0 ? Math.min(1, Math.max(0, (y - y0) / (y1 - y0))) : 1;
    const e = u * u * (3 - 2 * u); // smoothstep keeps the outline free of kinks
    perRow[y] = s0 + (s1 - s0) * e;
  }
  return { scale, perRow };
}

export class BodyRangeError extends Error {
  constructor(public part: string, public ratio: number) {
    super(`The ${part} measurement is ${Math.round((ratio - 1) * 100)}% away from this base model, which is more than the engine can reshape realistically. Pick a base model closer to these measurements.`);
  }
}

/** Source x for output x in a row: body region scaled about the centre, blended back to identity in the backdrop. */
export function sourceX(x: number, cx: number, halfW: number, s: number): number {
  const d = x - cx, ad = Math.abs(d), sign = Math.sign(d);
  const R = halfW + 10, M = Math.max(48, R * 0.6);
  const inner = R * s;
  if (ad <= inner) return cx + d / s;
  if (ad <= inner + M) { const u = (ad - inner) / M; return cx + sign * (R + u * (inner + M - R)); }
  return x;
}

/** Warp an image (and its mask) by a body plan. Rows only move horizontally, so faces and hems stay put. */
export function warpBody(img: Img, mask: Mask, a: BodyAnalysis, plan: BodyPlan): { img: Img; mask: Mask } {
  const { width: w, height: h } = img;
  const out = new Uint8ClampedArray(img.data.length);
  const outM = new Uint8Array(mask.data.length);
  // Smooth the body half-width over nearby rows so arms and hands don't make the warp jump.
  const hw = (y: number) => { let m = 0; for (let k = -24; k <= 24; k += 4) { const yy = y + k; if (yy >= 0 && yy < h) m = Math.max(m, a.halfWidth[yy]); } return m; };
  for (let y = 0; y < h; y++) {
    const s = plan.perRow[y], half = hw(y);
    for (let x = 0; x < w; x++) {
      const sx = s === 1 || half === 0 ? x : Math.min(w - 1, Math.max(0, sourceX(x, a.cx, half, s)));
      const x0 = Math.floor(sx), x1 = Math.min(w - 1, x0 + 1), t = sx - x0;
      const i0 = (y * w + x0) * 4, i1 = (y * w + x1) * 4, o = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) out[o + c] = img.data[i0 + c] * (1 - t) + img.data[i1 + c] * t;
      outM[y * w + x] = mask.data[y * w + x0] * (1 - t) + mask.data[y * w + x1] * t;
    }
  }
  return { img: { width: w, height: h, data: out }, mask: { width: w, height: h, data: outM } };
}

export interface BodyCheck { estimatedCm: { bust: number; waist: number; hips: number }; targetCm: { bust: number; waist: number; hips: number }; maxErrorCm: number; passed: boolean }

/** Measure the warped picture at the same lines and convert widths back to cm via the base model's calibration. */
export function checkBody(base: BodyAnalysis, warped: Img, warpedMask: Mask, baseCm: BodyCm, target: BodyCm, tol = TOLERANCE_CM): BodyCheck {
  const at = (y: number) => { const v: number[] = []; for (let k = -2; k <= 2; k++) v.push(dressWidth(warped, warpedMask, y + k, base.cx, base.by)); return median(v); };
  const est = {
    bust: baseCm.bust * at(base.rows.bust) / base.widths.bust,
    waist: baseCm.waist * at(base.rows.waist) / base.widths.waist,
    hips: baseCm.hips * at(base.rows.hip) / base.widths.hip,
  };
  const targetCm = { bust: target.bust, waist: target.waist, hips: target.hips };
  const maxErrorCm = Math.max(Math.abs(est.bust - target.bust), Math.abs(est.waist - target.waist), Math.abs(est.hips - target.hips));
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return { estimatedCm: { bust: r1(est.bust), waist: r1(est.waist), hips: r1(est.hips) }, targetCm, maxErrorCm: r1(maxErrorCm), passed: maxErrorCm <= tol };
}

/** What the engine measured for one personalisation, saved with the result so it can be shown and audited. */
export interface PersonalisationChecks {
  body: Partial<Record<'front' | 'side' | 'back', BodyCheck>>;
  skin: { targetLab: number[]; deltaE: number; passed: boolean } | null;
  face: { views: ('front' | 'side' | 'back')[]; bodyDrift: Partial<Record<'front' | 'side' | 'back', number>>; likeness: 'not_checked' };
  heightCm: { requested: number | null; drawn: false };
}

// ------------------------------------------------------------------ skin

/** Median skin colour in a region (fractions of the image), or null when too little skin is visible. */
export function sampleSkin(img: Img, region = { x0: 0.25, x1: 0.75, y0: 0.2, y1: 0.8 }, mask?: Mask): Lab | null {
  const labs: Lab[] = [];
  const { width: w, height: h } = img;
  const step = Math.max(1, Math.round(Math.sqrt((w * h) / 40000)));
  let n = 0;
  for (let y = Math.round(region.y0 * h); y < Math.round(region.y1 * h); y += step) {
    for (let x = Math.round(region.x0 * w); x < Math.round(region.x1 * w); x += step) {
      n++;
      if (mask && mask.data[y * w + x] < 128) continue;
      const [r, g, b] = px(img, x, y);
      if (isSkin(r, g, b) && !isDress(r, g, b)) labs.push(rgbToLab(r, g, b));
    }
  }
  if (labs.length < Math.max(30, n * 0.03)) return null;
  return medianLab(labs);
}

/** Skin colour of the base model's arms beside the torso (bust to hip rows). */
export const armSkin = (img: Img, mask: Mask, a: BodyAnalysis) =>
  sampleSkin(img, { x0: 0, x1: 1, y0: a.rows.bust / img.height, y1: a.rows.hip / img.height }, mask);

/** Shift exposed skin towards the target colour; shading and texture stay because only the median moves. */
export function recolourSkin(img: Img, mask: Mask, from: Lab, to: Lab): Img {
  const { width: w, height: h } = img;
  const weight = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (mask.data[i] < 64) continue;
    const [r, g, b] = px(img, x, y);
    if (isSkin(r, g, b) && !isDress(r, g, b)) weight[i] = mask.data[i] / 255;
  }
  // Soften the weight a little so the edge between skin and dress or hair doesn't show.
  const soft = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let k = -2; k <= 2; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += weight[y * w + xx]; n++; } }
    soft[y * w + x] = s / n;
  }
  const out = new Uint8ClampedArray(img.data);
  const d: Lab = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  for (let i = 0; i < w * h; i++) {
    const k = Math.max(soft[i], weight[i]);
    if (k <= 0) continue;
    const o = i * 4;
    const lab = rgbToLab(out[o], out[o + 1], out[o + 2]);
    const [r, g, b] = labToRgb([lab[0] + d[0] * k, lab[1] + d[1] * k, lab[2] + d[2] * k]);
    out[o] = r; out[o + 1] = g; out[o + 2] = b;
  }
  return { width: w, height: h, data: out };
}

// ------------------------------------------------------------------ compositing

/** Mean absolute colour difference over a block of rows, used to catch an edit that moved the body. */
export function rowDiff(a: Img, b: Img, y0: number, y1: number): number {
  let s = 0, n = 0;
  for (let y = Math.max(0, y0); y < Math.min(a.height, y1); y += 2) for (let x = 0; x < a.width; x += 2) {
    const i = (y * a.width + x) * 4;
    s += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
    n += 3;
  }
  return n ? s / n : 0;
}

/** Take the head (above the neck line, inside the person outline) from `head`; keep everything else from `body`. */
export function compositeHead(body: Img, head: Img, mask: Mask, a: BodyAnalysis): Img {
  const { width: w, height: h } = body;
  const neck = a.top + 0.17 * a.height, fade = 0.035 * a.height;
  const out = new Uint8ClampedArray(body.data);
  for (let y = 0; y < Math.min(h, Math.ceil(neck + fade)); y++) {
    const vy = y <= neck ? 1 : 1 - (y - neck) / fade;
    for (let x = 0; x < w; x++) {
      // Person outline grown by ~16px so hair edges and the new face's outline come along.
      let m = 0;
      for (let k = -16; k <= 16; k += 4) { const xx = x + k; if (xx >= 0 && xx < w) m = Math.max(m, mask.data[y * w + xx]); }
      const k = vy * (m / 255);
      if (k <= 0) continue;
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) out[o + c] = body.data[o + c] * (1 - k) + head.data[o + c] * k;
    }
  }
  return { width: w, height: h, data: out };
}

// ------------------------------------------------------------------ head crop for the face step

export interface Box { x: number; y: number; size: number }

/** A square around the head and shoulders. Sending only this crop gives the face model more pixels and keeps the body out of its reach. */
export function headBox(a: BodyAnalysis, w: number, h: number): Box {
  const size = Math.round(Math.min(w, h, 0.3 * a.height));
  const x = Math.round(Math.min(Math.max(0, a.cx - size / 2), w - size));
  const y = Math.round(Math.min(Math.max(0, a.top - 0.04 * a.height), h - size));
  return { x, y, size };
}

export function crop(img: Img, b: Box): Img {
  const out = new Uint8ClampedArray(b.size * b.size * 4);
  for (let y = 0; y < b.size; y++) out.set(img.data.subarray(((b.y + y) * img.width + b.x) * 4, ((b.y + y) * img.width + b.x + b.size) * 4), y * b.size * 4);
  return { width: b.size, height: b.size, data: out };
}

/**
 * Best small shift of the edited crop onto the original, judged on the crop's outer ring
 * (backdrop and shoulders, which the face edit should not change). Returns the shift and
 * the remaining mean colour difference there; a large difference means it did not line up.
 */
export function alignCrop(orig: Img, edited: Img, maxShift = 16): { dx: number; dy: number; error: number } {
  const n = orig.width, ring = Math.round(n * 0.14);
  let best = { dx: 0, dy: 0, error: Infinity };
  for (let dy = -maxShift; dy <= maxShift; dy += 2) for (let dx = -maxShift; dx <= maxShift; dx += 2) {
    let s = 0, c = 0;
    for (let y = maxShift; y < n - maxShift; y += 3) for (let x = maxShift; x < n - maxShift; x += 3) {
      if (x > ring && x < n - ring && y > ring && y < n - ring) continue;
      const i = (y * n + x) * 4, j = ((y + dy) * n + (x + dx)) * 4;
      s += Math.abs(orig.data[i] - edited.data[j]) + Math.abs(orig.data[i + 1] - edited.data[j + 1]) + Math.abs(orig.data[i + 2] - edited.data[j + 2]);
      c += 3;
    }
    const e = s / c;
    if (e < best.error) best = { dx, dy, error: e };
  }
  return best;
}

/** A full-size copy of `img` with the edited crop pasted back at its box, shifted by the alignment. */
export function pasteCrop(img: Img, edited: Img, b: Box, shift: { dx: number; dy: number }): Img {
  const out = new Uint8ClampedArray(img.data);
  for (let y = 0; y < b.size; y++) for (let x = 0; x < b.size; x++) {
    const sx = Math.min(b.size - 1, Math.max(0, x + shift.dx)), sy = Math.min(b.size - 1, Math.max(0, y + shift.dy));
    const o = ((b.y + y) * img.width + b.x + x) * 4, i = (sy * b.size + sx) * 4;
    out[o] = edited.data[i]; out[o + 1] = edited.data[i + 1]; out[o + 2] = edited.data[i + 2];
  }
  return { width: img.width, height: img.height, data: out };
}
