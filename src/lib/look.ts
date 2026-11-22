import { ACC_LIB, BACK_NAMES, BUILTIN_PICS, HEM_PRESETS, JOIN_PRESETS, MODEL_WIDTH, SKINS, SKIRT_NAMES, SLEEVE_NAMES, TOP_NAMES, nameFor } from './data';
import type { AccKey, StylePic, View } from './data';
import type { Look } from './types';
import type { FigureProps } from '../components/Figure';

export const allPics = (look: Look): StylePic[] => [...BUILTIN_PICS, ...look.pics];
export const picById = (look: Look, id: string) => allPics(look).find((p) => p.id === id) ?? BUILTIN_PICS[0];

export const accItem = (look: Look, k: AccKey) => {
  const st = look.acc[k];
  const it = ACC_LIB[k].items[st.i] ?? ACC_LIB[k].items[0];
  return { ...it, color: st.color || it.color, custom: st.custom || null, on: st.on };
};

/** Width factor from measurements: wider hips/bust give a fuller figure. */
export const widthFactor = (look: Look) => {
  const base = MODEL_WIDTH[look.model] ?? 1;
  const hips = look.meas['Hips'] ?? 118;
  const bust = look.meas['Bust'] ?? 106;
  const m = ((hips / 118) + (bust / 106)) / 2;
  return Math.max(0.8, Math.min(1.35, base * (0.6 + 0.4 * m)));
};

export const figureProps = (look: Look, view: View): FigureProps => {
  const top = picById(look, look.mix.Top).top;
  const sleeve = picById(look, look.mix.Sleeves).sleeve;
  const skirt = picById(look, look.mix.Skirt).skirt;
  const backDesign = look.backOverride ?? picById(look, look.mix.Back).back;
  const g = accItem(look, 'Gele'), sh = accItem(look, 'Shoes'), b = accItem(look, 'Bag'), j = accItem(look, 'Jewellery');
  return {
    view, skin: SKINS[look.model] ?? SKINS[2], width: widthFactor(look),
    topPart: look.parts.Top, sleevePart: look.parts.Sleeves, skirtPart: look.parts.Skirt,
    top, sleeve, skirt, backDesign, join: look.join, hem: look.hem, peplum: look.peplum,
    geleStyle: g.on ? g.look : 'none', gele: g.color, geleImg: g.on ? g.custom : null,
    shoeStyle: sh.on ? sh.look : 'none', shoe: sh.color,
    bagStyle: b.on ? b.look : 'none', bagColor: b.color, bagImg: b.on ? b.custom : null,
    jewel: j.on ? j.look : 'none', jewelColor: j.color,
  };
};

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) || 0);
/** Plain colour name for the tailor, from hue and lightness. */
export const colourName = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (l > 0.92) return 'White';
  if (l < 0.12) return 'Black';
  if (sat < 0.15) return l > 0.75 ? 'Silver' : l > 0.4 ? 'Grey' : 'Charcoal';
  let h = 0;
  if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  const dark = l < 0.3, light = l > 0.72;
  if (h < 12 || h >= 345) return dark ? 'Wine' : light ? 'Blush' : 'Red';
  if (h < 25) return dark ? 'Brown' : light ? 'Peach' : 'Coral';
  if (h < 38) return dark ? 'Brown' : light ? 'Peach' : 'Orange';
  if (h < 52) return light ? 'Champagne' : 'Gold';
  if (h < 68) return light ? 'Cream' : dark ? 'Olive' : 'Yellow';
  if (h < 170) return dark ? 'Emerald' : light ? 'Mint' : 'Green';
  if (h < 195) return dark ? 'Deep teal' : light ? 'Aqua' : 'Teal';
  if (h < 250) return dark ? 'Navy' : light ? 'Sky blue' : 'Royal blue';
  if (h < 300) return dark ? 'Deep purple' : light ? 'Lilac' : 'Purple';
  if (h < 330) return dark ? 'Plum' : light ? 'Pink' : 'Magenta';
  return dark ? 'Wine' : light ? 'Pink' : 'Fuchsia';
};
const FAB_WORD: Record<string, string> = { lace: 'lace', sequin: 'sequin fabric', ankara: 'ankara print', stripe: 'stripe (adire)', plain: 'plain satin', photo: 'uploaded fabric' };
const fabName = (p: Look['parts']['Top']) => {
  if (p.name && !p.name.startsWith('My fabric')) return p.name;
  if (p.f === 'photo') return `Client's own fabric (photo), mostly ${colourName(p.c).toLowerCase()}`;
  const base = `${colourName(p.c)} ${FAB_WORD[p.f]}`;
  const det = p.f === 'lace' || p.f === 'sequin' ? ` with ${colourName(p.d).toLowerCase()} beads` : p.f === 'plain' ? '' : ` in ${colourName(p.d).toLowerCase()}`;
  return `${base}${det} (${p.c.toUpperCase()})`;
};

/** Plain-English sewing spec for the tailor card. */
export const tailorSpec = (look: Look): [string, string][] => {
  const t = picById(look, look.mix.Top), s = picById(look, look.mix.Sleeves), k = picById(look, look.mix.Skirt);
  const backKey = look.backOverride ?? picById(look, look.mix.Back).back;
  const P = look.parts;
  const same = P.Top.c === P.Skirt.c && P.Top.f === P.Skirt.f && P.Top.c === P.Sleeves.c && P.Top.img === P.Skirt.img;
  const rows: [string, string][] = [
    ['Top', `${TOP_NAMES[t.top]}, from picture ${t.id}`],
    ['Sleeves', `${SLEEVE_NAMES[s.sleeve]}, from picture ${s.id}`],
    ['Skirt', `${SKIRT_NAMES[k.skirt]}, from picture ${k.id}`],
    ['Join', `${nameFor(JOIN_PRESETS, look.join)}${look.peplum ? ', with peplum flare' : ''}`],
    ['Length', nameFor(HEM_PRESETS, look.hem)],
    ['Back', `${BACK_NAMES[backKey]}${look.backPhoto ? ' (see back picture)' : ''}${look.backNotes ? `. ${look.backNotes}` : ''}`],
    ['Fabric', same ? `${fabName(P.Top)}, all parts` : `Top: ${fabName(P.Top)}. Sleeves: ${fabName(P.Sleeves)}. Skirt: ${fabName(P.Skirt)}`],
    ['Lining', fabName(P.Lining)],
  ];
  const acc = (['Gele', 'Shoes', 'Bag', 'Jewellery'] as AccKey[]).filter((x) => look.acc[x].on).map((x) => accItem(look, x).custom ? `own ${ACC_LIB[x].single}` : accItem(look, x).name.toLowerCase());
  if (acc.length) rows.push(['Styling', acc.join(', ')]);
  if (look.notes) rows.push(['Notes', look.notes]);
  return rows;
};

const SKIRT_SHAPE: Record<string, string> = {
  mermaid: 'fitted mermaid skirt that hugs the hips and thighs down to the knee, then flares out wide at the hem',
  straight: 'straight column skirt',
  aline: 'A-line skirt that widens gently from the waist',
  ball: 'full, voluminous ball-gown skirt',
  wrap: 'iro wrapper skirt tied at the waist',
};
const LENGTH_WORDS: Record<string, string> = { Floor: 'floor-length', Ankle: 'ankle-length', Midi: 'midi-length (below the knee)', Knee: 'knee-length', Mini: 'mini-length (above the knee)' };
const TOP_WORDS: Record<string, string> = { square: 'a square neckline', corset: 'a structured corset bodice', offshoulder: 'an off-shoulder neckline', vneck: 'a V-neckline', buba: 'a loose buba blouse top' };

/** Instruction for the image-edit try-on model. The silhouette words matter most:
 *  without them models shorten skirts, drop the flare and invent slits. */
export const tryOnPrompt = (look: Look, view: View): string => {
  const t = picById(look, look.mix.Top), s = picById(look, look.mix.Sleeves), k = picById(look, look.mix.Skirt);
  const backKey = look.backOverride ?? picById(look, look.mix.Back).back;
  const P = look.parts;
  const same = P.Top.c === P.Skirt.c && P.Top.f === P.Skirt.f && P.Top.c === P.Sleeves.c && P.Top.img === P.Skirt.img;
  const hem = nameFor(HEM_PRESETS, look.hem);
  const join = nameFor(JOIN_PRESETS, look.join);
  const fabric = same ? fabName(P.Top) : `top in ${fabName(P.Top)}, sleeves in ${fabName(P.Sleeves)}, skirt in ${fabName(P.Skirt)}`;
  const gown = [
    `${TOP_WORDS[t.top] ?? TOP_NAMES[t.top]}`,
    `${SLEEVE_NAMES[s.sleeve].toLowerCase()}s`.replace('sleevelesss', 'no sleeves'),
    `the top joins the skirt at the ${join === 'Custom' ? 'waist' : join.toLowerCase()}${look.peplum ? ' with a peplum flare' : ''}`,
    `${/^[aeiou]/i.test(LENGTH_WORDS[hem] ?? 'f') ? 'an' : 'a'} ${LENGTH_WORDS[hem] ?? 'floor-length'} ${SKIRT_SHAPE[k.skirt] ?? 'skirt'}`,
    `fabric: ${fabric.replace(/ \(#?[0-9A-F]{6}\)/gi, '')}`,
    view === 'back' ? `back: ${BACK_NAMES[backKey].toLowerCase()}` : '',
  ].filter(Boolean).join('; ');
  const noSlit = k.skirt === 'wrap' ? '' : ' The skirt is closed all the way round with no slit.';
  const angle = view === 'back' ? ' Show her from behind.' : view === 'side' ? ' Show her from the side.' : '';
  return `Dress the woman in the first image in the exact outfit shown in the second image, which is a flat drawing of a Nigerian owambe outfit. ` +
    `Outfit: ${gown}.${noSlit} Copy the outfit's silhouette, length, sleeves and fabric pattern exactly from the drawing; render the fabric as real cloth. ` +
    `Keep her face, hair, skin tone, body shape and pose unchanged.${angle} Realistic full-body fashion photo, plain light studio background.`;
};
