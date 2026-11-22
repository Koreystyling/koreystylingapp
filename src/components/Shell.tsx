import type { ReactNode } from 'react';
import { useStore } from '../lib/store';
import { BrandMark } from './ui';

export function TopBar({ active }: { active: 'looks' | 'catalogue' | 'clients' | 'brand' }) {
  const { credits, brand } = useStore();
  const links: [string, string, typeof active][] = [['#/', 'Looks', 'looks'], ['#/studio/catalogue', 'Catalogue', 'catalogue'], ['#/studio/clients', 'Clients', 'clients'], ['#/studio/brand', 'My brand', 'brand']];
  return (
    <header className="topbar" style={{ padding: undefined }}>
      <a href="#/" className="logo">korey<span style={{ color: '#C2185B' }}>.</span></a>
      <nav aria-label="Main" className="mainnav hide-phone" style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
        {links.map(([href, name, key]) => <a key={key} href={href} aria-current={active === key ? 'page' : undefined}>{name}</a>)}
      </nav>
      <span style={{ flex: 1 }} />
      <span className="credits">{credits} credits</span>
      <a href="#/studio/brand" aria-label="Account and brand" style={{ textDecoration: 'none' }}>
        <BrandMark name={brand.name} logo={brand.logo} main="#FFFFFF" accent="#16121A" size={38} />
      </a>
    </header>
  );
}

export function TabBar({ active }: { active: 'looks' | 'catalogue' | 'clients' | 'new' }) {
  const items: [string, string, typeof active][] = [['#/', 'Looks', 'looks'], ['#/studio/catalogue', 'Catalogue', 'catalogue'], ['#/studio/clients', 'Clients', 'clients'], ['#/build/new', 'New look', 'new']];
  return (
    <nav aria-label="Main" className="tabbar hide-laptop">
      {items.map(([href, name, key]) => (
        <a key={key} href={href} aria-current={active === key ? 'page' : undefined}>
          {active === key && <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: '50%', background: '#C2185B' }} />}
          {name}
        </a>
      ))}
    </nav>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>{children}</div>;
}
