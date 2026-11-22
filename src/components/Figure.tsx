import { useId } from 'react';
import type { BackKind, FabKind, SkirtKind, SleeveKind, TopKind, View } from '../lib/data';

export interface FabPart { c: string; d: string; f: FabKind; img?: string }

export interface FigureProps {
  view?: View;
  flip?: boolean;
  skin?: string;
  width?: number;
  topPart?: FabPart; sleevePart?: FabPart; skirtPart?: FabPart;
  top?: TopKind; sleeve?: SleeveKind; skirt?: SkirtKind; backDesign?: BackKind;
  join?: number; hem?: number; peplum?: boolean;
  gele?: string; geleStyle?: string; geleImg?: string | null;
  shoe?: string; shoeStyle?: string;
  bagStyle?: string; bagColor?: string; bagImg?: string | null;
  jewel?: string; jewelColor?: string;
  w?: number; h?: number;
  className?: string;
  garmentOnly?: boolean; // only the clothes, for the try-on model
}

const K: [number, number][] = [[104, 10], [112, 38], [130, 35], [150, 31], [175, 26], [200, 21], [225, 28], [250, 33], [300, 31], [380, 23], [440, 18], [500, 14]];
const hw = (y: number) => {
  if (y <= K[0][0]) return K[0][1];
  for (let i = 1; i < K.length; i++) {
    if (y <= K[i][0]) { const a = K[i - 1], b = K[i]; return a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]); }
  }
  return K[K.length - 1][1];
};
const f = (n: number) => Math.round(n * 10) / 10;

const TOPS: Record<TopKind, { y0: number; ease: (y: number) => number; neck: (l: number, r: number) => string }> = {
  corset: { y0: 146, ease: () => 1.5, neck: (l, r) => `M${l} 146 Q86 134 100 147 Q114 134 ${r} 146` },
  square: { y0: 140, ease: () => 1.5, neck: (l, r) => `M${l} 140 L${r} 140` },
  offshoulder: { y0: 126, ease: (y) => (y < 150 ? 6 - (y - 126) * 0.19 : 1.5), neck: (l, r) => `M${l} 126 Q100 118 ${r} 126` },
  vneck: { y0: 113, ease: () => 1.8, neck: (l, r) => `M${l} 113 L100 166 L${r} 113` },
  buba: { y0: 112, ease: () => 9, neck: (l, r) => `M${l} 112 L88 106 Q100 118 112 106 L${r} 112` },
};

const SL: Record<SleeveKind, [string, string]> = {
  none: ['', ''],
  cap: ['M58 116 Q63 108 77 114 L75 137 Q64 141 56 134 Z', 'M60 130 Q66 133 74 131'],
  puff: ['M54 128 Q42 102 66 102 Q86 104 79 122 L76 141 Q61 148 54 128 Z', 'M58 110 L64 136 M66 106 L69 139 M74 108 L74 138'],
  bell: ['M58 116 Q66 110 76 116 L70 198 Q76 228 66 238 Q48 244 34 232 Q46 214 53 198 Z', 'M54 204 Q44 222 40 232 M64 204 Q60 226 56 238'],
  long: ['M58 116 Q66 110 76 116 L71 170 L61 294 L48 294 L53 170 Z', 'M50 286 L61 286'],
  bishop: ['M58 116 Q68 110 77 116 L75 172 Q76 258 63 284 L49 287 Q34 250 49 172 Z M48 284 L63 282 L62 294 L48 295 Z', 'M54 180 Q50 240 52 282 M66 180 Q68 240 60 282'],
};

const GELE: Record<string, [string, string, string, string]> = {
  fan: ['M78 54 Q64 8 104 2 Q146 6 140 40 Q152 30 160 42 Q148 58 120 50 Q100 40 78 54 Z', '', 'M100 50 L86 12 M100 50 L100 6 M100 50 L116 8 M100 50 L130 16 M100 50 L140 30 M100 50 L150 42', 'M90 14 Q104 6 122 10'],
  rose: ['M80 64 Q72 34 100 28 Q128 32 122 60 Z', 'M122 46 m-15 0 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0', 'M122 46 m-10 0 a10 10 0 1 1 20 0 M122 46 m-5 0 a5 5 0 1 0 10 0 M84 46 Q100 38 114 42', 'M112 36 Q120 32 128 36'],
  turban: ['M79 66 Q72 24 100 20 Q128 24 121 66 Q111 56 100 58 Q89 56 79 66 Z', 'M93 34 Q100 24 107 34 Q100 44 93 34 Z', 'M82 52 Q100 30 118 52 M80 42 Q100 56 120 40 M86 30 Q100 46 116 28', 'M88 28 Q96 22 106 24'],
  halfmoon: ['M78 62 Q68 18 106 12 Q152 10 164 48 Q144 40 124 50 Q108 44 98 54 Q88 56 78 62 Z', '', 'M96 50 Q110 24 150 30 M100 44 Q120 22 158 42 M92 40 Q104 18 130 18', 'M104 18 Q130 14 150 24'],
};

const SHOES: Record<string, [string, string]> = {
  pump: ['M84 503 Q86 497 96 499 L97 506 Q90 509 83 507 Z M95 505 L96 511 L94 511 Z', ''],
  sandal: ['M84 506 L97 506 L97 508 L84 508 Z M95 507 L96 512 L94 512 Z', 'M86 500 L95 505 M93 499 L87 505'],
  block: ['M83 503 Q86 497 96 499 L97 506 L84 508 Z M93 506 L97 506 L97 512 L93 512 Z', ''],
  none: ['M85 502 Q89 498 96 500 L96 506 L85 506 Z', ''],
};

const BAGS: Record<string, [string, string, string]> = {
  box: ['M142 290 L170 290 Q172 290 172 292 L172 308 Q172 310 170 310 L142 310 Q140 310 140 308 L140 292 Q140 290 142 290 Z', 'M140 297 L172 297 M156 294 L156 300', ''],
  pouch: ['M144 288 Q156 284 168 288 Q176 300 170 312 Q156 318 142 312 Q136 300 144 288 Z', 'M146 290 Q156 296 166 290 M156 284 Q160 276 164 284', 'M144 298 Q156 302 170 298 M142 305 Q156 309 171 305'],
  envelope: ['M139 292 L173 292 L173 310 L139 310 Z', 'M139 292 L156 303 L173 292', ''],
};

const JEWEL: Record<string, [string, string, string, number, string, string]> = {
  coral: ['M87 105 Q100 121 113 105 M85 107 Q100 127 115 107 M84 110 Q100 134 116 110', '', '#D2512E', 3.4, '.1 4', 'M81 77 a2.4 2.4 0 1 0 4.8 0 a2.4 2.4 0 1 0 -4.8 0 M114.2 77 a2.4 2.4 0 1 0 4.8 0 a2.4 2.4 0 1 0 -4.8 0'],
  gold: ['M88 101 Q100 110 112 101', 'M100 108 Q96 114 100 120 Q104 114 100 108 Z', '#E9B23A', 3, 'none', 'M82 76 a2 3.5 0 1 0 4 0 a2 3.5 0 1 0 -4 0 M114 76 a2 3.5 0 1 0 4 0 a2 3.5 0 1 0 -4 0'],
  pearl: ['M86 105 Q100 124 114 105', 'M98 118 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0', '#F4F0E8', 3.2, '.1 4.2', 'M82 78 a1.8 1.8 0 1 0 3.6 0 a1.8 1.8 0 1 0 -3.6 0 M82.5 82 a1.4 2 0 1 0 2.8 0 a1.4 2 0 1 0 -2.8 0 M114.4 78 a1.8 1.8 0 1 0 3.6 0 a1.8 1.8 0 1 0 -3.6 0 M114.7 82 a1.4 2 0 1 0 2.8 0 a1.4 2 0 1 0 -2.8 0'],
};

// Pattern opacities per fabric: [dot, small dot, lace curl, stripe, ring]
const FK: Record<FabKind, number[]> = { lace: [0.9, 0.55, 0.5, 0, 0], plain: [0, 0, 0, 0, 0], stripe: [0, 0, 0, 0.8, 0], ankara: [0.9, 0, 0, 0, 0.9], sequin: [1, 1, 0, 0, 0], photo: [0, 0, 0, 0, 0] };

function Fabric({ id, p }: { id: string; p: FabPart }) {
  if (p.f === 'photo' && p.img) {
    return (
      <pattern id={id} width="56" height="56" patternUnits="userSpaceOnUse">
        <rect width="56" height="56" fill={p.c} />
        <image href={p.img} width="56" height="56" preserveAspectRatio="xMidYMid slice" />
      </pattern>
    );
  }
  const v = FK[p.f] ?? FK.lace;
  return (
    <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill={p.c} />
      <circle cx="5" cy="5" r="1.3" fill={p.d} opacity={v[0]} />
      <circle cx="0" cy="0" r=".8" fill={p.d} opacity={v[1]} />
      <circle cx="10" cy="10" r=".8" fill={p.d} opacity={v[1]} />
      <path d="M0 5 Q2.5 2 5 5 T10 5" fill="none" stroke={p.d} strokeWidth=".35" opacity={v[2]} />
      <path d="M0 2 L10 2 M0 7 L10 7" stroke={p.d} strokeWidth="1.4" opacity={v[3]} />
      <circle cx="5" cy="5" r="3.4" fill="none" stroke={p.d} strokeWidth="1.1" opacity={v[4]} />
    </pattern>
  );
}

const DEF_PART: FabPart = { c: '#0E5A46', d: '#F2C25B', f: 'lace' };

export default function Figure(props: FigureProps) {
  const uid = 'k' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const view = props.view ?? 'front';
  const back = view === 'back';
  const go = Boolean(props.garmentOnly);
  const top = props.top ?? 'square';
  const sleeve = props.sleeve ?? 'cap';
  const skirt = props.skirt ?? 'mermaid';
  const join = Math.max(160, Math.min(280, props.join ?? 200));
  const hem = Math.max(join + 60, Math.min(500, props.hem ?? 500));
  const skin = props.skin ?? '#8A5A3C';
  const tP = props.topPart ?? DEF_PART;
  const sP = props.sleevePart ?? tP;
  const kP = props.skirtPart ?? tP;
  const dot = tP.f === 'photo' ? '#FFFFFF' : tP.d;
  const kDot = kP.f === 'photo' ? '#FFFFFF' : kP.d;
  const sDot = sP.f === 'photo' ? '#FFFFFF' : sP.d;

  // ---- top
  const T = TOPS[top] ?? TOPS.square;
  const side = (y0: number, y1: number, ease: (y: number) => number, sign: number) => {
    const pts: string[] = [];
    for (let y = y0; y < y1; y += 6) pts.push(`${f(100 + sign * (hw(y) + ease(y)))} ${y}`);
    pts.push(`${f(100 + sign * (hw(y1) + ease(y1)))} ${y1}`);
    return pts;
  };
  const L0 = f(100 - (hw(T.y0) + T.ease(T.y0))), R0 = f(100 + (hw(T.y0) + T.ease(T.y0)));
  const rightSide = side(T.y0, join, T.ease, 1);
  const leftSide = side(T.y0, join, T.ease, -1).reverse();
  const jl = f(100 - (hw(join) + T.ease(join))), jr = f(100 + (hw(join) + T.ease(join)));
  const neckLine = back ? `M${L0} ${T.y0} L${R0} ${T.y0}` : T.neck(L0, R0);
  const topD = `${neckLine} L${rightSide.join(' L')} Q100 ${join + 4} ${leftSide.join(' L')} Z`;
  let topLines = '';
  if (top === 'corset' && !back) {
    const mid = (T.y0 + join) / 2;
    [-24, -12, 12, 24].forEach((dx) => { topLines += `M${100 + dx} ${T.y0 + 8} L${100 + dx * 0.8} ${join - 2} `; });
    [-1, -0.5, 0, 0.5, 1].forEach((a) => { topLines += `M100 ${mid} L${f(100 + a * 26)} ${f(mid - 26 + Math.abs(a) * 8)} M100 ${mid} L${f(100 + a * 22)} ${f(mid + 22)} `; });
  } else if (top === 'buba' && !back) {
    topLines = `M100 116 L100 ${join - 4} M86 ${join - 10} Q100 ${join - 4} 114 ${join - 10}`;
  } else if (!back) {
    topLines = `M100 ${T.y0 + 10} L100 ${join - 4}`;
  }
  const strapD = top === 'square' ? 'M71 141 L75 111 L86 111 L83 141 Z' : '';

  // ---- peplum
  const ph = hw(join);
  const peplumD = `M${f(100 - ph - 2)} ${join} L${f(100 - ph - 16)} ${join + 28} Q100 ${join + 36} ${f(100 + ph + 16)} ${join + 28} L${f(100 + ph + 2)} ${join} Z`;

  // ---- skirt
  const sides2 = (y0: number, y1: number, ease: (y: number) => number) => ({ r: side(y0, y1, ease, 1), l: side(y0, y1, ease, -1).reverse() });
  let skirtD = '', skirtLines = '';
  const hj = hw(join) + 2;
  if (skirt === 'straight') {
    const s = sides2(join, hem, () => 2.5);
    skirtD = `M${f(100 - hj)} ${join} L${f(100 + hj)} ${join} L${s.r.join(' L')} Q100 ${hem + 4} ${s.l.join(' L')} Z`;
    skirtLines = `M100 ${hem - 40} L100 ${hem}`;
  } else if (skirt === 'mermaid') {
    const fl = Math.max(join + 60, Math.min(400, hem - 110));
    const s = sides2(join, fl, () => 1.8);
    const hh = f(hw(fl) + (hem - fl) * 0.38 + 8);
    skirtD = `M${f(100 - hj)} ${join} L${s.r.join(' L')} Q${f(100 + hw(fl) + 4)} ${f(fl + (hem - fl) * 0.55)} ${f(100 + hh)} ${hem} Q100 ${hem + 6} ${f(100 - hh)} ${hem} Q${f(100 - hw(fl) - 4)} ${f(fl + (hem - fl) * 0.55)} ${s.l.join(' L')} Z`;
    skirtLines = `M${f(100 - hw(fl))} ${fl} Q100 ${fl + 8} ${f(100 + hw(fl))} ${fl} M${f(100 - hw(fl) * 0.4)} ${fl + 4} L${f(100 - hh * 0.45)} ${hem} M${f(100 + hw(fl) * 0.4)} ${fl + 4} L${f(100 + hh * 0.45)} ${hem}`;
  } else if (skirt === 'aline') {
    const hh = f(hj + (hem - join) * 0.24 + 4);
    skirtD = `M${f(100 - hj)} ${join} L${f(100 + hj)} ${join} Q${f(100 + hj + 12)} ${f((join + hem) / 2)} ${f(100 + hh)} ${hem} Q100 ${hem + 6} ${f(100 - hh)} ${hem} Q${f(100 - hj - 12)} ${f((join + hem) / 2)} ${f(100 - hj)} ${join} Z`;
    skirtLines = `M92 ${join + 10} L${f(100 - hh * 0.4)} ${hem} M108 ${join + 10} L${f(100 + hh * 0.4)} ${hem}`;
  } else if (skirt === 'ball') {
    const hh = f(Math.min(76, hj + (hem - join) * 0.3 + 18));
    const mid = f(join + (hem - join) * 0.42);
    skirtD = `M${f(100 - hj)} ${join} L${f(100 + hj)} ${join} Q${f(100 + hh + 18)} ${mid} ${f(100 + hh)} ${hem} Q100 ${hem + 8} ${f(100 - hh)} ${hem} Q${f(100 - hh - 18)} ${mid} ${f(100 - hj)} ${join} Z`;
    skirtLines = `M90 ${join + 6} Q78 ${mid} ${f(100 - hh * 0.55)} ${hem} M100 ${join + 6} L100 ${hem + 4} M110 ${join + 6} Q122 ${mid} ${f(100 + hh * 0.55)} ${hem}`;
  } else {
    const s = sides2(join, hem, (y) => 5 + (y - join) * 0.02);
    skirtD = `M${f(100 - hj - 3)} ${join} L${f(100 + hj + 3)} ${join} L${s.r.join(' L')} Q100 ${hem + 4} ${s.l.join(' L')} Z`;
    skirtLines = `M${f(100 + hj)} ${join + 6} Q104 ${f((join + hem) / 2)} ${f(100 - hw(hem) * 0.6)} ${hem}`;
  }
  const legTop = hem - 16;

  const sl: [string, string] = (top === 'offshoulder' && sleeve === 'cap') ? ['M50 122 Q60 114 76 124 L74 140 Q60 144 50 136 Z', ''] : (SL[sleeve] ?? SL.none);

  // ---- back designs
  const bd = props.backDesign ?? 'zip';
  let backSkin = '', backLines = '';
  if (back) {
    if (bd === 'zip') backLines = `M100 ${T.y0 + 2} L100 ${Math.min(hem - 10, join + 50)} M98 ${T.y0 + 4} L102 ${T.y0 + 4} L102 ${T.y0 + 12} L98 ${T.y0 + 12} Z`;
    if (bd === 'lowback') backSkin = `M83 ${T.y0 + 1} Q100 ${T.y0 + 6} 117 ${T.y0 + 1} L113 ${join - 30} Q100 ${join - 4} 87 ${join - 30} Z`;
    if (bd === 'laceup') {
      backSkin = `M86 ${T.y0 + 1} L114 ${T.y0 + 1} L102 ${join - 4} L98 ${join - 4} Z`;
      for (let y = T.y0 + 8; y < join - 10; y += 10) { const t = (y - T.y0) / (join - T.y0); const half = 14 * (1 - t) + 2; backLines += `M${f(100 - half - 1)} ${y} L${f(100 + half + 1)} ${y + 8} M${f(100 + half + 1)} ${y} L${f(100 - half - 1)} ${y + 8} `; }
    }
  }
  const capeD = `M62 114 Q100 104 138 114 Q170 300 ${f(172)} ${hem + 4} Q100 ${hem + 14} ${f(28)} ${hem + 4} Q30 300 62 114 Z`;

  const gs = props.geleStyle ?? 'fan';
  const gg = GELE[gs];
  const geleImg = props.geleImg;
  const ss = props.shoeStyle ?? 'pump';
  const shoeColor = props.shoe ?? '#E0A526';
  const sh = SHOES[ss] ?? SHOES.pump;
  const bagStyle = props.bagStyle ?? 'none';
  const bg = BAGS[bagStyle];
  const bagImg = props.bagImg;
  const jj = JEWEL[props.jewel ?? 'none'];
  const jewelColor = props.jewelColor ?? (jj ? jj[2] : '#000');

  const w = props.w ?? 200, h = props.h ?? 520;
  const wf = props.width ?? 1;
  const bodyXf = wf !== 1 ? `translate(100 0) scale(${wf} 1) translate(-100 0)` : undefined;
  const viewXf = view === 'side' ? (props.flip ? 'translate(162 0) scale(-0.62 1)' : 'translate(38 0) scale(0.62 1)') : undefined;
  const P = { T: uid + 'T', S: uid + 'S', K: uid + 'K', G: uid + 'g' };

  return (
    <svg width={w} height={h} viewBox="0 0 200 520" role="img" aria-label={`Model wearing the look, ${view} view`} className={props.className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <Fabric id={P.T} p={tP} />
        <Fabric id={P.S} p={sP} />
        <Fabric id={P.K} p={kP} />
        <linearGradient id={P.G} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".36" />
          <stop offset=".4" stopColor="#000" stopOpacity="0" />
          <stop offset=".55" stopColor="#fff" stopOpacity=".1" />
          <stop offset="1" stopColor="#000" stopOpacity=".4" />
        </linearGradient>
      </defs>
      {!go && <ellipse cx="100" cy="511" rx="64" ry="6" fill="#000" opacity=".13" />}
      <g transform={viewXf}>
        <g transform={bodyXf}>
          {!go && <>
          {hem < 480 && <>
            <path d={`M86 ${legTop} L95 ${legTop} L95 500 L89 500 Z`} fill={skin} />
            <path d={`M105 ${legTop} L114 ${legTop} L111 500 L105 500 Z`} fill={skin} />
          </>}
          <path d={sh[0]} fill={ss === 'none' ? skin : shoeColor} />
          <g transform="translate(200 0) scale(-1 1)"><path d={sh[0]} fill={ss === 'none' ? skin : shoeColor} /></g>
          {ss === 'sandal' && <>
            <path d={sh[1]} fill="none" stroke={shoeColor} strokeWidth="1.4" />
            <g transform="translate(200 0) scale(-1 1)"><path d={sh[1]} fill="none" stroke={shoeColor} strokeWidth="1.4" /></g>
          </>}

          <path d="M66 118 Q56 124 56 152 L53 222 Q50 262 48 292 Q45 306 52 309 Q59 307 59 294 L64 224 L71 162 Z" fill={skin} />
          <path d="M134 118 Q144 124 144 152 L147 222 Q150 262 152 292 Q155 306 148 309 Q141 307 141 294 L136 224 L129 162 Z" fill={skin} />
          <path d="M66 118 Q56 124 56 152 L53 222 Q50 262 48 292 Q45 306 52 309 L54 290 L58 224 Z" fill="#000" opacity=".16" />
          <path d="M134 118 Q144 124 144 152 L147 222 Q150 262 152 292 Q155 306 148 309 L146 290 L142 224 Z" fill="#000" opacity=".16" />

          <path d="M90 88 L110 88 L112 106 Q130 109 138 118 L136 146 L64 146 L62 118 Q70 109 88 106 Z" fill={skin} />
          <path d="M90 92 L110 92 L111 104 Q100 110 89 104 Z" fill="#000" opacity=".14" />
          </>}

          <path d={skirtD} fill={`url(#${P.K})`} />
          <path d={skirtD} fill={`url(#${P.G})`} />
          <path d={skirtLines} fill="none" stroke={kDot} strokeWidth="1" opacity=".55" />
          {skirt === 'wrap' && !back && <circle cx="122" cy={join + 8} r="7" fill={`url(#${P.K})`} stroke={kDot} strokeWidth=".8" />}

          <path d={topD} fill={`url(#${P.T})`} />
          <path d={topD} fill={`url(#${P.G})`} />
          <path d={topLines} fill="none" stroke={dot} strokeWidth=".9" opacity=".6" />
          {strapD && <>
            <path d={strapD} fill={`url(#${P.T})`} />
            <g transform="translate(200 0) scale(-1 1)"><path d={strapD} fill={`url(#${P.T})`} /></g>
          </>}
          {props.peplum && <>
            <path d={peplumD} fill={`url(#${P.T})`} />
            <path d={peplumD} fill={`url(#${P.G})`} />
          </>}
          <path d={`M${jl} ${join} Q100 ${join + 4} ${jr} ${join}`} fill="none" stroke={dot} strokeWidth="1.8" opacity=".85" />

          {back && (bd === 'lowback' || bd === 'laceup') && <path d={backSkin} fill={go ? '#FFFFFF' : skin} stroke={dot} strokeWidth="1" />}
          <path d={backLines} fill="none" stroke={dot} strokeWidth="1.5" strokeLinecap="round" />
          {back && bd === 'bow' && (
            <g>
              <path d={`M100 ${join} Q78 ${join - 16} 74 ${join} Q78 ${join + 14} 100 ${join} Z M100 ${join} Q122 ${join - 16} 126 ${join} Q122 ${join + 14} 100 ${join} Z`} fill={`url(#${P.T})`} stroke={dot} strokeWidth="1" />
              <path d={`M98 ${join} L88 ${join + 34} L94 ${join + 34} Z M102 ${join} L112 ${join + 34} L106 ${join + 34} Z`} fill={`url(#${P.T})`} stroke={dot} strokeWidth=".8" />
              <circle cx="100" cy={join} r="4" fill={dot} />
            </g>
          )}
          {back && bd === 'cape' && <>
            <path d={capeD} fill={tP.c} opacity=".38" />
            <path d={capeD} fill={`url(#${P.T})`} opacity=".35" />
          </>}

          {sl[0] && <>
            <path d={sl[0]} fill={`url(#${P.S})`} />
            <path d={sl[0]} fill="#000" opacity=".16" />
            <path d={sl[1]} fill="none" stroke={sDot} strokeWidth=".9" opacity=".6" />
            <g transform="translate(200 0) scale(-1 1)">
              <path d={sl[0]} fill={`url(#${P.S})`} />
              <path d={sl[0]} fill="#000" opacity=".22" />
              <path d={sl[1]} fill="none" stroke={sDot} strokeWidth=".9" opacity=".6" />
            </g>
          </>}

          {!go && view !== 'back' && bagImg && <image href={bagImg} x="136" y="280" width="40" height="36" preserveAspectRatio="xMidYMid meet" />}
          {!go && view !== 'back' && !bagImg && bg && (
            <g>
              <path d={bg[0]} fill={props.bagColor ?? '#E0A526'} stroke="#3A2410" strokeOpacity=".35" strokeWidth=".8" />
              <path d={bg[1]} fill="none" stroke="#F7DE9A" strokeWidth="1.1" />
              <path d={bg[2]} fill="none" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="1.6" strokeDasharray=".1 3.2" strokeLinecap="round" />
            </g>
          )}

          {!go && jj && !back && (
            <g>
              <path d={jj[0]} fill="none" stroke={jewelColor} strokeWidth={jj[3]} strokeDasharray={jj[4]} strokeLinecap="round" />
              <path d={jj[1]} fill={jewelColor} />
            </g>
          )}
        </g>

        {!go && <>
        {/* Head stays its natural width */}
        <ellipse cx="100" cy="70" rx="17" ry="21" fill={skin} />
        {back && <ellipse cx="100" cy="70" rx="17" ry="21" fill="#1A0E0A" opacity=".6" />}
        {gs === 'none' && !geleImg && <path d="M83 64 Q82 46 100 45 Q118 46 117 64 Q112 52 100 52 Q88 52 83 64 Z M91 42 a9 8 0 1 0 18 0 a9 8 0 1 0 -18 0" fill="#1A0E0A" />}
        {view === 'front' && (
          <g>
            <path d="M88 63 Q93 60 97 63 M103 63 Q107 60 112 63" fill="none" stroke="#1E1420" strokeWidth="1.3" strokeLinecap="round" />
            <ellipse cx="93" cy="69" rx="3.2" ry="1.7" fill="#1E1420" />
            <ellipse cx="107" cy="69" rx="3.2" ry="1.7" fill="#1E1420" />
            <path d="M89 68 L88 66.5 M97 68 L98 66.5 M103 68 L102 66.5 M111 68 L112 66.5" stroke="#1E1420" strokeWidth=".8" />
            <circle cx="93.8" cy="68.6" r=".6" fill="#FFFFFF" />
            <circle cx="107.8" cy="68.6" r=".6" fill="#FFFFFF" />
            <path d="M100 70 Q98 77 97 79 Q100 81 103 79" fill="none" stroke="#000" strokeOpacity=".25" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M94 85 Q100 82 106 85 Q100 90 94 85 Z" fill="#6E2A36" />
            <ellipse cx="88" cy="78" rx="4" ry="2.4" fill="#C2566A" opacity=".18" />
            <ellipse cx="112" cy="78" rx="4" ry="2.4" fill="#C2566A" opacity=".18" />
          </g>
        )}
        {jj && !back && <path d={jj[5]} fill={jewelColor} />}

        {geleImg ? (
          <image href={geleImg} x="66" y="0" width="80" height="62" preserveAspectRatio="xMidYMax meet" />
        ) : gg && (
          <g>
            <path d={gg[0]} fill={props.gele ?? '#E0A526'} />
            <path d={gg[0]} fill="#000" opacity=".12" />
            <path d="M80 66 Q75 38 100 34 Q125 38 120 66 Q111 54 100 54 Q89 54 80 66 Z" fill={props.gele ?? '#E0A526'} />
            <path d={gg[1]} fill={props.gele ?? '#E0A526'} />
            <path d={gg[2]} fill="none" stroke="#000" strokeOpacity=".24" strokeWidth="1.2" strokeLinecap="round" />
            <path d={gg[3]} fill="none" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth="1" strokeLinecap="round" />
          </g>
        )}
        </>}
      </g>
    </svg>
  );
}
