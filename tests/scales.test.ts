import { describe, expect, it } from 'vitest';
import { SCALE_TYPES, spellScale, scaleType } from '../src/theory/scales';
import { degreeLabel } from '../src/theory/spelling';
import { ALL_ROOTS, chromaOfName } from './helpers';

/** Semitone formulas written out by hand, independent of tonal. */
const FORMULAS: Record<string, { semis: number[]; degrees: string[] }> = {
  'minor-pentatonic': { semis: [0, 3, 5, 7, 10], degrees: ['1', 'b3', '4', '5', 'b7'] },
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
        expect(s.notes[0]).toBe(root);
        expect(s.degrees).toEqual(formula.degrees);
        const rootChroma = chromaOfName(root);
        const got = s.notes.map((n) => (chromaOfName(n) - rootChroma + 12) % 12);
        expect(got).toEqual(formula.semis);
        // No two notes share a letter in a five-note scale either.
        expect(new Set(s.notes.map((n) => n[0])).size).toBe(s.notes.length);
      });
    }
  }
});

describe('A minor pentatonic spelling', () => {
  it('matches the textbook notes', () => {
    expect(spellScale('A', scaleType('minor-pentatonic')).notes).toEqual(['A', 'C', 'D', 'E', 'G']);
  });
  it('spells Eb minor pentatonic with flats', () => {
    expect(spellScale('Eb', scaleType('minor-pentatonic')).notes).toEqual(['Eb', 'Gb', 'Ab', 'Bb', 'Db']);
  });
});
