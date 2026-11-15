import { describe, expect, it } from 'vitest';
import { Note, Scale } from 'tonal';
import { chordChromas, chordScaleFor, normalizeSymbol } from '../src/theory/chordScale';
import { scaleType } from '../src/theory/scales';

const E = { root: 'E', minor: false };
const C = { root: 'C', minor: false };
const Am = { root: 'A', minor: true };

const pick = (sym: string, key = C) => {
  const r = chordScaleFor(sym, key);
  return `${r.root} ${r.scaleId}`;
};

describe('reading chord symbols', () => {
  it.each([
    ['C#sus9', 'C#9sus4'],
    ['C#7sus', 'C#7sus4'],
    ['Cm(maj7)', 'CmMaj7'],
    ['Emaj7', 'Emaj7'],
  ])('%s reads as %s', (a, b) => expect(normalizeSymbol(a)).toBe(b));
});

describe('a jam track in E (Emaj7, C#7b9, Am6, C#9, ...)', () => {
  it.each([
    ['Emaj7', 'E major'],
    ['Amaj7', 'E major'],
    ['F#m7', 'E major'],
    ['G#m7', 'E major'],
    ['Bsus9', 'E major'],
    ['C#sus9', 'E major'],
    ['C#7sus', 'E major'],
    ['C#7b9', 'C# phrygian-dominant'],
    ['Am6', 'A melodic-minor'],
    ['C#9', 'F# melodic-minor'],
    ['C#7', 'F# melodic-minor'],
  ])('%s gets %s', (sym, expected) => expect(pick(sym, E)).toBe(expected));

  it('names the mode each in-key chord sees', () => {
    expect(chordScaleFor('F#m7', E).modeOverChord).toBe('F# Dorian');
    expect(chordScaleFor('Amaj7', E).modeOverChord).toBe('A Lydian');
    expect(chordScaleFor('G#m7', E).modeOverChord).toBe('G# Phrygian');
  });
});

describe('textbook chord-scale choices', () => {
  it.each([
    ['G7', C, 'C major'], // V7 is in the key
    ['A7', C, 'D melodic-minor'], // V of ii
    ['E7', C, 'A melodic-minor'], // V of vi
    ['D7', C, 'D mixolydian'], // V of V, a major target
    ['Bb', C, 'Bb lydian'], // borrowed bVII
    ['Fm6', C, 'F melodic-minor'], // borrowed iv
    ['C7b9', C, 'C phrygian-dominant'],
    ['C7#9', C, 'C diminished-hw'],
    ['Ebdim7', C, 'Eb diminished-wh'],
    ['F#m7b5', C, 'F# locrian'],
    ['Caug', C, 'C whole-tone'],
    ['E7', Am, 'E phrygian-dominant'], // V7 in a minor key
    ['Dm7', Am, 'A natural-minor'],
  ])('%s gets %s', (sym, key, expected) => expect(pick(sym, key)).toBe(expected));
});

describe('every suggestion contains every chord tone', () => {
  const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const qualities = ['', 'm', '7', 'maj7', 'm7', 'm7b5', 'dim7', 'aug', '6', 'm6', '9', '7b9', '7#9', 'sus4', '7sus4', 'add9', 'mMaj7'];
  for (const key of [C, E, Am, { root: 'Bb', minor: false }]) {
    it(`in ${key.root} ${key.minor ? 'minor' : 'major'}`, () => {
      for (const r of roots) {
        for (const q of qualities) {
          const sym = `${r}${q}`;
          const s = chordScaleFor(sym, key);
          const notes = Scale.get(`${s.root} ${scaleType(s.scaleId).tonalName}`).notes.map((n) => Note.chroma(n));
          for (const c of chordChromas(sym)) expect(notes, `${sym} in ${key.root}: ${s.label}`).toContain(c);
        }
      }
    });
  }
});
