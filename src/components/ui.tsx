import { useRef } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { PALETTE } from '../lib/data';
import { fileToDataUrl } from '../lib/media';
import { toast } from '../lib/hooks';

export const Icon = {
  camera: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>,
  upload: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>,
  left: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>,
  spin: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" /></svg>,
  sparkle: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" /></svg>,
  x: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>,
};

/** A button that opens the file picker (and the camera on phones). */
export function Upload({ onFile, children, className = 'stk', style, capture, max, label }: {
  onFile: (dataUrl: string) => void; children: ReactNode; className?: string; style?: CSSProperties; capture?: boolean; max?: number; label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <motion.button type="button" whileTap={{ scale: 0.97 }} className={className} style={style as never} aria-label={label} onClick={() => ref.current?.click()}>{children}</motion.button>
      <input ref={ref} type="file" accept="image/*" {...(capture ? { capture: 'environment' } : {})} hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try { onFile(await fileToDataUrl(file, max)); } catch { toast('That file is not an image we can read.'); }
        }} />
    </>
  );
}

export function Swatches({ value, onPick, label }: { value: string; onPick: (hex: string) => void; label: string }) {
  const v = value.toLowerCase();
  return (
    <div className="row" role="group" aria-label={label}>
      {PALETTE.map(([name, hex]) => (
        <motion.button key={hex} type="button" whileTap={{ scale: 0.88 }} className="swatch" aria-label={name} aria-pressed={v === hex.toLowerCase()} style={{ background: hex }} onClick={() => onPick(hex)} />
      ))}
      <label className="stk" style={{ minHeight: 38, padding: '0 6px 0 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
        Custom
        <input type="color" className="color-in" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onPick(e.target.value)} aria-label={`Custom ${label.toLowerCase()}`} />
      </label>
    </div>
  );
}

export function Toggle({ on, onClick, label, color }: { on: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className="stk" style={{ minHeight: 44, padding: '0 14px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span>{label}</span>
      <span style={{ width: 42, height: 24, borderRadius: 12, background: on ? color : '#E7E2E8', border: '1px solid #DED8E1', position: 'relative', transition: 'background .2s' }}>
        <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 32 }} style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#FFFFFF', border: '1px solid #DED8E1' }} />
      </span>
    </button>
  );
}

export function BrandMark({ name, logo, main, accent, size = 36 }: { name: string; logo?: string | null; main: string; accent: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'K';
  if (logo) return <img src={logo} alt={`${name} logo`} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', background: '#FFFFFF', flex: 'none' }} />;
  return <span aria-hidden="true" className="h" style={{ width: size, height: size, borderRadius: '50%', background: accent, color: main, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, flex: 'none' }}>{initials}</span>;
}
