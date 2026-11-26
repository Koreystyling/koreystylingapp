import { describe, expect, it } from 'vitest';
import {
  BodyRangeError, alignCrop, analyseBody, crop, headBox, pasteCrop, armSkin, checkBody, compositeHead, deltaE, labToRgb, planBody, recolourSkin, rgbToLab,
  sampleSkin, sourceX, warpBody, TOLERANCE_CM, type Img, type Lab, type Mask,
} from '../lib/engine/core';
import { BASE_BODY, nearestBase } from '../lib/engine/calibration';
import { consentCurrent, giveConsent, markCompleted, newProfile, normaliseProfile, setFaceReference, withStatus } from '../lib/profile';

// A synthetic "base model": grey backdrop, skin head, neck, arms and legs, and a charcoal dress
// whose width is 120px at the bust, 100px at the waist and 130px at the hips.
const W = 400, H = 600, CX = 200;
const BACKDROP = [200, 195, 188], DRESS = [60, 60, 62], SKIN = [150, 100, 75];
const lerp = (y: number, pts: [number, number][]) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [y0, v0] = pts[i], [y1, v1] = pts[i + 1];
    if (y >= y0 && y <= y1) return v0 + (v1 - v0) * (y - y0) / (y1 - y0);
  }
  return 0;
};
const DRESS_W: [number, number][] = [[120, 110], [171, 120], [239, 100], [306, 130], [420, 120]];

function figure(): { img: Img; mask: Mask } {
  const data = new Uint8ClampedArray(W * H * 4), m = new Uint8Array(W * H);
  const set = (x: number, y: number, c: number[]) => { const i = (y * W + x) * 4; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255; if (c !== BACKDROP) m[y * W + x] = 255; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c = BACKDROP;
    const dx = Math.abs(x - CX);
    if (y >= 20 && y < 100 && (x - CX) ** 2 + (y - 60) ** 2 <= 40 ** 2) c = SKIN; // head
    else if (y >= 100 && y < 120 && dx <= 15) c = SKIN; // neck
    else if (y >= 120 && y <= 420 && dx <= lerp(y, DRESS_W) / 2) c = DRESS;
    else if (y >= 130 && y <= 360) { const edge = lerp(Math.min(Math.max(y, 120), 420), DRESS_W) / 2 + 6; if (dx > edge && dx <= edge + 18) c = SKIN; } // arms
    if (c === BACKDROP && y > 420 && y <= 580 && dx >= 10 && dx <= 40) c = SKIN; // legs
    set(x, y, c);
  }
  return { img: { width: W, height: H, data }, mask: { width: W, height: H, data: m } };
}

const BASE = { bust: 92, waist: 75, hips: 100, height: 168 };

describe('body analysis', () => {
  it('finds the bust, waist and hip lines and their widths', () => {
    const { img, mask } = figure();
    const a = analyseBody(img, mask);
    expect(a.top).toBe(20);
    expect(a.cx).toBeGreaterThanOrEqual(CX - 2);
    expect(a.cx).toBeLessThanOrEqual(CX + 2);
    expect(Math.abs(a.rows.bust - 171)).toBeLessThanOrEqual(5);
    expect(Math.abs(a.rows.waist - 239)).toBeLessThanOrEqual(5);
    expect(Math.abs(a.rows.hip - 306)).toBeLessThanOrEqual(5);
    expect(Math.abs(a.widths.waist - 101)).toBeLessThanOrEqual(2);
  });
});

describe('measured body warp', () => {
  it('reshapes to bigger measurements and the check confirms it within tolerance', () => {
    const { img, mask } = figure();
    const a = analyseBody(img, mask);
    const target = { bust: 104, waist: 88, hips: 112, height: 165 };
    const plan = planBody(a, BASE, target, H);
    const w = warpBody(img, mask, a, plan);
    const c = checkBody(a, w.img, w.mask, BASE, target);
    expect(c.passed).toBe(true);
    expect(c.maxErrorCm).toBeLessThanOrEqual(TOLERANCE_CM);
  });

  it('reshapes to smaller measurements too', () => {
    const { img, mask } = figure();
    const a = analyseBody(img, mask);
    const target = { bust: 84, waist: 68, hips: 94, height: 160 };
    const w = warpBody(img, mask, a, planBody(a, BASE, target, H));
    expect(checkBody(a, w.img, w.mask, BASE, target).passed).toBe(true);
  });

  it('fails the check when the picture does not match the measurements', () => {
    const { img, mask } = figure();
    const a = analyseBody(img, mask);
    const unchanged = checkBody(a, img, mask, BASE, { bust: 104, waist: 88, hips: 112, height: 165 });
    expect(unchanged.passed).toBe(false);
    expect(unchanged.maxErrorCm).toBeGreaterThan(TOLERANCE_CM);
  });

  it('leaves the head above the neck line untouched', () => {
    const { img, mask } = figure();
    const a = analyseBody(img, mask);
    const w = warpBody(img, mask, a, planBody(a, BASE, { bust: 110, waist: 95, hips: 120, height: 165 }, H));
    for (let y = 0; y < 90; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      expect(w.img.data[i]).toBe(img.data[i]);
    }
  });

  it('refuses measurements too far from the base model and names the closest one', () => {
    const { img, mask } = figure();
    const a = analyseBody(img, mask);
    expect(() => planBody(a, BASE, { bust: 140, waist: 125, hips: 150, height: 165 }, H)).toThrow(BodyRangeError);
    expect(nearestBase({ bust: 116, waist: 99, hips: 124 })).toBe('bisola');
    expect(nearestBase({ bust: 82, waist: 66, hips: 90 })).toBe('temi');
  });

  it('maps every row without folds (source x only ever increases)', () => {
    for (const s of [0.75, 0.9, 1.1, 1.35]) {
      let prev = -Infinity;
      for (let x = 0; x < W; x++) { const sx = sourceX(x, CX, 80, s); expect(sx).toBeGreaterThanOrEqual(prev); prev = sx; }
    }
  });

  it('has a calibration for every pilot model', () => {
    for (const id of ['adaeze', 'temi', 'halima', 'ifeoma', 'bisola']) expect(BASE_BODY[id]?.bust).toBeGreaterThan(0);
  });
});

describe('skin tone', () => {
  it('converts colours to Lab and back', () => {
    const lab = rgbToLab(150, 100, 75);
    expect(labToRgb(lab)).toEqual([150, 100, 75]);
  });

  it('samples skin from a face photo and moves the body\'s skin to it', () => {
    const { img, mask } = figure();
    const a = analyseBody(img, mask);
    const face: Img = { width: 50, height: 50, data: new Uint8ClampedArray(50 * 50 * 4) };
    for (let i = 0; i < 2500; i++) face.data.set([92, 58, 42, 255], i * 4);
    const target = sampleSkin(face)!;
    expect(target).not.toBeNull();
    const from = armSkin(img, mask, a)! as Lab;
    const out = recolourSkin(img, mask, from, target);
    const after = armSkin(out, mask, a)!;
    expect(deltaE(after, target)).toBeLessThanOrEqual(6);
    // The dress is not skin and keeps its colour.
    const i = (239 * W + CX) * 4;
    expect([out.data[i], out.data[i + 1], out.data[i + 2]]).toEqual(DRESS);
  });

  it('reports no skin for a photo without any', () => {
    const grey: Img = { width: 40, height: 40, data: new Uint8ClampedArray(40 * 40 * 4).fill(128) };
    expect(sampleSkin(grey)).toBeNull();
  });
});

describe('face composite', () => {
  it('takes only the head from the edited image', () => {
    const { img, mask } = figure();
    const a = analyseBody(img, mask);
    const edited: Img = { width: W, height: H, data: new Uint8ClampedArray(img.data.length).fill(255) };
    const out = compositeHead(img, edited, mask, a);
    const at = (y: number, x: number) => out.data[(y * W + x) * 4 + 1];
    expect(at(60, CX)).toBe(255); // head replaced
    expect(at(239, CX)).toBe(DRESS[1]); // body kept
    expect(at(60, 5)).toBe(BACKDROP[1]); // backdrop beside the head kept
  });
});

describe('head crop for the face step', () => {
  it('crops around the head, finds how far an edit moved, and pastes it back in place', () => {
    const { img, mask } = figure();
    const a = analyseBody(img, mask);
    const box = headBox(a, W, H);
    expect(box.y).toBeLessThanOrEqual(a.top);
    expect(box.x + box.size / 2).toBeCloseTo(a.cx, -1);
    const head = crop(img, box);
    // Simulate a face edit that came back shifted 6px right and 4px down.
    const moved: typeof head = { ...head, data: new Uint8ClampedArray(head.data.length) };
    for (let y = 0; y < head.height; y++) for (let x = 0; x < head.width; x++) {
      const sx = Math.min(head.width - 1, Math.max(0, x - 6)), sy = Math.min(head.height - 1, Math.max(0, y - 4));
      moved.data.set(head.data.subarray((sy * head.width + sx) * 4, (sy * head.width + sx) * 4 + 4), (y * head.width + x) * 4);
    }
    const fit = alignCrop(head, moved);
    expect(fit).toMatchObject({ dx: 6, dy: 4 });
    expect(fit.error).toBeLessThan(1);
    const back = pasteCrop(img, moved, box, fit);
    expect(Array.from(back.data.subarray((60 * W + CX) * 4, (60 * W + CX) * 4 + 3))).toEqual(SKIN);
  });
});

describe('profile and engine together', () => {
  const ref = { id: 'f1', storage: 'device' as const, mime: 'image/jpeg', width: 10, height: 10, bytes: 1, addedAt: 0 };
  it('needs consent to the current wording', () => {
    const p = giveConsent(newProfile('me', 'Me', 'halima'));
    expect(consentCurrent(p)).toBe(true);
    expect(consentCurrent({ ...p, consent: { ...p.consent, textVersion: '2026-11-26' } })).toBe(false);
  });

  it('saves what the engine measured with the result', () => {
    const p = setFaceReference(giveConsent(newProfile('me', 'Me', 'halima')), ref);
    const checks = { body: {}, skin: { targetLab: [40, 15, 20], deltaE: 1.2, passed: true }, face: { views: ['front' as const], bodyDrift: {}, likeness: 'not_checked' as const }, heightCm: { requested: 165, drawn: false as const } };
    const done = markCompleted(p, {}, 'test', 1, checks);
    expect(done.personalizationStatus).toBe('completed');
    expect(done.personalizedModel?.checks?.skin?.deltaE).toBe(1.2);
  });

  it('turns a run interrupted by closing the app into a failure, not a stuck "processing"', () => {
    const p = withStatus(setFaceReference(giveConsent(newProfile('me', 'Me', 'halima')), ref));
    const loaded = normaliseProfile({ ...p, personalizationStatus: 'processing' });
    expect(loaded.personalizationStatus).toBe('failed');
    expect(loaded.lastError).toMatch(/interrupted/);
  });
});
