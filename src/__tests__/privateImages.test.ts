import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { deleteImages, deleteOrphans, getImage, listImageIds, putImage } from '../lib/privateImages';

describe('private image store', () => {
  it('saves, reads back and deletes photos', async () => {
    const r = await putImage(new Blob(['abc'], { type: 'image/jpeg' }), { width: 10, height: 20 });
    expect(r.storage).toBe('device');
    expect(r.id).toMatch(/^img_/);
    const back = await getImage(r.id);
    expect(back?.size).toBe(3);
    await deleteImages([r.id]);
    expect(await getImage(r.id)).toBeNull();
  });
  it('removes orphans that no profile points at', async () => {
    const a = await putImage(new Blob(['a']), { width: 1, height: 1 });
    const b = await putImage(new Blob(['b']), { width: 1, height: 1 });
    const removed = await deleteOrphans(new Set([a.id]));
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(await listImageIds()).toContain(a.id);
    expect(await listImageIds()).not.toContain(b.id);
  });
});
