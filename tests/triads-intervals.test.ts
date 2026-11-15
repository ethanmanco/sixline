import { describe, expect, it } from 'vitest';
import { INTERVAL_TYPES, RUN_TYPES, buildIntervalShapes, buildRunShapes } from '../src/shapes/intervalShapes';
import { STRING_SETS, TRIAD_TYPES, buildTriadShapes } from '../src/shapes/triadShapes';
import { ALL_ROOTS, OPEN, chromaOfName } from './helpers';

/** Triad formulas in semitones, written by hand. */
const TRIADS: Record<string, number[]> = { major: [0, 4, 7], minor: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8] };
const INTERVAL_SEMIS: Record<string, number> = { m3: 3, M3: 4, P4: 5, TT: 6, P5: 7, m6: 8, M6: 9, P8: 12 };
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

describe('triads on every string set, in every key', () => {
  for (const set of STRING_SETS) {
    for (const type of TRIAD_TYPES) {
      for (const root of ALL_ROOTS) {
        it(`${root} ${type.label} on ${set.short}`, () => {
          const shapes = buildTriadShapes(root, type, set);
          expect(shapes).toHaveLength(3);
          const r = chromaOfName(root);
          const formula = TRIADS[type.id].map((x) => (r + x) % 12);
          shapes.forEach((s, inv) => {
            expect(s.notes.map((n) => n.string)).toEqual([set.low, set.low + 1, set.low + 2]);
            for (let i = 1; i < 3; i++) expect(s.notes[i].midi).toBeGreaterThan(s.notes[i - 1].midi);
            expect(new Set(s.notes.map((n) => n.midi % 12))).toEqual(new Set(formula));
            // Root position has the root in the bass, then the 3rd, then the 5th.
            expect(s.notes[0].midi % 12).toBe(formula[inv]);
            const frets = s.notes.map((n) => n.fret);
            for (const n of s.notes) {
              expect(n.midi).toBe(OPEN[n.string] + n.fret);
              expect(chromaOfName(n.note)).toBe(n.midi % 12);
              expect(n.fret).toBeLessThanOrEqual(15);
              expect(n.fret === 0 ? n.finger === 0 : [1, 2, 3, 4].includes(n.finger as number)).toBe(true);
            }
            expect(Math.max(...frets) - Math.min(...frets)).toBeLessThanOrEqual(4);
            expect(s.muted).toHaveLength(3);
          });
        });
      }
    }
  }

  it('C major on G, B, and high E: the three textbook shapes', () => {
    const set = STRING_SETS.find((s) => s.id === 'gbe')!;
    const [root, first, second] = buildTriadShapes('C', TRIAD_TYPES[0], set);
    expect(root.notes.map((n) => n.fret)).toEqual([5, 5, 3]);
    expect(first.notes.map((n) => n.fret)).toEqual([9, 8, 8]);
    expect(second.notes.map((n) => n.fret)).toEqual([12, 13, 12]);
    expect(first.symbol).toBe('C/E');
  });
});

describe('interval shapes in every key', () => {
  for (const t of INTERVAL_TYPES) {
    for (const root of ALL_ROOTS) {
      it(`${t.label} from ${root}`, () => {
        const shapes = buildIntervalShapes(root, t);
        expect(shapes.length).toBeGreaterThanOrEqual(4);
        for (const s of shapes) {
          const [lo, hi] = s.notes;
          expect(lo.midi % 12).toBe(chromaOfName(root));
          expect(hi.midi - lo.midi).toBe(INTERVAL_SEMIS[t.id]);
          expect(hi.string - lo.string).toBe(t.pairs === 'adjacent' ? 1 : 2);
          for (const n of s.notes) {
            expect(n.fret).toBeGreaterThanOrEqual(1);
            expect(n.fret).toBeLessThanOrEqual(15);
            expect(chromaOfName(n.note)).toBe(n.midi % 12);
          }
        }
      });
    }
  }
});

describe('double-stop runs in every key', () => {
  for (const run of RUN_TYPES) {
    for (const root of ALL_ROOTS) {
      it(`${run.label} in ${root}`, () => {
        const [s] = buildRunShapes(root, run);
        const r = chromaOfName(root);
        const scale = new Set(MAJOR.map((x) => (r + x) % 12));
        expect(s.playSteps!.length).toBeGreaterThanOrEqual(8);
        let prev = -1;
        for (const [a, b] of s.playSteps!) {
          const lo = s.notes[a];
          const hi = s.notes[b];
          expect(lo.string).toBe(run.lower);
          expect(hi.string).toBe(run.upper);
          expect(scale.has(lo.midi % 12) && scale.has(hi.midi % 12)).toBe(true);
          const gap = hi.midi - lo.midi;
          expect(run.steps === 2 ? [3, 4] : [8, 9]).toContain(gap);
          expect(lo.midi).toBeGreaterThan(prev);
          prev = lo.midi;
        }
      });
    }
  }
});
