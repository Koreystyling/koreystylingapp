import { useEffect, useState } from 'react';
import { getImage } from './privateImages';

/** A short-lived blob: URL for a private image id (or an in-memory draft blob). Revoked on change. */
export function usePrivateImage(id?: string | null, draft?: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true, made: string | null = null;
    setUrl(null);
    (async () => {
      const blob = draft ?? (id ? await getImage(id).catch(() => null) : null);
      if (!alive || !blob) return;
      made = URL.createObjectURL(blob);
      setUrl(made);
    })();
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [id, draft]);
  return url;
}
