import { useEffect, useState } from 'react';

export type Bp = 'phone' | 'tablet' | 'laptop';
const bpOf = (w: number): Bp => (w < 760 ? 'phone' : w < 1200 ? 'tablet' : 'laptop');

export function useBp(): Bp {
  const [bp, setBp] = useState<Bp>(() => bpOf(typeof window === 'undefined' ? 1440 : window.innerWidth));
  useEffect(() => {
    const on = () => setBp(bpOf(window.innerWidth));
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return bp;
}

export function useViewportH(): number {
  const [h, setH] = useState(() => (typeof window === 'undefined' ? 900 : window.innerHeight));
  useEffect(() => {
    const on = () => setH(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return h;
}

/** Tiny hash router: "#/build/abc" -> ["build", "abc"]. Works inside previews and static hosting. */
export function useRoute(): string[] {
  const parse = () => window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean);
  const [r, setR] = useState(parse);
  useEffect(() => {
    const on = () => { setR(parse()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}

export const go = (path: string) => { window.location.hash = path.startsWith('#') ? path : '#' + path; };

let toastTimer: number | undefined;
export function toast(msg: string) {
  window.dispatchEvent(new CustomEvent('korey-toast', { detail: msg }));
  window.clearTimeout(toastTimer);
}

export function useToast(): string | null {
  const [m, setM] = useState<string | null>(null);
  useEffect(() => {
    let t: number | undefined;
    const on = (e: Event) => { setM((e as CustomEvent).detail); window.clearTimeout(t); t = window.setTimeout(() => setM(null), 2600); };
    window.addEventListener('korey-toast', on);
    return () => window.removeEventListener('korey-toast', on);
  }, []);
  return m;
}
