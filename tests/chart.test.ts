import { describe, expect, it } from 'vitest';
import { chartToText, parseChart } from '../src/jam/chart';

describe('chord chart parser', () => {
  it('reads a chart pasted with section labels and dashes', () => {
    const text = `A section

Emaj7-C#sus9-C#7b9- Amaj7-Am6

G#m7-C#9- F#m7 - G#m7 - Amaj7 - Bsus9

B Section

Amaj7 - Am6 - Emaj7 -C#7b9

F#m7-Bsus9-Emaj7-C#7sus-C#7`;
    const { progression, unknown } = parseChart(text);
    expect(unknown).toEqual([]);
    expect(progression.sections.map((s) => s.name)).toEqual(['A', 'B']);
    expect(progression.sections[0].chords).toEqual(['Emaj7', 'C#sus9', 'C#7b9', 'Amaj7', 'Am6', 'G#m7', 'C#9', 'F#m7', 'G#m7', 'Amaj7', 'Bsus9']);
    expect(progression.sections[1].chords).toHaveLength(9);
  });

  it('reads "Name: chords" lines and bar lines', () => {
    const { progression } = parseChart('Verse: | Am | F | C | G |\nChorus: F G Am');
    expect(progression.sections).toEqual([
      { name: 'Verse', chords: ['Am', 'F', 'C', 'G'] },
      { name: 'Chorus', chords: ['F', 'G', 'Am'] },
    ]);
  });

  it('puts chords before any label in section A, and reports words that are not chords', () => {
    const { progression, unknown } = parseChart('Am9 Gm9 Xyz');
    expect(progression.sections).toEqual([{ name: 'A', chords: ['Am9', 'Gm9'] }]);
    expect(unknown).toEqual(['Xyz']);
  });

  it('round-trips through text', () => {
    const p = parseChart('A: Am7 D7\nB: Gmaj7 Cmaj7').progression;
    expect(parseChart(chartToText(p)).progression).toEqual(p);
  });
});
