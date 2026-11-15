import { Scale } from 'tonal';
import { degreeLabel } from './spelling';

export interface ScaleType {
  /** URL-safe id, e.g. "minor-pentatonic". */
  id: string;
  /** Display name, e.g. "Minor pentatonic". */
  label: string;
  /** The name tonal knows it by. */
  tonalName: string;
  /** Decides which fingering rule builds its positions. */
  family: 'pentatonic' | 'heptatonic' | 'blues';
}

export const SCALE_TYPES: readonly ScaleType[] = [
  { id: 'minor-pentatonic', label: 'Minor pentatonic', tonalName: 'minor pentatonic', family: 'pentatonic' },
];

export function scaleType(id: string): ScaleType {
  const t = SCALE_TYPES.find((s) => s.id === id);
  if (!t) throw new Error(`Unknown scale type: ${id}`);
  return t;
}

export interface ScaleSpelling {
  root: string;
  /** Note names in scale order, starting on the root. */
  notes: string[];
  /** Tonal interval names, e.g. "3m". */
  intervals: string[];
  /** Guitarist degree labels, e.g. "b3". */
  degrees: string[];
}

/** Generates a scale's notes and degrees in any key from tonal. Nothing is hand-typed. */
export function spellScale(root: string, type: ScaleType): ScaleSpelling {
  const s = Scale.get(`${root} ${type.tonalName}`);
  if (s.empty) throw new Error(`tonal does not know ${root} ${type.tonalName}`);
  return {
    root,
    notes: s.notes,
    intervals: s.intervals,
    degrees: s.intervals.map(degreeLabel),
  };
}
