// Private image store for customer photos and images generated from them.
//
// Photos live in this browser's IndexedDB, not in localStorage and not on any public URL.
// The app reads them back as short-lived blob: URLs. Prototype limits: data stays on this one
// device and browser, clearing site data removes it, and nothing is encrypted at rest beyond
// what the browser does. A server version (private bucket + signed URLs) replaces this later.

import type { ImageReference } from './profile';

const DB = 'korey-private';
const STORE = 'images';

interface Row { id: string; blob: Blob; mime: string; width: number; height: number; addedAt: number }

let dbp: Promise<IDBDatabase> | null = null;
const db = () => {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }); };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => { dbp = null; reject(r.error); };
    });
  }
  return dbp;
};

const tx = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> => {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
};

const iid = () => 'img_' + Math.random().toString(36).slice(2, 12);

/** Save a photo privately. Returns the reference fields (kind and version are set by the profile). */
export async function putImage(blob: Blob, size: { width: number; height: number }, origin: ImageReference['origin'] = 'upload'): Promise<Omit<ImageReference, 'kind' | 'version'>> {
  const row: Row = { id: iid(), blob, mime: blob.type || 'image/jpeg', width: size.width, height: size.height, addedAt: Date.now() };
  await tx('readwrite', (s) => s.put(row));
  return { id: row.id, storage: 'device', mime: row.mime, width: row.width, height: row.height, bytes: blob.size, addedAt: row.addedAt, origin };
}

export async function getImage(id: string): Promise<Blob | null> {
  const row = await tx<Row | undefined>('readonly', (s) => s.get(id) as IDBRequest<Row | undefined>);
  return row?.blob ?? null;
}

export async function deleteImages(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await tx('readwrite', (s) => { ids.forEach((id) => s.delete(id)); });
}

export async function listImageIds(): Promise<string[]> {
  const keys = await tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys());
  return (keys ?? []).map(String);
}

/** Remove stored photos that no profile points at any more (e.g. after a crash mid-save). */
export async function deleteOrphans(keep: Set<string>): Promise<number> {
  const all = await listImageIds();
  const gone = all.filter((id) => !keep.has(id));
  await deleteImages(gone);
  return gone.length;
}

export const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result));
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

export const dataUrlToBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob();
