import { Note } from 'tonal';

/**
 * Guitar tunings, low string to high. Notes are written with octaves so
 * the tuner knows the exact pitch of each string.
 */
export interface Tuning {
  id: string;
  label: string;
  /** Six notes, low E side first, e.g. ["D2", "A2", "D3", "G3", "A3", "D4"]. */
  notes: string[];
  about: string;
}

export const TUNINGS: readonly Tuning[] = [
  { id: 'standard', label: 'Standard', notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], about: 'The usual tuning. Almost every tab assumes it.' },
  { id: 'half-down', label: 'Half step down', notes: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'], about: 'Every string a half step lower. Common in blues and rock (Hendrix, SRV, Van Halen).' },
  { id: 'whole-down', label: 'Whole step down', notes: ['D2', 'G2', 'C3', 'F3', 'A3', 'D4'], about: 'Every string a whole step lower, for a heavier, darker sound.' },
  { id: 'drop-d', label: 'Drop D', notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'], about: 'Only the low E drops to D, so power chords take one finger.' },
  { id: 'drop-c', label: 'Drop C', notes: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'], about: 'Drop D taken a whole step lower. Heavy rock and metal.' },
  { id: 'dadgad', label: 'DADGAD', notes: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'], about: 'Open and droning, a favorite for Celtic and fingerstyle playing.' },
  { id: 'open-d', label: 'Open D', notes: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'], about: 'Strum the open strings for a D major chord. Great for slide.' },
  { id: 'open-g', label: 'Open G', notes: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'], about: 'Open strings make a G major chord. Classic for slide and Keith Richards style riffs.' },
  { id: 'open-e', label: 'Open E', notes: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'], about: 'Open strings make an E major chord. Bright slide tuning.' },
  { id: 'open-a', label: 'Open A', notes: ['E2', 'A2', 'E3', 'A3', 'C#4', 'E4'], about: 'Open strings make an A major chord.' },
  { id: 'open-c', label: 'Open C', notes: ['C2', 'G2', 'C3', 'G3', 'C4', 'E4'], about: 'A deep, ringing open C major chord.' },
];

export function tuningById(id: string | undefined): Tuning {
  return TUNINGS.find((t) => t.id === id) ?? TUNINGS[0];
}

/** MIDI numbers of a tuning's strings, low to high. */
export function tuningMidis(t: Tuning): number[] {
  return t.notes.map((n) => {
    const m = Note.midi(n);
    if (m === null || m === undefined) throw new Error(`Bad note ${n}`);
    return m;
  });
}

/** Name without octave, e.g. "F#". */
export function pitchName(n: string): string {
  return Note.pitchClass(n);
}

/**
 * Which string a pitch most likely belongs to: the nearest string in cents.
 * `midiCents` is the pitch as MIDI note times 100 plus cents (A4 = 6900).
 */
export function nearestString(midiCents: number, midis: readonly number[]): number {
  let best = 0;
  let bestDist = Infinity;
  midis.forEach((m, i) => {
    const d = Math.abs(midiCents - m * 100);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}
