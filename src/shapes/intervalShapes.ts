import { Interval, Note, Scale } from 'tonal';
import type { Finger, FretNote, Shape, StringIndex } from '../core/types';
import { INTERVAL_DESCRIPTIONS } from '../content/descriptions';
import { MAX_FRET, OPEN_MIDI, TAB_LETTERS, chromaOf, stringName } from '../theory/guitar';
import { plainNames, readableRoot } from '../theory/scales';
import { degreeLabel, noteChroma } from '../theory/spelling';

/**
 * Intervals and double stops: two notes at once. Interval shapes show one
 * interval from the key's root on every useful pair of strings. Double-stop
 * runs walk up the major scale in 3rds or 6ths on one pair of strings, the way
 * they show up in country, soul, and rock tab.
 */

export interface IntervalType {
  id: string;
  label: string;
  /** Tonal interval name, e.g. "3m". */
  tonal: string;
  /** Which string pairs it is shown on: neighbors, or with one string skipped. */
  pairs: 'adjacent' | 'skip';
}

export const INTERVAL_TYPES: readonly IntervalType[] = [
  { id: 'm3', label: 'Minor 3rd', tonal: '3m', pairs: 'adjacent' },
  { id: 'M3', label: 'Major 3rd', tonal: '3M', pairs: 'adjacent' },
  { id: 'P4', label: 'Perfect 4th', tonal: '4P', pairs: 'adjacent' },
  { id: 'TT', label: 'Tritone (flat 5)', tonal: '5d', pairs: 'adjacent' },
  { id: 'P5', label: 'Perfect 5th', tonal: '5P', pairs: 'adjacent' },
  { id: 'm6', label: 'Minor 6th', tonal: '6m', pairs: 'skip' },
  { id: 'M6', label: 'Major 6th', tonal: '6M', pairs: 'skip' },
  { id: 'P8', label: 'Octave', tonal: '8P', pairs: 'skip' },
];

export interface RunType {
  id: string;
  label: string;
  short: string;
  /** Scale steps between the two notes: 2 for 3rds, 5 for 6ths. */
  steps: number;
  lower: StringIndex;
  upper: StringIndex;
}

export const RUN_TYPES: readonly RunType[] = [
  { id: '3rds-be', label: '3rds on the B and high E strings', short: '3rds, B e', steps: 2, lower: 4, upper: 5 },
  { id: '3rds-gb', label: '3rds on the G and B strings', short: '3rds, G B', steps: 2, lower: 3, upper: 4 },
  { id: '6ths-ge', label: '6ths on the G and high E strings', short: '6ths, G e', steps: 5, lower: 3, upper: 5 },
  { id: '6ths-db', label: '6ths on the D and B strings', short: '6ths, D B', steps: 5, lower: 2, upper: 4 },
];

/** Two notes: the lower fret gets the index, the other the finger that matches the distance. */
export function twoNoteFingers(lowerFret: number, upperFret: number): [Finger, Finger] {
  if (lowerFret === 0 && upperFret === 0) return [0, 0];
  if (lowerFret === 0) return [0, Math.min(4, Math.max(1, upperFret)) as Finger];
  if (upperFret === 0) return [Math.min(4, Math.max(1, lowerFret)) as Finger, 0];
  const diff = upperFret - lowerFret;
  if (diff === 0) return [2, 3];
  if (diff > 0) return [1, Math.min(4, diff + 1) as Finger];
  return [Math.min(4, 1 - diff) as Finger, 1];
}

function pairsFor(t: IntervalType): [StringIndex, StringIndex][] {
  const gap = t.pairs === 'adjacent' ? 1 : 2;
  const out: [StringIndex, StringIndex][] = [];
  for (let s = 0; s + gap <= 5; s++) out.push([s as StringIndex, (s + gap) as StringIndex]);
  return out;
}

function spellInterval(key: string, t: IntervalType) {
  const upperOf = (r: string) => Note.pitchClass(Note.transpose(r, t.tonal));
  const root = readableRoot(key, (r) => [r, upperOf(r)]);
  const [lowName, highName] = plainNames([root, upperOf(root)]);
  return { root: lowName, upper: highName, degree: degreeLabel(t.tonal), semis: Interval.semitones(t.tonal) ?? 0 };
}

/** One interval from the key's root, on each string pair where it fits on frets 1 to 15. */
export function buildIntervalShapes(key: string, t: IntervalType): Shape[] {
  const sp = spellInterval(key, t);
  const rootChroma = noteChroma(sp.root);
  const desc = INTERVAL_DESCRIPTIONS[t.id] ?? { sound: '', useWhen: '' };
  const pairs = pairsFor(t);
  const shapes: Shape[] = [];
  for (const [lo, hi] of pairs) {
    const base = (((rootChroma - OPEN_MIDI[lo]) % 12) + 12) % 12;
    let placed: [number, number] | null = null;
    for (const f of [base, base + 12]) {
      if (f < 1) continue;
      const upper = OPEN_MIDI[lo] + f + sp.semis - OPEN_MIDI[hi];
      if (upper >= 1 && f <= MAX_FRET && upper <= MAX_FRET) {
        placed = [f, upper];
        break;
      }
    }
    if (!placed) continue;
    const [lf, uf] = placed;
    const [f1, f2] = twoNoteFingers(lf, uf);
    const notes: FretNote[] = [
      { string: lo, fret: lf, midi: OPEN_MIDI[lo] + lf, note: sp.root, degree: '1', isRoot: true, finger: f1 },
      {
        string: hi,
        fret: uf,
        midi: OPEN_MIDI[hi] + uf,
        note: sp.upper,
        degree: t.id === 'P8' ? '1' : sp.degree,
        isRoot: t.id === 'P8',
        finger: f2,
      },
    ];
    const skip = hi - lo === 2 ? ` Mute the ${stringName(lo + 1)} string in between with the underside of your fretting finger.` : '';
    shapes.push({
      id: `int-${t.id}-${lo}${hi}`,
      kind: 'chord',
      name: `${t.label} from ${sp.root}`,
      symbol: `${sp.root} to ${sp.upper}`,
      subtitle: `On the ${stringName(lo)} and ${stringName(hi)} strings`,
      root: sp.root,
      notes,
      muted: ([0, 1, 2, 3, 4, 5] as StringIndex[]).filter((s) => s !== lo && s !== hi),
      position: {
        index: shapes.length + 1,
        count: pairs.length,
        startFret: Math.min(lf, uf),
        label: `${TAB_LETTERS[lo]} ${TAB_LETTERS[hi]}`,
      },
      positionUnit: 'Strings',
      fingeringSource: 'suggested',
      info: {
        intervals: ['1', t.id === 'P8' ? '8' : sp.degree],
        noteNames: [sp.root, sp.upper],
        sound: desc.sound,
        useWhen: desc.useWhen,
        fingeringNote: `Finger ${f1} on the ${stringName(lo)} string, finger ${f2} on the ${stringName(hi)} string.${skip}`,
      },
    });
  }
  return shapes.map((s) => ({ ...s, position: { ...s.position!, count: shapes.length } }));
}

/**
 * Every diatonic 3rd (or 6th) of the key's major scale on one pair of
 * strings, from the lowest fret to the highest, played as a run of double stops.
 */
export function buildRunShapes(key: string, run: RunType): Shape[] {
  const root = readableRoot(key, (r) => Scale.get(`${r} major`).notes);
  const scale = Scale.get(`${root} major`);
  const names = plainNames(scale.notes);
  const chromas = names.map(noteChroma);
  const degrees = scale.intervals.map(degreeLabel);
  const desc = INTERVAL_DESCRIPTIONS[run.id] ?? { sound: '', useWhen: '' };
  const notes: FretNote[] = [];
  const steps: number[][] = [];
  for (let f = 0; f <= MAX_FRET; f++) {
    const lowMidi = OPEN_MIDI[run.lower] + f;
    const k = chromas.indexOf(chromaOf(lowMidi));
    if (k < 0) continue;
    const upperChroma = chromas[(k + run.steps) % 7];
    let upMidi = lowMidi + 1;
    while (chromaOf(upMidi) !== upperChroma) upMidi++;
    const uf = upMidi - OPEN_MIDI[run.upper];
    if (uf < 0 || uf > MAX_FRET) continue;
    const [f1, f2] = twoNoteFingers(f, uf);
    const u = (k + run.steps) % 7;
    steps.push([notes.length, notes.length + 1]);
    notes.push(
      { string: run.lower, fret: f, midi: lowMidi, note: names[k], degree: degrees[k], isRoot: k === 0, finger: f1 },
      { string: run.upper, fret: uf, midi: upMidi, note: names[u], degree: degrees[u], isRoot: u === 0, finger: f2 },
    );
  }
  const skip = run.upper - run.lower === 2 ? ` Mute the ${stringName(run.lower + 1)} string in between.` : '';
  return [
    {
      id: `run-${run.id}`,
      kind: 'chord',
      name: `${run.steps === 2 ? '3rds' : '6ths'} in ${root} major`,
      subtitle: `On the ${stringName(run.lower)} and ${stringName(run.upper)} strings, low to high`,
      root,
      notes,
      playSteps: steps,
      muted: ([0, 1, 2, 3, 4, 5] as StringIndex[]).filter((s) => s !== run.lower && s !== run.upper),
      fingeringSource: 'suggested',
      info: {
        intervals: degrees,
        noteNames: names,
        sound: desc.sound,
        useWhen: desc.useWhen,
        fingeringNote: `Each pair is two notes of the ${root} major scale played together. Shift up the neck pair by pair; the finger numbers show the suggested fingers for each pair.${skip}`,
      },
    },
  ];
}
