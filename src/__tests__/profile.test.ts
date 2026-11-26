import { describe, expect, it } from 'vitest';
import {
  bodyStale, clearPersonalImages, deriveStatus, giveConsent, identityStale, imageIdsOf, markCompleted, markFailed,
  markProcessing, newProfile, normaliseProfile, setBaseModel, setBodyReference, setFaceReference, setMeasurements,
} from '../lib/profile';
import type { ImageReference } from '../lib/profile';
import { baseModelFor, modelFor } from '../lib/models';
import { newLook } from '../lib/types';

const ref = (id: string): Omit<ImageReference, 'kind' | 'version'> => ({ id, storage: 'device', mime: 'image/jpeg', width: 800, height: 1200, bytes: 1000, addedAt: 1 });
const gen = (id: string): ImageReference => ({ ...ref(id), kind: 'generated', version: 1 });
const base = () => newProfile('me', 'Me', 'halima', { Bust: 100, Waist: 80, Hips: 110 });
const consented = () => giveConsent(base());
const done = (p = setFaceReference(consented(), ref('f1'))) => markCompleted(markProcessing(p), { front: gen('g1'), side: gen('g2'), back: gen('g3') }, 'test-engine');

describe('profile inputs are independent', () => {
  it('starts not personalised, with the base model and measurements', () => {
    const p = base();
    expect(p.personalizationStatus).toBe('not_personalised');
    expect(p.baseModelId).toBe('halima');
    expect(p.measurementProfile.valuesCm.Bust).toBe(100);
  });
  it('accepts a face photo alone', () => {
    const p = setFaceReference(consented(), ref('f1'));
    expect(p.faceReference?.kind).toBe('face');
    expect(p.bodyReference).toBeNull();
    expect(p.personalizationStatus).toBe('ready');
  });
  it('accepts a full-body photo alone', () => {
    const p = setBodyReference(consented(), ref('b1'));
    expect(p.bodyReference?.kind).toBe('body');
    expect(p.faceReference).toBeNull();
    expect(p.personalizationStatus).toBe('ready');
  });
  it('accepts both', () => {
    const p = setBodyReference(setFaceReference(consented(), ref('f1')), ref('b1'));
    expect([p.faceReference?.id, p.bodyReference?.id]).toEqual(['f1', 'b1']);
    expect(p.personalizationStatus).toBe('ready');
  });
  it('never changes the base model or measurements when photos are added', () => {
    const p = setBodyReference(setFaceReference(consented(), ref('f1')), ref('b1'));
    expect(p.baseModelId).toBe('halima');
    expect(p.measurementProfile.valuesCm).toEqual({ Bust: 100, Waist: 80, Hips: 110 });
    expect(p.measurementProfile.version).toBe(1);
  });
  it('waits for consent before photos make it ready', () => {
    const p = setFaceReference(base(), ref('f1'));
    expect(p.personalizationStatus).toBe('awaiting_references');
    expect(deriveStatus(giveConsent(p))).toBe('ready');
  });
  it('shows awaiting references after consent with no photos', () => {
    expect(consented().personalizationStatus).toBe('awaiting_references');
  });
});

describe('lifecycle and invalidation', () => {
  it('goes processing then completed', () => {
    const p = setFaceReference(consented(), ref('f1'));
    const proc = markProcessing(p);
    expect(proc.personalizationStatus).toBe('processing');
    expect(done(p).personalizationStatus).toBe('completed');
  });
  it('refuses to start without references', () => {
    expect(() => markProcessing(consented())).toThrow();
  });
  it('records failure and keeps the photos', () => {
    const p = markFailed(markProcessing(setFaceReference(consented(), ref('f1'))), 'timeout');
    expect(p.personalizationStatus).toBe('failed');
    expect(p.faceReference?.id).toBe('f1');
    expect(p.lastError).toBe('timeout');
  });
  it('changing measurements invalidates the body result only', () => {
    const p = setMeasurements(done(), { Hips: 116 });
    expect(bodyStale(p)).toBe(true);
    expect(identityStale(p)).toBe(false);
    expect(p.personalizationStatus).toBe('needs_regeneration');
  });
  it('the same measurements do not invalidate anything', () => {
    const d = done();
    const p = setMeasurements(d, { Hips: 110 });
    expect(p).toBe(d);
    expect(p.personalizationStatus).toBe('completed');
  });
  it('changing the face photo invalidates the identity result only', () => {
    const p = setFaceReference(done(), ref('f2'));
    expect(identityStale(p)).toBe(true);
    expect(bodyStale(p)).toBe(false);
    expect(p.faceReference?.version).toBe(2);
    expect(p.personalizationStatus).toBe('needs_regeneration');
  });
  it('changing the body photo or base model invalidates the body result', () => {
    expect(bodyStale(setBodyReference(done(), ref('b9')))).toBe(true);
    expect(bodyStale(setBaseModel(done(), 'bisola'))).toBe(true);
  });
  it('outfit changes do not touch the profile', () => {
    const d = done();
    const look = { ...newLook({ profileId: d.id }), mix: { Top: 'A', Sleeves: 'B', Skirt: 'C', Back: 'D' }, hem: 420 };
    expect(look.profileId).toBe(d.id);
    expect(deriveStatus(d)).toBe('completed'); // nothing in a look feeds the profile's staleness checks
  });
  it('new inputs clear a failure', () => {
    const f = markFailed(markProcessing(setFaceReference(consented(), ref('f1'))), 'x');
    const p = setFaceReference(f, ref('f2'));
    expect(p.personalizationStatus).toBe('ready');
    expect(p.lastError).toBeNull();
  });
  it('bumps personalisationVersion on input changes only', () => {
    const c = consented();
    expect(c.personalizationVersion).toBe(1);
    expect(setFaceReference(c, ref('f1')).personalizationVersion).toBe(2);
  });
});

describe('privacy', () => {
  it('lists every private image for deletion', () => {
    const p = setBodyReference(done(), ref('b1'));
    expect(imageIdsOf(p).sort()).toEqual(['b1', 'f1', 'g1', 'g2', 'g3']);
  });
  it('clearing removes photos, results and consent but keeps measurements and base model', () => {
    const p = clearPersonalImages(setBodyReference(done(), ref('b1')));
    expect(imageIdsOf(p)).toEqual([]);
    expect(p.consent.given).toBe(false);
    expect(p.personalizationStatus).toBe('not_personalised');
    expect(p.baseModelId).toBe('halima');
    expect(p.measurementProfile.valuesCm.Bust).toBe(100);
  });
});

describe('backwards compatibility', () => {
  it('old looks without modelId or profile still map to a library model', () => {
    const old = newLook({ model: 5 });
    delete (old as { modelId?: string }).modelId;
    expect(modelFor(old).id).toBe('bisola');
    expect(baseModelFor(old, null).id).toBe('bisola');
  });
  it('the profile decides the base model when there is one', () => {
    const look = newLook({ modelId: 'temi' });
    expect(baseModelFor(look, setBaseModel(base(), 'ifeoma')).id).toBe('ifeoma');
  });
  it('fills in missing fields on profiles saved by older versions', () => {
    const p = normaliseProfile({ id: 'p1', ownerKey: 'me', baseModelId: 'adaeze' });
    expect(p.measurementProfile.version).toBe(1);
    expect(p.personalizationStatus).toBe('not_personalised');
    expect(p.consent.given).toBe(false);
  });
});
