import { Note, Scale } from 'tonal';
import { degreeLabel } from './spelling';

export type ScaleFamily = 'pentatonic' | 'blues' | 'heptatonic';

export interface ScaleType {
  /** URL-safe id, e.g. "minor-pentatonic". */
  id: string;
  /** Display name, e.g. "Minor pentatonic". */
  label: string;
  /** The name tonal knows it by. */
  tonalName: string;
  /** Decides which fingering rule builds its positions. */
  family: ScaleFamily;
  /** List heading it sits under. */
  group: 'pentatonic' | 'major-minor' | 'modes';
  /** For blues: the scale it is built on, before the blue notes are added. */
  base?: string;
}

export const SCALE_GROUPS = [
  { id: 'pentatonic', label: 'Pentatonic and blues', short: 'Pentatonic' },
  { id: 'major-minor', label: 'Major and minor', short: 'Major, minor' },
  { id: 'modes', label: 'Modes', short: 'Modes' },
];

export const SCALE_TYPES: readonly ScaleType[] = [
  { id: 'minor-pentatonic', label: 'Minor pentatonic', tonalName: 'minor pentatonic', family: 'pentatonic', group: 'pentatonic' },
  { id: 'major-pentatonic', label: 'Major pentatonic', tonalName: 'major pentatonic', family: 'pentatonic', group: 'pentatonic' },
  { id: 'blues', label: 'Blues', tonalName: 'minor blues', family: 'blues', group: 'pentatonic', base: 'minor pentatonic' },
  { id: 'major', label: 'Major', tonalName: 'major', family: 'heptatonic', group: 'major-minor' },
  { id: 'natural-minor', label: 'Natural minor', tonalName: 'aeolian', family: 'heptatonic', group: 'major-minor' },
  { id: 'dorian', label: 'Dorian', tonalName: 'dorian', family: 'heptatonic', group: 'modes' },
  { id: 'phrygian', label: 'Phrygian', tonalName: 'phrygian', family: 'heptatonic', group: 'modes' },
  { id: 'lydian', label: 'Lydian', tonalName: 'lydian', family: 'heptatonic', group: 'modes' },
  { id: 'mixolydian', label: 'Mixolydian', tonalName: 'mixolydian', family: 'heptatonic', group: 'modes' },
  { id: 'locrian', label: 'Locrian', tonalName: 'locrian', family: 'heptatonic', group: 'modes' },
];

export function scaleType(id: string): ScaleType {
  const t = SCALE_TYPES.find((s) => s.id === id);
  if (!t) throw new Error(`Unknown scale type: ${id}`);
  return t;
}

export interface ScaleSpelling {
  /** The root as written for this scale. May be the enharmonic of the key (C# locrian in the key of Db). */
  root: string;
  /** Note names in scale order, starting on the root. */
  notes: string[];
  /** Tonal interval names, e.g. "3m". */
  intervals: string[];
  /** Guitarist degree labels, e.g. "b3". */
  degrees: string[];
}

/**
 * How hard a spelling is to read: double sharps and flats are worst, then Fb
 * and Cb, then E# and B#, then any other sharp or flat.
 */
export function spellingCost(notes: readonly string[]): number {
  return notes.reduce((cost, n) => {
    if (/bb|##/.test(n)) return cost + 10;
    if (/^(Fb|Cb)$/.test(n)) return cost + 4;
    if (/^(E#|B#)$/.test(n)) return cost + 2;
    return cost + (/[#b]/.test(n) ? 1 : 0);
  }, 0);
}

/**
 * Picks the easier-to-read of a root and its enharmonic twin, but only when it
 * is clearly easier, so the key as picked usually wins. Db dorian would need
 * Fb and Cb, so it is written C# dorian; Dbm becomes C#m; Db major and F#maj7
 * stay as they are.
 */
export function readableRoot(root: string, spell: (r: string) => string[]): string {
  const alt = Note.enharmonic(root);
  if (!alt || alt === root || /bb|##/.test(alt)) return root;
  return spellingCost(spell(alt)) < spellingCost(spell(root)) - 2 ? alt : root;
}

/** Generates a scale's notes and degrees in any key from tonal. Nothing is hand-typed. */
export function spellScale(key: string, type: ScaleType): ScaleSpelling {
  const get = (r: string) => Scale.get(`${r} ${type.tonalName}`);
  const root = readableRoot(key, (r) => get(r).notes);
  const s = get(root);
  if (s.empty) throw new Error(`tonal does not know ${root} ${type.tonalName}`);
  return {
    root,
    notes: s.notes,
    intervals: s.intervals,
    degrees: s.intervals.map(degreeLabel),
  };
}
