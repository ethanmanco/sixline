import { Chord } from 'tonal';
import { plainNames, readableRoot } from './scales';
import { degreeLabel } from './spelling';

export interface ChordType {
  /** URL-safe id, e.g. "maj7". */
  id: string;
  /** Spoken name, e.g. "major 7". */
  label: string;
  /** Symbol after the root as guitarists write it: "", "m", "7", "maj7". */
  symbol: string;
  /** Symbol tonal understands. */
  tonalSymbol: string;
  /** Suffix in chords-db, or null when chords-db has no entry (power chords). */
  dbSuffix: string | null;
}

export const CHORD_TYPES: Record<string, ChordType> = {
  major: { id: 'major', label: 'major', symbol: '', tonalSymbol: 'M', dbSuffix: 'major' },
  minor: { id: 'minor', label: 'minor', symbol: 'm', tonalSymbol: 'm', dbSuffix: 'minor' },
  power: { id: 'power', label: 'power chord', symbol: '5', tonalSymbol: '5', dbSuffix: null },
  dom7: { id: 'dom7', label: 'dominant 7', symbol: '7', tonalSymbol: '7', dbSuffix: '7' },
  maj7: { id: 'maj7', label: 'major 7', symbol: 'maj7', tonalSymbol: 'maj7', dbSuffix: 'maj7' },
  m7: { id: 'm7', label: 'minor 7', symbol: 'm7', tonalSymbol: 'm7', dbSuffix: 'm7' },
  sus2: { id: 'sus2', label: 'sus2', symbol: 'sus2', tonalSymbol: 'sus2', dbSuffix: 'sus2' },
  sus4: { id: 'sus4', label: 'sus4', symbol: 'sus4', tonalSymbol: 'sus4', dbSuffix: 'sus4' },
  add9: { id: 'add9', label: 'add9', symbol: 'add9', tonalSymbol: 'add9', dbSuffix: 'add9' },
  m7b5: { id: 'm7b5', label: 'minor 7 flat 5', symbol: 'm7b5', tonalSymbol: 'm7b5', dbSuffix: 'm7b5' },
  sus7: { id: 'sus7', label: '7sus4', symbol: '7sus4', tonalSymbol: '7sus4', dbSuffix: '7sus4' },
  dim: { id: 'dim', label: 'diminished', symbol: 'dim', tonalSymbol: 'dim', dbSuffix: 'dim' },
  dim7: { id: 'dim7', label: 'diminished 7', symbol: 'dim7', tonalSymbol: 'dim7', dbSuffix: 'dim7' },
  aug: { id: 'aug', label: 'augmented', symbol: 'aug', tonalSymbol: 'aug', dbSuffix: 'aug' },
  six: { id: 'six', label: '6', symbol: '6', tonalSymbol: '6', dbSuffix: '6' },
  m6: { id: 'm6', label: 'minor 6', symbol: 'm6', tonalSymbol: 'm6', dbSuffix: 'm6' },
  nine: { id: 'nine', label: '9', symbol: '9', tonalSymbol: '9', dbSuffix: '9' },
};

export interface ChordSpelling {
  root: string;
  /** Written symbol, e.g. "Amaj7". */
  name: string;
  notes: string[];
  intervals: string[];
  degrees: string[];
}

/** Notes and degrees of a chord in any key, from tonal. */
export function spellChord(key: string, type: ChordType): ChordSpelling {
  const root = readableRoot(key, (r) => Chord.get(`${r}${type.tonalSymbol}`).notes);
  const c = Chord.get(`${root}${type.tonalSymbol}`);
  if (c.empty) throw new Error(`tonal does not know ${root}${type.tonalSymbol}`);
  return {
    root,
    name: `${root}${type.symbol}`,
    notes: plainNames(c.notes),
    intervals: c.intervals,
    degrees: c.intervals.map(degreeLabel),
  };
}
