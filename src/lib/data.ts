// Shared constants for Korey: step colours, palettes, styles, accessories.

export type FabKind = 'lace' | 'plain' | 'stripe' | 'ankara' | 'sequin' | 'photo';
export type TopKind = 'square' | 'corset' | 'offshoulder' | 'vneck' | 'buba';
export type SleeveKind = 'none' | 'cap' | 'puff' | 'bell' | 'long' | 'bishop';
export type SkirtKind = 'mermaid' | 'straight' | 'aline' | 'ball' | 'wrap';
export type BackKind = 'zip' | 'lowback' | 'laceup' | 'bow' | 'cape';
export type View = 'front' | 'back' | 'side';
export type AccKey = 'Gele' | 'Shoes' | 'Bag' | 'Jewellery';
export type PartKey = 'Top' | 'Sleeves' | 'Skirt' | 'Lining';

export const STEP_NAMES = ['Person', 'Size', 'Style', 'Shape', 'Back', 'Fabric', 'Accessories', 'Share'];
export const STEP_TITLES = ['Who are we dressing?', 'Measurements', 'Mix the style', 'Shape it', 'Design the back', 'Fabric and colour', 'Gele and accessories', 'Share the look'];
export const STEP_HINTS = ['upload a photo, or use a model', 'these go to the tailor exactly', 'pick parts from any picture', 'tap the model to set the lines', 'pick one, or upload your own', 'upload yours, or change any colour', 'all optional, or upload your own', 'send it to your tailor'];

// Jewel tone per step (fill), darker text tone, and the soft studio backdrop.
export const STEP_COLOR = ['#C2185B', '#E8660C', '#6D35D8', '#0A7C86', '#2459D6', '#13804D', '#C8901A', '#CF3B2B'];
export const STEP_TEXT = ['#A3144C', '#A84E08', '#5A2BB8', '#086770', '#1D4AB3', '#0F6A40', '#7A5600', '#A82E21'];
const wall = (a: string, b: string, c: string) => `radial-gradient(ellipse at 50% 22%, ${a} 0%, ${b} 45%, ${c} 100%)`;
export const STEP_WALL = [
  wall('#FFF5F8', '#F6D3DF', '#E7A9BF'), wall('#FFF8F1', '#F8DEC6', '#EDB88C'), wall('#F8F5FF', '#DFD3F7', '#BBA4EA'),
  wall('#F3FBFB', '#CBE9EB', '#93CDD2'), wall('#F5F8FF', '#D3E0F8', '#A3BCEB'), wall('#F4FBF7', '#CDEBD9', '#98CFAF'),
  wall('#FFFBF1', '#F5E5BD', '#E3C67E'), wall('#FFF6F4', '#F6D5CF', '#E8A398'),
];
export const WALLS = { pink: STEP_WALL[0], peach: STEP_WALL[1], lilac: STEP_WALL[2], teal: STEP_WALL[3], blue: STEP_WALL[4], green: STEP_WALL[5], gold: STEP_WALL[6], coral: STEP_WALL[7] };

export const PALETTE: [string, string][] = [
  ['Wine', '#7A1238'], ['Fuchsia', '#D6246E'], ['Coral', '#E8553F'], ['Orange', '#F27A1A'], ['Gold', '#E0A526'],
  ['Emerald', '#0E5A46'], ['Green', '#19A463'], ['Teal', '#0B7F8A'], ['Royal blue', '#1F4E8C'], ['Sky', '#6FA8E8'],
  ['Purple', '#4A1450'], ['Lilac', '#B48ADB'], ['Black', '#1E1420'], ['Ivory', '#F7F2EA'],
];

export const SKINS = ['#C68E63', '#A0663F', '#8A5A3C', '#6E4630', '#5A3825', '#B07A52'];
export const SIZES = ['Size 10', 'Size 12', 'Size 14', 'Size 16', 'Size 18', 'Size 20'];
export const MODEL_WIDTH = [0.88, 0.94, 1, 1.06, 1.12, 1.18];

export const MEASURES: [string, number][] = [
  ['Bust', 106], ['Waist', 92], ['Hips', 118], ['Shoulder', 40], ['Underbust', 92],
  ['Bust point', 26], ['Arm length', 58], ['Round arm', 34], ['Top length', 40], ['Full length', 142],
];

export interface StylePic {
  id: string;
  top: TopKind; sleeve: SleeveKind; skirt: SkirtKind; back: BackKind;
  cloth: string; dot: string; bg: string;
  front?: string; backImg?: string; // uploaded screenshots (data URLs)
  name?: string;
}

export const BUILTIN_PICS: StylePic[] = [
  { id: 'A', top: 'corset', sleeve: 'none', skirt: 'straight', back: 'laceup', cloth: '#7A1238', dot: '#F3D9E3', bg: '#F7E3EA' },
  { id: 'B', top: 'buba', sleeve: 'bishop', skirt: 'wrap', back: 'zip', cloth: '#B87A0A', dot: '#FFF1C9', bg: '#FBEBD0' },
  { id: 'C', top: 'offshoulder', sleeve: 'puff', skirt: 'mermaid', back: 'bow', cloth: '#1F4E8C', dot: '#CFE0F7', bg: '#E3ECF8' },
  { id: 'D', top: 'square', sleeve: 'bell', skirt: 'ball', back: 'cape', cloth: '#4A1450', dot: '#E9D9F0', bg: '#EFE2F2' },
];

export const TOP_NAMES: Record<TopKind, string> = { square: 'Square neck', corset: 'Corset bodice', offshoulder: 'Off-shoulder', vneck: 'V-neck', buba: 'Buba' };
export const SLEEVE_NAMES: Record<SleeveKind, string> = { none: 'Sleeveless', cap: 'Cap sleeve', puff: 'Puff sleeve', bell: 'Bell sleeve', long: 'Long sleeve', bishop: 'Bishop sleeve' };
export const SKIRT_NAMES: Record<SkirtKind, string> = { mermaid: 'Mermaid', straight: 'Straight', aline: 'A-line', ball: 'Ball skirt', wrap: 'Iro wrap' };
export const BACKS: [BackKind, string][] = [['zip', 'Plain zip'], ['lowback', 'Low back'], ['laceup', 'Lace-up'], ['bow', 'Big bow'], ['cape', 'Sheer cape']];
export const BACK_NAMES = Object.fromEntries(BACKS) as Record<BackKind, string>;

export const JOIN_PRESETS: [string, number][] = [['High waist', 176], ['Natural waist', 200], ['Peplum line', 222], ['Drop waist', 245], ['Hip', 262]];
export const HEM_PRESETS: [string, number][] = [['Floor', 500], ['Ankle', 470], ['Midi', 420], ['Knee', 372], ['Mini', 320]];
export const nameFor = (list: [string, number][], v: number) => { const m = list.find((x) => Math.abs(x[1] - v) < 6); return m ? m[0] : 'Custom'; };

export interface FabricSwatch { id: string; name: string; c: string; d: string; f: FabKind; img?: string }
export const BUILTIN_FABRICS: FabricSwatch[] = [
  { id: 'f1', name: 'Emerald aso-ebi lace', c: '#0E5A46', d: '#F2C25B', f: 'lace' },
  { id: 'f2', name: 'Ankara print', c: '#F27A1A', d: '#1F4E8C', f: 'ankara' },
  { id: 'f3', name: 'Adire stripe', c: '#1F3A8C', d: '#CFE0F7', f: 'stripe' },
  { id: 'f4', name: 'Gold sequin', c: '#B87A0A', d: '#FFF1C9', f: 'sequin' },
  { id: 'f5', name: 'Wine satin', c: '#7A1238', d: '#7A1238', f: 'plain' },
  { id: 'f6', name: 'Pink lace', c: '#D6246E', d: '#FFE1EC', f: 'lace' },
];

export const fabImg = (f: FabKind, d: string, img?: string) => {
  if (f === 'photo' && img) return `url(${img})`;
  return ({
    lace: `radial-gradient(circle, ${d} 1.4px, transparent 1.8px)`,
    sequin: `radial-gradient(circle, ${d} 1.8px, transparent 2.2px)`,
    ankara: `radial-gradient(circle, transparent 3px, ${d} 3.5px, ${d} 4.5px, transparent 5px)`,
    stripe: `repeating-linear-gradient(0deg, ${d} 0 3px, transparent 3px 8px)`,
    plain: 'none', photo: 'none',
  } as Record<FabKind, string>)[f];
};
export const fabSize = (f: FabKind) => ({ lace: '8px 8px', sequin: '6px 6px', ankara: '14px 14px', stripe: 'auto', plain: 'auto', photo: 'cover' } as Record<FabKind, string>)[f];

export interface AccItem { name: string; look: string; color: string }
export const ACC_LIB: Record<AccKey, { kind: 'gele' | 'shoe' | 'bag' | 'jewel'; single: string; items: AccItem[] }> = {
  Gele: { kind: 'gele', single: 'gele', items: [{ name: 'Fan gele', look: 'fan', color: '#E0A526' }, { name: 'Rose gele', look: 'rose', color: '#7A1238' }, { name: 'Turban', look: 'turban', color: '#0E5A46' }, { name: 'Half-moon', look: 'halfmoon', color: '#D6246E' }] },
  Shoes: { kind: 'shoe', single: 'shoes', items: [{ name: 'Gold pumps', look: 'pump', color: '#E0A526' }, { name: 'Strappy sandals', look: 'sandal', color: '#C9B8CC' }, { name: 'Block heels', look: 'block', color: '#7A1238' }, { name: 'Nude pumps', look: 'pump', color: '#C68E63' }] },
  Bag: { kind: 'bag', single: 'bag', items: [{ name: 'Box clutch', look: 'box', color: '#E0A526' }, { name: 'Beaded purse', look: 'pouch', color: '#7A1238' }, { name: 'Envelope clutch', look: 'envelope', color: '#0E5A46' }, { name: 'Silver box', look: 'box', color: '#BFC4CC' }] },
  Jewellery: { kind: 'jewel', single: 'jewellery', items: [{ name: 'Coral beads', look: 'coral', color: '#D2512E' }, { name: 'Gold set', look: 'gold', color: '#E9B23A' }, { name: 'Pearls', look: 'pearl', color: '#F4F0E8' }, { name: 'Coral and gold', look: 'coral', color: '#E07A3A' }] },
};
export const ACC_KEYS: AccKey[] = ['Gele', 'Shoes', 'Bag', 'Jewellery'];

export const BRAND_MAIN: [string, string][] = [['#7A1238', 'Wine'], ['#1F4E8C', 'Royal blue'], ['#0E6B52', 'Emerald'], ['#4A1450', 'Aubergine'], ['#16121A', 'Black']];
export const BRAND_ACCENT: [string, string][] = [['#F2C25B', 'Gold'], ['#F3D9E3', 'Blush'], ['#FFFFFF', 'White'], ['#D2512E', 'Coral']];

export const STYLE_CHIPS: [string, string][] = [
  ['Owambe gowns', '#C2185B'], ['Aso-ebi', '#C8901A'], ['Iro and buba', '#13804D'], ['Mermaid', '#2459D6'],
  ['Corset tops', '#6D35D8'], ['Bubu', '#E8660C'], ['Gele styles', '#0A7C86'], ['Wedding guest', '#CF3B2B'],
];
