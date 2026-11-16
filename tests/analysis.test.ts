import { describe, expect, it } from 'vitest';
import { ANALYSIS_RATE, analyze, detectTempo, fft } from '../src/jam/analysis';

const R = ANALYSIS_RATE;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** A few seconds of triads, like a simple backing track. */
function chords(progression: number[][], secondsEach = 2): Float32Array {
  const out = new Float32Array(Math.floor(progression.length * secondsEach * R));
  progression.forEach((notes, c) => {
    const start = Math.floor(c * secondsEach * R);
    for (let i = 0; i < secondsEach * R; i++) {
      let s = 0;
      for (const n of notes) s += Math.sin((2 * Math.PI * hz(n) * i) / R) + 0.3 * Math.sin((4 * Math.PI * hz(n) * i) / R);
      out[start + i] = s / notes.length;
    }
  });
  return out;
}

/** Short noise clicks at a steady tempo. */
function clicks(bpm: number, seconds = 20): Float32Array {
  const out = new Float32Array(seconds * R);
  const every = Math.round((60 / bpm) * R);
  let seed = 1;
  for (let t = 0; t < out.length; t += every) {
    for (let i = 0; i < 300 && t + i < out.length; i++) {
      seed = (seed * 16807) % 2147483647;
      out[t + i] = ((seed / 2147483647) * 2 - 1) * Math.exp(-i / 60);
    }
  }
  return out;
}

describe('fft', () => {
  it('finds a pure tone in the right bin', () => {
    const n = 1024;
    const re = new Float64Array(n).map((_, i) => Math.sin((2 * Math.PI * 50 * i) / n));
    const im = new Float64Array(n);
    fft(re, im);
    const mags = Array.from({ length: n / 2 }, (_, k) => Math.hypot(re[k], im[k]));
    expect(mags.indexOf(Math.max(...mags))).toBe(50);
  });
});

describe('key detection', () => {
  it('hears I IV V I in C major as C major', () => {
    const C = [48, 52, 55];
    const F = [53, 57, 60];
    const G = [55, 59, 62];
    const [best] = analyze(chords([C, F, G, C, C, F, G, C])).keys;
    expect(best).toMatchObject({ root: 'C', minor: false });
  });

  it('hears i iv v i in A minor as A minor', () => {
    const Am = [57, 60, 64];
    const Dm = [50, 53, 57];
    const Em = [52, 55, 59];
    const [best] = analyze(chords([Am, Dm, Em, Am, Am, Dm, Em, Am])).keys;
    expect(best).toMatchObject({ root: 'A', minor: true });
  });
});

describe('tempo detection', () => {
  it.each([90, 120, 140])('finds %i BPM from clicks', (bpm) => {
    const got = detectTempo(clicks(bpm))!;
    expect(Math.abs(got - bpm) / bpm).toBeLessThan(0.03);
  });
});
