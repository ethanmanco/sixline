import { describe, expect, it } from 'vitest';
import { assignFingers } from '../src/fingering/fingers';
import { buildScaleShapes } from '../src/shapes/scaleShapes';
import { SCALE_TYPES, scaleType } from '../src/theory/scales';
import type { Shape } from '../src/core/types';
import { ALL_ROOTS, OPEN, chromaOfName } from './helpers';

const pentatonics = SCALE_TYPES.filter((t) => t.family === 'pentatonic');

function frets(shape: Shape): string {
  // Compact picture of a box, low E first: "5 8 | 5 7 | ..."
  const byString: number[][] = [[], [], [], [], [], []];
  for (const n of shape.notes) byString[n.string].push(n.fret);
  return byString.map((f) => f.join(' ')).join(' | ');
}

describe('assignFingers', () => {
  it('puts one finger on each fret of a four-fret window', () => {
    const hand = assignFingers([
      { string: 0, fret: 5 },
      { string: 0, fret: 6 },
      { string: 0, fret: 7 },
      { string: 0, fret: 8 },
    ]);
    expect(hand.lo).toBe(5);
    expect(hand.fingers.map((f) => f.finger)).toEqual([1, 2, 3, 4]);
  });

  it('marks a note outside the window as a shift', () => {
    const hand = assignFingers(
      [
        { string: 0, fret: 10 },
        { string: 3, fret: 9 },
        { string: 4, fret: 13 },
      ],
      10,
    );
    expect(hand.lo).toBe(10);
    expect(hand.fingers[1]).toEqual({ finger: 1, shift: 'down' });
    expect(hand.fingers[2]).toEqual({ finger: 4 });
  });

  it('leaves open strings without a finger', () => {
    const hand = assignFingers([
      { string: 0, fret: 0 },
      { string: 0, fret: 3 },
    ]);
    expect(hand.fingers[0]).toEqual({ finger: 0 });
    expect(hand.fingers[1].finger).toBe(3);
  });
});

describe('A minor pentatonic, the five textbook boxes', () => {
  const shapes = buildScaleShapes('A', scaleType('minor-pentatonic'));
  it('has five positions', () => expect(shapes).toHaveLength(5));
  it.each([
    [1, '5 8 | 5 7 | 5 7 | 5 7 | 5 8 | 5 8'],
    [2, '8 10 | 7 10 | 7 10 | 7 9 | 8 10 | 8 10'],
    [3, '10 12 | 10 12 | 10 12 | 9 12 | 10 13 | 10 12'],
    [4, '12 15 | 12 15 | 12 14 | 12 14 | 13 15 | 12 15'],
    [5, '3 5 | 3 5 | 2 5 | 2 5 | 3 5 | 3 5'],
  ])('position %i', (pos, expected) => {
    expect(frets(shapes[pos - 1])).toBe(expected);
  });
  it('fingers position 1 with index on 5 and pinky on 8', () => {
    const fingers = shapes[0].notes.map((n) => n.finger).join('');
    expect(fingers).toBe('141313131414');
  });
});

describe('every pentatonic position in every key', () => {
  for (const type of pentatonics) {
    for (const root of ALL_ROOTS) {
      const shapes = buildScaleShapes(root, type);
      const rootChroma = chromaOfName(root);
      const scaleChromas = new Set(shapes[0].info.noteNames.map(chromaOfName));

      it(`${root} ${type.label}: 5 positions with 2 notes per string`, () => {
        expect(shapes).toHaveLength(5);
        for (const s of shapes) {
          expect(s.notes).toHaveLength(12);
          for (let str = 0; str < 6; str++) {
            expect(s.notes.filter((n) => n.string === str)).toHaveLength(2);
          }
        }
      });

      it(`${root} ${type.label}: every note is in the scale, on the neck, and correctly labeled`, () => {
        for (const s of shapes) {
          for (const n of s.notes) {
            expect(n.fret).toBeGreaterThanOrEqual(0);
            expect(n.fret).toBeLessThanOrEqual(15);
            expect(n.midi).toBe(OPEN[n.string] + n.fret);
            expect(scaleChromas.has(n.midi % 12)).toBe(true);
            expect(chromaOfName(n.note)).toBe(n.midi % 12);
            expect(n.isRoot).toBe(n.midi % 12 === rootChroma);
          }
        }
      });

      it(`${root} ${type.label}: notes climb in pitch, string by string`, () => {
        for (const s of shapes) {
          for (let i = 1; i < s.notes.length; i++) {
            expect(s.notes[i].midi).toBeGreaterThan(s.notes[i - 1].midi);
            expect(s.notes[i].string).toBeGreaterThanOrEqual(s.notes[i - 1].string);
          }
        }
      });

      it(`${root} ${type.label}: one finger per fret, shifts marked`, () => {
        for (const s of shapes) {
          const fretted = s.notes.filter((n) => n.fret > 0 && !n.shift);
          // Open positions keep the index on fret 1.
          const hasOpen = s.notes.some((n) => n.fret === 0);
          const lo = hasOpen ? 1 : Math.min(...fretted.map((n) => n.fret));
          for (const n of s.notes) {
            if (n.fret === 0) {
              expect(n.finger).toBe(0);
            } else if (n.shift) {
              expect(n.finger).toBe(n.shift === 'up' ? 4 : 1);
            } else {
              expect(n.finger).toBe(n.fret - lo + 1);
            }
          }
          // At most one shift per position keeps the boxes playable.
          expect(s.notes.filter((n) => n.shift).length).toBeLessThanOrEqual(1);
        }
      });

      it(`${root} ${type.label}: the five positions together cover every scale note on the low E string`, () => {
        const starts = new Set(shapes.map((s) => s.notes[0].midi % 12));
        expect(starts).toEqual(scaleChromas);
      });
    }
  }
});
