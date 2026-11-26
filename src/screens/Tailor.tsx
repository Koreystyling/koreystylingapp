import { motion } from 'framer-motion';
import Figure from '../components/Figure';
import { BrandMark } from '../components/ui';
import { MEASURES } from '../lib/data';
import type { View } from '../lib/data';
import { figureProps, picById, tailorSpec } from '../lib/look';
import { decodeShare } from '../lib/share';
import { useStore } from '../lib/store';
import { useBp } from '../lib/hooks';
import type { Brand, Look } from '../lib/types';

/** Tailor card. Opened from the builder (#/tailor/<id>) or from a share link (#/t/<payload>), no login. */
export default function Tailor({ lookId, payload }: { lookId?: string; payload?: string }) {
  const store = useStore();
  const bp = useBp();
  const phone = bp === 'phone';
  let look: Look | undefined, brand: Pick<Brand, 'name' | 'main' | 'accent' | 'whatsapp' | 'instagram'> & { logo?: string | null } = store.brand;
  const shared = Boolean(payload);
  if (payload) { const p = decodeShare(payload); if (p) { look = p.look; brand = p.brand; } }
  else if (lookId) look = store.getLook(lookId);

  if (!look) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1 className="h">This look could not be opened</h1>
      <p className="muted">The link may be cut short. Ask for it to be sent again.</p>
      <a href="#/" className="stk btn">Go to korey</a>
    </div>
  );

  const views: [View, string][] = [['front', 'Front'], ['back', 'Back'], ['side', 'Side']];
  const needed = look.neededBy ? new Date(look.neededBy + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : null;
  const srcIds = Array.from(new Set([look.mix.Top, look.mix.Sleeves, look.mix.Skirt]));
  const wa = brand.whatsapp ? `https://wa.me/${brand.whatsapp.replace(/[^0-9]/g, '')}` : null;
  const figH = phone ? 300 : bp === 'tablet' ? 380 : 470;

  return (
    <div style={{ minHeight: '100dvh', background: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: brand.main, color: '#FFFFFF', padding: phone ? '0 16px' : '0 40px', minHeight: phone ? 68 : 80, display: 'flex', alignItems: 'center', gap: 14 }}>
        <BrandMark name={brand.name} logo={'logo' in brand ? brand.logo : null} main={brand.main} accent={brand.accent} size={phone ? 40 : 48} />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span className="h" style={{ fontSize: phone ? 17 : 20 }}>{brand.name}</span>
          <span style={{ fontSize: 13, opacity: 0.85 }}>Tailor card · no login needed</span>
        </div>
        <span style={{ flex: 1 }} />
        {!shared && <a href={`#/build/${look.id}`} className="no-print" style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 14, marginRight: 8 }}>Edit look</a>}
        <button onClick={() => window.print()} className="no-print" style={{ minHeight: 44, padding: '0 16px', border: 0, borderRadius: 12, background: '#FFFFFF', color: brand.main, fontWeight: 700 }}>{phone ? 'Print' : 'Print or save as PDF'}</button>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: bp === 'laptop' ? 'row' : 'column', gap: 32, padding: phone ? '20px 16px' : '28px 40px', maxWidth: 1500, width: '100%', margin: '0 auto' }}>
        <section aria-label="The look" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h1 className="h" style={{ margin: 0, fontSize: phone ? 24 : 30 }}>{look.clientName}</h1>
              <p style={{ margin: '4px 0 0', fontSize: 15, color: 'var(--muted)' }}>{look.name}{needed ? ` · needed by ${needed}` : ''}</p>
            </div>
            <span style={{ fontSize: 13, color: '#4F4252', background: '#F6F1F6', borderRadius: 8, padding: '6px 12px' }}>Preview for style. Sew from the measurements.</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: phone ? 8 : 14 }}>
            {views.map(([v, n], i) => (
              <motion.figure key={v} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                style={{ margin: 0, borderRadius: 20, background: 'radial-gradient(ellipse at 50% 38%,#F4F0F2 0%,#E2DADE 60%,#D3CACF 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '12px 0 14px', gap: 8, overflow: 'hidden' }}>
                {look!.tryon?.[v] ? <img src={look!.tryon[v]} alt={`${n} view`} style={{ height: figH, objectFit: 'contain' }} />
                  : <Figure {...figureProps(look!, v)} garmentOnly w={Math.round(figH * 200 / 520)} h={figH} />}
                <figcaption style={{ fontWeight: 700, fontSize: 14 }}>{n}</figcaption>
              </motion.figure>
            ))}
          </div>
        </section>

        <aside style={{ flex: 'none', width: bp === 'laptop' ? 460 : '100%', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 className="h" style={{ margin: 0, fontSize: 20 }}>Measurements ({look.unit})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', columnGap: 24, borderTop: '1px solid var(--line)' }}>
              {MEASURES.map(([k]) => {
                const v = look!.meas[k];
                const shown = v == null || Number.isNaN(v) ? 'Missing' : look!.unit === 'cm' ? String(v) : String(Math.round(v / 2.54 * 2) / 2);
                return <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--line)', fontSize: 15 }}><span className="muted">{k}</span><span style={{ fontWeight: 700, color: shown === 'Missing' ? '#A3144C' : undefined }}>{shown}</span></div>;
              })}
            </div>
          </section>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 className="h" style={{ margin: 0, fontSize: 20 }}>What to sew</h2>
            {tailorSpec(look).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 16, fontSize: 15, lineHeight: 1.35 }}><span className="muted" style={{ width: 90, flex: 'none' }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
            ))}
          </section>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 className="h" style={{ margin: 0, fontSize: 20 }}>Source pictures</h2>
            <div className="row" style={{ gap: 10 }}>
              {srcIds.map((id) => {
                const p = picById(look!, id);
                const used = (['Top', 'Sleeves', 'Skirt'] as const).filter((k) => look!.mix[k] === id).map((k) => k.toLowerCase()).join(', ');
                return (
                  <span key={id} style={{ width: 84, height: 108, borderRadius: 12, background: p.bg, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    {p.front ? <img src={p.front} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Figure view="front" garmentOnly skin="#7A4A30" topPart={{ c: p.cloth, d: p.dot, f: 'lace' }} top={p.top} sleeve={p.sleeve} skirt={p.skirt} geleStyle="none" bagStyle="none" jewel="none" w={38} h={100} />}
                    <span style={{ position: 'absolute', top: 4, left: 4, right: 4, background: '#FFFFFF', borderRadius: 6, padding: '0 6px', fontSize: 11, fontWeight: 600 }}>{id} · {used}</span>
                  </span>
                );
              })}
              {look.backPhoto && <img src={look.backPhoto} alt="Back picture" style={{ width: 84, height: 108, objectFit: 'cover', borderRadius: 12 }} />}
            </div>
          </section>
          {shared && wa && <a href={wa} target="_blank" rel="noreferrer" className="no-print" style={{ minHeight: 48, borderRadius: 12, background: brand.main, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, textDecoration: 'none' }}>Chat with {brand.name} on WhatsApp</a>}
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Made with korey</span>
        </aside>
      </main>
    </div>
  );
}
