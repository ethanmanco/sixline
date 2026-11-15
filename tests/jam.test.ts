import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TRACKS, creditText, formatTime } from '../src/jam/tracks';
import { buildScaleShapes } from '../src/shapes/scaleShapes';
import { scaleType } from '../src/theory/scales';

const credits = readFileSync('public/jam/CREDITS.md', 'utf-8');

describe('Jam backing tracks', () => {
  it('have unique ids', () => {
    expect(new Set(TRACKS.map((t) => t.id)).size).toBe(TRACKS.length);
  });

  for (const t of TRACKS) {
    it(`${t.title}: file, license, credit, and scales are all in place`, () => {
      expect(existsSync(`public/jam/${t.file}`)).toBe(true);
      expect(t.source).toMatch(/^https:\/\/(ccmixter\.org|freesound\.org)\//);
      expect(['CC BY 3.0', 'CC0 1.0']).toContain(t.license.name);
      // Every file in the app is listed in the credits file with its source.
      expect(credits).toContain(t.file);
      expect(credits).toContain(t.source);
      expect(creditText(t)).toContain(t.artist);
      expect(t.scales.length).toBeGreaterThan(0);
      for (const id of t.scales) expect(buildScaleShapes(t.root, scaleType(id)).length).toBeGreaterThan(1);
    });
  }
});

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [59.9, '0:59'],
    [61, '1:01'],
    [283, '4:43'],
  ])('%d seconds reads %s', (s, text) => expect(formatTime(s)).toBe(text));
});
