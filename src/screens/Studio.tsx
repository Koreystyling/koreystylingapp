import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Figure from '../components/Figure';
import { TabBar } from '../components/Shell';
import { BrandMark, Upload } from '../components/ui';
import { BRAND_ACCENT, BRAND_MAIN } from '../lib/data';
import type { SkirtKind, TopKind } from '../lib/data';
import { figureProps } from '../lib/look';
import { useStore } from '../lib/store';
import { useBp, go, toast } from '../lib/hooks';
import type { CatalogueItem } from '../lib/types';

type Tab = 'brand' | 'catalogue' | 'clients';

export default function Studio({ tab }: { tab: Tab }) {
  const store = useStore();
  const bp = useBp();
  const phone = bp === 'phone';
  const tabs: [Tab, string][] = [['brand', 'Brand'], ['catalogue', 'Catalogue'], ['clients', 'Clients']];
  const used = store.plan === 'Studio' ? 200 : 30;

  return (
    <div style={{ minHeight: '100dvh', background: '#F6F1F6', display: 'flex', flexDirection: phone ? 'column' : 'row' }}>
      <aside style={{ flex: phone ? 'none' : '0 0 230px', background: '#16121A', color: '#FFFFFF', padding: phone ? '14px 16px' : '24px 16px', display: 'flex', flexDirection: phone ? 'row' : 'column', flexWrap: phone ? 'wrap' : 'nowrap', gap: phone ? 10 : 20, alignItems: phone ? 'center' : 'stretch', position: phone ? 'static' : 'sticky', top: 0, height: phone ? 'auto' : '100dvh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: phone ? 0 : '0 8px', gap: 10 }}>
          <a href="#/" className="h" style={{ fontSize: 26, color: '#FFFFFF', textDecoration: 'none' }}>korey<span style={{ color: '#E0A526' }}>.</span></a>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#16121A', background: '#E0A526', borderRadius: 999, padding: '3px 10px' }}>Studio</span>
        </div>
        <nav aria-label="Studio" style={{ display: 'flex', flexDirection: phone ? 'row' : 'column', gap: 4, overflowX: 'auto', flex: phone ? '1 1 100%' : 'none' }}>
          {tabs.map(([k, n]) => (
            <a key={k} href={`#/studio/${k}`} aria-current={tab === k ? 'page' : undefined} style={{ minHeight: 44, display: 'flex', alignItems: 'center', padding: '0 12px', borderRadius: 10, background: tab === k ? '#E0A526' : 'transparent', color: tab === k ? '#16121A' : '#FFFFFF', fontSize: 15, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>{n}</a>
          ))}
          {!phone && <a href="#/build/new" style={{ minHeight: 44, display: 'flex', alignItems: 'center', padding: '0 12px', borderRadius: 10, color: '#EADFEB', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>New look</a>}
        </nav>
        {!phone && (
          <div style={{ marginTop: 'auto', background: 'rgba(255,255,255,.08)', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#EADFEB' }}>Credits this month</span>
            <span className="h" style={{ fontSize: 22 }}>{store.credits} of {used}</span>
            <div style={{ height: 6, background: 'rgba(255,255,255,.15)', borderRadius: 3, overflow: 'hidden' }}><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (store.credits / used) * 100)}%` }} style={{ height: '100%', background: '#E0A526' }} /></div>
            <span style={{ fontSize: 12, color: '#EADFEB' }}>{store.plan} plan</span>
          </div>
        )}
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: phone ? '20px 16px 90px' : '32px clamp(16px,3vw,40px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {tab === 'brand' && <BrandTab />}
            {tab === 'catalogue' && <CatalogueTab />}
            {tab === 'clients' && <ClientsTab />}
          </motion.div>
        </AnimatePresence>
      </main>
      {phone && <TabBar active={tab === 'clients' ? 'clients' : tab === 'catalogue' ? 'catalogue' : 'looks'} />}
    </div>
  );
}

function Title({ t, d, action }: { t: string; d: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 className="h" style={{ margin: 0, fontSize: 32 }}>{t}</h1>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--muted)' }}>{d}</p>
      </div>
      {action}
    </div>
  );
}

function ColorRow({ label, list, value, onPick }: { label: string; list: [string, string][]; value: string; onPick: (h: string) => void }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <legend style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{label}</legend>
      <div className="row" style={{ gap: 10 }}>
        {list.map(([hex, name]) => (
          <motion.button key={name} type="button" whileTap={{ scale: 0.9 }} onClick={() => onPick(hex)} aria-label={name} aria-pressed={value.toLowerCase() === hex.toLowerCase()}
            style={{ width: 44, height: 44, borderRadius: '50%', background: hex, border: `3px solid ${value.toLowerCase() === hex.toLowerCase() ? '#16121A' : '#FFFFFF'}`, boxShadow: '0 0 0 1px #E7E2E8' }} />
        ))}
        <label className="stk" style={{ minHeight: 44, padding: '0 8px 0 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>Custom
          <input type="color" className="color-in" value={value} onChange={(e) => onPick(e.target.value)} aria-label={`Custom ${label.toLowerCase()}`} />
        </label>
      </div>
    </fieldset>
  );
}

function BrandTab() {
  const { brand, setBrand, looks } = useStore();
  const sample = looks[0];
  return (
    <>
      <Title t="Your brand" d="Your clients see your name, logo and colours on every look, share link and tailor card." />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <form onSubmit={(e) => e.preventDefault()} className="card" style={{ flex: '1 1 340px', minWidth: 0, borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <BrandMark name={brand.name} logo={brand.logo} main={brand.main} accent={brand.accent} size={72} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontWeight: 700 }}>Logo</span>
              <div className="row">
                <Upload className="stk pill" max={320} onFile={(img) => { setBrand({ logo: img }); toast('Logo added.'); }}>{brand.logo ? 'Change logo' : 'Upload logo'}</Upload>
                {brand.logo && <button type="button" className="stk pill" onClick={() => setBrand({ logo: null })}>Remove</button>}
              </div>
            </div>
          </div>
          <label className="field">Business name<input className="input" value={brand.name} onChange={(e) => setBrand({ name: e.target.value })} /></label>
          <ColorRow label="Main colour" list={BRAND_MAIN} value={brand.main} onPick={(h) => setBrand({ main: h })} />
          <ColorRow label="Second colour" list={BRAND_ACCENT} value={brand.accent} onPick={(h) => setBrand({ accent: h })} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            <label className="field">WhatsApp<input className="input" value={brand.whatsapp} onChange={(e) => setBrand({ whatsapp: e.target.value })} /></label>
            <label className="field">Instagram<input className="input" value={brand.instagram} onChange={(e) => setBrand({ instagram: e.target.value })} /></label>
          </div>
          <label className="field">Your page name<input className="input" value={brand.handle} onChange={(e) => setBrand({ handle: e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase() })} /></label>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>Your page: <strong style={{ color: 'var(--ink)' }}>korey.app/{brand.handle || 'yourname'}</strong></p>
        </form>

        <section aria-label="What your clients see" style={{ flex: '0 1 300px', minWidth: 260, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="lbl">What your clients see</span>
          <div className="card" style={{ borderRadius: 22, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <motion.div animate={{ backgroundColor: brand.main }} style={{ color: '#FFFFFF', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <BrandMark name={brand.name} logo={brand.logo} main={brand.main} accent={brand.accent} size={36} />
              <span className="h" style={{ fontSize: 16 }}>{brand.name}</span>
            </motion.div>
            <div style={{ height: 260, background: 'radial-gradient(ellipse at 50% 40%,#F4F0F2 0%,#DCD4D8 100%)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <Figure {...(sample ? figureProps(sample, 'front') : {})} topPart={{ c: brand.main, d: brand.accent, f: 'lace' }} sleevePart={{ c: brand.main, d: brand.accent, f: 'lace' }} skirtPart={{ c: brand.main, d: brand.accent, f: 'lace' }} gele={brand.accent} geleStyle="fan" geleImg={null} shoe={brand.accent} bagStyle="none" w={96} h={250} />
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontWeight: 700 }}>{sample?.name ?? 'Your look'}</span>
              <span style={{ minHeight: 44, borderRadius: 12, background: brand.main, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>Chat on WhatsApp</span>
              <span style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>Made with korey</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

const TAGS: CatalogueItem['tag'][] = ['Top', 'Sleeves', 'Skirt', 'Full look'];
const topOf = (s?: string): TopKind => (['square', 'corset', 'offshoulder', 'vneck', 'buba'].includes(s ?? '') ? s as TopKind : 'square');
const skirtOf = (s?: string): SkirtKind => (['mermaid', 'straight', 'aline', 'ball', 'wrap'].includes(s ?? '') ? s as SkirtKind : 'straight');

function CatalogueTab() {
  const { catalogue, addCatalogue, removeCatalogue, getLook } = useStore();
  const [filter, setFilter] = useState<'All' | CatalogueItem['tag']>('All');
  const [pending, setPending] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [tag, setTag] = useState<CatalogueItem['tag']>('Full look');
  const items = filter === 'All' ? catalogue : catalogue.filter((x) => x.tag === filter);
  return (
    <>
      <Title t="Catalogue" d="Your past work, tagged by part. Clients mix from here."
        action={<Upload className="stk dark btn" max={720} onFile={(img) => { setPending(img); setName(''); }}>Upload work</Upload>} />
      <AnimatePresence>
        {pending && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={(e) => { e.preventDefault(); addCatalogue({ name: name || 'New piece', tag, img: pending, c: '#6B6170', bg: '#EDE3EE' }); setPending(null); toast('Added to your catalogue.'); }}
            className="card" style={{ padding: 16, display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', overflow: 'hidden' }}>
            <img src={pending} alt="" style={{ width: 110, height: 140, objectFit: 'cover', borderRadius: 12 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 240px' }}>
              <label className="field">Name<input className="input" autoFocus value={name} placeholder="e.g. Beaded corset" onChange={(e) => setName(e.target.value)} /></label>
              <div className="row">{TAGS.map((t) => <button type="button" key={t} className={'stk pill' + (tag === t ? ' on' : '')} style={tag === t ? { background: '#E0A526', borderColor: '#E0A526', color: '#16121A' } : undefined} onClick={() => setTag(t)}>{t}</button>)}</div>
              <div className="row"><button className="stk dark pill" type="submit">Save</button><button type="button" className="stk pill" onClick={() => setPending(null)}>Cancel</button></div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      <div className="row">
        {(['All', ...TAGS] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} style={{ minHeight: 40, padding: '0 16px', borderRadius: 999, border: `1px solid ${filter === f ? '#E0A526' : '#CFC7D3'}`, background: filter === f ? '#E0A526' : '#FFFFFF', fontWeight: 700, fontSize: 14 }}>{f}</button>
        ))}
      </div>
      <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 16 }}>
        <AnimatePresence>
          {items.map((it) => {
            const lk = it.lookId ? getLook(it.lookId) : undefined;
            return (
              <motion.div layout key={it.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="card" style={{ borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <span style={{ height: 180, background: it.bg, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
                  {it.img ? <img src={it.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : lk ? <Figure {...figureProps(lk, 'front')} w={66} h={172} />
                      : <Figure view="front" skin="#6E4630" topPart={{ c: it.c, d: '#F2C25B', f: 'lace' }} top={topOf(it.style)} sleeve={it.tag === 'Sleeves' ? (it.style === 'bell' ? 'bell' : 'puff') : 'cap'} skirt={skirtOf(it.style)} geleStyle="none" bagStyle="none" jewel="none" w={66} h={172} />}
                </span>
                <span style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{it.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, background: '#F6F1F6', borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>{it.tag}</span>
                </span>
                <button aria-label={`Remove ${it.name}`} onClick={() => removeCatalogue(it.id)} style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', border: '1px solid #E7E2E8', background: 'rgba(255,255,255,.9)', fontSize: 14 }}>×</button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

function ClientsTab() {
  const { clients, addClient, looks } = useStore();
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: '', event: '', date: '' });
  const fmt = (d?: string) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Not set');
  return (
    <>
      <Title t="Clients" d="Measurements and photos are saved per client, private to you." action={<button className="stk dark btn" onClick={() => setAdding(true)}>Add client</button>} />
      <AnimatePresence>
        {adding && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="card" style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, alignItems: 'end', overflow: 'hidden' }}
            onSubmit={(e) => { e.preventDefault(); if (!f.name.trim()) return; addClient({ name: f.name.trim(), event: f.event, date: f.date || undefined }); setF({ name: '', event: '', date: '' }); setAdding(false); toast('Client added.'); }}>
            <label className="field">Name<input className="input" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <label className="field">Event<input className="input" value={f.event} placeholder="e.g. Wedding aso-ebi" onChange={(e) => setF({ ...f, event: e.target.value })} /></label>
            <label className="field">Event date<input type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
            <div className="row"><button type="submit" className="stk dark pill" style={{ minHeight: 46 }}>Save</button><button type="button" className="stk pill" style={{ minHeight: 46 }} onClick={() => setAdding(false)}>Cancel</button></div>
          </motion.form>
        )}
      </AnimatePresence>
      <div className="card" style={{ borderRadius: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560, fontSize: 15 }}>
          <thead><tr style={{ textAlign: 'left', color: 'var(--muted)', fontSize: 13 }}>
            <th style={{ padding: '14px 16px' }}>Client</th><th style={{ padding: '14px 16px' }}>Measurements</th><th style={{ padding: '14px 16px' }}>Looks</th><th style={{ padding: '14px 16px' }}>Next event</th><th style={{ padding: '14px 16px' }} />
          </tr></thead>
          <tbody>
            {clients.map((c) => {
              const mine = looks.filter((l) => l.clientId === c.id);
              const meas = mine[0]?.meas ?? c.meas;
              const missing = meas ? 10 - Object.values(meas).filter((v) => typeof v === 'number' && !Number.isNaN(v)).length : 10;
              return (
                <tr key={c.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>{c.name}<div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>{c.event}</div></td>
                  <td style={{ padding: '12px 16px', color: missing <= 0 ? '#0E6B52' : '#A3401C', fontWeight: 600 }}>{missing <= 0 ? 'Complete' : `Missing ${missing}`}</td>
                  <td style={{ padding: '12px 16px' }}>{mine.length ? <a href={`#/build/${mine[0].id}`}>{mine.length}</a> : 0}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>{fmt(c.date)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}><button className="stk pill" onClick={() => go(`/build/new?client=${c.id}`)}>New look</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
