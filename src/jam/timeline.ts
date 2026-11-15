/**
 * Chord progressions and timelines for Jam.
 *
 * A progression is the chord chart, split into sections ("A", "B"). A
 * timeline says when each chord starts in the recording. Timelines are made
 * by tapping along with the track (see the tap tool in Jam), so they match
 * the real recording rather than a guessed tempo.
 */

export interface Section {
  name: string;
  /** Chords in order, as written on the chart. */
  chords: string[];
}

export interface Progression {
  sections: Section[];
}

/** One chord in the chart, with where it lives. */
export interface ChartChord {
  symbol: string;
  section: number;
  /** Index within its section. */
  index: number;
}

/** A tap: at `t` seconds the chart moves to chord `chord` (an index into the flattened chart). */
export interface Mark {
  t: number;
  chord: number;
}

export interface Timeline {
  marks: Mark[];
}

export function flatten(p: Progression): ChartChord[] {
  return p.sections.flatMap((s, si) => s.chords.map((symbol, index) => ({ symbol, section: si, index })));
}

/** Index of the first chord of each section in the flattened chart. */
export function sectionStarts(p: Progression): number[] {
  const out: number[] = [];
  let i = 0;
  for (const s of p.sections) {
    out.push(i);
    i += s.chords.length;
  }
  return out;
}

/** Which mark is active at time `t` (the last one at or before it), or -1 before the first. */
export function markAt(tl: Timeline, t: number): number {
  let lo = 0;
  let hi = tl.marks.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (tl.marks[mid].t <= t) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

/** Keeps marks in time order and drops exact duplicates. */
export function normalize(tl: Timeline): Timeline {
  const marks = [...tl.marks].filter((m) => Number.isFinite(m.t) && m.t >= 0).sort((a, b) => a.t - b.t);
  return { marks: marks.filter((m, i) => i === 0 || m.t - marks[i - 1].t > 0.05) };
}

/** Parses a timeline pasted or loaded from storage. Returns null if it is not valid. */
export function parseTimeline(text: string, chartLength: number): Timeline | null {
  try {
    const raw = JSON.parse(text) as { marks?: unknown };
    if (!raw || !Array.isArray(raw.marks)) return null;
    const marks: Mark[] = [];
    for (const m of raw.marks) {
      if (Array.isArray(m) && typeof m[0] === 'number' && typeof m[1] === 'number' && m[1] >= 0 && m[1] < chartLength) {
        marks.push({ t: m[0], chord: m[1] });
      } else return null;
    }
    return normalize({ marks });
  } catch {
    return null;
  }
}

/** Compact text form: {"marks":[[t, chord], ...]} with times to 0.01 s. */
export function serializeTimeline(tl: Timeline): string {
  return JSON.stringify({ marks: tl.marks.map((m) => [Math.round(m.t * 100) / 100, m.chord]) });
}

const STORE = (trackId: string) => `sixline.timeline.${trackId}`;

export function loadSavedTimeline(trackId: string, chartLength: number): Timeline | null {
  try {
    const text = localStorage.getItem(STORE(trackId));
    return text ? parseTimeline(text, chartLength) : null;
  } catch {
    return null;
  }
}

export function saveTimeline(trackId: string, tl: Timeline | null): void {
  try {
    if (tl && tl.marks.length) localStorage.setItem(STORE(trackId), serializeTimeline(tl));
    else localStorage.removeItem(STORE(trackId));
  } catch {
    // Storage can be blocked; the timeline still works for this visit.
  }
}
