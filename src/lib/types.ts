import type { AccKey, BackKind, FabKind, PartKey, StylePic } from './data';
import { MEASURES } from './data';

export interface Part { c: string; d: string; f: FabKind; img?: string; name?: string }
export interface AccState { on: boolean; i: number; color?: string | null; custom?: string | null }

export interface Look {
  id: string;
  name: string;
  clientId?: string | null;
  clientName: string;
  status: 'Draft' | 'Shared' | 'Sent to tailor';
  neededBy?: string;
  updatedAt: number;
  model: number; // size index for the garment sketch proportions
  modelId?: string; // selected photo model from the library (src/lib/models.ts)
  photo?: string | null; // uploaded full-body photo
  tryon?: { front?: string; back?: string; side?: string } | null; // AI try-on results
  unit: 'cm' | 'in';
  meas: Record<string, number>; // always stored in cm
  pics: StylePic[]; // user-uploaded style pictures
  pic: string; // selected picture id
  mix: { Top: string; Sleeves: string; Skirt: string; Back: string };
  backOverride: BackKind | null;
  backPhoto?: string | null;
  backNotes: string;
  join: number;
  hem: number;
  peplum: boolean;
  parts: Record<PartKey, Part>;
  acc: Record<AccKey, AccState>;
  notes: string;
}

export interface Brand {
  name: string;
  logo?: string | null;
  main: string;
  accent: string;
  whatsapp: string;
  instagram: string;
  handle: string;
}

export interface Client { id: string; name: string; event: string; date?: string; meas?: Record<string, number> }
export interface CatalogueItem { id: string; name: string; tag: 'Top' | 'Sleeves' | 'Skirt' | 'Full look'; img?: string; lookId?: string; c: string; bg: string; style?: string }

export const uid = () => Math.random().toString(36).slice(2, 10);

export const newLook = (partial: Partial<Look> = {}): Look => ({
  id: uid(),
  name: 'New look',
  clientName: 'Me',
  status: 'Draft',
  updatedAt: Date.now(),
  model: 2,
  photo: null,
  tryon: null,
  unit: 'cm',
  meas: Object.fromEntries(MEASURES),
  pics: [],
  pic: 'D',
  mix: { Top: 'D', Sleeves: 'C', Skirt: 'C', Back: 'A' },
  backOverride: null,
  backNotes: '',
  join: 200,
  hem: 500,
  peplum: false,
  parts: {
    Top: { c: '#0E5A46', d: '#F2C25B', f: 'lace' },
    Sleeves: { c: '#0E5A46', d: '#F2C25B', f: 'lace' },
    Skirt: { c: '#0E5A46', d: '#F2C25B', f: 'lace' },
    Lining: { c: '#E0A526', d: '#E0A526', f: 'plain' },
  },
  acc: {
    Gele: { on: true, i: 0 },
    Shoes: { on: true, i: 0 },
    Bag: { on: false, i: 0 },
    Jewellery: { on: true, i: 0 },
  },
  notes: '',
  ...partial,
});
