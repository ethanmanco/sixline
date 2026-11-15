import { describe, expect, it } from 'vitest';
import { flatten, markAt, normalize, parseTimeline, sectionStarts, serializeTimeline, type Progression } from '../src/jam/timeline';

const prog: Progression = {
  sections: [
    { name: 'A', chords: ['Emaj7', 'C#7b9', 'Amaj7'] },
    { name: 'B', chords: ['F#m7', 'Bsus9'] },
  ],
};

describe('chart', () => {
  it('flattens sections in order', () => {
    expect(flatten(prog).map((c) => c.symbol)).toEqual(['Emaj7', 'C#7b9', 'Amaj7', 'F#m7', 'Bsus9']);
    expect(sectionStarts(prog)).toEqual([0, 3]);
  });
});

describe('timeline', () => {
  const tl = normalize({ marks: [{ t: 4, chord: 1 }, { t: 0.5, chord: 0 }, { t: 8, chord: 2 }] });

  it('sorts marks by time', () => {
    expect(tl.marks.map((m) => m.t)).toEqual([0.5, 4, 8]);
  });

  it('finds the chord playing at any time', () => {
    expect(markAt(tl, 0)).toBe(-1);
    expect(markAt(tl, 0.5)).toBe(0);
    expect(markAt(tl, 3.99)).toBe(0);
    expect(markAt(tl, 4)).toBe(1);
    expect(markAt(tl, 100)).toBe(2);
  });

  it('round-trips through text, and rejects bad input', () => {
    expect(parseTimeline(serializeTimeline(tl), 5)).toEqual(tl);
    expect(parseTimeline('{"marks":[[1,9]]}', 5)).toBeNull();
    expect(parseTimeline('not json', 5)).toBeNull();
  });
});
