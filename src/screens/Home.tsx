import { motion } from 'framer-motion';
import Figure from '../components/Figure';
import { Page, TabBar, TopBar } from '../components/Shell';
import { STYLE_CHIPS, WALLS } from '../lib/data';
import { figureProps } from '../lib/look';
import { useStore } from '../lib/store';
import { useBp } from '../lib/hooks';
import type { Look } from '../lib/types';
import { newLook } from '../lib/types';

const walls = [WALLS.pink, WALLS.gold, WALLS.teal, WALLS.lilac, WALLS.blue, WALLS.peach, WALLS.green, WALLS.coral];
const statusColor: Record<Look['status'], string> = { 'Sent to tailor': '#0F6A40', Draft: '#7A5600', Shared: '#1D4AB3' };

const heroLooks = [
  newLook({ model: 1, mix: { Top: 'A', Sleeves: 'A', Skirt: 'D', Back: 'A' }, parts: { Top: { c: '#7A1238', d: '#F3D9E3', f: 'sequin' }, Sleeves: { c: '#7A1238', d: '#F3D9E3', f: 'sequin' }, Skirt: { c: '#7A1238', d: '#F3D9E3', f: 'sequin' }, Lining: { c: '#F3D9E3', d: '#F3D9E3', f: 'plain' } }, acc: { Gele: { on: true, i: 1 }, Shoes: { on: true, i: 2 }, Bag: { on: false, i: 0 }, Jewellery: { on: true, i: 1 } } }),
  newLook({ model: 2, mix: { Top: 'D', Sleeves: 'C', Skirt: 'C', Back: 'A' } }),
  newLook({ model: 0, mix: { Top: 'C', Sleeves: 'C', Skirt: 'A', Back: 'C' }, parts: { Top: { c: '#E8660C', d: '#1F4E8C', f: 'ankara' }, Sleeves: { c: '#E8660C', d: '#1F4E8C', f: 'ankara' }, Skirt: { c: '#E8660C', d: '#1F4E8C', f: 'ankara' }, Lining: { c: '#1F4E8C', d: '#1F4E8C', f: 'plain' } }, acc: { Gele: { on: true, i: 3, color: '#E8660C' }, Shoes: { on: true, i: 0 }, Bag: { on: false, i: 0 }, Jewellery: { on: true, i: 0 } } }),
];

const fmtDate = (d?: string) => {
  if (!d) return null;
  const dt = new Date(d + 'T12:00:00');
  return Number.isNaN(dt.getTime()) ? null : { mon: dt.toLocaleString('en-GB', { month: 'short' }), day: String(dt.getDate()) };
};

export default function Home() {
  const { looks, clients } = useStore();
  const bp = useBp();
  const phone = bp === 'phone', laptop = bp === 'laptop';
  const tileH = phone ? 210 : bp === 'tablet' ? 300 : 290;
  const figH = phone ? 188 : bp === 'tablet' ? 262 : 250;
  const figW = Math.round(figH * 200 / 520);
  const sorted = [...looks].sort((a, b) => b.updatedAt - a.updatedAt);
  const lookCols = phone ? 2 : bp === 'tablet' ? 3 : 5;
  const upcoming = clients.filter((c) => c.date).sort((a, b) => (a.date! < b.date! ? -1 : 1)).slice(0, 4);

  return (
    <Page>
      <TopBar active="looks" />
      <main style={{ flex: 1, padding: phone ? '20px 16px' : bp === 'tablet' ? '28px' : '32px 40px', display: 'flex', gap: 28, maxWidth: 1600, width: '100%', margin: '0 auto' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: phone ? 28 : 36 }}>
          <section style={{ display: 'flex', flexDirection: laptop ? 'row' : 'column', gap: laptop ? 36 : 20, alignItems: laptop ? 'center' : 'stretch' }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
              <span className="lbl" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden="true" style={{ display: 'flex', gap: 3 }}>{['#C2185B', '#C8901A', '#13804D', '#2459D6'].map((c) => <span key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}</span>
                Made for Owambe
              </span>
              <h1 className="h" style={{ margin: 0, fontSize: phone ? 34 : bp === 'tablet' ? 46 : 52, lineHeight: 1.04 }}>See the outfit on them <span className="it" style={{ color: '#C2185B' }}>before</span> the first cut.</h1>
              <p style={{ margin: 0, fontSize: phone ? 15 : 17, lineHeight: 1.5, color: 'var(--muted-2)', maxWidth: 520 }}>Mix parts from any style, drop in the real fabric, add the gele, and send the tailor exact measurements.</p>
              <div className="row" style={{ marginTop: 4, gap: 10 }}>
                <a href="#/build/new" className="stk dark btn">Start a new look</a>
                <a href="#/build/new?step=2" className="stk btn">Upload a style</a>
              </div>
            </motion.div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: phone ? 8 : 12, flex: laptop ? '0 0 470px' : '0 0 auto' }}>
              {heroLooks.map((l, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}
                  style={{ height: tileH, borderRadius: 18, background: [WALLS.pink, WALLS.gold, WALLS.teal][i], display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden', position: 'relative', marginTop: phone ? 0 : [24, 0, 36][i] }}>
                  <span aria-hidden="true" style={{ position: 'absolute', bottom: 4, width: '70%', height: 16, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(22,18,26,.2),rgba(22,18,26,0) 70%)' }} />
                  <span style={{ position: 'relative' }}><Figure {...figureProps(l, 'front')} bagStyle="none" w={figW} h={figH} /></span>
                </motion.div>
              ))}
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 className="h" style={{ margin: 0, fontSize: phone ? 22 : 26 }}>Who are we dressing?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${phone ? 1 : 3}, minmax(0,1fr))`, gap: 12 }}>
              {[
                { t: 'Me', d: 'Use my photo and my sizes', c: '#C2185B', tint: '#FBE4EC', href: '#/build/new', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6' },
                { t: 'A client', d: 'Pick from your saved clients', c: '#086770', tint: '#DDF1F2', href: '#/studio/clients', icon: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c1.2-3.4 3.6-5 6.5-5s5.3 1.6 6.5 5M17 9.5a2.5 2.5 0 100-5M17 12.5c2.4 0 4 1.3 4.8 3.8' },
                { t: 'Default model', d: 'Show a style before you have a photo', c: '#7A5600', tint: '#FBF0D6', href: '#/build/new?step=2', icon: 'M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.4 7.2 17.9l.9-5.4L4.2 8.7l5.4-.8z' },
              ].map((w) => (
                <a key={w.t} href={w.href} className="card" style={{ padding: phone ? 14 : 18, display: 'flex', flexDirection: phone ? 'row' : 'column', alignItems: phone ? 'center' : 'flex-start', gap: 12 }}>
                  <span aria-hidden="true" style={{ width: 44, height: 44, flex: 'none', borderRadius: '50%', background: w.tint, color: w.c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={w.icon} /></svg>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{w.t}</span>
                    <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.35 }}>{w.d}</span>
                  </span>
                </a>
              ))}
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 className="h" style={{ margin: 0, fontSize: phone ? 22 : 26 }}>Your looks</h2>
              <a href="#/studio/catalogue" style={{ fontWeight: 600, fontSize: 14 }}>Catalogue</a>
            </div>
            {sorted.length === 0 && <a href="#/build/new" className="card" style={{ padding: 20, textAlign: 'center', fontWeight: 600 }}>No looks yet. Start your first one.</a>}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${lookCols}, minmax(0,1fr))`, gap: 14 }}>
              {sorted.map((l, i) => (
                <motion.a layout key={l.id} href={`#/build/${l.id}`} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ position: 'relative', height: phone ? 200 : 236, background: walls[i % walls.length], display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <span aria-hidden="true" style={{ position: 'absolute', bottom: 4, width: '60%', height: 12, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(22,18,26,.2),rgba(22,18,26,0) 70%)' }} />
                    <span style={{ position: 'relative' }}>
                      {l.tryon?.front ? <img src={l.tryon.front} alt="" style={{ height: phone ? 180 : 214 }} /> : <Figure {...figureProps(l, 'front')} w={phone ? 66 : 78} h={phone ? 172 : 204} />}
                    </span>
                    <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,.88)', color: statusColor[l.status], borderRadius: 999, padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor[l.status] }} />{l.status}
                    </span>
                  </span>
                  <span style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span className="h" style={{ fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{l.clientName}</span>
                  </span>
                </motion.a>
              ))}
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 className="h" style={{ margin: 0, fontSize: phone ? 22 : 26 }}>Browse by style</h2>
            <div className="row">
              {STYLE_CHIPS.map(([t, c]) => (
                <a key={t} href={`#/studio/catalogue`} style={{ minHeight: 40, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 999, background: '#FFFFFF', border: '1px solid var(--line)', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                  <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />{t}
                </a>
              ))}
            </div>
          </section>
        </div>

        {laptop && (
          <aside aria-label="Coming up" className="card" style={{ flex: 'none', width: 300, alignSelf: 'flex-start', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 className="h" style={{ margin: 0, fontSize: 22 }}>Coming up</h2>
            {upcoming.length === 0 && <span className="muted" style={{ fontSize: 14 }}>Add event dates to your clients to see them here.</span>}
            {upcoming.map((c, i) => {
              const d = fmtDate(c.date);
              const tint = ['#DCF0E4', '#FBF0D6', '#E1EAFB', '#FBE4EC'][i % 4], col = ['#0F6A40', '#7A5600', '#1D4AB3', '#A3144C'][i % 4];
              const lk = looks.find((l) => l.clientId === c.id);
              return (
                <a key={c.id} href={lk ? `#/build/${lk.id}` : `#/build/new?client=${c.id}`} style={{ display: 'flex', gap: 12, alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #F0ECF1', textDecoration: 'none' }}>
                  <span style={{ width: 50, height: 54, flex: 'none', borderRadius: 12, background: tint, color: col, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{d?.mon}</span><span className="h" style={{ fontSize: 21, lineHeight: 1 }}>{d?.day}</span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 600 }}>{c.name}</span><span style={{ fontSize: 13, color: col, fontWeight: 600 }}>{lk ? lk.status : 'No look yet'}</span></span>
                </a>
              );
            })}
            <a href="#/studio/clients" className="stk btn" style={{ marginTop: 2 }}>All clients</a>
          </aside>
        )}
      </main>
      <TabBar active="looks" />
    </Page>
  );
}
