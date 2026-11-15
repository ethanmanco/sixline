import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TRACKS, creditText, formatTime, songKey } from '../src/jam/tracks';
import { chordChromas, chordScaleFor } from '../src/theory/chordScale';
import { chromaOfName } from './helpers';
import { buildScaleShapes } from '../src/shapes/scaleShapes';
import { scaleType } from '../src/theory/scales';

const credits = readFileSync('public/jam/CREDITS.md', 'utf-8');

describe('Jam backing tracks', () => {
  it('have unique ids', () => {
    expect(new Set(TRACKS.map((t) => t.id)).size).toBe(TRACKS.length);
  });

  for (const t of TRACKS) {
    it(`${t.title}: file, license, credit, and scales are all in place`, () => {
      if (t.kind === 'youtube') {
        // Nothing is copied: it plays from YouTube, so there is no file and no copy license.
        expect(t.youtubeId).toMatch(/^[\w-]{11}$/);
        expect(t.file).toBe('');
        expect(t.source).toContain(t.youtubeId);
      } else {
        expect(existsSync(`public/jam/${t.file}`)).toBe(true);
        expect(t.source).toMatch(/^https:\/\/(ccmixter\.org|freesound\.org)\//);
        expect(['CC BY 3.0', 'CC0 1.0']).toContain(t.license.name);
        // Every file in the app is listed in the credits file with its source.
        expect(credits).toContain(t.file);
        expect(credits).toContain(t.source);
      }
      expect(creditText(t)).toContain(t.artist);
      expect(t.scales.length).toBeGreaterThan(0);
      for (const id of t.scales) expect(buildScaleShapes(t.root, scaleType(id)).length).toBeGreaterThan(1);
      // Every chord in a chart can be read and given a scale that holds all its notes.
      for (const s of t.progression?.sections ?? []) {
        for (const sym of s.chords) {
          const pick = chordScaleFor(sym, songKey(t));
          const notes = buildScaleShapes(pick.root, scaleType(pick.scaleId)).at(-1)!.info.noteNames.map(chromaOfName);
          for (const c of chordChromas(sym)) expect(notes).toContain(c);
        }
      }
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
