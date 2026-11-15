/**
 * Movable shapes built by rule: barre chords, power chords, and slash chords.
 * A shape is a pattern of frets relative to one anchor note on one string
 * (usually the root, or the bass note for a slash chord). Sliding it along
 * the neck gives the same chord in every key.
 */
import type { Barre, Finger, StringIndex } from '../core/types';
import { MAX_FRET, OPEN_MIDI } from '../theory/guitar';
import type { Voicing } from './db';

interface Template {
  /** String the anchor note sits on. */
  anchorString: StringIndex;
  /** Offsets from the anchor fret, low E first. null = muted. */
  offsets: (number | null)[];
  fingers: Finger[];
  /** A barre: which strings the finger lays across, at which offset from the anchor. */
  barre?: { offset: number; from: StringIndex; to: StringIndex; finger: Finger };
}

const x = null;

export const TEMPLATES: Record<string, Template> = {
  // Triad barres.
  'major-e': { anchorString: 0, offsets: [0, 2, 2, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1], barre: { offset: 0, from: 0, to: 5, finger: 1 } },
  'minor-e': { anchorString: 0, offsets: [0, 2, 2, 0, 0, 0], fingers: [1, 3, 4, 1, 1, 1], barre: { offset: 0, from: 0, to: 5, finger: 1 } },
  'major-a': { anchorString: 1, offsets: [x, 0, 2, 2, 2, 0], fingers: [0, 1, 2, 3, 4, 1], barre: { offset: 0, from: 1, to: 5, finger: 1 } },
  'minor-a': { anchorString: 1, offsets: [x, 0, 2, 2, 1, 0], fingers: [0, 1, 3, 4, 2, 1], barre: { offset: 0, from: 1, to: 5, finger: 1 } },
  // 7th chord barres.
  'dom7-e': { anchorString: 0, offsets: [0, 2, 0, 1, 0, 0], fingers: [1, 3, 1, 2, 1, 1], barre: { offset: 0, from: 0, to: 5, finger: 1 } },
  'm7-e': { anchorString: 0, offsets: [0, 2, 0, 0, 0, 0], fingers: [1, 3, 1, 1, 1, 1], barre: { offset: 0, from: 0, to: 5, finger: 1 } },
  'maj7-e': { anchorString: 0, offsets: [0, x, 1, 1, 0, x], fingers: [1, 0, 3, 4, 2, 0] },
  'dom7-a': { anchorString: 1, offsets: [x, 0, 2, 0, 2, 0], fingers: [0, 1, 3, 1, 4, 1], barre: { offset: 0, from: 1, to: 5, finger: 1 } },
  'm7-a': { anchorString: 1, offsets: [x, 0, 2, 0, 1, 0], fingers: [0, 1, 3, 1, 2, 1], barre: { offset: 0, from: 1, to: 5, finger: 1 } },
  'maj7-a': { anchorString: 1, offsets: [x, 0, 2, 1, 2, 0], fingers: [0, 1, 3, 2, 4, 1], barre: { offset: 0, from: 1, to: 5, finger: 1 } },
  // Power chords.
  'power-6': { anchorString: 0, offsets: [0, 2, 2, x, x, x], fingers: [1, 3, 4, 0, 0, 0] },
  'power-5': { anchorString: 1, offsets: [x, 0, 2, 2, x, x], fingers: [0, 1, 3, 4, 0, 0] },
  // Slash chords. The anchor is the bass note.
  // Major over its 3rd: 3rd on the A string, root, 5th, and 3rd barred two frets lower.
  'major-over-3rd': { anchorString: 1, offsets: [x, 0, -2, -2, -2, x], fingers: [0, 3, 1, 1, 1, 0], barre: { offset: -2, from: 2, to: 4, finger: 1 } },
  // Minor over its 3rd: the shape of an open Am with C in the bass, made movable.
  'minor-over-3rd': { anchorString: 1, offsets: [x, 0, -1, -1, -2, x], fingers: [0, 4, 2, 3, 1, 0] },
  // Over the 5th: an A-shape barre with the index also on the low E string, which lands on the 5th.
  'major-over-5th': { anchorString: 0, offsets: [0, 0, 2, 2, 2, 0], fingers: [1, 1, 2, 3, 4, 1], barre: { offset: 0, from: 0, to: 5, finger: 1 } },
  'minor-over-5th': { anchorString: 0, offsets: [0, 0, 2, 2, 1, 0], fingers: [1, 1, 3, 4, 2, 1], barre: { offset: 0, from: 0, to: 5, finger: 1 } },
};

/** Fret of the anchor note on its string, moved up an octave if the shape would dip below fret 1. */
export function anchorFret(chroma: number, t: Template): number {
  let f = (((chroma - OPEN_MIDI[t.anchorString]) % 12) + 12) % 12;
  const lowest = Math.min(...t.offsets.filter((o): o is number => o !== null));
  while (f + lowest < 1) f += 12;
  return f;
}

export function movableVoicing(templateId: string, anchorChroma: number): Voicing {
  const t = TEMPLATES[templateId];
  if (!t) throw new Error(`Unknown template ${templateId}`);
  const a = anchorFret(anchorChroma, t);
  const frets = t.offsets.map((o) => (o === null ? null : a + o));
  if (frets.some((f) => f !== null && f > MAX_FRET)) throw new Error(`${templateId} runs past fret ${MAX_FRET}`);
  const barres: Barre[] = t.barre ? [{ fret: a + t.barre.offset, from: t.barre.from, to: t.barre.to, finger: t.barre.finger }] : [];
  return { frets, fingers: [...t.fingers], barres };
}
