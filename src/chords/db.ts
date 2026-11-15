/**
 * Adapter for chords-db (MIT, (c) 2016 David Rubert,
 * https://github.com/tombatossals/chords-db).
 *
 * In chords-db, fret numbers are relative to `baseFret`: 1 means the base
 * fret, 0 means open, -1 means muted. Everything here converts to absolute
 * frets counted from the nut, which is what the rest of Sixline uses.
 */
import type { Barre, Finger, StringIndex } from '../core/types';
import { noteChroma } from '../theory/spelling';

export interface DbPosition {
  frets: number[];
  fingers: number[];
  baseFret: number;
  barres: number[];
  capo?: boolean;
  midi?: number[];
}

export interface DbChord {
  key: string;
  suffix: string;
  positions: DbPosition[];
}

export interface ChordDb {
  keys: string[];
  chords: Record<string, DbChord[]>;
}

let loading: Promise<ChordDb> | null = null;
let loaded: ChordDb | null = null;

/** Loads the guitar chord data on demand, as its own small download. */
export function loadChordDb(): Promise<ChordDb> {
  loading ??= import('@tombatossals/chords-db/lib/guitar.json').then((m) => {
    loaded = ((m as { default?: unknown }).default ?? m) as ChordDb;
    return loaded;
  });
  return loading;
}

/** The data, if it has finished loading. */
export function chordDbIfLoaded(): ChordDb | null {
  return loaded;
}

/** For tests and tools that already have the JSON in hand. */
export function setChordDb(db: ChordDb): void {
  loaded = db;
  loading = Promise.resolve(db);
}

/** chords-db names keys "Csharp", "Fsharp", "Eb"... Find the one that sounds like `root`. */
export function dbKeyFor(db: ChordDb, root: string): string {
  const c = noteChroma(root);
  const key = Object.keys(db.chords).find((k) => noteChroma(k.replace('sharp', '#')) === c);
  if (!key) throw new Error(`chords-db has no key for ${root}`);
  return key;
}

export function dbPositions(db: ChordDb, root: string, suffix: string): DbPosition[] {
  const list = db.chords[dbKeyFor(db, root)] ?? [];
  return list.find((c) => c.suffix === suffix)?.positions ?? [];
}

/** chords-db slash chords for a root, e.g. "/B" or "m/C", whose bass note sounds like `bassChroma`. */
export function dbSlashPositions(db: ChordDb, root: string, minor: boolean, bassChroma: number): DbPosition[] {
  const list = db.chords[dbKeyFor(db, root)] ?? [];
  const prefix = minor ? 'm/' : '/';
  const match = list.find((c) => {
    if (!c.suffix.startsWith(prefix)) return false;
    try {
      return noteChroma(c.suffix.slice(prefix.length)) === bassChroma;
    } catch {
      return false;
    }
  });
  return match?.positions ?? [];
}

export interface Voicing {
  /** Absolute fret per string, low E first. null = muted. */
  frets: (number | null)[];
  fingers: Finger[];
  barres: Barre[];
}

export function toVoicing(p: DbPosition): Voicing {
  const frets = p.frets.map((f) => (f < 0 ? null : f === 0 ? 0 : p.baseFret + f - 1));
  const fingers = p.fingers.map((f) => f as Finger);
  const barres: Barre[] = p.barres.map((rel) => {
    const abs = p.baseFret + rel - 1;
    const strings = frets.map((f, s) => (f === abs ? s : -1)).filter((s) => s >= 0);
    const from = Math.min(...strings) as StringIndex;
    const to = Math.max(...strings) as StringIndex;
    const finger = fingers[from] || 1;
    // Strings under the barre are held by the barre finger even if the data leaves them blank.
    for (const s of strings) if (fingers[s] === 0) fingers[s] = finger;
    return { fret: abs, from, to, finger };
  });
  return { frets, fingers, barres };
}

export function sameFrets(a: Voicing, b: Voicing): boolean {
  return a.frets.every((f, i) => f === b.frets[i]);
}
