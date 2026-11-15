import type { FretNote, Shape, StringIndex } from '../core/types';
import { CHORD_DESCRIPTIONS } from '../content/descriptions';
import { dbPositions, sameFrets, toVoicing, type ChordDb, type Voicing } from '../chords/db';
import { movableVoicing } from '../chords/movable';
import { CHORD_TYPES, spellChord, type ChordSpelling, type ChordType } from '../theory/chords';
import { MAX_FRET, OPEN_MIDI, STRING_NAMES, chromaOf, stringName } from '../theory/guitar';
import { noteChroma } from '../theory/spelling';

export type ChordGroup = 'open' | 'barre' | 'power' | 'seventh' | 'sus';

export const CHORD_GROUPS: { id: ChordGroup; label: string; short: string }[] = [
  { id: 'open', label: 'Open chords', short: 'Open' },
  { id: 'barre', label: 'Barre chords', short: 'Barre' },
  { id: 'power', label: 'Power chords', short: 'Power' },
  { id: 'seventh', label: '7th chords', short: '7th' },
  { id: 'sus', label: 'Sus and add9', short: 'Sus, add9' },
];

export interface ChordItem {
  id: string;
  group: ChordGroup;
  type: ChordType;
  /** Label for the list, given the root, e.g. "A major, E shape". */
  label: (root: string) => string;
  /** Chip label for the quick picker, e.g. "A", "Am", "A7". Shown under its group name. */
  short: (root: string) => string;
  /** Where the voicings come from. */
  source: { kind: 'open' } | { kind: 'all' } | { kind: 'movable'; template: string; shapeLabel: string };
}

const T = CHORD_TYPES;

export const CHORD_ITEMS: readonly ChordItem[] = [
  { id: 'open-major', group: 'open', type: T.major, short: (r) => r, label: (r) => `${r} major`, source: { kind: 'open' } },
  { id: 'open-minor', group: 'open', type: T.minor, short: (r) => `${r}m`, label: (r) => `${r} minor`, source: { kind: 'open' } },
  { id: 'open-7', group: 'open', type: T.dom7, short: (r) => `${r}7`, label: (r) => `${r}7`, source: { kind: 'open' } },
  {
    id: 'barre-major-e',
    group: 'barre',
    type: T.major,
    short: (r) => `${r} E shape`, label: (r) => `${r} major, E shape`,
    source: { kind: 'movable', template: 'major-e', shapeLabel: 'E-shape barre' },
  },
  {
    id: 'barre-major-a',
    group: 'barre',
    type: T.major,
    short: (r) => `${r} A shape`, label: (r) => `${r} major, A shape`,
    source: { kind: 'movable', template: 'major-a', shapeLabel: 'A-shape barre' },
  },
  {
    id: 'barre-minor-e',
    group: 'barre',
    type: T.minor,
    short: (r) => `${r}m E shape`, label: (r) => `${r} minor, E shape`,
    source: { kind: 'movable', template: 'minor-e', shapeLabel: 'E-shape barre' },
  },
  {
    id: 'barre-minor-a',
    group: 'barre',
    type: T.minor,
    short: (r) => `${r}m A shape`, label: (r) => `${r} minor, A shape`,
    source: { kind: 'movable', template: 'minor-a', shapeLabel: 'A-shape barre' },
  },
  {
    id: 'power-6',
    group: 'power',
    type: T.power,
    short: (r) => `${r}5 6th string`, label: (r) => `${r}5, root on 6th string`,
    source: { kind: 'movable', template: 'power-6', shapeLabel: 'Power chord, root on the low E string' },
  },
  {
    id: 'power-5',
    group: 'power',
    type: T.power,
    short: (r) => `${r}5 5th string`, label: (r) => `${r}5, root on 5th string`,
    source: { kind: 'movable', template: 'power-5', shapeLabel: 'Power chord, root on the A string' },
  },
  { id: 'dom7', group: 'seventh', type: T.dom7, short: (r) => `${r}7`, label: (r) => `${r}7 (dominant 7)`, source: { kind: 'all' } },
  { id: 'maj7', group: 'seventh', type: T.maj7, short: (r) => `${r}maj7`, label: (r) => `${r}maj7 (major 7)`, source: { kind: 'all' } },
  { id: 'm7', group: 'seventh', type: T.m7, short: (r) => `${r}m7`, label: (r) => `${r}m7 (minor 7)`, source: { kind: 'all' } },
  { id: 'sus2', group: 'sus', type: T.sus2, short: (r) => `${r}sus2`, label: (r) => `${r}sus2`, source: { kind: 'all' } },
  { id: 'sus4', group: 'sus', type: T.sus4, short: (r) => `${r}sus4`, label: (r) => `${r}sus4`, source: { kind: 'all' } },
  { id: 'add9', group: 'sus', type: T.add9, short: (r) => `${r}add9`, label: (r) => `${r}add9`, source: { kind: 'all' } },
];

/** An open voicing sits in the first few frets and lets at least one string ring open. */
export function isOpenVoicing(v: Voicing): boolean {
  const played = v.frets.filter((f): f is number => f !== null);
  return played.includes(0) && Math.max(...played) <= 4;
}

function fitsNeck(v: Voicing): boolean {
  return v.frets.every((f) => f === null || f <= MAX_FRET);
}

/**
 * chords-db is community data and a few entries have slips: a note outside the
 * chord, or a fretted note with no finger. Those voicings are left out rather
 * than shown with a wrong note or a guessed finger.
 */
export function isUsableVoicing(v: Voicing, chordChromas: readonly number[]): boolean {
  return v.frets.every((f, s) => {
    if (f === null) return true;
    if (!chordChromas.includes(chromaOf(OPEN_MIDI[s] + f))) return false;
    return f === 0 || v.fingers[s] !== 0;
  });
}

function lowestFretted(v: Voicing): number {
  const fretted = v.frets.filter((f): f is number => f !== null && f > 0);
  return fretted.length ? Math.min(...fretted) : 0;
}

function listNames(strings: number[]): string {
  const names = strings.map((s) => stringName(s));
  if (names.length === 1) return `the ${names[0]} string`;
  return `the ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} strings`;
}

/** Plain-English directions for the fretting hand. */
export function describeVoicing(v: Voicing, fromDb: boolean): string {
  const parts: string[] = [];
  for (const b of v.barres) {
    parts.push(
      `Lay finger ${b.finger} flat across fret ${b.fret}, from the ${stringName(b.from)} string to the ${stringName(b.to)} string.`,
    );
  }
  const muted = v.frets.map((f, s) => (f === null ? s : -1)).filter((s) => s >= 0);
  if (muted.length) parts.push(`Don't play ${listNames(muted)}.`);
  const open = v.frets.map((f, s) => (f === 0 ? s : -1)).filter((s) => s >= 0);
  if (open.length) parts.push(`Let ${listNames(open)} ring open.`);
  parts.push(fromDb ? 'Fingering from chords-db.' : 'Standard movable shape: slide it to change key.');
  return parts.join(' ');
}

export function voicingToShape(
  v: Voicing,
  spelling: ChordSpelling,
  meta: { id: string; name: string; index: number; count: number; fromDb: boolean; subtitle?: string },
  item: ChordItem,
): Shape {
  const chromas = spelling.notes.map(noteChroma);
  const notes: FretNote[] = [];
  v.frets.forEach((f, s) => {
    if (f === null) return;
    const midi = OPEN_MIDI[s] + f;
    const idx = chromas.indexOf(chromaOf(midi));
    if (idx < 0) throw new Error(`${spelling.name}: ${STRING_NAMES[s]} string fret ${f} is not a chord tone`);
    notes.push({
      string: s as StringIndex,
      fret: f,
      midi,
      note: spelling.notes[idx],
      degree: spelling.degrees[idx],
      isRoot: idx === 0,
      finger: f === 0 ? 0 : v.fingers[s] || null,
    });
  });
  const desc = CHORD_DESCRIPTIONS[item.type.id] ?? { sound: '', useWhen: '' };
  return {
    id: meta.id,
    kind: 'chord',
    name: meta.name,
    symbol: spelling.name,
    subtitle: meta.subtitle,
    root: spelling.root,
    notes,
    muted: v.frets.map((f, s) => (f === null ? (s as StringIndex) : -1)).filter((s): s is StringIndex => s >= 0),
    barres: v.barres,
    position: { index: meta.index, count: meta.count, startFret: lowestFretted(v) },
    fingeringSource: meta.fromDb ? 'chords-db' : 'suggested',
    info: {
      intervals: spelling.degrees,
      noteNames: spelling.notes,
      sound: desc.sound,
      useWhen: desc.useWhen,
      fingeringNote: describeVoicing(v, meta.fromDb),
    },
  };
}

/** Every voicing of a chord item in one key. Empty when the key has no such shape. */
export function buildChordShapes(db: ChordDb, root: string, item: ChordItem): Shape[] {
  const spelling = spellChord(root, item.type);
  const chordChromas = spelling.notes.map(noteChroma);
  const fromDb = item.type.dbSuffix
    ? dbPositions(db, root, item.type.dbSuffix)
        .map(toVoicing)
        .filter((v) => fitsNeck(v) && isUsableVoicing(v, chordChromas))
    : [];

  let voicings: { v: Voicing; fromDb: boolean }[];
  let subtitle: ((v: Voicing) => string) | undefined;
  switch (item.source.kind) {
    case 'open':
      voicings = fromDb.filter(isOpenVoicing).map((v) => ({ v, fromDb: true }));
      subtitle = () => 'Open chord';
      break;
    case 'all':
      voicings = fromDb.map((v) => ({ v, fromDb: true }));
      subtitle = (v) => (isOpenVoicing(v) ? 'Open voicing' : `Voicing at fret ${lowestFretted(v)}`);
      break;
    case 'movable': {
      const generated = movableVoicing(item.source.template, noteChroma(root));
      // Prefer the chords-db fingering when it has this exact voicing.
      const match = fromDb.find((v) => sameFrets(v, generated));
      voicings = [{ v: match ?? generated, fromDb: !!match }];
      const label = item.source.shapeLabel;
      subtitle = (v) => `${label} at fret ${lowestFretted(v)}`;
      break;
    }
  }
  voicings.sort((a, b) => lowestFretted(a.v) - lowestFretted(b.v));

  return voicings.map(({ v, fromDb: src }, i) =>
    voicingToShape(
      v,
      spelling,
      {
        id: `${item.id}-${i + 1}`,
        name: item.label(spelling.root),
        index: i + 1,
        count: voicings.length,
        fromDb: src,
        subtitle: subtitle?.(v),
      },
      item,
    ),
  );
}
