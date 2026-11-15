import { beforeAll, describe, expect, it } from 'vitest';
import guitarJson from '@tombatossals/chords-db/lib/guitar.json';
import { setChordDb, type ChordDb } from '../src/chords/db';
import { CHORD_ITEMS, buildChordShapes } from '../src/shapes/chordShapes';
import { spellChord, CHORD_TYPES } from '../src/theory/chords';
import { ALL_ROOTS, OPEN, chromaOfName } from './helpers';

const db = guitarJson as unknown as ChordDb;
beforeAll(() => setChordDb(db));

/** Chord formulas in semitones from the root, written by hand. */
const FORMULAS: Record<string, { semis: number[]; degrees: string[]; optional?: number[] }> = {
  major: { semis: [0, 4, 7], degrees: ['1', '3', '5'] },
  minor: { semis: [0, 3, 7], degrees: ['1', 'b3', '5'] },
  power: { semis: [0, 7], degrees: ['1', '5'] },
  dom7: { semis: [0, 4, 7, 10], degrees: ['1', '3', '5', 'b7'], optional: [7] },
  maj7: { semis: [0, 4, 7, 11], degrees: ['1', '3', '5', '7'], optional: [7] },
  m7: { semis: [0, 3, 7, 10], degrees: ['1', 'b3', '5', 'b7'], optional: [7] },
  sus2: { semis: [0, 2, 7], degrees: ['1', '2', '5'], optional: [7] },
  sus4: { semis: [0, 5, 7], degrees: ['1', '4', '5'], optional: [7] },
  add9: { semis: [0, 4, 7, 2], degrees: ['1', '3', '5', '9'], optional: [7] },
};

describe('chord spelling in every key', () => {
  for (const type of Object.values(CHORD_TYPES)) {
    for (const root of ALL_ROOTS) {
      it(`${root}${type.symbol}`, () => {
        const f = FORMULAS[type.id];
        const s = spellChord(root, type);
        // The root may be respelled for readability (Dbm is written C#m) but must sound the same.
        expect(chromaOfName(s.notes[0])).toBe(chromaOfName(root));
        expect(s.notes[0]).toBe(s.root);
        // Readable: no double sharps or flats.
        for (const n of s.notes) expect(n).not.toMatch(/bb|##/);
        expect(s.degrees).toEqual(f.degrees);
        const r = chromaOfName(root);
        expect(s.notes.map((n) => (chromaOfName(n) - r + 12) % 12)).toEqual(f.semis);
      });
    }
  }
});

describe('every chord voicing in every key sounds the right notes', () => {
  for (const item of CHORD_ITEMS) {
    for (const root of ALL_ROOTS) {
      it(`${item.label(root)}`, () => {
        const shapes = buildChordShapes(db, root, item);
        const f = FORMULAS[item.type.id];
        const r = chromaOfName(root);
        for (const s of shapes) {
          const sounding = new Set(s.notes.map((n) => (n.midi - r + 1200) % 12));
          // Nothing outside the chord.
          for (const c of sounding) expect(f.semis).toContain(c);
          // Every chord tone present, except ones that are commonly left out (the 5th).
          for (const c of f.semis) {
            if (!f.optional?.includes(c)) expect(sounding.has(c)).toBe(true);
          }
          for (const n of s.notes) {
            expect(n.midi).toBe(OPEN[n.string] + n.fret);
            expect(n.fret).toBeGreaterThanOrEqual(0);
            expect(n.fret).toBeLessThanOrEqual(15);
            expect(chromaOfName(n.note)).toBe(n.midi % 12);
            if (n.fret > 0) expect([1, 2, 3, 4, 'T']).toContain(n.finger);
          }
          // Muted and sounding strings never overlap and cover all six.
          expect(s.notes.length + (s.muted?.length ?? 0)).toBe(6);
        }
      });
    }
  }
});

describe('movable shapes', () => {
  const movable = CHORD_ITEMS.filter((i) => i.source.kind === 'movable');
  for (const item of movable) {
    for (const root of ALL_ROOTS) {
      it(`${item.label(root)}: one voicing with the root as the lowest note`, () => {
        const [shape, ...rest] = buildChordShapes(db, root, item);
        expect(rest).toHaveLength(0);
        expect(shape.notes[0].isRoot).toBe(true);
        expect(shape.notes[0].string).toBe(item.id.endsWith('-e') || item.id === 'power-6' ? 0 : 1);
        if (item.group === 'barre') {
          expect(shape.barres).toHaveLength(1);
          expect(shape.barres![0].fret).toBe(shape.notes[0].fret);
          expect(shape.barres![0].to).toBe(5);
        }
      });
    }
  }

  it('A major E shape is the textbook barre at fret 5', () => {
    const item = CHORD_ITEMS.find((i) => i.id === 'barre-major-e')!;
    const [s] = buildChordShapes(db, 'A', item);
    expect(s.notes.map((n) => n.fret)).toEqual([5, 7, 7, 6, 5, 5]);
    expect(s.notes.map((n) => n.finger)).toEqual([1, 3, 4, 2, 1, 1]);
  });

  it('C major A shape is the textbook barre at fret 3', () => {
    const item = CHORD_ITEMS.find((i) => i.id === 'barre-major-a')!;
    const [s] = buildChordShapes(db, 'C', item);
    expect(s.muted).toEqual([0]);
    expect(s.notes.map((n) => n.fret)).toEqual([3, 5, 5, 5, 3]);
  });
});

describe('open chords', () => {
  const openMajor = CHORD_ITEMS.find((i) => i.id === 'open-major')!;
  const openMinor = CHORD_ITEMS.find((i) => i.id === 'open-minor')!;

  it.each(['C', 'A', 'G', 'E', 'D'])('%s major has an open shape', (root) => {
    expect(buildChordShapes(db, root, openMajor).length).toBeGreaterThan(0);
  });

  it.each(['A', 'E', 'D'])('%s minor has an open shape', (root) => {
    expect(buildChordShapes(db, root, openMinor).length).toBeGreaterThan(0);
  });

  it('every open voicing rings at least one open string and stays in the first frets', () => {
    for (const root of ALL_ROOTS) {
      for (const item of CHORD_ITEMS.filter((i) => i.group === 'open')) {
        for (const s of buildChordShapes(db, root, item)) {
          expect(s.notes.some((n) => n.fret === 0)).toBe(true);
          expect(Math.max(...s.notes.map((n) => n.fret))).toBeLessThanOrEqual(4);
        }
      }
    }
  });

  it('Bb major has no open shape, so the list can point to the barre version', () => {
    expect(buildChordShapes(db, 'Bb', openMajor)).toHaveLength(0);
  });

  it('C major open is x32010 with the usual fingers', () => {
    const [s] = buildChordShapes(db, 'C', openMajor);
    expect(s.muted).toEqual([0]);
    expect(s.notes.map((n) => n.fret)).toEqual([3, 2, 0, 1, 0]);
    expect(s.notes.map((n) => n.finger)).toEqual([3, 2, 0, 1, 0]);
  });
});

describe('chords-db data checks', () => {
  it('leaves out only a handful of faulty voicings across all keys', () => {
    let kept = 0;
    let total = 0;
    for (const item of CHORD_ITEMS.filter((i) => i.source.kind === 'all')) {
      for (const root of ALL_ROOTS) {
        const key = Object.keys(db.chords).find((k) => chromaOfName(k.replace('sharp', '#')) === chromaOfName(root))!;
        total += db.chords[key].find((c) => c.suffix === item.type.dbSuffix)!.positions.length;
        kept += buildChordShapes(db, root, item).length;
      }
    }
    expect(total - kept).toBeLessThanOrEqual(8);
    expect(kept).toBeGreaterThan(200);
  });
});
