import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Figure from './Figure';
import type { FigureProps } from './Figure';
import type { View } from '../lib/data';

// Spin-around view. GSAP drives an angle (0-360). The angle picks the drawn view
// (front, side, back, other side) and squashes it near the turn for a smooth spin.
// Drag sideways to turn it by hand. When try-on images exist, they spin instead.

const viewAt = (a: number): { view: View; flip: boolean; sx: number } => {
  const t = ((a % 360) + 360) % 360;
  const sector = Math.round(t / 90) % 4;
  const off = Math.abs(t - sector * 90 - (sector === 0 && t > 315 ? 360 : 0));
  const sx = 1 - 0.5 * Math.pow(Math.min(off, 45) / 45, 1.6);
  return [{ view: 'front' as View, flip: false }, { view: 'side' as View, flip: false }, { view: 'back' as View, flip: false }, { view: 'side' as View, flip: true }].map((v) => ({ ...v, sx }))[sector];
};

export default function Turntable({ fig, w, h, playing, images }: { fig: FigureProps; w: number; h: number; playing: boolean; images?: { front?: string; back?: string; side?: string } | null }) {
  const [angle, setAngle] = useState(0);
  const st = useRef({ a: 0 });
  const tween = useRef<gsap.core.Tween | null>(null);
  const drag = useRef<{ x: number; a: number } | null>(null);

  useEffect(() => {
    tween.current?.kill();
    if (playing) {
      tween.current = gsap.to(st.current, { a: st.current.a + 360, duration: 6, ease: 'none', repeat: -1, onUpdate: () => setAngle(st.current.a) });
    } else {
      const target = Math.round(st.current.a / 90) * 90;
      tween.current = gsap.to(st.current, { a: target, duration: 0.5, ease: 'power2.out', onUpdate: () => setAngle(st.current.a) });
    }
    return () => { tween.current?.kill(); };
  }, [playing]);

  const v = viewAt(angle);
  const img = images?.[v.view];
  return (
    <div
      style={{ width: w, height: h, touchAction: 'pan-y', cursor: 'grab', position: 'relative' }}
      onPointerDown={(e) => { tween.current?.pause(); drag.current = { x: e.clientX, a: st.current.a }; (e.target as Element).setPointerCapture?.(e.pointerId); }}
      onPointerMove={(e) => { if (!drag.current) return; st.current.a = drag.current.a - (e.clientX - drag.current.x) * 0.8; setAngle(st.current.a); }}
      onPointerUp={() => {
        drag.current = null;
        if (playing) { tween.current?.kill(); tween.current = gsap.to(st.current, { a: st.current.a + 360, duration: 6, ease: 'none', repeat: -1, onUpdate: () => setAngle(st.current.a) }); }
        else { const target = Math.round(st.current.a / 90) * 90; gsap.to(st.current, { a: target, duration: 0.4, ease: 'power2.out', onUpdate: () => setAngle(st.current.a) }); }
      }}
      aria-label="Spin the model. Drag sideways to turn."
    >
      <div style={{ transform: `scaleX(${v.sx * (v.flip && img ? -1 : 1)})`, transformOrigin: '50% 50%', width: w, height: h, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        {img ? <img src={img} alt={`Realistic preview, ${v.view}`} style={{ height: h, width: 'auto', objectFit: 'contain' }} />
          : <Figure {...fig} view={v.view} flip={v.flip} w={w} h={h} />}
      </div>
    </div>
  );
}
