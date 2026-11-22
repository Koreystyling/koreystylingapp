import { colourName } from './look';
import type { Brand, Look } from './types';

// The tailor link carries the whole look in the URL, so the tailor needs no login.
// Uploaded photos are too big for a link; they travel once the backend (Supabase storage) is in.

export interface SharePayload { look: Look; brand: Pick<Brand, 'name' | 'main' | 'accent' | 'whatsapp' | 'instagram'> }

const stripImages = (l: Look): Look => ({
  ...l,
  photo: null,
  tryon: null,
  backPhoto: null,
  pics: l.pics.map((p) => ({ ...p, front: undefined, backImg: undefined })),
  parts: Object.fromEntries(Object.entries(l.parts).map(([k, p]) => [k, p.f === 'photo' ? { ...p, img: undefined, f: 'plain', name: `Client's own fabric, mostly ${colourName(p.c).toLowerCase()} (photo sent separately)` } : { ...p, img: undefined }])) as Look['parts'],
  acc: Object.fromEntries(Object.entries(l.acc).map(([k, a]) => [k, { ...a, custom: null }])) as Look['acc'],
});

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

export const encodeShare = (look: Look, brand: Brand) => {
  const payload: SharePayload = { look: stripImages(look), brand: { name: brand.name, main: brand.main, accent: brand.accent, whatsapp: brand.whatsapp, instagram: brand.instagram } };
  return b64(JSON.stringify(payload));
};

export const decodeShare = (s: string): SharePayload | null => {
  try { return JSON.parse(unb64(s)); } catch { return null; }
};

export const shareUrl = (look: Look, brand: Brand) => {
  const base = window.location.href.split('#')[0];
  return `${base}#/t/${encodeShare(look, brand)}`;
};
