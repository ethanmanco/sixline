import type { FretPos, StringIndex } from '../core/types';

/** Standard tuning, low to high. */
export const OPEN_MIDI: readonly number[] = [40, 45, 50, 55, 59, 64];
export const STRINGS: readonly StringIndex[] = [0, 1, 2, 3, 4, 5];
export const MAX_FRET = 15;

/** Spoken names used in accessible labels. */
export const STRING_NAMES: readonly string[] = ['Low E', 'A', 'D', 'G', 'B', 'High E'];

/** Letters printed at the left of a tab staff. */
export const TAB_LETTERS: readonly string[] = ['E', 'A', 'D', 'G', 'B', 'e'];

export function midiAt(pos: FretPos): number {
  return OPEN_MIDI[pos.string] + pos.fret;
}

export function isOnNeck(pos: FretPos): boolean {
  return pos.fret >= 0 && pos.fret <= MAX_FRET;
}

/** Every playable position for a pitch, low string first. */
export function positionsOf(midi: number): FretPos[] {
  const out: FretPos[] = [];
  for (const s of STRINGS) {
    const fret = midi - OPEN_MIDI[s];
    if (fret >= 0 && fret <= MAX_FRET) out.push({ string: s, fret });
  }
  return out;
}

export function chromaOf(midi: number): number {
  return ((midi % 12) + 12) % 12;
}
