import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Brand, CatalogueItem, Client, Look } from './types';
import { newLook, uid } from './types';
import type { FabricSwatch } from './data';
import type { PersonalizationProfile } from './profile';
import { clearPersonalImages, imageIdsOf, newProfile, normaliseProfile, setBodyReference } from './profile';
import { dataUrlToBlob, deleteImages, putImage } from './privateImages';

// MVP persistence: everything lives in this browser (localStorage).
// The PRD's Supabase backend replaces this module later; screens only use the hook.

interface State {
  looks: Look[];
  profiles: PersonalizationProfile[]; // one per person ('me' or a client); photos live in IndexedDB
  clients: Client[];
  catalogue: CatalogueItem[];
  fabrics: FabricSwatch[];
  brand: Brand;
  credits: number;
  plan: 'Free trial' | 'Personal' | 'Studio' | 'Atelier';
}

const KEY = 'korey.v1';

const seed = (): State => {
  const looks: Look[] = [
    newLook({ name: "Aunty Bisi's 60th", clientName: 'Bisi Adeyemi', clientId: 'c1', status: 'Sent to tailor', neededBy: '2026-12-06', model: 2, mix: { Top: 'D', Sleeves: 'C', Skirt: 'C', Back: 'A' }, backNotes: 'Concealed back zip. Room to dance.' }),
    newLook({ name: 'Wedding aso-ebi', clientName: 'Tolu Bakare', clientId: 'c2', status: 'Draft', neededBy: '2026-12-14', model: 1, mix: { Top: 'A', Sleeves: 'A', Skirt: 'D', Back: 'A' },
      parts: { Top: { c: '#7A1238', d: '#F3D9E3', f: 'sequin' }, Sleeves: { c: '#7A1238', d: '#F3D9E3', f: 'sequin' }, Skirt: { c: '#7A1238', d: '#F3D9E3', f: 'sequin' }, Lining: { c: '#F3D9E3', d: '#F3D9E3', f: 'plain' } },
      acc: { Gele: { on: true, i: 1 }, Shoes: { on: true, i: 2 }, Bag: { on: true, i: 1 }, Jewellery: { on: true, i: 1 } } }),
    newLook({ name: 'Thanksgiving', clientName: 'Hauwa Musa', clientId: 'c4', status: 'Shared', neededBy: '2026-12-20', model: 3, mix: { Top: 'B', Sleeves: 'B', Skirt: 'B', Back: 'B' },
      parts: { Top: { c: '#1F3A8C', d: '#CFE0F7', f: 'stripe' }, Sleeves: { c: '#1F3A8C', d: '#CFE0F7', f: 'stripe' }, Skirt: { c: '#1F3A8C', d: '#CFE0F7', f: 'stripe' }, Lining: { c: '#CFE0F7', d: '#CFE0F7', f: 'plain' } },
      acc: { Gele: { on: true, i: 2, color: '#1F3A8C' }, Shoes: { on: true, i: 3 }, Bag: { on: false, i: 0 }, Jewellery: { on: true, i: 2 } } }),
    newLook({ name: 'Naming party', clientName: 'Kemi Ojo', clientId: 'c5', status: 'Shared', model: 0, mix: { Top: 'C', Sleeves: 'C', Skirt: 'A', Back: 'C' },
      parts: { Top: { c: '#E8660C', d: '#1F4E8C', f: 'ankara' }, Sleeves: { c: '#E8660C', d: '#1F4E8C', f: 'ankara' }, Skirt: { c: '#E8660C', d: '#1F4E8C', f: 'ankara' }, Lining: { c: '#1F4E8C', d: '#1F4E8C', f: 'plain' } },
      acc: { Gele: { on: true, i: 3, color: '#E8660C' }, Shoes: { on: true, i: 0 }, Bag: { on: false, i: 0 }, Jewellery: { on: true, i: 0 } } }),
  ];
  looks.forEach((l, i) => { l.updatedAt = Date.now() - i * 86400000; });
  return {
    looks,
    profiles: [],
    clients: [
      { id: 'c1', name: 'Mrs Bisi Adeyemi', event: "60th birthday", date: '2026-12-06' },
      { id: 'c2', name: 'Tolu Bakare', event: 'Wedding aso-ebi', date: '2026-12-14' },
      { id: 'c3', name: 'Ngozi Eze', event: 'Birthday dinner', date: '2027-01-03', meas: { Bust: 98, Waist: 84 } },
      { id: 'c4', name: 'Hauwa Musa', event: 'Thanksgiving', date: '2026-12-20' },
      { id: 'c5', name: 'Kemi Ojo', event: 'Naming party' },
    ],
    catalogue: [
      { id: 'k1', name: 'Corset bodice', tag: 'Top', c: '#7A1238', bg: '#EDE3EE', style: 'corset' },
      { id: 'k2', name: 'Puff sleeve', tag: 'Sleeves', c: '#C98A0E', bg: '#F4E9DA', style: 'puff' },
      { id: 'k3', name: 'Mermaid skirt', tag: 'Skirt', c: '#1F4E8C', bg: '#E4EEF0', style: 'mermaid' },
      { id: 'k4', name: 'Iro and buba', tag: 'Full look', c: '#0E6B52', bg: '#E8EFE6', style: 'buba' },
      { id: 'k5', name: 'Beaded peplum', tag: 'Top', c: '#4A1450', bg: '#EDE3EE', style: 'square' },
      { id: 'k6', name: 'Bell sleeve', tag: 'Sleeves', c: '#7A1238', bg: '#F4E9DA', style: 'bell' },
      { id: 'k7', name: 'A-line skirt', tag: 'Skirt', c: '#0E6B52', bg: '#E4EEF0', style: 'aline' },
      { id: 'k8', name: 'Lace gown', tag: 'Full look', c: '#C98A0E', bg: '#E8EFE6', style: 'offshoulder' },
    ],
    fabrics: [],
    brand: { name: 'Adunni Couture', logo: null, main: '#7A1238', accent: '#F2C25B', whatsapp: '+234 803 000 0000', instagram: '@adunnicouture', handle: 'adunnicouture' },
    credits: 142,
    plan: 'Studio',
  };
};

const load = (): State => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...seed(), ...saved, profiles: (saved.profiles ?? []).map(normaliseProfile) };
    }
  } catch { /* private mode or blocked storage: fall back to demo data */ }
  return seed();
};

interface Ctx extends State {
  saveLook: (l: Look) => void;
  deleteLook: (id: string) => void;
  getLook: (id: string) => Look | undefined;
  setBrand: (b: Partial<Brand>) => void;
  addClient: (c: Omit<Client, 'id'>) => Client;
  updateClient: (id: string, c: Partial<Client>) => void;
  addCatalogue: (c: Omit<CatalogueItem, 'id'>) => void;
  removeCatalogue: (id: string) => void;
  addFabric: (f: Omit<FabricSwatch, 'id'>) => FabricSwatch;
  spendCredit: (n?: number) => boolean;
  getProfile: (id?: string | null) => PersonalizationProfile | undefined;
  profileForOwner: (ownerKey: string) => PersonalizationProfile | undefined;
  /** The owner's profile, created (not personalised yet) if they have none. */
  ensureProfile: (ownerKey: string, displayName: string, baseModelId: string, valuesCm: Record<string, number>) => PersonalizationProfile;
  saveProfile: (p: PersonalizationProfile) => void;
  /** Delete every photo and generated image of a profile from this device. */
  deletePersonalImages: (id: string) => Promise<void>;
  storageFull: boolean;
  reset: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(load);
  const [storageFull, setFull] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    try { localStorage.setItem(KEY, JSON.stringify(s)); setFull(false); } catch { setFull(true); }
  }, [s]);

  const saveLook = useCallback((l: Look) => setS((p) => {
    const nl = { ...l, updatedAt: Date.now() };
    const exists = p.looks.some((x) => x.id === l.id);
    return { ...p, looks: exists ? p.looks.map((x) => (x.id === l.id ? nl : x)) : [nl, ...p.looks] };
  }), []);

  // One-off migration: looks that carry a photo straight on the look (older app versions)
  // move it into the owner's profile as a private full-body reference. Consent is not
  // assumed, so the profile shows "Awaiting photos" until the person confirms.
  useEffect(() => {
    const legacy = s.looks.filter((l) => typeof l.photo === 'string' && l.photo.startsWith('data:'));
    if (!legacy.length) return;
    let cancelled = false;
    (async () => {
      for (const l of legacy) {
        try {
          const blob = await dataUrlToBlob(l.photo!);
          const bmp = await createImageBitmap(blob).catch(() => null);
          const ref = await putImage(blob, { width: bmp?.width ?? 0, height: bmp?.height ?? 0 }, 'legacy-look-photo');
          if (cancelled) { void deleteImages([ref.id]); return; }
          setS((p) => {
            const ownerKey = l.clientId ?? 'me';
            const existing = p.profiles.find((x) => x.ownerKey === ownerKey);
            let prof = existing ?? newProfile(ownerKey, l.clientName, l.modelId ?? 'halima', l.meas);
            if (!prof.bodyReference) prof = setBodyReference(prof, ref);
            else void deleteImages([ref.id]); // owner already has a body photo; keep theirs
            const profiles = existing ? p.profiles.map((x) => (x.id === prof.id ? prof : x)) : [...p.profiles, prof];
            return { ...p, profiles, looks: p.looks.map((x) => (x.id === l.id ? { ...x, photo: null, profileId: prof.id } : x)) };
          });
        } catch { /* leave the look as it is; it still works with its base model */ }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<Ctx>(() => ({
    ...s,
    storageFull,
    saveLook,
    deleteLook: (id) => setS((p) => ({ ...p, looks: p.looks.filter((x) => x.id !== id) })),
    getLook: (id) => s.looks.find((x) => x.id === id),
    setBrand: (b) => setS((p) => ({ ...p, brand: { ...p.brand, ...b } })),
    addClient: (c) => { const nc = { ...c, id: uid() }; setS((p) => ({ ...p, clients: [...p.clients, nc] })); return nc; },
    updateClient: (id, c) => setS((p) => ({ ...p, clients: p.clients.map((x) => (x.id === id ? { ...x, ...c } : x)) })),
    addCatalogue: (c) => setS((p) => ({ ...p, catalogue: [{ ...c, id: uid() }, ...p.catalogue] })),
    removeCatalogue: (id) => setS((p) => ({ ...p, catalogue: p.catalogue.filter((x) => x.id !== id) })),
    addFabric: (f) => { const nf = { ...f, id: uid() }; setS((p) => ({ ...p, fabrics: [nf, ...p.fabrics] })); return nf; },
    spendCredit: (n = 1) => { if (s.credits < n) return false; setS((p) => ({ ...p, credits: p.credits - n })); return true; },
    reset: () => { void deleteImages(s.profiles.flatMap(imageIdsOf)); setS(seed()); },
    getProfile: (id) => (id ? s.profiles.find((x) => x.id === id) : undefined),
    profileForOwner: (ownerKey) => s.profiles.find((x) => x.ownerKey === ownerKey),
    ensureProfile: (ownerKey, displayName, baseModelId, valuesCm) => {
      const found = s.profiles.find((x) => x.ownerKey === ownerKey);
      if (found) return found;
      const np = newProfile(ownerKey, displayName, baseModelId, valuesCm);
      setS((p) => (p.profiles.some((x) => x.ownerKey === ownerKey) ? p : { ...p, profiles: [...p.profiles, np] }));
      return np;
    },
    saveProfile: (pr) => setS((p) => ({ ...p, profiles: p.profiles.some((x) => x.id === pr.id) ? p.profiles.map((x) => (x.id === pr.id ? pr : x)) : [...p.profiles, pr] })),
    deletePersonalImages: async (id) => {
      const pr = s.profiles.find((x) => x.id === id);
      if (!pr) return;
      await deleteImages(imageIdsOf(pr));
      setS((p) => ({ ...p, profiles: p.profiles.map((x) => (x.id === id ? clearPersonalImages(x) : x)) }));
    },
  }), [s, storageFull, saveLook]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export const useStore = () => {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('useStore outside StoreProvider');
  return c;
};
