import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Page, TopBar } from '../components/Shell';
import ModelPhoto from '../components/ModelPhoto';
import { MEASURES } from '../lib/data';
import { DEFAULT_MODEL_ID, MODELS, modelById, modelFor } from '../lib/models';
import type { ModelEntry } from '../lib/models';
import {
  CONSENT_TEXT, STATUS_LABEL, bodyStale, giveConsent, identityStale, newProfile, setBaseModel, setBodyReference,
  setFaceReference, setMeasurements, setUnit, withStatus,
} from '../lib/profile';
import type { ImageReference, PersonalizationProfile, PersonalizationStatus } from '../lib/profile';
import { deleteImages, putImage } from '../lib/privateImages';
import { fileToJpegBlob } from '../lib/media';
import { usePrivateImage } from '../lib/useImage';
import { useStore } from '../lib/store';
import { go, toast, useBp } from '../lib/hooks';

// Personalise a Korey model: choose the base model, add a face photo and/or a full-body photo,
// and keep the measurements. Photos personalise the chosen model; they never replace it.

type Pending = { blob: Blob; width: number; height: number } | null | undefined; // undefined = unchanged, null = remove

const query = () => new URLSearchParams(window.location.hash.split('?')[1] ?? '');

const STATUS_COLOR: Record<PersonalizationStatus, [string, string]> = {
  not_personalised: ['#F1EEF2', '#4F4252'],
  awaiting_references: ['#FBF0D6', '#7A5600'],
  ready: ['#E3F2EA', '#0E6B3A'],
  processing: ['#E3ECF8', '#1F4E8C'],
  completed: ['#E3F2EA', '#0E6B3A'],
  failed: ['#FBE4E4', '#A32020'],
  needs_regeneration: ['#FBF0D6', '#7A5600'],
};

export function StatusBadge({ status }: { status: PersonalizationStatus }) {
  const [bg, fg] = STATUS_COLOR[status];
  return (
    <span data-testid="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, background: bg, color: fg, borderRadius: 999, padding: '4px 10px', whiteSpace: 'nowrap' }}>
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: fg }} />{STATUS_LABEL[status]}
    </span>
  );
}

const STATUS_HELP: Record<PersonalizationStatus, string> = {
  not_personalised: 'Using the Korey model as she is. Add a face photo or a full-body photo to personalise her.',
  awaiting_references: 'Add a face photo or a full-body photo (and agree to the consent note) to get ready.',
  ready: 'Your photos and measurements are saved and ready. The personalisation engine is not switched on yet, so the base model is still shown.',
  processing: 'Making your personalised model.',
  completed: 'Your personalised model is ready and is reused for every outfit.',
  failed: 'The last attempt failed. Your photos and measurements are kept.',
  needs_regeneration: 'Something changed since your personalised model was made, so it needs making again.',
};

export default function Profile({ ownerKey }: { ownerKey: string }) {
  const store = useStore();
  const bp = useBp();
  const phone = bp === 'phone', laptop = bp === 'laptop';
  const q = query();
  const lookId = q.get('look');
  const look = lookId ? store.getLook(lookId) : undefined;
  const client = store.clients.find((c) => c.id === ownerKey);
  const ownerName = ownerKey === 'me' ? 'Me' : client?.name ?? look?.clientName ?? 'Client';
  const saved = store.profileForOwner(ownerKey);

  const initial = useMemo(() => saved ?? newProfile(ownerKey, ownerName, look ? modelFor(look).id : DEFAULT_MODEL_ID, {
    ...Object.fromEntries(MEASURES), ...(client?.meas ?? {}), ...(look?.meas ?? {}),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [ownerKey]);
  const [draft, setDraft] = useState<PersonalizationProfile>(initial);
  const [face, setFace] = useState<Pending>(undefined);
  const [body, setBody] = useState<Pending>(undefined);
  const [dirty, setDirty] = useState(!saved);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const change = (fn: (p: PersonalizationProfile) => PersonalizationProfile) => { setDraft(fn); setDirty(true); };
  const base = modelById(draft.baseModelId) ?? modelById(DEFAULT_MODEL_ID)!;

  // What the profile will look like once saved (pending photos count as present).
  const fakeRef = (p: { width: number; height: number; blob: Blob }): Omit<ImageReference, 'kind' | 'version'> => ({ id: 'pending', storage: 'device', mime: p.blob.type, width: p.width, height: p.height, bytes: p.blob.size, addedAt: Date.now() });
  const preview = useMemo(() => {
    let p = draft;
    if (face !== undefined) p = setFaceReference(p, face ? fakeRef(face) : null);
    if (body !== undefined) p = setBodyReference(p, body ? fakeRef(body) : null);
    return withStatus(p);
  }, [draft, face, body]);

  const hasFace = face !== undefined ? !!face : !!draft.faceReference;
  const hasBody = body !== undefined ? !!body : !!draft.bodyReference;

  const pick = async (file: File | undefined, set: (p: Pending) => void, max: number) => {
    if (!file) return;
    try { set(await fileToJpegBlob(file, max)); setDirty(true); } catch { toast('That file is not an image we can read.'); }
  };

  const save = async () => {
    setSaving(true);
    const remove: string[] = [];
    try {
      let p = draft;
      if (face !== undefined) {
        if (p.faceReference) remove.push(p.faceReference.id);
        p = setFaceReference(p, face ? await putImage(face.blob, face) : null);
      }
      if (body !== undefined) {
        if (p.bodyReference) remove.push(p.bodyReference.id);
        p = setBodyReference(p, body ? await putImage(body.blob, body) : null);
      }
      p = withStatus({ ...p, displayName: ownerName });
      store.saveProfile(p);
      await deleteImages(remove);
      if (look) store.saveLook({ ...look, profileId: p.id, modelId: p.baseModelId, model: base.drawingSize, meas: { ...look.meas, ...p.measurementProfile.valuesCm } });
      setDraft(p); setFace(undefined); setBody(undefined); setDirty(false);
      toast('Profile saved.');
    } catch {
      toast('Could not save on this device. Check storage space and try again.');
    } finally { setSaving(false); }
  };

  const deleteAll = async () => {
    if (saved) await store.deletePersonalImages(saved.id);
    setFace(undefined); setBody(undefined); setConfirmDelete(false);
    setDraft((d) => withStatus({ ...d, faceReference: null, bodyReference: null, personalizedModel: null, personalizationStatus: 'not_personalised', consent: { ...d.consent, given: false, at: null } }));
    toast('Your photos and anything made from them are deleted from this device.');
  };

  const back = look ? `/build/${look.id}` : '/';

  return (
    <Page>
      <TopBar active="looks" />
      <main style={{ flex: 1, width: '100%', maxWidth: 1200, margin: '0 auto', padding: phone ? '16px 16px 120px' : '28px 28px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <a href={'#' + back} style={{ fontSize: 14, fontWeight: 600 }}>← {look ? `Back to ${look.name}` : 'Back'}</a>
            <h1 className="h" style={{ margin: 0, fontSize: phone ? 28 : 38, lineHeight: 1.08 }}>Personalise {base.name} for {ownerName === 'Me' ? 'you' : ownerName}</h1>
            <p style={{ margin: 0, fontSize: 15, color: 'var(--muted-2)', maxWidth: 640, lineHeight: 1.5 }}>Your photos <b>personalise</b> the Korey model you choose. They never replace her. Your measurements decide the body size.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge status={preview.personalizationStatus} />
            {dirty && <span style={{ fontSize: 12, fontWeight: 700, color: '#7A5600' }}>Unsaved changes</span>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: laptop ? 'row' : 'column', gap: 24, alignItems: 'flex-start' }}>
          {/* -------------------------------------------- preview */}
          <section aria-label="Preview" className="card" style={{ flex: laptop ? '0 0 420px' : '1 1 auto', width: laptop ? undefined : '100%', maxWidth: laptop ? undefined : 560, alignSelf: laptop ? undefined : 'center', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, position: laptop ? 'sticky' : 'static', top: 16 }}>
            <span className="lbl">Preview</span>
            <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
              <figure style={{ margin: 0, flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <ModelPhoto model={base} h={phone ? 300 : 380} style={{ width: '100%', objectPosition: '50% 20%' }} />
                <figcaption style={{ fontSize: 13 }}><b>Base model: {base.name}</b> · UK {base.ukSize} · {base.bodyShape}</figcaption>
              </figure>
              <div style={{ flex: '0 0 30%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <RefThumb label="Face" draft={face} saved={draft.faceReference} />
                <RefThumb label="Full body" draft={body} saved={draft.bodyReference} />
                <span style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.35 }}>References only. Shown to you, never used as the model.</span>
              </div>
            </div>
            <span style={{ fontSize: 13, color: 'var(--muted-2)', lineHeight: 1.45, background: 'var(--paper)', borderRadius: 10, padding: '10px 12px' }}>{STATUS_HELP[preview.personalizationStatus]}</span>
            {saved?.personalizedModel && (identityStale(saved) || bodyStale(saved)) && (
              <span style={{ fontSize: 12, color: '#7A5600' }}>{identityStale(saved) ? 'Face photo changed. ' : ''}{bodyStale(saved) ? 'Measurements, body photo or base model changed.' : ''}</span>
            )}
          </section>

          {/* -------------------------------------------- form */}
          <div style={{ flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: 22 }}>
            <Section n={1} title="Choose the base model" hint="She stays the foundation of every look.">
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${phone ? 3 : 5}, minmax(0,1fr))`, gap: 10 }}>
                {MODELS.map((m) => <ModelChoice key={m.id} m={m} on={draft.baseModelId === m.id} pick={() => change((p) => setBaseModel(p, m.id))} />)}
              </div>
            </Section>

            <Section n={2} title="Consent" hint="Needed before you add photos.">
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.45, cursor: 'pointer' }}>
                <input type="checkbox" checked={draft.consent.given} disabled={draft.consent.given} onChange={() => change((p) => giveConsent(p))} style={{ width: 22, height: 22, flex: 'none', marginTop: 1 }} />
                <span>{CONSENT_TEXT}{draft.consent.given && draft.consent.at ? <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>Agreed {new Date(draft.consent.at).toLocaleDateString()}</span> : null}</span>
              </label>
            </Section>

            <Section n={3} title="Face photo" hint="For her face and skin tone. Front-facing, good light, no sunglasses.">
              <PhotoSlot label="face photo" enabled={draft.consent.given} has={hasFace} onFile={(f) => pick(f, setFace, 1280)} onRemove={() => { setFace(null); setDirty(true); }} />
            </Section>

            <Section n={4} title="Full-body photo (optional)" hint="Helps check body proportions against your measurements. It does not replace the model.">
              <PhotoSlot label="full-body photo" enabled={draft.consent.given} has={hasBody} onFile={(f) => pick(f, setBody, 1800)} onRemove={() => { setBody(null); setDirty(true); }} />
            </Section>

            <Section n={5} title="Measurements" hint="These set the body size. Photos never override them.">
              <Measurements p={draft} onChange={(v) => change((p) => setMeasurements(p, v))} onUnit={(u) => change((p) => setUnit(p, u))} />
            </Section>

            <Section n={6} title="Personalised model" hint="Made once, then reused for every outfit.">
              <button className="stk" disabled style={{ minHeight: 48, padding: '0 16px', fontSize: 14, alignSelf: 'flex-start' }}>Create personalised model</button>
              <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>Not available yet: the personalisation engine is the next build step. Saving now keeps everything ready for it.</span>
            </Section>

            <Section n={7} title="Your data" hint="Photos stay private on this device.">
              <span style={{ fontSize: 13, color: 'var(--muted-2)', lineHeight: 1.5 }}>Photos are kept in this browser's private storage, not on a public link, and are not uploaded anywhere until the personalisation engine runs. Clearing this browser's data also removes them.</span>
              {!confirmDelete
                ? <button className="stk" onClick={() => setConfirmDelete(true)} disabled={!saved?.faceReference && !saved?.bodyReference && !saved?.personalizedModel && face === undefined && body === undefined} style={{ minHeight: 44, padding: '0 14px', fontSize: 14, alignSelf: 'flex-start', color: '#A32020' }}>Delete my photos and generated images</button>
                : (
                  <div className="row">
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Delete them from this device?</span>
                    <button className="stk" onClick={deleteAll} style={{ minHeight: 44, padding: '0 14px', fontSize: 14, background: '#A32020', borderColor: '#A32020', color: '#FFFFFF' }}>Yes, delete</button>
                    <button className="stk" onClick={() => setConfirmDelete(false)} style={{ minHeight: 44, padding: '0 14px', fontSize: 14 }}>Cancel</button>
                  </div>
                )}
            </Section>
          </div>
        </div>
      </main>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: '#FFFFFF', borderTop: '1px solid var(--line)', padding: phone ? '10px 16px calc(12px + env(safe-area-inset-bottom))' : '12px 28px', display: 'flex', gap: 10, justifyContent: 'flex-end', zIndex: 10 }}>
        <button className="stk" onClick={() => go(back)} style={{ minHeight: 50, padding: '0 18px', flex: phone ? 1 : 'none' }}>{dirty ? 'Leave without saving' : 'Done'}</button>
        <motion.button whileTap={{ scale: 0.97 }} className="stk dark" onClick={save} disabled={saving || !dirty} style={{ minHeight: 50, padding: '0 22px', flex: phone ? 2 : 'none' }}>{saving ? 'Saving…' : 'Save profile'}</motion.button>
      </div>
    </Page>
  );
}

function Section({ n, title, hint, children }: { n: number; title: string; hint: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-labelledby={`sec-${n}`}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ width: 26, height: 26, flex: 'none', borderRadius: '50%', background: '#16121A', color: '#FFFFFF', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 id={`sec-${n}`} style={{ margin: 0, fontSize: 18 }}>{title}</h2>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{hint}</span>
        </div>
      </div>
      {children}
    </section>
  );
}

function ModelChoice({ m, on, pick }: { m: ModelEntry; on: boolean; pick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={pick} aria-pressed={on} aria-label={`${m.name}, ${m.bodyShape}, UK size ${m.ukSize}, ${m.skinTone} skin`} className={'stk' + (on ? ' on' : '')}
      style={{ padding: 4, display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left', ['--accent' as string]: '#16121A' }}>
      <img src={m.thumb} alt="" style={{ width: '100%', aspectRatio: '2 / 3', objectFit: 'cover', borderRadius: 9, display: 'block' }} />
      <span style={{ fontSize: 13, fontWeight: 700, padding: '0 4px' }}>{m.name}</span>
      <span style={{ fontSize: 11, fontWeight: 500, padding: '0 4px 2px', opacity: 0.8 }}>UK {m.ukSize} · {m.bodyShape}</span>
    </motion.button>
  );
}

function RefThumb({ label, draft, saved }: { label: string; draft: Pending; saved: ImageReference | null }) {
  const url = usePrivateImage(draft === undefined ? saved?.id : null, draft ? draft.blob : null);
  const has = draft === undefined ? !!saved : !!draft;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ aspectRatio: '3 / 4', borderRadius: 10, overflow: 'hidden', background: '#F1EEF2', border: '1px dashed var(--line-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: has && url ? 0 : 6 }}>
        {has && url ? <img src={url} alt={`${label} reference`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : `No ${label.toLowerCase()} photo`}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>
    </div>
  );
}

function PhotoSlot({ label, enabled, has, onFile, onRemove }: { label: string; enabled: boolean; has: boolean; onFile: (f: File | undefined) => void; onRemove: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="row">
      <button className={'stk' + (has ? '' : ' dash')} disabled={!enabled} onClick={() => ref.current?.click()} style={{ minHeight: 48, padding: '0 16px', fontSize: 14 }}>
        {has ? `Replace ${label}` : `Upload ${label}`}
      </button>
      {has && <button className="stk" onClick={onRemove} style={{ minHeight: 48, padding: '0 14px', fontSize: 14 }}>Remove</button>}
      {!enabled && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Agree to the consent note first.</span>}
      <input ref={ref} type="file" accept="image/*" hidden aria-label={`Choose a ${label}`} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; onFile(f); }} />
    </div>
  );
}

function Measurements({ p, onChange, onUnit }: { p: PersonalizationProfile; onChange: (v: Record<string, number>) => void; onUnit: (u: 'cm' | 'in') => void }) {
  const cm = p.measurementProfile.unit === 'cm';
  return (
    <>
      <div role="group" aria-label="Units" style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onUnit('cm')} aria-pressed={cm} className={'stk' + (cm ? ' on' : '')} style={{ minWidth: 56, minHeight: 40, ['--accent' as string]: '#16121A' }}>cm</button>
        <button onClick={() => onUnit('in')} aria-pressed={!cm} className={'stk' + (!cm ? ' on' : '')} style={{ minWidth: 56, minHeight: 40, ['--accent' as string]: '#16121A' }}>in</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
        {MEASURES.map(([name]) => {
          const v = p.measurementProfile.valuesCm[name];
          const shown = v == null || Number.isNaN(v) ? '' : cm ? String(v) : String(Math.round(v / 2.54 * 2) / 2);
          return (
            <label key={name} style={{ display: 'flex', flexDirection: 'column', gap: 2, border: '1px solid var(--line-2)', borderRadius: 12, padding: '6px 10px', background: '#FFFFFF' }}>
              <span style={{ fontSize: 12, color: '#6B5B6E', fontWeight: 700 }}>{name}</span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <input defaultValue={shown} key={p.measurementProfile.unit} inputMode="decimal" aria-label={`${name} in ${p.measurementProfile.unit}`}
                  onChange={(e) => { const n = parseFloat(e.target.value.replace(',', '.')); onChange({ [name]: Number.isNaN(n) ? NaN : Math.round((cm ? n : n * 2.54) * 10) / 10 }); }}
                  style={{ width: '100%', border: 0, fontSize: 19, fontWeight: 700, padding: '2px 0', minHeight: 28, background: 'transparent' }} />
                <span style={{ fontSize: 12, color: '#6B5B6E' }}>{p.measurementProfile.unit}</span>
              </span>
            </label>
          );
        })}
      </div>
    </>
  );
}
