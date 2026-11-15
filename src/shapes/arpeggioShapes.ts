import { Chord } from 'tonal';
import type { Shape } from '../core/types';
import { ARPEGGIO_DESCRIPTIONS } from '../content/descriptions';
import { windowPositions } from '../fingering/positions';
import { readableRoot } from '../theory/scales';
import { degreeLabel, noteChroma } from '../theory/spelling';
import { handLo, spellPlaced, describeHand, wholeNeckShape, type Spelling } from './scaleShapes';

export interface ArpeggioType {
  id: string;
  label: string;
  /** Chord symbol after the root, as guitarists write it. */
  symbol: string;
  tonalSymbol: string;
  group: 'triads' | 'sevenths';
}

export const ARPEGGIO_GROUPS = [
  { id: 'triads', label: 'Triads', short: 'Triads' },
  { id: 'sevenths', label: '7th arpeggios', short: '7th' },
];

export const ARPEGGIO_TYPES: readonly ArpeggioType[] = [
  { id: 'major', label: 'Major', symbol: '', tonalSymbol: 'M', group: 'triads' },
  { id: 'minor', label: 'Minor', symbol: 'm', tonalSymbol: 'm', group: 'triads' },
  { id: 'dom7', label: 'Dominant 7', symbol: '7', tonalSymbol: '7', group: 'sevenths' },
  { id: 'maj7', label: 'Major 7', symbol: 'maj7', tonalSymbol: 'maj7', group: 'sevenths' },
  { id: 'm7', label: 'Minor 7', symbol: 'm7', tonalSymbol: 'm7', group: 'sevenths' },
  { id: 'm7b5', label: 'Minor 7 flat 5', symbol: 'm7b5', tonalSymbol: 'm7b5', group: 'sevenths' },
  { id: 'dim7', label: 'Diminished 7', symbol: 'dim7', tonalSymbol: 'dim7', group: 'sevenths' },
];

export function spellArpeggio(key: string, type: ArpeggioType): Spelling & { intervals: string[]; symbol: string } {
  const get = (r: string) => Chord.get(`${r}${type.tonalSymbol}`);
  const root = readableRoot(key, (r) => get(r).notes);
  const c = get(root);
  if (c.empty) throw new Error(`tonal does not know ${root}${type.tonalSymbol}`);
  return {
    root,
    symbol: `${root}${type.symbol}`,
    notes: c.notes,
    intervals: c.intervals,
    degrees: c.intervals.map(degreeLabel),
  };
}

/**
 * Arpeggio positions use the same four-fret window rule as the 7-note scales,
 * with one position starting on each chord tone on the low E string.
 */
export function buildArpeggioShapes(key: string, type: ArpeggioType): Shape[] {
  const spelling = spellArpeggio(key, type);
  const chromas = spelling.notes.map(noteChroma);
  const desc = ARPEGGIO_DESCRIPTIONS[type.id] ?? { sound: '', useWhen: '' };
  const name = `${spelling.root} ${type.label.toLowerCase()} arpeggio`;
  const boxes = windowPositions(chromas, chromas);
  const shapes: Shape[] = boxes.map((placed, i) => {
    const notes = spellPlaced(placed, spelling);
    return {
      id: `arp-${type.id}-${i + 1}`,
      kind: 'arpeggio',
      name,
      symbol: spelling.symbol,
      root: spelling.root,
      notes,
      position: { index: i + 1, count: boxes.length, startFret: notes[0].fret },
      fingeringSource: 'suggested',
      info: {
        intervals: spelling.degrees,
        noteNames: spelling.notes,
        sound: desc.sound,
        useWhen: desc.useWhen,
        fingeringNote: describeHand(notes, handLo(notes)),
      },
    };
  });
  const neck = wholeNeckShape(spelling, 'arpeggio', `arp-${type.id}-neck`, name, desc, spelling.degrees);
  return [...shapes, { ...neck, symbol: spelling.symbol }];
}
