import { Interval, Key, Note } from 'tonal';
import { chromaOf } from './guitar';

/**
 * Turns a tonal interval ("3m", "5d", "7M") into the degree label guitarists
 * read ("b3", "b5", "7"). Extensions above the octave keep their number, so a
 * ninth reads "9", but the octave itself reads "1".
 */
export function degreeLabel(interval: string): string {
  const iv = Interval.get(interval);
  if (iv.empty) throw new Error(`Unknown interval: ${interval}`);
  const n = iv.num > 8 ? iv.num : iv.simple === 8 ? 1 : iv.simple;
  const perfectType = iv.type === 'perfectable';
  let prefix = '';
  switch (iv.q) {
    case 'P':
    case 'M':
      break;
    case 'm':
      prefix = 'b';
      break;
    case 'd':
      prefix = perfectType ? 'b' : 'bb';
      break;
    case 'dd':
      prefix = perfectType ? 'bb' : 'bbb';
      break;
    case 'A':
      prefix = '#';
      break;
    case 'AA':
      prefix = '##';
      break;
    default:
      throw new Error(`Unhandled interval quality: ${interval}`);
  }
  return `${prefix}${n}`;
}

/** Whether a key root is usually written with sharps (A, E, F#) or flats (F, Bb, Eb). */
export function prefersSharps(root: string): boolean {
  return Key.majorKey(root).alteration >= 0;
}

/** Note name without octave, spelled with sharps or flats. */
export function spellMidi(midi: number, sharps: boolean): string {
  const full = sharps ? Note.fromMidiSharps(midi) : Note.fromMidi(midi);
  return Note.pitchClass(full);
}

/** Chroma (0 to 11, C = 0) of a note name such as "Bb". */
export function noteChroma(name: string): number {
  const c = Note.chroma(name);
  if (c === undefined || Number.isNaN(c)) throw new Error(`Unknown note: ${name}`);
  return c;
}

/** Looks up how a pitch is spelled inside a set of note names, or null if it is not in the set. */
export function spellIn(midi: number, noteNames: readonly string[]): string | null {
  const c = chromaOf(midi);
  return noteNames.find((n) => noteChroma(n) === c) ?? null;
}
