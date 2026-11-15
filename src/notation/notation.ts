import { Note } from 'tonal';

/**
 * Standard notation for guitar: treble clef, written one octave above the
 * sounding pitch (the small 8 under the clef). Pure functions, so the staff
 * math can be tested without a browser.
 */

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export interface Written {
  /** Staff step above the bottom line (E4 written). Lines are even steps 0 to 8. */
  step: number;
  accidental: '' | '#' | 'b' | '##' | 'bb';
  /** Sounding pitch with octave, e.g. "A2", for screen readers. */
  sounding: string;
}

/** Where a note sits on the staff, from its spelled name (e.g. "Bb") and sounding MIDI number. */
export function written(name: string, midi: number): Written {
  const n = Note.get(name);
  if (n.empty) throw new Error(`Unknown note name ${name}`);
  const letter = n.letter;
  const alt = n.alt;
  // Octave of the spelled note, so Cb sits in the octave above B and B# in the one below C.
  const soundingOctave = Math.floor((midi - alt) / 12) - 1;
  const writtenOctave = soundingOctave + 1;
  const step = LETTERS.indexOf(letter) + 7 * writtenOctave - (LETTERS.indexOf('E') + 7 * 4);
  const accidental = (alt === 0 ? '' : alt > 0 ? '#'.repeat(alt) : 'b'.repeat(-alt)) as Written['accidental'];
  return { step, accidental, sounding: `${name}${soundingOctave}` };
}

/** Ledger lines a note needs: even steps outside the staff, between the staff and the note. */
export function ledgerSteps(step: number): number[] {
  const out: number[] = [];
  for (let s = -2; s >= step; s -= 2) out.push(s);
  for (let s = 10; s <= step; s += 2) out.push(s);
  return out;
}

/** Unicode music symbols, drawn with the Noto Music font. */
export const GLYPH = {
  trebleClef: '\u{1D11E}',
  sharp: '♯',
  flat: '♭',
  doubleSharp: '\u{1D12A}',
  doubleFlat: '\u{1D12B}',
};

export function accidentalGlyph(a: Written['accidental']): string {
  return { '': '', '#': GLYPH.sharp, b: GLYPH.flat, '##': GLYPH.doubleSharp, bb: GLYPH.doubleFlat }[a];
}
