import type { Finger, FretPos } from '../core/types';

export interface FingerChoice {
  finger: Finger;
  shift?: 'up' | 'down';
}

export interface HandWindow {
  /** Fret under the index finger. The pinky covers lo + 3. */
  lo: number;
  fingers: FingerChoice[];
}

/**
 * One finger per fret.
 *
 * The hand covers a four-fret window: index on the window's first fret, pinky
 * on its last. Open strings need no finger. A note just outside the window is
 * reached by moving the hand: the index reaches back (shift "down") or the
 * pinky reaches up (shift "up"), and the note is marked so the learner sees it.
 *
 * The window is the one that holds the most notes. Ties go to the window that
 * starts nearest the anchor fret (where the position begins on the low E
 * string), then to the lower window.
 */
export function assignFingers(notes: readonly FretPos[], anchorFret?: number): HandWindow {
  const fretted = notes.filter((n) => n.fret > 0).map((n) => n.fret);
  if (fretted.length === 0) {
    return { lo: 1, fingers: notes.map(() => ({ finger: 0 as Finger })) };
  }
  const min = Math.min(...fretted);
  const max = Math.max(...fretted);
  // A position with open strings keeps the index on fret 1.
  const hasOpen = notes.some((n) => n.fret === 0);
  const anchor = hasOpen ? 1 : anchorFret !== undefined && anchorFret > 0 ? anchorFret : min;

  let best = { lo: min, count: -1, dist: Infinity };
  for (let lo = Math.max(1, min - 3); lo <= max; lo++) {
    const count = fretted.filter((f) => f >= lo && f <= lo + 3).length;
    const dist = Math.abs(lo - anchor);
    if (count > best.count || (count === best.count && dist < best.dist)) {
      best = { lo, count, dist };
    }
  }

  const lo = best.lo;
  const fingers = notes.map((n): FingerChoice => {
    if (n.fret === 0) return { finger: 0 };
    if (n.fret < lo) return { finger: 1, shift: 'down' };
    if (n.fret > lo + 3) return { finger: 4, shift: 'up' };
    return { finger: (n.fret - lo + 1) as Finger };
  });
  return { lo, fingers };
}
