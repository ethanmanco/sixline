import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TRACKS, creditText, formatTime, localToTrack, songKey } from '../src/jam/tracks';
import { fileId } from '../src/jam/localTracks';
import { chordChromas, chordScaleFor } from '../src/theory/chordScale';
import { chromaOfName } from './helpers';
import { buildScaleShapes } from '../src/shapes/scaleShapes';
import { scaleType } from '../src/theory/scales';

const credits = readFileSync('public/jam/CREDITS.md', 'utf-8');

describe('Jam backing tracks', () => {
  it('ship only files that are in the track list', () => {
    const files = readdirSync('public/jam').filter((f) => f.endsWith('.mp3')).sort();
    expect(files).toEqual(TRACKS.map((t) => t.file).sort());
  });

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

describe('your tracks', () => {
  const meta = {
    id: 'local-abc',
    title: 'My jam',
    fileName: 'My jam.mp3',
    size: 1,
    durationSec: 200,
    root: 'E',
    minor: false,
    alternatives: [],
    keyEstimated: true,
    bpm: 96,
    bpmEstimated: true,
    chart: 'A: Emaj7 C#7b9 Amaj7 Am6',
    added: 0,
  };

  it('become playable tracks with the key, scales, and chart', () => {
    const t = localToTrack(meta, 'blob:x');
    expect(t).toMatchObject({ id: 'local-abc', local: true, src: 'blob:x', root: 'E', keyLabel: 'E major', bpm: 96 });
    expect(t.progression?.sections[0].chords).toEqual(['Emaj7', 'C#7b9', 'Amaj7', 'Am6']);
    expect(t.scales).toContain('major');
    expect(localToTrack({ ...meta, minor: true }, '').scales[0]).toBe('minor-pentatonic');
    expect(localToTrack({ ...meta, chart: '' }, '').progression).toBeUndefined();
  });

  it('get the same id for the same file', () => {
    const f = { name: 'a.mp3', size: 10, lastModified: 5 };
    expect(fileId(f)).toBe(fileId({ ...f }));
    expect(fileId(f)).not.toBe(fileId({ ...f, size: 11 }));
    expect(fileId(f)).toMatch(/^local-/);
  });
});
