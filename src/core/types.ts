/**
 * Shared data model. The fretboard, tab preview, and audio only ever see these
 * types, so the future Jam and Songs sections can feed them anything.
 */

/** 0 = low E (6th string), 5 = high E (1st string). */
export type StringIndex = 0 | 1 | 2 | 3 | 4 | 5;

/** 0 = open string, 1 to 4 = index to pinky, 'T' = thumb. */
export type Finger = 0 | 1 | 2 | 3 | 4 | 'T';

export type LabelMode = 'finger' | 'note' | 'degree' | 'none';

export type ShapeKind = 'chord' | 'scale' | 'arpeggio';

export interface FretPos {
  string: StringIndex;
  /** 0 (open) to 15. Always absolute, counted from the nut. */
  fret: number;
}

export interface FretNote extends FretPos {
  midi: number;
  /** Spelled for the key, e.g. "Bb" rather than "A#". No octave. */
  note: string;
  /** Scale or chord degree relative to the root, e.g. "1", "b3", "5". */
  degree: string;
  isRoot: boolean;
  finger: Finger | null;
  /** The fretting hand moves one fret to reach this note. */
  shift?: 'up' | 'down';
}

export interface Barre {
  fret: number;
  from: StringIndex;
  to: StringIndex;
  finger: Finger;
}

export interface ShapeInfo {
  /** Interval names from the root, in scale order, e.g. ["1", "b3", "4", "5", "b7"]. */
  intervals: string[];
  /** Note names in scale order, e.g. ["A", "C", "D", "E", "G"]. */
  noteNames: string[];
  sound: string;
  useWhen: string;
  /** Plain-English description of how the hand sits for this fingering. */
  fingeringNote?: string;
}

export interface Shape {
  id: string;
  kind: ShapeKind;
  /** Full display name, e.g. "A minor pentatonic". */
  name: string;
  /** Chord symbol, e.g. "Amaj7". */
  symbol?: string;
  /** Short line under the name, e.g. "E-shape barre at fret 5". */
  subtitle?: string;
  root: string;
  /** In play order. Scales and arpeggios go low to high; chord notes sound together. */
  notes: FretNote[];
  /** Note indexes to play, when not simply up and back down (e.g. the whole-neck view plays each pitch once). */
  playOrder?: number[];
  muted?: StringIndex[];
  barres?: Barre[];
  position?: { index: number; count: number; startFret: number };
  fingeringSource: 'chords-db' | 'suggested';
  info: ShapeInfo;
}
