import { describe, expect, it } from 'vitest';
import type { Shape } from '../src/core/types';
import { ARPEGGIO_TYPES, buildArpeggioShapes } from '../src/shapes/arpeggioShapes';
import { buildScaleShapes } from '../src/shapes/scaleShapes';
import { SCALE_TYPES, scaleType } from '../src/theory/scales';
import { ALL_ROOTS, OPEN, chromaOfName } from './helpers';

/** Arpeggio formulas in semitones from the root, written by hand. */
const ARP_FORMULAS: Record<string, { semis: number[]; degrees: string[] }> = {
  major: { semis: [0, 4, 7], degrees: ['1', '3', '5'] },
  minor: { semis: [0, 3, 7], degrees: ['1', 'b3', '5'] },
  dom7: { semis: [0, 4, 7, 10], degrees: ['1', '3', '5', 'b7'] },
  maj7: { semis: [0, 4, 7, 11], degrees: ['1', '3', '5', '7'] },
  m7: { semis: [0, 3, 7, 10], degrees: ['1', 'b3', '5', 'b7'] },
  m7b5: { semis: [0, 3, 6, 10], degrees: ['1', 'b3', 'b5', 'b7'] },
  dim7: { semis: [0, 3, 6, 9], degrees: ['1', 'b3', 'b5', 'bb7'] },
  dim: { semis: [0, 3, 6], degrees: ['1', 'b3', 'b5'] },
  aug: { semis: [0, 4, 8], degrees: ['1', '3', '#5'] },
  mmaj7: { semis: [0, 3, 7, 11], degrees: ['1', 'b3', '5', '7'] },
  six: { semis: [0, 4, 7, 9], degrees: ['1', '3', '5', '6'] },
  m6: { semis: [0, 3, 7, 9], degrees: ['1', 'b3', '5', '6'] },
  nine: { semis: [0, 4, 7, 10, 2], degrees: ['1', '3', '5', 'b7', '9'] },
};

function frets(shape: Shape): string {
  const byString: number[][] = [[], [], [], [], [], []];
  for (const n of shape.notes) byString[n.string].push(n.fret);
  return byString.map((f) => f.join(' ')).join(' | ');
}

/** Checks shared by every position of every scale and arpeggio. */
function checkPosition(s: Shape, chromas: Set<number>, rootChroma: number) {
  const midis = s.notes.map((n) => n.midi);
  expect(new Set(midis).size).toBe(midis.length);
  for (let i = 1; i < s.notes.length; i++) expect(s.notes[i].midi).toBeGreaterThan(s.notes[i - 1].midi);
  for (const n of s.notes) {
    expect(n.fret).toBeGreaterThanOrEqual(0);
    expect(n.fret).toBeLessThanOrEqual(15);
    expect(n.midi).toBe(OPEN[n.string] + n.fret);
    expect(chromas.has(n.midi % 12)).toBe(true);
    expect(chromaOfName(n.note)).toBe(n.midi % 12);
    expect(n.isRoot).toBe(n.midi % 12 === rootChroma);
  }
  // Every note of the scale or arpeggio shows up in every position.
  expect(new Set(midis.map((m) => m % 12))).toEqual(chromas);
}

/** One finger per fret inside the window, shifts marked, open strings unfingered. */
function checkWindowFingers(s: Shape) {
  const open = s.notes.some((n) => n.fret === 0);
  const anchor = s.notes.find((n) => typeof n.finger === 'number' && n.finger > 0 && !n.shift)!;
  const lo = anchor.fret - (anchor.finger as number) + 1;
  if (open) expect(lo).toBe(1);
  for (const n of s.notes) {
    if (n.fret === 0) expect(n.finger).toBe(0);
    else if (n.shift) {
      expect(n.shift).toBe('down');
      expect(n.finger).toBe(1);
      expect(n.fret).toBe(lo - 1);
    } else {
      expect(n.finger).toBe(n.fret - lo + 1);
      expect(n.fret).toBeLessThanOrEqual(lo + 3);
    }
  }
}

describe('every scale in every key: positions and whole neck', () => {
  for (const type of SCALE_TYPES) {
    for (const root of ALL_ROOTS) {
      it(`${root} ${type.label}`, () => {
        const shapes = buildScaleShapes(root, type);
        const positions = shapes.filter((s) => s.position);
        const neck = shapes.find((s) => !s.position)!;
        const scaleChromas = shapes[0].info.noteNames.map(chromaOfName);
        const chromas = new Set(scaleChromas);
        const r = chromaOfName(root);
        expect(positions).toHaveLength(type.family === 'window' ? scaleChromas.length : 5);
        for (const s of positions) {
          checkPosition(s, chromas, r);
          expect(s.fingeringSource).toBe('suggested');
          if (type.family === 'window') checkWindowFingers(s);
        }
        // Position k starts on scale note k on the low E string (blues follows the pentatonic boxes).
        if (type.family === 'window') {
          expect(positions.map((s) => s.notes[0].midi % 12)).toEqual(scaleChromas);
        }
        // Whole neck: every scale note on every string, played once per pitch, low to high.
        let expected = 0;
        for (const open of OPEN) for (let f = 0; f <= 15; f++) if (chromas.has((open + f) % 12)) expected++;
        expect(neck.notes).toHaveLength(expected);
        const played = neck.playOrder!.map((i) => neck.notes[i].midi);
        expect(played).toEqual([...new Set(neck.notes.map((n) => n.midi))].sort((a, b) => a - b));
      });
    }
  }
});

describe('textbook shapes', () => {
  it('A major, position 1: index on fret 5, reaching back on the higher strings', () => {
    const [p1] = buildScaleShapes('A', scaleType('major'));
    expect(frets(p1)).toBe('5 7 | 4 5 7 | 4 6 7 | 4 6 7 | 5 7 | 4 5 7');
    expect(p1.notes.filter((n) => n.shift).map((n) => n.string)).toEqual([1, 2, 3, 5]);
  });

  it('E natural minor, position 1 is the open position', () => {
    const [p1] = buildScaleShapes('E', scaleType('natural-minor'));
    expect(frets(p1)).toBe('0 2 3 | 0 2 3 | 0 2 4 | 0 2 | 0 1 3 | 0 2 3');
  });

  it('A blues, position 1 is the minor pentatonic box with the flat 5 added', () => {
    const [p1] = buildScaleShapes('A', scaleType('blues'));
    expect(frets(p1)).toBe('5 8 | 5 6 7 | 5 7 | 5 7 8 | 5 8 | 5 8');
    expect(p1.notes.filter((n) => n.degree === 'b5')).toHaveLength(2);
  });
});

describe('every arpeggio in every key', () => {
  for (const type of ARPEGGIO_TYPES) {
    for (const root of ALL_ROOTS) {
      it(`${root}${type.symbol} arpeggio`, () => {
        const shapes = buildArpeggioShapes(root, type);
        const f = ARP_FORMULAS[type.id];
        const r = chromaOfName(root);
        const chromas = new Set(f.semis.map((x) => (r + x) % 12));
        expect(shapes[0].info.intervals).toEqual(f.degrees);
        const positions = shapes.filter((s) => s.position);
        expect(positions).toHaveLength(f.semis.length);
        for (const s of positions) {
          checkPosition(s, chromas, r);
          checkWindowFingers(s);
          expect(s.kind).toBe('arpeggio');
        }
      });
    }
  }
});
