import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Figure from '../components/Figure';
import Acc from '../components/Acc';
import Turntable from '../components/Turntable';
import ModelPhoto, { PHOTO_RATIO } from '../components/ModelPhoto';
import { Icon, Swatches, Toggle, Upload } from '../components/ui';
import {
  ACC_KEYS, ACC_LIB, BACKS, BUILTIN_FABRICS, HEM_PRESETS, JOIN_PRESETS, MEASURES, STEP_COLOR, STEP_HINTS, STEP_NAMES,
  STEP_TEXT, STEP_TITLES, STEP_WALL, SKIRT_NAMES, SLEEVE_NAMES, TOP_NAMES, fabImg, fabSize, nameFor,
} from '../lib/data';
import type { AccKey, BackKind, PartKey, SkirtKind, SleeveKind, StylePic, TopKind, View } from '../lib/data';
import type { Look } from '../lib/types';
import { newLook } from '../lib/types';
import { accItem, allPics, figureProps, picById, tailorSpec, tryOnPrompt } from '../lib/look';
import { useStore } from '../lib/store';
import { go, toast, useBp, useViewportH } from '../lib/hooks';
import { averageColor, downloadSvgs } from '../lib/media';
import { shareUrl } from '../lib/share';
import { requestTryOn, svgToPng, tryOnEnabled } from '../lib/tryon';
import { MODELS, baseModelFor, personImageFor } from '../lib/models';
import { setBaseModel, setMeasurements } from '../lib/profile';
import type { PersonalizationProfile } from '../lib/profile';
import { usePrivateImage } from '../lib/useImage';
import { StatusBadge } from './Profile';

type ViewTab = 'Front' | 'Back' | 'Side' | 'Spin';

const query = () => new URLSearchParams(window.location.hash.split('?')[1] ?? '');

export default function Builder({ lookId }: { lookId?: string }) {
  const store = useStore();
  const bp = useBp();
  const vh = useViewportH();
  const phone = bp === 'phone', compact = bp !== 'laptop';

  const initial = useMemo<Look>(() => {
    const found = lookId && lookId !== 'new' ? store.getLook(lookId) : undefined;
    if (found) {
      // The person's profile is the authority for base model and measurements.
      const pr = store.getProfile(found.profileId);
      return pr ? { ...found, modelId: pr.baseModelId, meas: { ...found.meas, ...pr.measurementProfile.valuesCm } } : found;
    }
    const q = query();
    const client = store.clients.find((c) => c.id === q.get('client'));
    const pr = store.profileForOwner(client?.id ?? 'me');
    const fromProfile = pr ? { profileId: pr.id, modelId: pr.baseModelId } : {};
    return newLook(client ? { ...fromProfile, clientId: client.id, clientName: client.name, name: client.event || 'New look', neededBy: client.date, meas: { ...Object.fromEntries(MEASURES), ...(client.meas ?? {}), ...(pr?.measurementProfile.valuesCm ?? {}) } } : { ...fromProfile, ...(pr ? { meas: { ...Object.fromEntries(MEASURES), ...pr.measurementProfile.valuesCm } } : {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookId]);

  const [look, setLook] = useState<Look>(initial);
  const [step, setStep] = useState(Number(query().get('step') ?? 0) || 0);
  const [view, setView] = useState<ViewTab>('Front');
  const [mode, setMode] = useState<'join' | 'hem'>('join');
  const [target, setTarget] = useState<'All' | PartKey>('All');
  const [accTab, setAccTab] = useState<AccKey>('Gele');
  const [showReal, setShowReal] = useState(true);
  const [busy, setBusy] = useState(false);
  const figRef = useRef<HTMLDivElement>(null);
  const garmentRef = useRef<HTMLDivElement>(null);

  // Autosave every change, and put the look id in the URL once it exists.
  useEffect(() => { store.saveLook(look); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [look]);
  useEffect(() => { if (lookId === 'new') window.history.replaceState(null, '', `#/build/${look.id}`); }, [lookId, look.id]);

  const up = (patch: Partial<Look> | ((l: Look) => Partial<Look>)) => setLook((l) => ({ ...l, ...(typeof patch === 'function' ? patch(l) : patch), tryon: null }));
  const upKeep = (patch: Partial<Look>) => setLook((l) => ({ ...l, ...patch }));

  const goStep = (i: number) => {
    setStep(i);
    if (i === 4) setView('Back');
    else if (step === 4 && view === 'Back') setView('Front');
  };

  const accent = STEP_COLOR[step], accentText = STEP_TEXT[step];
  const stageH = phone ? Math.max(340, Math.min(420, vh * 0.48)) : 0;
  const figH = phone ? stageH - 124 : Math.max(380, Math.min(compact ? 560 : 640, vh - 200));
  const figW = Math.round(figH * 200 / 520);
  const sc = figH / 520;
  const viewKey = (view === 'Spin' ? 'front' : view.toLowerCase()) as View;
  const fig = figureProps(look, viewKey);
  const real = showReal && look.tryon?.[viewKey];
  const profile = store.getProfile(look.profileId) ?? null;
  const model = baseModelFor(look, profile);
  const personalised = profile?.personalizationStatus === 'completed' ? profile.personalizedModel : null;
  const persUrl = usePrivateImage(personalised?.views[viewKey]?.id ?? null);
  const photoW = Math.round(figH * PHOTO_RATIO);
  const shapeMode = step === 3 && view !== 'Spin';
  const spinImages = { ...model.views, ...(showReal ? look.tryon ?? {} : {}) };
  const sketchH = Math.round(figH * (phone ? 0.36 : compact ? 0.3 : 0.38));

  // ----- shape: tap or drag on the model to set the lines
  const setLineFromY = (clientY: number) => {
    const box = figRef.current?.getBoundingClientRect();
    if (!box) return;
    const y = Math.round(((clientY - box.top) / sc) / 2) * 2;
    if (mode === 'join') { const v = Math.max(160, Math.min(280, y)); up((l) => ({ join: v, hem: Math.max(l.hem, v + 60) })); }
    else up((l) => ({ hem: Math.max(l.join + 60, Math.min(500, y)) }));
  };
  const dragging = useRef(false);

  // ----- fabric targets
  const P = look.parts;
  const tgtKeys: PartKey[] = target === 'All' ? ['Top', 'Sleeves', 'Skirt'] : [target];
  const curPart = P[tgtKeys[0]];
  const applyPart = (patch: Partial<Look['parts']['Top']>) => up((l) => {
    const np = { ...l.parts };
    tgtKeys.forEach((k) => { np[k] = { ...np[k], ...patch }; if (patch.f && patch.f !== 'photo') delete np[k].img; });
    return { parts: np };
  });

  const pics = allPics(look);
  const cur = picById(look, look.pic);

  const doTryOn = async () => {
    if (!tryOnEnabled()) { toast('Realistic photos switch on once the try-on key is added. This is the drawn preview.'); return; }
    if (!store.spendCredit(1)) { toast('You are out of credits for this month.'); return; }
    const svg = garmentRef.current?.querySelector('svg');
    if (!svg) return;
    setBusy(true);
    try {
      const garment = await svgToPng(svg as SVGSVGElement);
      const personImage = await personImageFor(look, viewKey, profile);
      const img = await requestTryOn({ personImage, garmentImage: garment, view: viewKey, description: tailorSpec(look).map((r) => r.join(': ')).join('. '), prompt: tryOnPrompt(look, viewKey) });
      upKeep({ tryon: { ...(look.tryon ?? {}), [viewKey]: img } });
      setShowReal(true);
    } catch (e) {
      toast((e as Error).message);
    } finally { setBusy(false); }
  };

  const sendToTailor = () => { upKeep({ status: 'Sent to tailor' }); go(`/tailor/${look.id}`); };

  // ------------------------------------------------------------------ layout
  const shell: CSSProperties = { height: '100dvh', minHeight: phone ? 640 : 560, display: 'flex', flexDirection: 'column', background: 'var(--paper)', overflow: 'hidden', ['--accent' as string]: accent, ['--accent-text' as string]: accentText };

  return (
    <div style={shell}>
      <header className="topbar" style={{ padding: phone ? '10px 14px' : '12px 22px', gap: phone ? 10 : 16 }}>
        <a href="#/" className="logo">korey<span style={{ color: accent, transition: 'color .3s' }}>.</span></a>
        <span style={{ width: 1, height: 22, background: 'var(--line)' }} />
        <label style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0, flex: '0 1 320px' }}>
          <span className="lbl">Look</span>
          <input value={look.name} onChange={(e) => upKeep({ name: e.target.value })} className="h" aria-label="Look name"
            style={{ border: 0, padding: 0, fontSize: phone ? 16 : 19, background: 'transparent', minWidth: 0, width: '100%' }} />
        </label>
        <span style={{ flex: 1 }} />
        <span className="credits hide-phone">{store.credits} credits</span>
        <motion.button whileTap={{ scale: 0.96 }} onClick={sendToTailor} className="stk dark" style={{ minHeight: 44, padding: '0 18px', fontSize: 14, flex: 'none' }}>{phone ? 'Send' : 'Send to tailor'}</motion.button>
      </header>

      {phone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: '#FFFFFF', borderBottom: '1px solid var(--line)' }}>
          <button onClick={() => goStep(Math.max(0, step - 1))} aria-label="Previous step" className="stk" style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.left}</button>
          <div style={{ flex: 1, display: 'flex', gap: 5 }}>
            {STEP_NAMES.map((n, i) => (
              <button key={n} onClick={() => goStep(i)} aria-label={STEP_TITLES[i]} style={{ flex: 1, height: 6, borderRadius: 3, border: 0, padding: 0, background: i <= step ? STEP_COLOR[i] : '#E7E2E8', transition: 'background .3s' }} />
            ))}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{step + 1}/8</span>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: phone ? 'column' : 'row' }}>
        {!phone && (
          <nav aria-label="Steps" style={{ flex: 'none', width: compact ? 100 : 196, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
            {STEP_NAMES.map((n, i) => {
              const on = step === i;
              return (
                <motion.button key={n} whileTap={{ scale: 0.97 }} onClick={() => goStep(i)} aria-current={on ? 'step' : undefined} aria-label={STEP_TITLES[i]} className="stk"
                  style={{ minHeight: compact ? 66 : 50, display: 'flex', flexDirection: compact ? 'column' : 'row', alignItems: 'center', gap: compact ? 4 : 10, padding: '6px 10px', textAlign: 'left', position: 'relative', ...(on ? { background: STEP_COLOR[i], borderColor: STEP_COLOR[i], color: '#FFFFFF' } : {}) }}>
                  <span style={{ width: 28, height: 28, flex: 'none', borderRadius: '50%', background: on ? '#FFFFFF' : i < step ? STEP_COLOR[i] : '#F1EEF2', color: on ? STEP_COLOR[i] : i < step ? '#FFFFFF' : '#6B6170', border: '1px solid #DED8E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{i < step ? '✓' : i + 1}</span>
                  <span style={{ fontSize: compact ? 12 : 15, fontWeight: 700, lineHeight: 1.1 }}>{n}</span>
                </motion.button>
              );
            })}
          </nav>
        )}

        {/* ------------------------------------------------ stage */}
        <section aria-label="Preview" style={{ flex: phone ? `0 0 ${stageH}px` : '1 1 auto', minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '14px 16px 16px', gap: 12, overflow: 'hidden' }}>
          <AnimatePresence initial={false}>
            <motion.div key={step} aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} style={{ position: 'absolute', inset: 0, background: STEP_WALL[step] }} />
          </AnimatePresence>

          <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 3, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => goStep(0)} className="stk" style={{ minHeight: 44, padding: '4px 14px 4px 6px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <img src={model.thumb} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 8%', border: '1px solid #DED8E1' }} />
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6B5B6E' }}>Dressing</span>
                <span>{model.name}{personalised ? ` for ${look.clientName}` : ` · UK ${model.ukSize}`}</span>
              </span>
            </button>
            <button onClick={() => go(`/profile/${look.clientId ?? 'me'}?look=${look.id}`)} aria-label="Personalise this model" className="stk" style={{ minHeight: 44, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: accentText }}>
              {Icon.sparkle}<span className="hide-phone">{profile && profile.personalizationStatus !== 'not_personalised' ? 'Personalisation' : 'Personalise'}</span>
            </button>
          </div>

          {!compact && <span style={{ position: 'absolute', top: 22, right: 20, zIndex: 3, fontSize: 12, fontWeight: 600, color: '#3A3340', background: 'rgba(255,255,255,.7)', borderRadius: 999, padding: '6px 12px' }}>Preview for style. Sew from the measurements.</span>}

          {!(phone && step === 3) && (
            <div style={{ position: 'absolute', left: 14, bottom: phone ? 58 : 80, zIndex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span className="lbl" style={{ color: '#3A3340' }}>Quick</span>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => goStep(5)} aria-label="Upload or change fabric" className="stk"
                style={{ width: phone ? 40 : 48, height: phone ? 40 : 48, borderRadius: '50%', padding: 0, backgroundColor: P.Top.c, backgroundImage: fabImg(P.Top.f, P.Top.d, P.Top.img), backgroundSize: P.Top.f === 'photo' ? 'cover' : '8px 8px', boxShadow: '0 2px 8px rgba(22,18,26,.12)' }} />
              {ACC_KEYS.map((k) => {
                const it = accItem(look, k);
                return (
                  <motion.button key={k} whileTap={{ scale: 0.9 }} aria-label={(it.on ? 'Change ' : 'Add ') + ACC_LIB[k].single} className="stk"
                    onClick={() => { goStep(6); setAccTab(k); }}
                    style={{ width: phone ? 40 : 48, height: phone ? 40 : 48, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: it.on ? '#FFFFFF' : '#E6DCE7', opacity: it.on ? 1 : 0.6, boxShadow: '0 2px 8px rgba(22,18,26,.12)', overflow: 'hidden' }}>
                    <Acc kind={ACC_LIB[k].kind} look={it.look} color={it.color} img={it.custom} s={phone ? 30 : 38} />
                  </motion.button>
                );
              })}
            </div>
          )}

          <div aria-hidden="true" style={{ position: 'absolute', left: '50%', bottom: phone ? 52 : 66, transform: 'translateX(-50%)', width: phone ? 160 : 300, height: 26, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(22,18,26,.22),rgba(22,18,26,0) 70%)' }} />

          <div style={{ position: 'relative', zIndex: 2, flex: 1, minHeight: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6 }}>
            <div ref={figRef} style={{ position: 'relative', width: shapeMode ? figW : photoW, height: figH }}>
              {view === 'Spin'
                ? <Turntable fig={fig} w={photoW} h={figH} playing images={spinImages} />
                : (
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={viewKey + (real ? 'r' : shapeMode ? 's' : 'p')} initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: 1, scaleX: 1 }} exit={{ opacity: 0, scaleX: 0.6 }} transition={{ duration: 0.22 }} style={{ width: shapeMode ? figW : photoW, height: figH, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      {real ? <img src={real} alt={`Realistic preview, ${viewKey}`} style={{ height: figH, width: 'auto', objectFit: 'contain', borderRadius: 12 }} />
                        : shapeMode ? <Figure {...fig} garmentOnly w={figW} h={figH} />
                          : persUrl ? <img src={persUrl} alt={`${model.name} personalised for ${look.clientName}, ${viewKey} view`} style={{ height: figH, width: photoW, objectFit: 'cover', borderRadius: 14 }} />
                            : <ModelPhoto model={model} view={viewKey} h={figH} />}
                    </motion.div>
                  </AnimatePresence>
                )}
              <div ref={garmentRef} aria-hidden="true" style={{ position: 'absolute', left: -9999, top: 0 }}><Figure {...fig} view={viewKey} garmentOnly w={200} h={520} /></div>
              {busy && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="stk" style={{ padding: '10px 14px', fontSize: 14 }}>Making it realistic…</span></div>}
              {step === 3 && view !== 'Spin' && (
                <>
                  <div role="presentation" style={{ position: 'absolute', left: -30, right: -30, top: 150 * sc, bottom: 0, cursor: 'crosshair', touchAction: 'none' }}
                    onPointerDown={(e) => { dragging.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); setLineFromY(e.clientY); }}
                    onPointerMove={(e) => { if (dragging.current) setLineFromY(e.clientY); }}
                    onPointerUp={() => { dragging.current = false; }} />
                  <motion.div layout style={{ position: 'absolute', left: -46, right: -46, top: look.join * sc, borderTop: '2px dashed #16121A', pointerEvents: 'none' }} />
                  <span style={{ position: 'absolute', right: phone ? -112 : -150, top: look.join * sc - 16, fontSize: 12, fontWeight: 700, color: '#FFFFFF', background: mode === 'join' ? '#16121A' : 'rgba(22,18,26,.55)', borderRadius: 999, padding: '4px 10px', pointerEvents: 'none', whiteSpace: 'nowrap' }}>Top ends here</span>
                  <div style={{ position: 'absolute', left: -46, right: -46, top: Math.min(look.hem, 496) * sc, borderTop: `2px dashed ${accentText}`, pointerEvents: 'none' }} />
                  <span style={{ position: 'absolute', left: phone ? -112 : -150, top: Math.min(look.hem, 496) * sc - 16, fontSize: 12, fontWeight: 700, color: '#FFFFFF', background: mode === 'hem' ? accentText : 'rgba(8,103,112,.55)', borderRadius: 999, padding: '4px 10px', pointerEvents: 'none', whiteSpace: 'nowrap' }}>Skirt ends here</span>
                </>
              )}
            </div>
          </div>

          {!shapeMode && !real && (
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => goStep(2)} aria-label="Garment sketch. Change the style" className="stk"
              style={{ position: 'absolute', right: phone ? 10 : 14, ...(phone ? { top: 66 } : { bottom: 80 }), zIndex: 4, padding: '6px 8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,.92)', boxShadow: '0 2px 10px rgba(22,18,26,.12)' }}>
              <span className="lbl" style={{ fontSize: 10, color: '#3A3340' }}>Garment</span>
              <Figure {...fig} view={viewKey} garmentOnly w={Math.round(sketchH * 200 / 520)} h={sketchH} />
            </motion.button>
          )}

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div role="tablist" aria-label="View" style={{ display: 'flex', gap: 6 }}>
              {(['Front', 'Back', 'Side', 'Spin'] as ViewTab[]).map((n) => (
                <motion.button key={n} whileTap={{ scale: 0.95 }} role="tab" aria-selected={view === n} onClick={() => setView(n)} className={'stk' + (view === n ? ' on' : '')}
                  style={{ minHeight: phone ? 38 : 44, minWidth: phone ? 58 : 80, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 10px' }}>
                  {n === 'Spin' && Icon.spin}{n}
                </motion.button>
              ))}
            </div>
            {look.tryon && Object.keys(look.tryon).length > 0
              ? <button onClick={() => setShowReal(!showReal)} className="stk" style={{ minHeight: phone ? 38 : 44, padding: '0 12px', fontSize: 13 }}>{showReal ? 'Show model' : 'Show dressed'}</button>
              : <motion.button whileTap={{ scale: 0.95 }} onClick={doTryOn} disabled={busy} className="stk dark" style={{ minHeight: phone ? 38 : 44, padding: '0 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>{Icon.sparkle}Make it realistic</motion.button>}
          </div>
        </section>

        {/* ------------------------------------------------ panel */}
        <aside aria-label={STEP_TITLES[step]} style={{ flex: phone ? '1 1 auto' : 'none', minHeight: 0, width: phone ? '100%' : (compact ? 372 : 420), background: '#FFFFFF', borderLeft: phone ? 0 : '1px solid var(--line)', borderTop: phone ? '1px solid var(--line)' : 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: phone ? 16 : 20 }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2, ease: 'easeOut' }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="lbl" style={{ display: 'flex', alignItems: 'center', gap: 8, color: accentText }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />Step {step + 1} of 8</span>
                  <h1 className="h" style={{ margin: '4px 0 0', fontSize: phone ? 22 : 30, lineHeight: 1.1 }}>{STEP_TITLES[step]}</h1>
                  <span className="it" style={{ fontSize: 16, color: 'var(--muted)' }}>{STEP_HINTS[step]}</span>
                </div>

                {step === 0 && <PersonStep look={look} up={up} upKeep={upKeep} profile={profile} />}
                {step === 1 && <SizeStep look={look} upKeep={upKeep} profile={profile} />}
                {step === 2 && <StyleStep look={look} up={up} pics={pics} cur={cur} />}
                {step === 3 && <ShapeStep look={look} up={up} mode={mode} setMode={setMode} />}
                {step === 4 && <BackStep look={look} up={up} upKeep={upKeep} />}
                {step === 5 && <FabricStep look={look} target={target} setTarget={setTarget} curPart={curPart} applyPart={applyPart} />}
                {step === 6 && <AccStep look={look} up={up} tab={accTab} setTab={setAccTab} />}
                {step === 7 && <ShareStep look={look} upKeep={upKeep} figRef={figRef} sendToTailor={sendToTailor} />}
              </motion.div>
            </AnimatePresence>
          </div>
          <div style={{ display: 'flex', gap: 10, padding: phone ? '10px 16px calc(12px + env(safe-area-inset-bottom))' : '12px 20px 18px', borderTop: '1px solid var(--line)' }}>
            <button onClick={() => (step === 0 ? go('/') : goStep(step - 1))} className="stk" style={{ flex: 1, minHeight: 50 }}>Back</button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => (step === 7 ? sendToTailor() : goStep(step + 1))} className="stk on" style={{ flex: 2, minHeight: 50 }}>{step === 7 ? 'Send to tailor' : 'Next: ' + STEP_NAMES[step + 1]}</motion.button>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ======================================================================= steps

type Up = (patch: Partial<Look> | ((l: Look) => Partial<Look>)) => void;
type UpKeep = (patch: Partial<Look>) => void;
const on = (b: boolean) => 'stk' + (b ? ' on' : '');
const H3 = ({ children }: { children: React.ReactNode }) => <span style={{ fontWeight: 700, fontSize: 15 }}>{children}</span>;

function PersonStep({ look, up, upKeep, profile }: { look: Look; up: Up; upKeep: UpKeep; profile: PersonalizationProfile | null }) {
  const store = useStore();
  const { clients } = store;
  const base = baseModelFor(look, profile);
  const ownerKey = look.clientId ?? 'me';
  const pickModel = (id: string, size: number) => {
    // The base model belongs to the person's profile when they have one, so every look for them follows.
    if (profile) store.saveProfile(setBaseModel(profile, id));
    up({ modelId: id, model: size });
  };
  return (
    <>
      <label className="field">Who is it for?
        <select className="input" value={ownerKey} onChange={(e) => {
          const c = clients.find((x) => x.id === e.target.value);
          const pr = store.profileForOwner(c?.id ?? 'me');
          const link = pr ? { profileId: pr.id, modelId: pr.baseModelId } : { profileId: null };
          upKeep(c
            ? { ...link, clientId: c.id, clientName: c.name, neededBy: look.neededBy ?? c.date, meas: { ...look.meas, ...(c.meas ?? {}), ...(pr?.measurementProfile.valuesCm ?? {}) } }
            : { ...link, clientId: null, clientName: 'Me', ...(pr ? { meas: { ...look.meas, ...pr.measurementProfile.valuesCm } } : {}) });
        }}>
          <option value="me">Me</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <H3>Choose a Korey model</H3>
      <div className="grid3">
        {MODELS.map((m) => {
          const sel = base.id === m.id;
          return (
            <motion.button key={m.id} whileTap={{ scale: 0.96 }} onClick={() => pickModel(m.id, m.drawingSize)} aria-pressed={sel} aria-label={`${m.name}, ${m.bodyShape}, UK size ${m.ukSize}, ${m.skinTone} skin`} className={on(sel)}
              style={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 3, textAlign: 'left' }}>
              <img src={m.thumb} alt="" style={{ width: '100%', aspectRatio: '2 / 3', objectFit: 'cover', borderRadius: 9, display: 'block' }} />
              <span style={{ fontSize: 13, fontWeight: 700, padding: '0 4px' }}>{m.name}</span>
              <span style={{ fontSize: 11, fontWeight: 500, padding: '0 4px 2px', opacity: 0.8 }}>UK {m.ukSize} · {m.bodyShape}</span>
            </motion.button>
          );
        })}
      </div>
      <div style={{ border: '1px solid var(--line-2)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--paper)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Make {base.name} look like {ownerKey === 'me' ? 'you' : look.clientName}</span>
          <StatusBadge status={profile?.personalizationStatus ?? 'not_personalised'} />
        </div>
        <span style={{ fontSize: 13, color: 'var(--muted-2)', lineHeight: 1.45 }}>Add a face photo and, if you like, a full-body photo. They personalise {base.name}; they never replace her. Measurements set the body size.</span>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => go(`/profile/${ownerKey}?look=${look.id}`)} className="stk dark" style={{ minHeight: 46, padding: '0 16px', fontSize: 14, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}>
          {Icon.sparkle}{profile && (profile.faceReference || profile.bodyReference) ? 'Edit personalisation' : `Personalise ${base.name}`}
        </motion.button>
      </div>
      <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>Pilot models are AI-generated. Your measurements, not the model, go to the tailor.</span>
    </>
  );
}

function SizeStep({ look, upKeep, profile }: { look: Look; upKeep: UpKeep; profile: PersonalizationProfile | null }) {
  const store = useStore();
  const cm = look.unit === 'cm';
  return (
    <>
      <div role="group" aria-label="Units" style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => upKeep({ unit: 'cm' })} aria-pressed={cm} className={on(cm)} style={{ minWidth: 56, minHeight: 40 }}>cm</button>
        <button onClick={() => upKeep({ unit: 'in' })} aria-pressed={!cm} className={on(!cm)} style={{ minWidth: 56, minHeight: 40 }}>in</button>
      </div>
      <div className="grid2">
        {MEASURES.map(([name]) => {
          const v = look.meas[name];
          const shown = v == null || Number.isNaN(v) ? '' : cm ? String(v) : String(Math.round(v / 2.54 * 2) / 2);
          return (
            <label key={name} style={{ display: 'flex', flexDirection: 'column', gap: 2, border: '1px solid var(--line-2)', borderRadius: 12, padding: '6px 10px' }}>
              <span style={{ fontSize: 12, color: '#6B5B6E', fontWeight: 700 }}>{name}</span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <input defaultValue={shown} key={look.unit} inputMode="decimal" aria-label={`${name} in ${look.unit}`}
                  onChange={(e) => { const n = parseFloat(e.target.value.replace(',', '.')); const cmv = Number.isNaN(n) ? NaN : Math.round((cm ? n : n * 2.54) * 10) / 10; upKeep({ meas: { ...look.meas, [name]: cmv } }); if (profile) store.saveProfile(setMeasurements(profile, { [name]: cmv })); }}
                  style={{ width: '100%', border: 0, fontSize: 19, fontWeight: 700, padding: '2px 0', minHeight: 28, background: 'transparent' }} />
                <span style={{ fontSize: 12, color: '#6B5B6E' }}>{look.unit}</span>
              </span>
            </label>
          );
        })}
      </div>
      <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>{profile ? `Saved to ${look.clientName === 'Me' ? 'your' : look.clientName + "'s"} profile too, so every look for ${look.clientName === 'Me' ? 'you' : 'them'} uses them. ` : ''}The garment sketch gets fuller or slimmer with the bust and hips. The tailor card always shows these exact numbers.</span>
    </>
  );
}

function PicThumb({ p, view, w = 44, h = 114 }: { p: StylePic; view: View; w?: number; h?: number }) {
  const img = view === 'front' ? p.front : p.backImg;
  if (img) return <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
  return <Figure view={view} garmentOnly skin="#7A4A30" topPart={{ c: p.cloth, d: p.dot, f: 'lace' }} top={p.top} sleeve={p.sleeve} skirt={p.skirt} backDesign={p.back} geleStyle="none" shoeStyle="pump" shoe={p.dot} bagStyle="none" jewel="none" w={w} h={h} />;
}

function StyleStep({ look, up, pics, cur }: { look: Look; up: Up; pics: StylePic[]; cur: StylePic }) {
  const nextId = String.fromCharCode(65 + pics.length);
  const addPic = (side: 'front' | 'backImg', img: string) => {
    // A new upload fills the empty side of the latest uploaded picture, or starts a new one.
    const last = look.pics[look.pics.length - 1];
    if (last && !last[side]) { up({ pics: look.pics.map((p) => (p.id === last.id ? { ...p, [side]: img } : p)), pic: last.id }); return; }
    const np: StylePic = { id: nextId, top: 'square', sleeve: 'cap', skirt: 'mermaid', back: 'zip', cloth: '#6B6170', dot: '#E7E2E8', bg: '#F1EEF2', [side]: img };
    up({ pics: [...look.pics, np], pic: np.id });
  };
  const setPicShape = (patch: Partial<StylePic>) => up({ pics: look.pics.map((p) => (p.id === cur.id ? { ...p, ...patch } : p)) });
  const custom = look.pics.some((p) => p.id === cur.id);
  const parts: [keyof Look['mix'], string][] = [['Top', 'top'], ['Sleeves', 'sleeves'], ['Skirt', 'skirt'], ['Back', 'back']];
  return (
    <>
      <div className="grid2">
        {pics.map((d) => (
          <motion.button key={d.id} whileTap={{ scale: 0.97 }} onClick={() => up({ pic: d.id })} aria-pressed={look.pic === d.id} aria-label={'Picture ' + d.id} className={on(look.pic === d.id)} style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ display: 'flex', gap: 4, width: '100%' }}>
              {(['front', 'back'] as View[]).map((v) => (
                <span key={v} style={{ flex: 1, height: 118, borderRadius: 9, background: d.bg, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
                  {(v === 'back' && !d.backImg && d.front) ? <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>no back yet</span> : <PicThumb p={d} view={v} />}
                </span>
              ))}
            </span>
            <span style={{ fontSize: 13 }}>Picture {d.id} · front and back</span>
          </motion.button>
        ))}
      </div>
      <div className="grid2">
        <Upload className="stk dash" onFile={(img) => addPic('front', img)} style={{ minHeight: 64, fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span>+ Front picture</span><span style={{ fontSize: 12, fontWeight: 500, color: '#6B5B6E' }}>screenshot or photo</span>
        </Upload>
        <Upload className="stk dash" onFile={(img) => addPic('backImg', img)} style={{ minHeight: 64, fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span>+ Back picture</span><span style={{ fontSize: 12, fontWeight: 500, color: '#6B5B6E' }}>same style, from behind</span>
        </Upload>
      </div>
      {custom && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--paper)', borderRadius: 12, padding: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>What is in picture {cur.id}?</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Pick the closest shapes. Later the AI reads these from the picture for you.</span>
          <div className="grid2">
            <label className="field" style={{ fontSize: 12 }}>Top<select className="input" value={cur.top} onChange={(e) => setPicShape({ top: e.target.value as TopKind })}>{Object.entries(TOP_NAMES).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
            <label className="field" style={{ fontSize: 12 }}>Sleeves<select className="input" value={cur.sleeve} onChange={(e) => setPicShape({ sleeve: e.target.value as SleeveKind })}>{Object.entries(SLEEVE_NAMES).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
            <label className="field" style={{ fontSize: 12 }}>Skirt<select className="input" value={cur.skirt} onChange={(e) => setPicShape({ skirt: e.target.value as SkirtKind })}>{Object.entries(SKIRT_NAMES).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
            <label className="field" style={{ fontSize: 12 }}>Back<select className="input" value={cur.back} onChange={(e) => setPicShape({ back: e.target.value as BackKind })}>{BACKS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
          </div>
        </div>
      )}
      <H3>From picture {cur.id}, use its…</H3>
      <div className="row">
        {parts.map(([k, label]) => {
          const isOn = look.mix[k] === cur.id && !(k === 'Back' && look.backOverride);
          return (
            <motion.button key={k} whileTap={{ scale: 0.95 }} onClick={() => up({ mix: { ...look.mix, [k]: cur.id }, ...(k === 'Back' ? { backOverride: null } : {}) })} className={on(isOn) + ' pill'} style={{ minHeight: 44 }}>
              {isOn ? `${label} added` : label}
            </motion.button>
          );
        })}
      </div>
      <div className="grid4" style={{ background: 'var(--paper)', borderRadius: 12, padding: 10 }}>
        {(Object.keys(look.mix) as (keyof Look['mix'])[]).map((k) => (
          <span key={k} style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 12, color: '#6B5B6E', fontWeight: 700 }}>{k}</span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{k === 'Back' && look.backOverride ? 'custom' : 'pic ' + look.mix[k]}</span>
          </span>
        ))}
      </div>
    </>
  );
}

function ShapeStep({ look, up, mode, setMode }: { look: Look; up: Up; mode: 'join' | 'hem'; setMode: (m: 'join' | 'hem') => void }) {
  const presets = mode === 'join' ? JOIN_PRESETS : HEM_PRESETS;
  return (
    <>
      <div className="grid2" style={{ gap: 8 }}>
        <button onClick={() => setMode('join')} aria-pressed={mode === 'join'} className={on(mode === 'join')} style={{ minHeight: 56, padding: '6px 10px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', fontSize: 14 }}>
          <span>Where the top ends</span><span style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>{nameFor(JOIN_PRESETS, look.join)}</span>
        </button>
        <button onClick={() => setMode('hem')} aria-pressed={mode === 'hem'} className={on(mode === 'hem')} style={{ minHeight: 56, padding: '6px 10px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', fontSize: 14 }}>
          <span>Where the skirt ends</span><span style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>{nameFor(HEM_PRESETS, look.hem)}</span>
        </button>
      </div>
      <span style={{ fontSize: 14, color: '#3A3340', lineHeight: 1.45, background: 'var(--paper)', borderRadius: 12, padding: '10px 12px' }}>Now tap or drag on the garment, anywhere from the bust to the feet. The line moves there and the outfit redraws.</span>
      <span style={{ fontWeight: 700, fontSize: 14 }}>Or pick a preset</span>
      <div className="row">
        {presets.map(([n, v]) => {
          const isOn = Math.abs((mode === 'join' ? look.join : look.hem) - v) < 6;
          return <button key={n} className={on(isOn) + ' pill'} onClick={() => (mode === 'join' ? up((l) => ({ join: v, hem: Math.max(l.hem, v + 60) })) : up((l) => ({ hem: Math.max(l.join + 60, v) })))}>{n}</button>;
        })}
      </div>
      <div className="row" aria-label="Fine adjust">
        <button className="stk pill" onClick={() => (mode === 'join' ? up((l) => ({ join: Math.max(160, l.join - 4) })) : up((l) => ({ hem: Math.max(l.join + 60, l.hem - 4) })))}>Move up</button>
        <button className="stk pill" onClick={() => (mode === 'join' ? up((l) => ({ join: Math.min(280, l.join + 4), hem: Math.max(l.hem, l.join + 64) })) : up((l) => ({ hem: Math.min(500, l.hem + 4) })))}>Move down</button>
      </div>
      <button onClick={() => up({ peplum: !look.peplum })} aria-pressed={look.peplum} className={on(look.peplum)} style={{ minHeight: 48, padding: '0 14px', fontSize: 14, textAlign: 'left' }}>Add a peplum flare at the join</button>
    </>
  );
}

function BackStep({ look, up, upKeep }: { look: Look; up: Up; upKeep: UpKeep }) {
  const backKind = look.backOverride ?? picById(look, look.mix.Back).back;
  const fp = figureProps(look, 'back');
  return (
    <>
      <div className="grid3">
        {BACKS.map(([k, n]) => (
          <motion.button key={k} whileTap={{ scale: 0.96 }} onClick={() => up({ backOverride: k })} aria-pressed={backKind === k} className={on(backKind === k)} style={{ padding: '5px 4px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ width: '100%', height: 110, borderRadius: 9, background: 'radial-gradient(ellipse at 50% 30%,#FFFFFF 0%,#E9E4EC 100%)', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
              <span style={{ marginTop: -20 }}><Figure {...fp} garmentOnly backDesign={k} geleStyle="none" shoeStyle="none" bagStyle="none" jewel="none" geleImg={null} w={84} h={218} /></span>
            </span>
            <span style={{ fontSize: 12 }}>{n}</span>
          </motion.button>
        ))}
        {look.backPhoto ? (
          <div className="stk" style={{ padding: 5, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <img src={look.backPhoto} alt="Back picture" style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 9 }} />
            <button className="stk" style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => upKeep({ backPhoto: null })}>Remove</button>
          </div>
        ) : (
          <Upload className="stk dash" onFile={(img) => upKeep({ backPhoto: img })} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13, minHeight: 140 }}>
            {Icon.upload}Upload a back picture
          </Upload>
        )}
      </div>
      <label className="field">Notes for the back
        <input className="input" value={look.backNotes} placeholder="e.g. Low enough to show the shoulder blades" onChange={(e) => upKeep({ backNotes: e.target.value })} />
      </label>
    </>
  );
}

function FabricStep({ look, target, setTarget, curPart, applyPart }: { look: Look; target: 'All' | PartKey; setTarget: (t: 'All' | PartKey) => void; curPart: Look['parts']['Top']; applyPart: (p: Partial<Look['parts']['Top']>) => void }) {
  const store = useStore();
  const lib = [...store.fabrics, ...BUILTIN_FABRICS];
  const P = look.parts;
  return (
    <>
      <Upload className="stk dash" max={720} onFile={async (img) => {
        const c = await averageColor(img);
        const sw = store.addFabric({ name: `My fabric ${store.fabrics.length + 1}`, c, d: c, f: 'photo', img });
        applyPart({ c: sw.c, d: sw.d, f: 'photo', img: sw.img, name: sw.name });
        toast(`Fabric added to ${target === 'All' ? 'the whole outfit' : 'the ' + target.toLowerCase()}`);
      }} style={{ minHeight: 120, borderWidth: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, background: '#FBFAF8', width: '100%' }}>
        {Icon.camera}
        <span style={{ fontSize: 17 }}>Upload a fabric photo</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#6B5B6E' }}>Your aso-ebi, lace, ankara or any print. One photo is enough.</span>
      </Upload>
      <H3>1. Choose the part</H3>
      <div className="row">
        {(['All', 'Top', 'Sleeves', 'Skirt', 'Lining'] as const).map((k) => {
          const pp = k === 'All' ? P.Top : P[k];
          return (
            <button key={k} onClick={() => setTarget(k)} aria-pressed={target === k} className={on(target === k) + ' pill'}>
              <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid #DED8E1', backgroundColor: pp.c, backgroundImage: fabImg(pp.f, pp.d, pp.img), backgroundSize: pp.f === 'photo' ? 'cover' : '6px 6px' }} />
              {k === 'All' ? 'Whole outfit' : k}
            </button>
          );
        })}
      </div>
      <H3>2. Tap a fabric from your uploads</H3>
      <div className="grid3" style={{ gap: 8 }}>
        {lib.map((x) => {
          const isOn = curPart.f === x.f && curPart.c === x.c && curPart.d === x.d && (curPart.img ?? null) === (x.img ?? null);
          return (
            <motion.button key={x.id} whileTap={{ scale: 0.96 }} onClick={() => applyPart({ c: x.c, d: x.d, f: x.f, img: x.img, name: x.name })} aria-pressed={isOn} className={on(isOn)} style={{ padding: 5, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'stretch' }}>
              <span aria-hidden="true" style={{ height: 58, borderRadius: 8, border: '1px solid #DED8E1', backgroundColor: x.c, backgroundImage: fabImg(x.f, x.d, x.img), backgroundSize: fabSize(x.f), backgroundPosition: 'center' }} />
              <span style={{ fontSize: 12, lineHeight: 1.15 }}>{x.name}</span>
            </motion.button>
          );
        })}
      </div>
      <H3>3. Or change the colour of {target === 'All' ? 'the whole outfit' : 'the ' + target.toLowerCase()}</H3>
      <Swatches label="Fabric colour" value={curPart.c} onPick={(h) => applyPart({ c: h, ...(curPart.f === 'photo' ? { f: 'plain' } : {}), name: undefined })} />
      <span style={{ fontWeight: 700, fontSize: 14 }}>Bead and pattern colour</span>
      <Swatches label="Bead colour" value={curPart.d} onPick={(h) => applyPart({ d: h, ...(curPart.f === 'photo' || curPart.f === 'plain' ? { f: 'lace' } : {}), name: undefined })} />
      <span style={{ fontWeight: 700, fontSize: 14 }}>Fabric type</span>
      <div className="row">
        {(['lace', 'sequin', 'ankara', 'stripe', 'plain'] as const).map((f) => (
          <button key={f} className={on(curPart.f === f) + ' pill'} onClick={() => applyPart({ f, name: undefined })}>{f[0].toUpperCase() + f.slice(1)}</button>
        ))}
      </div>
    </>
  );
}

function AccStep({ look, up, tab, setTab }: { look: Look; up: Up; tab: AccKey; setTab: (k: AccKey) => void }) {
  const L = ACC_LIB[tab];
  const st = look.acc[tab];
  const cur = accItem(look, tab);
  const setAcc = (patch: Partial<Look['acc']['Gele']>) => up((l) => ({ acc: { ...l.acc, [tab]: { ...l.acc[tab], ...patch } } }));
  return (
    <>
      <div role="tablist" aria-label="Accessory" className="grid4">
        {ACC_KEYS.map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={on(tab === k)} style={{ minHeight: 44, fontSize: 13, padding: '0 4px' }}>{k}</button>)}
      </div>
      <Toggle on={st.on} onClick={() => setAcc({ on: !st.on })} label={st.on ? 'Wearing ' + L.single : 'No ' + L.single} color={STEP_COLOR[6]} />
      <div className="grid2">
        {L.items.map((o, i) => {
          const isOn = st.on && st.i === i && !st.custom;
          return (
            <motion.button key={o.name} whileTap={{ scale: 0.96 }} onClick={() => setAcc({ i, on: true, color: null, custom: null })} aria-pressed={isOn} className={on(isOn) + (st.on ? '' : ' off')} style={{ padding: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ width: '100%', height: 78, borderRadius: 9, background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Acc kind={L.kind} look={o.look} color={st.i === i && st.color ? st.color : o.color} s={70} />
              </span>
              <span style={{ fontSize: 13 }}>{o.name}</span>
            </motion.button>
          );
        })}
        {st.custom ? (
          <div className="stk on" style={{ padding: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ width: '100%', height: 78, borderRadius: 9, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}><img src={st.custom} alt="" style={{ height: 74, objectFit: 'contain' }} /></span>
            <button className="stk" style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => setAcc({ custom: null })}>Remove my {L.single}</button>
          </div>
        ) : (
          <Upload className="stk dash" max={400} onFile={(img) => setAcc({ custom: img, on: true })} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13, minHeight: 110 }}>
            {Icon.upload}Upload my own {L.single}
          </Upload>
        )}
      </div>
      {!st.custom && <>
        <H3>Colour of the {L.single}</H3>
        <Swatches label={`${tab} colour`} value={cur.color} onPick={(h) => setAcc({ color: h, on: true })} />
      </>}
      <span style={{ fontSize: 13, color: '#6B5B6E' }}>All accessories are optional. Your own uploads show on the model as they are.</span>
    </>
  );
}

function ShareStep({ look, upKeep, figRef, sendToTailor }: { look: Look; upKeep: UpKeep; figRef: React.RefObject<HTMLDivElement>; sendToTailor: () => void }) {
  const store = useStore();
  const hidden = useRef<HTMLDivElement>(null);
  const link = shareUrl(look, store.brand);
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast('Link copied. Paste it in WhatsApp.'); }
    catch { window.prompt('Copy this link', link); }
    upKeep({ status: look.status === 'Draft' ? 'Shared' : look.status });
  };
  const wa = `https://wa.me/?text=${encodeURIComponent(`${look.name}: here is the look. ${link}`)}`;
  const download = async () => {
    const svgs = Array.from(hidden.current?.querySelectorAll('svg') ?? []) as SVGSVGElement[];
    await downloadSvgs(svgs, `${look.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'korey-look'}.png`, { title: look.name, brand: store.brand.name });
  };
  const saveCat = () => {
    store.addCatalogue({ name: look.name, tag: 'Full look', lookId: look.id, c: look.parts.Top.c, bg: '#EDE3EE', style: picById(look, look.mix.Top).top });
    toast('Saved to your catalogue.');
  };
  void figRef;
  return (
    <>
      <span className="h" style={{ fontSize: 22 }}>Looking good.</span>
      <div className="grid2">
        <label className="field">Needed by<input type="date" className="input" value={look.neededBy ?? ''} onChange={(e) => upKeep({ neededBy: e.target.value })} /></label>
        <label className="field">For<input className="input" value={look.clientName} onChange={(e) => upKeep({ clientName: e.target.value })} /></label>
      </div>
      <label className="field">Notes for the tailor<textarea className="input" value={look.notes} placeholder="e.g. Client wants room to dance." onChange={(e) => upKeep({ notes: e.target.value })} /></label>
      <motion.button whileTap={{ scale: 0.97 }} onClick={sendToTailor} className="stk on" style={{ minHeight: 52 }}>Send to tailor</motion.button>
      <div className="grid2">
        <button onClick={copy} className="stk" style={{ minHeight: 52 }}>Copy link</button>
        <a href={wa} target="_blank" rel="noreferrer" onClick={() => upKeep({ status: look.status === 'Draft' ? 'Shared' : look.status })} className="stk" style={{ minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Share on WhatsApp</a>
      </div>
      <div className="grid2">
        <button onClick={download} className="stk" style={{ minHeight: 52 }}>Download image</button>
        <button onClick={saveCat} className="stk" style={{ minHeight: 52 }}>Save to catalogue</button>
      </div>
      <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>The link opens the tailor card with the drawing, the exact measurements and what to sew. No login needed. Uploaded photos stay on this device for now.</span>
      <div ref={hidden} aria-hidden="true" style={{ position: 'absolute', left: -9999, top: 0 }}>
        {(['front', 'back', 'side'] as View[]).map((v) => <Figure key={v} {...figureProps(look, v)} garmentOnly w={200} h={520} />)}
      </div>
    </>
  );
}
