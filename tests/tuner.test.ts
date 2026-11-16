import { describe, expect, it } from 'vitest';
import { centsOff, detectPitch, freqOfMidi, halve, nearestNote, rms } from '../src/tuner/pitch';
import { TUNINGS, nearestString, tuningMidis } from '../src/tuner/tunings';

const RATE = 24000;

/** A plucked-string-like tone: a fundamental with decaying harmonics. */
function pluck(freq: number, seconds = 0.12, rate = RATE): Float32Array {
  const out = new Float32Array(Math.floor(seconds * rate));
  for (let i = 0; i < out.length; i++) {
    const t = i / rate;
    let s = 0;
    for (let h = 1; h <= 6; h++) s += Math.sin(2 * Math.PI * freq * h * t + h) / h ** 1.2;
    out[i] = 0.4 * s;
  }
  return out;
}

describe('pitch detection', () => {
  it.each([
    ['low E', 82.41],
    ['drop C low string', 65.41],
    ['A', 110],
    ['D', 146.83],
    ['G', 196],
    ['B', 246.94],
    ['high E', 329.63],
    ['high E fret 12', 659.26],
  ])('hears the %s (%f Hz) within 1 cent', (_name, f) => {
    const r = detectPitch(pluck(f), RATE)!;
    expect(r).not.toBeNull();
    expect(Math.abs(centsOff(r.freq, f))).toBeLessThan(1);
    expect(r.clarity).toBeGreaterThan(0.85);
  });

  it('hears a string that is 20 cents flat as 20 cents flat', () => {
    const target = 110;
    const f = target * 2 ** (-20 / 1200);
    const r = detectPitch(pluck(f), RATE)!;
    expect(centsOff(r.freq, target)).toBeCloseTo(-20, 0);
  });

  it('gives no pitch for noise', () => {
    let seed = 7;
    const noise = new Float32Array(3000).map(() => {
      seed = (seed * 16807) % 2147483647;
      return (seed / 2147483647) * 2 - 1;
    });
    expect(detectPitch(noise, RATE)).toBeNull();
  });

  it('still works after halving a 48 kHz signal', () => {
    const r = detectPitch(halve(pluck(82.41, 0.12, 48000)), 24000)!;
    expect(Math.abs(centsOff(r.freq, 82.41))).toBeLessThan(1);
  });

  it('measures level', () => {
    expect(rms(new Float32Array(100))).toBe(0);
    expect(rms(new Float32Array(100).fill(0.5))).toBeCloseTo(0.5);
  });
});

describe('notes and cents', () => {
  it('names notes and their offset', () => {
    expect(nearestNote(440)).toMatchObject({ name: 'A', octave: 4, midi: 69 });
    expect(nearestNote(440).cents).toBeCloseTo(0);
    expect(nearestNote(82.41)).toMatchObject({ name: 'E', octave: 2 });
    expect(nearestNote(440 * 2 ** (10 / 1200)).cents).toBeCloseTo(10);
  });

  it('follows the reference pitch', () => {
    expect(freqOfMidi(69, 432)).toBe(432);
    expect(nearestNote(432, 432)).toMatchObject({ name: 'A', octave: 4 });
  });
});

describe('tunings', () => {
  it('has six strings, low to high, in a sensible range, for every tuning', () => {
    for (const t of TUNINGS) {
      const m = tuningMidis(t);
      expect(m).toHaveLength(6);
      for (let i = 1; i < 6; i++) expect(m[i]).toBeGreaterThan(m[i - 1]);
      expect(m[0]).toBeGreaterThanOrEqual(36); // C2
      expect(m[5]).toBeLessThanOrEqual(64); // E4
    }
  });

  it('spells DADGAD and standard correctly', () => {
    expect(TUNINGS.find((t) => t.id === 'dadgad')!.notes.map((n) => n.replace(/\d/, '')).join('')).toBe('DADGAD');
    expect(tuningMidis(TUNINGS[0])).toEqual([40, 45, 50, 55, 59, 64]);
  });

  it('picks the nearest string', () => {
    const std = tuningMidis(TUNINGS[0]);
    expect(nearestString(45 * 100 + 30, std)).toBe(1); // A string, 30 cents sharp
    expect(nearestString(63.6 * 100, std)).toBe(5); // a little flat of high E
  });
});
