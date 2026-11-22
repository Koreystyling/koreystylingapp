type D = { a?: string; shade?: string; b?: string; lines?: string; shine?: string; dash?: string; lw?: number; lc?: string; lo?: string };

const lib = (c: string): Record<string, Record<string, D>> => ({
  gele: {
    fan: { a: 'M14 58 Q4 18 40 8 Q72 10 70 40 Q76 34 78 44 Q70 56 52 52 Q34 50 14 58 Z', shade: 'M14 58 Q30 50 52 52 Q40 58 14 58 Z', b: 'M18 66 Q16 52 40 50 Q62 52 60 66 Q50 60 40 60 Q28 60 18 66 Z', lines: 'M38 54 L22 20 M38 54 L36 12 M38 54 L50 12 M38 54 L62 20 M38 54 L70 36', shine: 'M26 18 Q40 10 56 14' },
    rose: { a: 'M14 66 Q6 30 38 22 Q68 26 62 62 Q50 54 38 54 Q24 54 14 66 Z', b: 'M44 34 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0', lines: 'M44 34 m-11 0 a11 11 0 1 1 22 0 M44 34 m-6 0 a6 6 0 1 0 12 0 M44 34 m-2 0 a2 2 0 1 1 4 0', shine: 'M34 24 Q44 20 52 24' },
    turban: { a: 'M14 66 Q6 16 40 12 Q74 16 66 66 Q54 54 40 56 Q26 54 14 66 Z', shade: 'M14 66 Q26 54 40 56 Q30 62 14 66 Z', b: 'M32 26 Q40 14 48 26 Q40 38 32 26 Z', lines: 'M18 48 Q40 20 62 48 M16 36 Q40 54 64 34 M24 20 Q40 40 58 20', shine: 'M26 18 Q36 12 48 14' },
    halfmoon: { a: 'M8 62 Q2 20 40 12 Q76 10 78 46 Q66 38 54 46 Q40 42 30 52 Q18 56 8 62 Z', b: 'M14 70 Q12 56 34 54 Q54 56 52 70 Q42 64 34 64 Q22 64 14 70 Z', lines: 'M28 50 Q40 24 70 30 M24 42 Q34 20 58 18 M34 52 Q50 34 76 42', shine: 'M32 16 Q52 12 68 22' },
  },
  shoe: {
    pump: { a: 'M6 62 Q6 54 18 53 Q34 51 46 44 Q56 37 63 27 L70 29 Q71 44 69 55 L67 62 Z', shade: 'M6 62 L67 62 L66 58 Q40 60 6 58 Z', b: 'M62 58 L68 58 L71 76 L66 76 Z', lines: 'M20 53 Q30 46 44 46', shine: 'M14 56 Q30 54 44 48' },
    sandal: { a: 'M6 64 L70 58 L70 62 L6 68 Z', b: 'M62 60 L67 60 L70 76 L66 76 Z', lines: 'M12 64 Q18 50 30 50 M24 63 Q30 48 40 46 M52 60 Q60 40 68 34 Q72 46 68 58 M40 52 Q52 50 60 46' },
    block: { a: 'M6 60 Q6 52 18 51 Q34 49 46 42 Q56 35 62 26 L70 28 Q72 44 70 54 L68 60 Z', shade: 'M6 60 L68 60 L67 56 Q40 58 6 56 Z', b: 'M56 58 L70 58 L70 76 L57 76 Z', lines: 'M20 51 Q30 44 44 44', shine: 'M14 54 Q30 52 44 46' },
  },
  bag: {
    box: { a: 'M12 26 L68 26 Q72 26 72 30 L72 58 Q72 62 68 62 L12 62 Q8 62 8 58 L8 30 Q8 26 12 26 Z', shade: 'M8 46 L72 46 L72 58 Q72 62 68 62 L12 62 Q8 62 8 58 Z', b: 'M36 32 L44 32 L44 42 L36 42 Z', lines: 'M8 38 L72 38 M14 28 L66 28', shine: 'M14 30 L40 30' },
    pouch: { a: 'M18 22 Q40 14 62 22 Q76 44 66 64 Q40 74 14 64 Q4 44 18 22 Z', shade: 'M8 50 Q40 60 72 50 Q70 60 66 64 Q40 74 14 64 Q10 58 8 50 Z', lines: 'M14 34 Q40 42 66 34 M10 44 Q40 52 70 44 M10 54 Q40 62 70 54 M24 22 Q40 30 56 22', shine: 'M38 18 Q34 6 40 4 Q46 6 42 18', dash: '.1 4.4', lw: 2.6, lc: '#FFFFFF', lo: '.85' },
    envelope: { a: 'M6 24 L74 24 L74 60 L6 60 Z', shade: 'M6 44 L74 44 L74 60 L6 60 Z', b: 'M6 24 L40 46 L74 24 Z', lines: 'M6 24 L40 46 L74 24', shine: 'M38 44 a3 3 0 1 0 4 0' },
  },
  jewel: {
    coral: { b: 'M14 62 a3.5 3.5 0 1 0 7 0 a3.5 3.5 0 1 0 -7 0 M59 62 a3.5 3.5 0 1 0 7 0 a3.5 3.5 0 1 0 -7 0', lines: 'M14 16 Q40 46 66 16 M10 18 Q40 56 70 18 M7 22 Q40 66 73 22', dash: '.1 5', lw: 4.6, lc: c, lo: '1' },
    gold: { a: 'M40 40 Q34 48 40 58 Q46 48 40 40 Z', b: 'M10 62 a4 6 0 1 0 8 0 a4 6 0 1 0 -8 0 M62 62 a4 6 0 1 0 8 0 a4 6 0 1 0 -8 0', lines: 'M16 18 Q40 44 64 18', shine: 'M38 46 L39 52', dash: 'none', lw: 4.4, lc: c, lo: '1' },
    pearl: { a: 'M37 52 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0', b: 'M12 62 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 M12.5 69 a2.5 3.2 0 1 0 5 0 a2.5 3.2 0 1 0 -5 0 M62 62 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 M62.5 69 a2.5 3.2 0 1 0 5 0 a2.5 3.2 0 1 0 -5 0', lines: 'M12 16 Q40 50 68 16', dash: '.1 5', lw: 4.6, lc: c, lo: '1' },
  },
});

export default function Acc({ kind, look, color, s = 72, img }: { kind: string; look: string; color: string; s?: number; img?: string | null }) {
  if (img) return <img src={img} alt="" width={s} height={s} style={{ objectFit: 'contain', width: s, height: s, borderRadius: 8 }} />;
  const d = lib(color)[kind]?.[look] ?? {};
  return (
    <svg width={s} height={s} viewBox="0 0 80 80" aria-hidden="true">
      <path d={d.a || ''} fill={color} stroke="#2B0F2F" strokeOpacity=".25" strokeWidth=".8" />
      <path d={d.shade || ''} fill="#000" opacity=".14" />
      <path d={d.b || ''} fill={kind === 'bag' ? '#F7DE9A' : color} />
      <path d={d.lines || ''} fill="none" stroke={d.lc || '#2B0F2F'} strokeOpacity={d.lo || '.3'} strokeWidth={d.lw || 1.3} strokeDasharray={d.dash || 'none'} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d.shine || ''} fill="none" stroke="#FFFFFF" strokeOpacity=".5" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
