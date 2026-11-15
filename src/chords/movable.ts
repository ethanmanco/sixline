/**
 * Movable shapes built by rule: E-shape and A-shape barre chords and power
 * chords. A shape is a pattern of frets relative to the root's fret; sliding
 * it along the neck gives the same chord in every key.
 */
import type { Barre, Finger, StringIndex } from '../core/types';
import { OPEN_MIDI } from '../theory/guitar';
import type { Voicing } from './db';

interface Template {
  /** Root string: 0 for E shape (6th string), 1 for A shape (5th string). */
  rootString: StringIndex;
  /** Offsets from the root fret, low E first. null = muted. */
  offsets: (number | null)[];
  fingers: Finger[];
  /** Strings the index finger lays across, or null for no barre. */
  barre: [StringIndex, StringIndex] | null;
}

export const TEMPLATES: Record<string, Template> = {
  'major-e': { rootString: 0, offsets: [0, 2, 2, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1], barre: [0, 5] },
  'minor-e': { rootString: 0, offsets: [0, 2, 2, 0, 0, 0], fingers: [1, 3, 4, 1, 1, 1], barre: [0, 5] },
  'major-a': { rootString: 1, offsets: [null, 0, 2, 2, 2, 0], fingers: [0, 1, 2, 3, 4, 1], barre: [1, 5] },
  'minor-a': { rootString: 1, offsets: [null, 0, 2, 2, 1, 0], fingers: [0, 1, 3, 4, 2, 1], barre: [1, 5] },
  'power-6': { rootString: 0, offsets: [0, 2, 2, null, null, null], fingers: [1, 3, 4, 0, 0, 0], barre: null },
  'power-5': { rootString: 1, offsets: [null, 0, 2, 2, null, null], fingers: [0, 1, 3, 4, 0, 0], barre: null },
};

/** Fret of the root on a string, from 1 to 12 (a barre needs at least fret 1). */
export function rootFret(rootChroma: number, string: StringIndex): number {
  const f = (((rootChroma - OPEN_MIDI[string]) % 12) + 12) % 12;
  return f === 0 ? 12 : f;
}

export function movableVoicing(templateId: string, rootChroma: number): Voicing {
  const t = TEMPLATES[templateId];
  if (!t) throw new Error(`Unknown template ${templateId}`);
  const r = rootFret(rootChroma, t.rootString);
  const frets = t.offsets.map((o) => (o === null ? null : r + o));
  const barres: Barre[] = t.barre ? [{ fret: r, from: t.barre[0], to: t.barre[1], finger: 1 }] : [];
  return { frets, fingers: [...t.fingers], barres };
}
