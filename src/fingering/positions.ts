import type { FretPos, StringIndex } from '../core/types';
import { MAX_FRET, OPEN_MIDI, chromaOf } from '../theory/guitar';

/**
 * Builds one box position by walking up the scale from a starting fret on the
 * low E string, placing `perString` notes on each string before moving to the
 * next one.
 *
 * Notes are chosen by pitch, not copied from a memorized pattern, so the
 * B string's major-third tuning works itself out.
 */
export function walkBox(chromas: readonly number[], startFret: number, perString: number): FretPos[] {
  const set = new Set(chromas);
  const out: FretPos[] = [];
  let s = 0;
  let onString = 0;
  for (let midi = OPEN_MIDI[0] + startFret; s < 6; midi++) {
    if (!set.has(chromaOf(midi))) continue;
    if (onString === perString) {
      s++;
      onString = 0;
      if (s === 6) break;
    }
    out.push({ string: s as StringIndex, fret: midi - OPEN_MIDI[s] });
    onString++;
  }
  return out;
}

/** Moves a position up or down an octave so every note fits on frets 0 to 15. */
export function fitOnNeck(box: FretPos[]): FretPos[] {
  const frets = box.map((p) => p.fret);
  const min = Math.min(...frets);
  const max = Math.max(...frets);
  if (min < 0 && max + 12 <= MAX_FRET) return box.map((p) => ({ ...p, fret: p.fret + 12 }));
  if (max > MAX_FRET && min - 12 >= 0) return box.map((p) => ({ ...p, fret: p.fret - 12 }));
  return box;
}

/** Fret of a pitch class on the low E string, from 0 to 11. */
export function lowEFret(chroma: number): number {
  return (((chroma - chromaOf(OPEN_MIDI[0])) % 12) + 12) % 12;
}

/**
 * The five pentatonic positions. Position k starts on the k-th note of the
 * scale (counting from the root) on the low E string, with two notes per
 * string. Positions climb the neck from position 1 and drop an octave only
 * when they would run past fret 15.
 */
export function pentatonicBoxes(scaleChromas: readonly number[]): FretPos[][] {
  const base = lowEFret(scaleChromas[0]);
  return scaleChromas.map((c) => {
    const start = base + ((lowEFret(c) - base + 12) % 12);
    return fitOnNeck(walkBox(scaleChromas, start, 2));
  });
}
