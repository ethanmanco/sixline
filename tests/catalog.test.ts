import { beforeAll, describe, expect, it } from 'vitest';
import guitarJson from '@tombatossals/chords-db/lib/guitar.json';
import { setChordDb, type ChordDb } from '../src/chords/db';
import { ITEMS } from '../src/learn/catalog';
import { KEYS, normalizeKey } from '../src/theory/keys';
import { chromaOfName } from './helpers';

beforeAll(() => setChordDb(guitarJson as unknown as ChordDb));

describe('key picker', () => {
  it('offers all twelve keys, one per pitch', () => {
    expect(new Set(KEYS.map(chromaOfName)).size).toBe(12);
  });

  it.each([
    ['A', 'A'],
    ['c#', 'Db'],
    ['C#', 'Db'],
    ['Gb', 'F#'],
    ['bb', 'Bb'],
    ['A#', 'Bb'],
    ['H', null],
    ['', null],
  ])('reads %s as %s', (raw, key) => {
    expect(normalizeKey(raw)).toBe(key);
  });
});

describe('every Learn item builds in every key', () => {
  for (const key of KEYS) {
    it(`key of ${key}`, () => {
      for (const item of ITEMS) {
        const shapes = item.build(key);
        // Only open chords may be missing in some keys, and they always offer a fallback.
        if (shapes.length === 0) expect(item.fallback).toBeDefined();
        for (const s of shapes) {
          expect(chromaOfName(s.root)).toBe(chromaOfName(key));
          expect(s.notes.length).toBeGreaterThan(0);
        }
      }
    });
  }
});
