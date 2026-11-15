import type { Finger, FretPos, StringIndex } from '../core/types';
import { MAX_FRET, OPEN_MIDI, STRINGS, chromaOf } from '../theory/guitar';

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

export interface Placed extends FretPos {
  finger: Finger;
  shift?: 'up' | 'down';
}

/**
 * One position in a fixed four-fret window, index finger on fret `lo`.
 *
 * Every scale note inside the window is played, one finger per fret. Between
 * strings tuned a fourth apart the window leaves a one-fret gap; when that
 * pitch is in the scale, the index finger reaches back one fret on the higher
 * string to get it, and the note is marked as a shift. With `lo` = 0 the
 * window is the open position: open strings plus frets 1 to 4.
 */
export function windowBox(chromas: readonly number[], lo: number): Placed[] {
  const set = new Set(chromas);
  const out: Placed[] = [];
  const [from, to] = lo === 0 ? [0, 4] : [lo, lo + 3];
  for (const s of STRINGS) {
    for (let f = from; f <= to; f++) {
      if (!set.has(chromaOf(OPEN_MIDI[s] + f))) continue;
      out.push({ string: s, fret: f, finger: (f === 0 ? 0 : lo === 0 ? f : f - lo + 1) as Finger });
    }
  }
  if (lo > 0) {
    for (const s of STRINGS) {
      if (s === 5 || OPEN_MIDI[s + 1] - OPEN_MIDI[s] !== 5) continue;
      const gap = OPEN_MIDI[s] + lo + 4;
      if (!set.has(chromaOf(gap))) continue;
      const fret = lo - 1;
      out.push(fret === 0 ? { string: (s + 1) as StringIndex, fret, finger: 0 } : { string: (s + 1) as StringIndex, fret, finger: 1, shift: 'down' });
    }
  }
  // Same pitch twice (only in the open position, G and B strings): keep the higher string.
  out.sort((a, b) => OPEN_MIDI[a.string] + a.fret - (OPEN_MIDI[b.string] + b.fret) || b.string - a.string);
  return out.filter((p, i) => i === 0 || OPEN_MIDI[p.string] + p.fret !== OPEN_MIDI[out[i - 1].string] + out[i - 1].fret);
}

/**
 * Window positions starting on each given pitch class on the low E string,
 * climbing the neck from the first one.
 */
export function windowPositions(chromas: readonly number[], starts: readonly number[]): Placed[][] {
  const base = lowEFret(starts[0]);
  return starts.map((c) => {
    let lo = base + ((lowEFret(c) - base + 12) % 12);
    if (lo + 3 > MAX_FRET) lo -= 12;
    return windowBox(chromas, lo);
  });
}

/**
 * Blues positions: the pentatonic boxes with the blue notes slotted in.
 * A blue note goes on the string whose box notes surround it, or else right
 * after the box note just below it.
 */
export function bluesBoxes(baseChromas: readonly number[], blueChromas: readonly number[]): FretPos[][] {
  return pentatonicBoxes(baseChromas).map((box) => {
    const out = [...box];
    const midis = box.map((p) => OPEN_MIDI[p.string] + p.fret);
    const lowest = Math.min(...midis);
    const highest = Math.max(...midis);
    for (let m = lowest; m <= highest; m++) {
      if (!blueChromas.includes(chromaOf(m))) continue;
      const surrounding = STRINGS.find((s) => {
        const frets = box.filter((p) => p.string === s).map((p) => p.fret);
        const f = m - OPEN_MIDI[s];
        return frets.length > 0 && f > Math.min(...frets) && f < Math.max(...frets);
      });
      if (surrounding !== undefined) {
        out.push({ string: surrounding, fret: m - OPEN_MIDI[surrounding] });
        continue;
      }
      // Otherwise right after the box note below it, or right before the box note above it
      // when the first choice would run past fret 15.
      const below = box.filter((_, i) => midis[i] < m).sort((a, b) => OPEN_MIDI[b.string] + b.fret - (OPEN_MIDI[a.string] + a.fret))[0];
      const above = box.filter((_, i) => midis[i] > m).sort((a, b) => OPEN_MIDI[a.string] + a.fret - (OPEN_MIDI[b.string] + b.fret))[0];
      const choice = [below, above].find((p) => p && m - OPEN_MIDI[p.string] >= 0 && m - OPEN_MIDI[p.string] <= MAX_FRET);
      if (choice) out.push({ string: choice.string, fret: m - OPEN_MIDI[choice.string] });
    }
    return out.sort((a, b) => OPEN_MIDI[a.string] + a.fret - (OPEN_MIDI[b.string] + b.fret));
  });
}

/** Every position of every note in the set on frets 0 to 15, low string first. */
export function wholeNeck(chromas: readonly number[]): FretPos[] {
  const out: FretPos[] = [];
  for (const s of STRINGS) {
    for (let f = 0; f <= MAX_FRET; f++) if (chromas.includes(chromaOf(OPEN_MIDI[s] + f))) out.push({ string: s, fret: f });
  }
  return out;
}
