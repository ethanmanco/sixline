import { Note, Scale } from 'tonal';
import { degreeLabel } from './spelling';

/**
 * Which fingering rule builds the positions: pentatonic boxes, pentatonic
 * boxes plus blue notes, or the four-fret window used for everything else.
 */
export type ScaleFamily = 'pentatonic' | 'blues' | 'window';

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
  group: 'pentatonic' | 'major-minor' | 'modes' | 'exotic';
  /** For blues: the scale it is built on, before the blue notes are added. */
  base?: string;
  /** Whole tone and diminished: evenly spaced, so letter-by-letter spelling does not apply. */
  symmetric?: boolean;
}

export const SCALE_GROUPS = [
  { id: 'pentatonic', label: 'Pentatonic and blues', short: 'Pentatonic' },
  { id: 'major-minor', label: 'Major and minor', short: 'Major, minor' },
  { id: 'modes', label: 'Modes', short: 'Modes' },
  { id: 'exotic', label: 'Symmetric and exotic', short: 'Exotic' },
];

export const SCALE_TYPES: readonly ScaleType[] = [
  { id: 'minor-pentatonic', label: 'Minor pentatonic', tonalName: 'minor pentatonic', family: 'pentatonic', group: 'pentatonic' },
  { id: 'major-pentatonic', label: 'Major pentatonic', tonalName: 'major pentatonic', family: 'pentatonic', group: 'pentatonic' },
  { id: 'blues', label: 'Blues', tonalName: 'minor blues', family: 'blues', group: 'pentatonic', base: 'minor pentatonic' },
  { id: 'major-blues', label: 'Major blues', tonalName: 'major blues', family: 'blues', group: 'pentatonic', base: 'major pentatonic' },
  { id: 'major', label: 'Major', tonalName: 'major', family: 'window', group: 'major-minor' },
  { id: 'natural-minor', label: 'Natural minor', tonalName: 'aeolian', family: 'window', group: 'major-minor' },
  { id: 'harmonic-minor', label: 'Harmonic minor', tonalName: 'harmonic minor', family: 'window', group: 'major-minor' },
  { id: 'melodic-minor', label: 'Melodic minor', tonalName: 'melodic minor', family: 'window', group: 'major-minor' },
  { id: 'dorian', label: 'Dorian', tonalName: 'dorian', family: 'window', group: 'modes' },
  { id: 'phrygian', label: 'Phrygian', tonalName: 'phrygian', family: 'window', group: 'modes' },
  { id: 'lydian', label: 'Lydian', tonalName: 'lydian', family: 'window', group: 'modes' },
  { id: 'mixolydian', label: 'Mixolydian', tonalName: 'mixolydian', family: 'window', group: 'modes' },
  { id: 'locrian', label: 'Locrian', tonalName: 'locrian', family: 'window', group: 'modes' },
  { id: 'phrygian-dominant', label: 'Phrygian dominant', tonalName: 'phrygian dominant', family: 'window', group: 'exotic' },
  { id: 'whole-tone', label: 'Whole tone', tonalName: 'whole tone', family: 'window', group: 'exotic', symmetric: true },
  { id: 'diminished-wh', label: 'Diminished (whole-half)', tonalName: 'diminished', family: 'window', group: 'exotic', symmetric: true },
  { id: 'diminished-hw', label: 'Diminished (half-whole)', tonalName: 'half-whole diminished', family: 'window', group: 'exotic', symmetric: true },
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

/**
 * Symmetric scales and chords (whole tone, diminished, augmented) can need a
 * double sharp or flat whatever the root. Guitar charts write those notes by
 * their plain name (F## as G), so Sixline does too. Degrees still come from
 * the intervals, so the #5 of an augmented chord still reads "#5".
 */
export function plainNames(notes: readonly string[], alsoRare = false): string[] {
  const odd = alsoRare ? /bb|##|^(Fb|Cb|E#|B#)$/ : /bb|##/;
  return notes.map((n) => (odd.test(n) ? Note.enharmonic(n) : n));
}

/** Generates a scale's notes and degrees in any key from tonal. Nothing is hand-typed. */
export function spellScale(key: string, type: ScaleType): ScaleSpelling {
  const get = (r: string) => Scale.get(`${r} ${type.tonalName}`);
  const root = readableRoot(key, (r) => get(r).notes);
  const s = get(root);
  if (s.empty) throw new Error(`tonal does not know ${root} ${type.tonalName}`);
  return {
    root,
    // Symmetric scales also drop Fb, Cb, E#, and B#: they repeat letters anyway, so plain names read best.
    notes: plainNames(s.notes, !!type.symmetric),
    intervals: s.intervals,
    degrees: s.intervals.map(degreeLabel),
  };
}
