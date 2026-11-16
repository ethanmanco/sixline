import { describe, expect, it } from 'vitest';
import { DROP2_SETS, DROP2_TYPES, buildDrop2Shapes, drop2Order } from '../src/shapes/drop2Shapes';
import { CHORD_TYPES } from '../src/theory/chords';
import { ALL_ROOTS, OPEN, chromaOfName } from './helpers';

/** Chord formulas in semitones, written by hand, in the order root, 3rd, 5th, 7th (or 6th). */
const FORMULAS: Record<string, number[]> = {
  maj7: [0, 4, 7, 11],
  dom7: [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  six: [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
};

describe('drop 2 order', () => {
  it('drops the second-highest note of each close voicing', () => {
    // Close root position C E G B: dropping G gives G C E B, the 5th in the bass.
    expect(drop2Order(2)).toEqual([2, 0, 1, 3]);
    // Root in the bass: C G B E.
    expect(drop2Order(0)).toEqual([0, 2, 3, 1]);
  });
});

describe('drop 2 voicings in every key, on every string group', () => {
  for (const set of DROP2_SETS) {
    for (const type of DROP2_TYPES) {
      for (const root of ALL_ROOTS) {
        it(`${root} ${type.label} on ${set.short}`, () => {
          const shapes = buildDrop2Shapes(root, type, set);
          expect(shapes).toHaveLength(4);
          const r = chromaOfName(root);
          const tones = FORMULAS[type.id].map((x) => (r + x) % 12);
          shapes.forEach((s, bass) => {
            expect(s.notes.map((n) => n.string)).toEqual([set.low, set.low + 1, set.low + 2, set.low + 3]);
            // Bottom to top the chord tones follow the drop 2 pattern, so the named tone is in the bass.
            expect(s.notes.map((n) => n.midi % 12)).toEqual(drop2Order(bass).map((i) => tones[i]));
            for (let i = 1; i < 4; i++) expect(s.notes[i].midi).toBeGreaterThan(s.notes[i - 1].midi);
            // A drop 2 voicing spans more than an octave but less than two.
            const spread = s.notes[3].midi - s.notes[0].midi;
            expect(spread).toBeGreaterThan(12);
            expect(spread).toBeLessThan(24);
            const frets = s.notes.map((n) => n.fret);
            expect(Math.max(...frets) - Math.min(...frets)).toBeLessThanOrEqual(4);
            for (const n of s.notes) {
              expect(n.midi).toBe(OPEN[n.string] + n.fret);
              expect(n.fret).toBeLessThanOrEqual(15);
              expect(chromaOfName(n.note)).toBe(n.midi % 12);
            }
            expect(s.muted).toHaveLength(2);
          });
        });
      }
    }
  }
});

describe('textbook drop 2 shapes', () => {
  const top = DROP2_SETS.find((s) => s.id === 'dgbe')!;
  it('Cmaj7 with the root in the bass on D G B e is 10 12 12 12', () => {
    expect(buildDrop2Shapes('C', CHORD_TYPES.maj7, top)[0].notes.map((n) => n.fret)).toEqual([10, 12, 12, 12]);
  });
  it('G7 with the root in the bass on D G B e is 5 7 6 7', () => {
    expect(buildDrop2Shapes('G', CHORD_TYPES.dom7, top)[0].notes.map((n) => n.fret)).toEqual([5, 7, 6, 7]);
  });
  it('labels inversions by the bass note', () => {
    const shapes = buildDrop2Shapes('C', CHORD_TYPES.maj7, top);
    expect(shapes.map((s) => s.symbol)).toEqual(['Cmaj7', 'Cmaj7/E', 'Cmaj7/G', 'Cmaj7/B']);
    expect(shapes.map((s) => s.position?.label)).toEqual(['Root', '3', '5', '7']);
  });
});
