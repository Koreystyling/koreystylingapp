// Personalisation profile: a person's own version of a Korey base model.
//
// The base model (a library photo) is always the foundation. A face photo gives identity and
// skin-tone reference; an optional full-body photo gives body-proportion reference; the
// measurement profile (cm) is the authority for body dimensions. A future engine turns these
// into personalised front/side/back images, which are stored and reused across outfits.
//
// Everything in this file is pure (no storage, no DOM) so the workflow can be unit tested.

import type { ModelView } from './models';

export type PersonalizationStatus =
  | 'not_personalised'
  | 'awaiting_references'
  | 'ready'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'needs_regeneration';

export const STATUS_LABEL: Record<PersonalizationStatus, string> = {
  not_personalised: 'Not personalised',
  awaiting_references: 'Awaiting photos',
  ready: 'Ready for personalisation',
  processing: 'Processing',
  completed: 'Personalised',
  failed: 'Failed',
  needs_regeneration: 'Needs regeneration',
};

/** A private image kept on this device (IndexedDB), never a public URL. */
export interface ImageReference {
  id: string; // key in the private image store
  kind: 'face' | 'body' | 'generated';
  storage: 'device';
  mime: string;
  width: number;
  height: number;
  bytes: number;
  addedAt: number;
  version: number; // goes up every time this slot gets a new photo
  origin?: 'upload' | 'legacy-look-photo';
}

export interface MeasurementProfile {
  valuesCm: Record<string, number>; // authoritative body dimensions, always cm
  unit: 'cm' | 'in'; // display preference only
  updatedAt: number;
  version: number; // goes up whenever a value changes
}

export interface PersonalizedModel {
  views: Partial<Record<ModelView, ImageReference>>;
  baseModelId: string;
  // The inputs this result was made from. A mismatch with the profile means it is out of date.
  faceVersion: number | null;
  bodyReferenceVersion: number | null;
  measurementVersion: number;
  engine: string;
  createdAt: number;
}

export interface Consent {
  given: boolean;
  at: number | null;
  textVersion: string;
}

export interface PersonalizationProfile {
  id: string;
  ownerKey: string; // 'me' or a client id
  displayName: string;
  baseModelId: string;
  faceReference: ImageReference | null;
  bodyReference: ImageReference | null;
  measurementProfile: MeasurementProfile;
  personalizedModel: PersonalizedModel | null;
  personalizationStatus: PersonalizationStatus;
  personalizationVersion: number; // goes up whenever any personalisation input changes
  lastError: string | null;
  consent: Consent;
  createdAt: number;
  updatedAt: number;
}

export const CONSENT_TEXT_VERSION = '2026-11-26';
export const CONSENT_TEXT =
  'I agree that Korey may store these photos privately on this device and use them only to personalise my chosen model. I can delete them, and anything made from them, at any time.';

const pid = () => 'p_' + Math.random().toString(36).slice(2, 10);

export const newProfile = (ownerKey: string, displayName: string, baseModelId: string, valuesCm: Record<string, number> = {}, now = Date.now()): PersonalizationProfile =>
  withStatus({
    id: pid(),
    ownerKey,
    displayName,
    baseModelId,
    faceReference: null,
    bodyReference: null,
    measurementProfile: { valuesCm: { ...valuesCm }, unit: 'cm', updatedAt: now, version: 1 },
    personalizedModel: null,
    personalizationStatus: 'not_personalised',
    personalizationVersion: 1,
    lastError: null,
    consent: { given: false, at: null, textVersion: CONSENT_TEXT_VERSION },
    createdAt: now,
    updatedAt: now,
  });

// ------------------------------------------------------------------ staleness and status

/** Identity result is out of date when the face photo changed since it was made. */
export const identityStale = (p: PersonalizationProfile) =>
  !!p.personalizedModel && p.personalizedModel.faceVersion !== (p.faceReference?.version ?? null);

/** Body result is out of date when measurements, the body photo or the base model changed. */
export const bodyStale = (p: PersonalizationProfile) =>
  !!p.personalizedModel && (
    p.personalizedModel.measurementVersion !== p.measurementProfile.version
    || p.personalizedModel.bodyReferenceVersion !== (p.bodyReference?.version ?? null)
    || p.personalizedModel.baseModelId !== p.baseModelId
  );

export const hasReferences = (p: PersonalizationProfile) => !!(p.faceReference || p.bodyReference);

/** Status follows from the inputs, except while the engine is working or after it failed. */
export const deriveStatus = (p: PersonalizationProfile): PersonalizationStatus => {
  if (p.personalizationStatus === 'processing') return 'processing';
  if (p.personalizedModel) return identityStale(p) || bodyStale(p) ? 'needs_regeneration' : 'completed';
  if (p.personalizationStatus === 'failed' && hasReferences(p)) return 'failed';
  if (hasReferences(p)) return p.consent.given ? 'ready' : 'awaiting_references';
  return p.consent.given ? 'awaiting_references' : 'not_personalised';
};

export const withStatus = (p: PersonalizationProfile): PersonalizationProfile => ({ ...p, personalizationStatus: deriveStatus(p) });

const touch = (p: PersonalizationProfile, patch: Partial<PersonalizationProfile>, inputsChanged: boolean, now = Date.now()) =>
  withStatus({
    ...p,
    ...patch,
    // A failure belongs to the old inputs; new inputs clear it.
    ...(inputsChanged && p.personalizationStatus === 'failed' ? { personalizationStatus: 'ready' as const, lastError: null } : {}),
    personalizationVersion: p.personalizationVersion + (inputsChanged ? 1 : 0),
    updatedAt: now,
  });

// ------------------------------------------------------------------ changes (each returns a new profile)

export const setBaseModel = (p: PersonalizationProfile, baseModelId: string) =>
  p.baseModelId === baseModelId ? p : touch(p, { baseModelId }, true);

export const giveConsent = (p: PersonalizationProfile, now = Date.now()) =>
  touch(p, { consent: { given: true, at: now, textVersion: CONSENT_TEXT_VERSION } }, false, now);

const nextVersion = (prev: ImageReference | null) => (prev?.version ?? 0) + 1;

/** New face photo (or null to remove it). Invalidates the identity result only. */
export const setFaceReference = (p: PersonalizationProfile, ref: Omit<ImageReference, 'version' | 'kind'> | null) =>
  touch(p, { faceReference: ref ? { ...ref, kind: 'face', version: nextVersion(p.faceReference) } : null }, true);

/** New full-body photo (or null to remove it). Invalidates the body result only. */
export const setBodyReference = (p: PersonalizationProfile, ref: Omit<ImageReference, 'version' | 'kind'> | null) =>
  touch(p, { bodyReference: ref ? { ...ref, kind: 'body', version: nextVersion(p.bodyReference) } : null }, true);

const sameValues = (a: Record<string, number>, b: Record<string, number>) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const x = a[k], y = b[k];
    if (!(x === y || (Number.isNaN(x) && Number.isNaN(y)))) return false;
  }
  return true;
};

/** Update measurements (cm). Only a real change bumps the version, which invalidates the body result. */
export const setMeasurements = (p: PersonalizationProfile, valuesCm: Record<string, number>, now = Date.now()) => {
  const merged = { ...p.measurementProfile.valuesCm, ...valuesCm };
  if (sameValues(merged, p.measurementProfile.valuesCm)) return p;
  return touch(p, { measurementProfile: { ...p.measurementProfile, valuesCm: merged, updatedAt: now, version: p.measurementProfile.version + 1 } }, true, now);
};

export const setUnit = (p: PersonalizationProfile, unit: 'cm' | 'in') =>
  touch(p, { measurementProfile: { ...p.measurementProfile, unit } }, false);

// ------------------------------------------------------------------ engine lifecycle (used by the future engine)

export const markProcessing = (p: PersonalizationProfile): PersonalizationProfile => {
  const s = deriveStatus(p);
  if (s !== 'ready' && s !== 'needs_regeneration' && s !== 'failed') throw new Error(`Cannot start personalisation from "${s}"`);
  return { ...p, personalizationStatus: 'processing', lastError: null, updatedAt: Date.now() };
};

export const markCompleted = (p: PersonalizationProfile, views: PersonalizedModel['views'], engine: string, now = Date.now()): PersonalizationProfile =>
  withStatus({
    ...p,
    personalizationStatus: 'completed',
    personalizedModel: {
      views, engine, createdAt: now, baseModelId: p.baseModelId,
      faceVersion: p.faceReference?.version ?? null,
      bodyReferenceVersion: p.bodyReference?.version ?? null,
      measurementVersion: p.measurementProfile.version,
    },
    lastError: null,
    updatedAt: now,
  });

export const markFailed = (p: PersonalizationProfile, error: string): PersonalizationProfile =>
  ({ ...p, personalizationStatus: 'failed', lastError: error, updatedAt: Date.now() });

/** Every private image this profile holds: references and generated views. Used for deletion. */
export const imageIdsOf = (p: PersonalizationProfile): string[] => [
  p.faceReference?.id, p.bodyReference?.id,
  ...Object.values(p.personalizedModel?.views ?? {}).map((v) => v?.id),
].filter((x): x is string => !!x);

/** Remove all photos and generated images, and withdraw consent. Measurements and base model stay. */
export const clearPersonalImages = (p: PersonalizationProfile): PersonalizationProfile =>
  withStatus({
    ...p,
    faceReference: null,
    bodyReference: null,
    personalizedModel: null,
    personalizationStatus: 'not_personalised',
    lastError: null,
    consent: { given: false, at: null, textVersion: CONSENT_TEXT_VERSION },
    personalizationVersion: p.personalizationVersion + 1,
    updatedAt: Date.now(),
  });

/** Profiles saved by older versions of the app may miss fields; fill them in. */
export const normaliseProfile = (raw: Partial<PersonalizationProfile> & { id: string; ownerKey: string; baseModelId: string }): PersonalizationProfile =>
  withStatus({
    displayName: raw.ownerKey === 'me' ? 'Me' : 'Client',
    faceReference: null,
    bodyReference: null,
    personalizedModel: null,
    personalizationStatus: 'not_personalised',
    personalizationVersion: 1,
    lastError: null,
    consent: { given: false, at: null, textVersion: CONSENT_TEXT_VERSION },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...raw,
    measurementProfile: { valuesCm: {}, unit: 'cm', updatedAt: Date.now(), version: 1, ...(raw.measurementProfile ?? {}) },
  } as PersonalizationProfile);
