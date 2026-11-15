import { describe, expect, it } from 'vitest';
import { SCALE_TYPES, spellScale, scaleType } from '../src/theory/scales';
import { degreeLabel } from '../src/theory/spelling';
import { ALL_ROOTS, chromaOfName } from './helpers';

/** Semitone formulas written out by hand, independent of tonal. */
const FORMULAS: Record<string, { semis: number[]; degrees: string[] }> = {
  'minor-pentatonic': { semis: [0, 3, 5, 7, 10], degrees: ['1', 'b3', '4', '5', 'b7'] },
  'major-pentatonic': { semis: [0, 2, 4, 7, 9], degrees: ['1', '2', '3', '5', '6'] },
  blues: { semis: [0, 3, 5, 6, 7, 10], degrees: ['1', 'b3', '4', 'b5', '5', 'b7'] },
  major: { semis: [0, 2, 4, 5, 7, 9, 11], degrees: ['1', '2', '3', '4', '5', '6', '7'] },
  'natural-minor': { semis: [0, 2, 3, 5, 7, 8, 10], degrees: ['1', '2', 'b3', '4', '5', 'b6', 'b7'] },
  dorian: { semis: [0, 2, 3, 5, 7, 9, 10], degrees: ['1', '2', 'b3', '4', '5', '6', 'b7'] },
  phrygian: { semis: [0, 1, 3, 5, 7, 8, 10], degrees: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'] },
  lydian: { semis: [0, 2, 4, 6, 7, 9, 11], degrees: ['1', '2', '3', '#4', '5', '6', '7'] },
  mixolydian: { semis: [0, 2, 4, 5, 7, 9, 10], degrees: ['1', '2', '3', '4', '5', '6', 'b7'] },
  locrian: { semis: [0, 1, 3, 5, 6, 8, 10], degrees: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'] },
  'major-blues': { semis: [0, 2, 3, 4, 7, 9], degrees: ['1', '2', 'b3', '3', '5', '6'] },
  'harmonic-minor': { semis: [0, 2, 3, 5, 7, 8, 11], degrees: ['1', '2', 'b3', '4', '5', 'b6', '7'] },
  'melodic-minor': { semis: [0, 2, 3, 5, 7, 9, 11], degrees: ['1', '2', 'b3', '4', '5', '6', '7'] },
  'phrygian-dominant': { semis: [0, 1, 4, 5, 7, 8, 10], degrees: ['1', 'b2', '3', '4', '5', 'b6', 'b7'] },
  'whole-tone': { semis: [0, 2, 4, 6, 8, 10], degrees: ['1', '2', '3', '#4', '#5', '#6'] },
  'diminished-wh': { semis: [0, 2, 3, 5, 6, 8, 9, 11], degrees: ['1', '2', 'b3', '4', 'b5', 'b6', '6', '7'] },
  'diminished-hw': { semis: [0, 1, 3, 4, 6, 7, 9, 10], degrees: ['1', 'b2', 'b3', '3', '#4', '5', '6', 'b7'] },
};

describe('degreeLabel', () => {
  it.each([
    ['1P', '1'],
    ['2M', '2'],
    ['3m', 'b3'],
    ['3M', '3'],
    ['4P', '4'],
    ['4A', '#4'],
    ['5d', 'b5'],
    ['5P', '5'],
    ['6m', 'b6'],
    ['7m', 'b7'],
    ['7M', '7'],
    ['7d', 'bb7'],
    ['8P', '1'],
  ])('%s reads as %s', (iv, label) => {
    expect(degreeLabel(iv)).toBe(label);
  });
});

describe('every scale in every key', () => {
  for (const type of SCALE_TYPES) {
    const formula = FORMULAS[type.id];
    it(`${type.label} has a hand-written formula to check against`, () => {
      expect(formula).toBeDefined();
    });
    for (const root of ALL_ROOTS) {
      it(`${root} ${type.label}`, () => {
        const s = spellScale(root, type);
        // The root may be respelled (Db locrian is written C# locrian) but must sound the same.
        expect(chromaOfName(s.notes[0])).toBe(chromaOfName(root));
        expect(s.notes[0]).toBe(s.root);
        expect(s.degrees).toEqual(formula.degrees);
        const rootChroma = chromaOfName(root);
        const got = s.notes.map((n) => (chromaOfName(n) - rootChroma + 12) % 12);
        expect(got).toEqual(formula.semis);
        // Each letter once, except the blues scales, which repeat one letter for the blue note,
        // and the eight-note diminished scales, which cannot fit in seven letters.
        const letters = new Set(s.notes.map((n) => n[0])).size;
        if (type.family === 'blues') expect(letters).toBe(s.notes.length - 1);
        else if (s.notes.length <= 7) expect(letters).toBe(s.notes.length);
        // Readable: no double sharps or flats.
        for (const n of s.notes) expect(n).not.toMatch(/bb|##/);
      });
    }
  }
});

describe('A minor pentatonic spelling', () => {
  it('matches the textbook notes', () => {
    expect(spellScale('A', scaleType('minor-pentatonic')).notes).toEqual(['A', 'C', 'D', 'E', 'G']);
  });
  it('writes Db dorian as C# dorian, but keeps Db major and Eb minor', () => {
    expect(spellScale('Db', scaleType('dorian')).root).toBe('C#');
    expect(spellScale('Db', scaleType('major')).root).toBe('Db');
    expect(spellScale('Eb', scaleType('natural-minor')).root).toBe('Eb');
    expect(spellScale('F#', scaleType('major')).root).toBe('F#');
  });

  it('spells Eb minor pentatonic with flats', () => {
    expect(spellScale('Eb', scaleType('minor-pentatonic')).notes).toEqual(['Eb', 'Gb', 'Ab', 'Bb', 'Db']);
  });
});
