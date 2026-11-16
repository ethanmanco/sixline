/**
 * "Your tracks": audio files you load from your own device. They are kept in
 * this browser's IndexedDB so they are still there next time, and they are
 * never uploaded anywhere. If storage is blocked or full, a track still works
 * until the page is closed.
 */

export interface LocalMeta {
  id: string;
  title: string;
  fileName: string;
  size: number;
  durationSec: number;
  root: string;
  minor: boolean;
  /** Other likely keys from the analysis, e.g. ["C minor", "F major"]. */
  alternatives: { root: string; minor: boolean }[];
  keyEstimated: boolean;
  bpm: number | null;
  bpmEstimated: boolean;
  /** Chord chart as typed, or empty. */
  chart: string;
  added: number;
}

interface Stored {
  meta: LocalMeta;
  blob: Blob;
}

const DB = 'sixline';
const STORE = 'tracks';
const memory = new Map<string, Stored>();

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** A stable id for a file, so loading the same file twice finds the same track. */
export function fileId(f: { name: string; size: number; lastModified: number }): string {
  let h = 5381;
  for (const ch of `${f.name}|${f.size}|${f.lastModified}`) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return `local-${h.toString(36)}`;
}

export async function listLocal(): Promise<LocalMeta[]> {
  const all = ((await tx('readonly', (s) => s.getAll())) as Stored[] | null) ?? [];
  const byId = new Map(all.map((x) => [x.meta.id, x]));
  for (const [id, x] of memory) if (!byId.has(id)) byId.set(id, x);
  return [...byId.values()].map((x) => x.meta).sort((a, b) => a.added - b.added);
}

export async function getBlob(id: string): Promise<Blob | null> {
  const stored = ((await tx('readonly', (s) => s.get(id))) as Stored | null) ?? memory.get(id) ?? null;
  return stored?.blob ?? null;
}

/** Saves a track. Returns false if the browser would not store it (it still works for this visit). */
export async function saveLocal(meta: LocalMeta, blob: Blob): Promise<boolean> {
  memory.set(meta.id, { meta, blob });
  const ok = await tx('readwrite', (s) => s.put({ meta, blob }, meta.id));
  return ok !== null;
}

export async function updateLocal(id: string, patch: Partial<LocalMeta>): Promise<void> {
  const blob = await getBlob(id);
  const current = ((await tx('readonly', (s) => s.get(id))) as Stored | null) ?? memory.get(id);
  if (!current || !blob) return;
  await saveLocal({ ...current.meta, ...patch, id }, blob);
}

export async function removeLocal(id: string): Promise<void> {
  memory.delete(id);
  await tx('readwrite', (s) => s.delete(id));
}
