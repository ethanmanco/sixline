import type { FretNote, Shape, StringIndex } from '../core/types';
import { CHORD_DESCRIPTIONS } from '../content/descriptions';
import { dbPositions, dbSlashPositions, sameFrets, toVoicing, type ChordDb, type Voicing } from '../chords/db';
import { movableVoicing } from '../chords/movable';
import { CHORD_TYPES, spellChord, type ChordSpelling, type ChordType } from '../theory/chords';
import { MAX_FRET, OPEN_MIDI, STRING_NAMES, chromaOf, stringName } from '../theory/guitar';
import { noteChroma } from '../theory/spelling';

export type ChordGroup = 'open' | 'barre' | 'power' | 'seventh' | 'sus' | 'sixnine' | 'dimaug' | 'slash';

export const CHORD_GROUPS: { id: ChordGroup; label: string; short: string }[] = [
  { id: 'open', label: 'Open chords', short: 'Open' },
  { id: 'barre', label: 'Barre chords', short: 'Barre' },
  { id: 'power', label: 'Power chords', short: 'Power' },
  { id: 'seventh', label: '7th chords', short: '7th' },
  { id: 'sus', label: 'Sus and add9', short: 'Sus, add9' },
  { id: 'sixnine', label: '6th and 9th chords', short: '6th, 9th' },
  { id: 'dimaug', label: 'Diminished and augmented', short: 'Dim, aug' },
  { id: 'slash', label: 'Slash chords', short: 'Slash' },
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
  source:
    | { kind: 'open' }
    | { kind: 'all' }
    | { kind: 'movable'; template: string; shapeLabel: string }
    /** A chord over one of its own notes: `bass` indexes the chord's notes (1 = 3rd, 2 = 5th). */
    | { kind: 'slash'; template: string; bass: number };
}

/** "G/B" for G major over its 3rd. */
export function slashName(root: string, type: ChordType, bass: number): string {
  const s = spellChord(root, type);
  return `${s.name}/${s.notes[bass]}`;
}

function barreItem(id: string, type: ChordType, template: string, shape: 'E' | 'A', name: string, symbol: string): ChordItem {
  return {
    id,
    group: 'barre',
    type,
    short: (r) => `${r}${symbol} ${shape} shape`,
    label: (r) => `${r} ${name}, ${shape} shape`,
    source: { kind: 'movable', template, shapeLabel: `${shape}-shape barre` },
  };
}

function slashItem(id: string, type: ChordType, template: string, bass: number, what: string): ChordItem {
  return {
    id,
    group: 'slash',
    type,
    short: (r) => slashName(r, type, bass),
    label: (r) => `${slashName(r, type, bass)} (${type.label}, ${what} in the bass)`,
    source: { kind: 'slash', template, bass },
  };
}

const T = CHORD_TYPES;

export const CHORD_ITEMS: readonly ChordItem[] = [
  { id: 'open-major', group: 'open', type: T.major, short: (r) => r, label: (r) => `${r} major`, source: { kind: 'open' } },
  { id: 'open-minor', group: 'open', type: T.minor, short: (r) => `${r}m`, label: (r) => `${r} minor`, source: { kind: 'open' } },
  { id: 'open-7', group: 'open', type: T.dom7, short: (r) => `${r}7`, label: (r) => `${r}7`, source: { kind: 'open' } },
  barreItem('barre-major-e', T.major, 'major-e', 'E', 'major', ''),
  barreItem('barre-major-a', T.major, 'major-a', 'A', 'major', ''),
  barreItem('barre-minor-e', T.minor, 'minor-e', 'E', 'minor', 'm'),
  barreItem('barre-minor-a', T.minor, 'minor-a', 'A', 'minor', 'm'),
  barreItem('barre-7-e', T.dom7, 'dom7-e', 'E', 'dominant 7', '7'),
  barreItem('barre-7-a', T.dom7, 'dom7-a', 'A', 'dominant 7', '7'),
  barreItem('barre-m7-e', T.m7, 'm7-e', 'E', 'minor 7', 'm7'),
  barreItem('barre-m7-a', T.m7, 'm7-a', 'A', 'minor 7', 'm7'),
  barreItem('barre-maj7-e', T.maj7, 'maj7-e', 'E', 'major 7', 'maj7'),
  barreItem('barre-maj7-a', T.maj7, 'maj7-a', 'A', 'major 7', 'maj7'),
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
  { id: 'm7b5', group: 'seventh', type: T.m7b5, short: (r) => `${r}m7b5`, label: (r) => `${r}m7b5 (minor 7 flat 5)`, source: { kind: 'all' } },
  { id: 'sus2', group: 'sus', type: T.sus2, short: (r) => `${r}sus2`, label: (r) => `${r}sus2`, source: { kind: 'all' } },
  { id: 'sus4', group: 'sus', type: T.sus4, short: (r) => `${r}sus4`, label: (r) => `${r}sus4`, source: { kind: 'all' } },
  { id: '7sus4', group: 'sus', type: T.sus7, short: (r) => `${r}7sus4`, label: (r) => `${r}7sus4`, source: { kind: 'all' } },
  { id: 'add9', group: 'sus', type: T.add9, short: (r) => `${r}add9`, label: (r) => `${r}add9`, source: { kind: 'all' } },
  { id: '6', group: 'sixnine', type: T.six, short: (r) => `${r}6`, label: (r) => `${r}6 (major 6)`, source: { kind: 'all' } },
  { id: 'm6', group: 'sixnine', type: T.m6, short: (r) => `${r}m6`, label: (r) => `${r}m6 (minor 6)`, source: { kind: 'all' } },
  { id: '9', group: 'sixnine', type: T.nine, short: (r) => `${r}9`, label: (r) => `${r}9 (dominant 9)`, source: { kind: 'all' } },
  { id: 'dim', group: 'dimaug', type: T.dim, short: (r) => `${r}dim`, label: (r) => `${r}dim (diminished)`, source: { kind: 'all' } },
  { id: 'dim7', group: 'dimaug', type: T.dim7, short: (r) => `${r}dim7`, label: (r) => `${r}dim7 (diminished 7)`, source: { kind: 'all' } },
  { id: 'aug', group: 'dimaug', type: T.aug, short: (r) => `${r}aug`, label: (r) => `${r}aug (augmented)`, source: { kind: 'all' } },
  slashItem('slash-major-3rd', T.major, 'major-over-3rd', 1, '3rd'),
  slashItem('slash-major-5th', T.major, 'major-over-5th', 2, '5th'),
  slashItem('slash-minor-3rd', T.minor, 'minor-over-3rd', 1, 'b3'),
  slashItem('slash-minor-5th', T.minor, 'minor-over-5th', 2, '5th'),
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
 * than shown with a wrong note or a guessed finger. Voicings missing a chord
 * tone (other than the 5th) are left out too, such as a "C9" with no Bb.
 */
export function isUsableVoicing(v: Voicing, chordChromas: readonly number[], requiredChromas: readonly number[] = [chordChromas[0]]): boolean {
  const sounding = new Set(v.frets.map((f, s) => (f === null ? -1 : chromaOf(OPEN_MIDI[s] + f))));
  if (!requiredChromas.every((c) => sounding.has(c))) return false;
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
  const desc = CHORD_DESCRIPTIONS[item.id] ?? CHORD_DESCRIPTIONS[item.type.id] ?? { sound: '', useWhen: '' };
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
  // Every chord tone must sound, except a perfect 5th, which guitarists often leave out.
  const required = chordChromas.filter((_, i) => spelling.intervals[i] !== '5P');
  const fromDb = item.type.dbSuffix
    ? dbPositions(db, root, item.type.dbSuffix)
        .map(toVoicing)
        .filter((v) => fitsNeck(v) && isUsableVoicing(v, chordChromas, required))
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
    case 'slash': {
      // chords-db has a few slash chords (mostly open ones); the movable shape covers every key.
      const bassChroma = chordChromas[item.source.bass];
      const isBass = (v: Voicing) => {
        const lowest = v.frets.findIndex((f) => f !== null);
        return lowest >= 0 && chromaOf(OPEN_MIDI[lowest] + (v.frets[lowest] as number)) === bassChroma;
      };
      const fromSlash = dbSlashPositions(db, root, item.type.id === 'minor', bassChroma)
        .map(toVoicing)
        .filter((v) => fitsNeck(v) && isUsableVoicing(v, chordChromas, required) && isBass(v));
      const generated = movableVoicing(item.source.template, bassChroma);
      voicings = fromSlash.map((v) => ({ v, fromDb: true }));
      if (!fromSlash.some((v) => sameFrets(v, generated))) voicings.push({ v: generated, fromDb: false });
      const bassName = spelling.notes[item.source.bass];
      subtitle = (v) =>
        isOpenVoicing(v) ? `Open shape, ${bassName} in the bass` : `Movable shape at fret ${lowestFretted(v)}, ${bassName} in the bass`;
      break;
    }
    case 'movable': {
      const generated = movableVoicing(item.source.template, noteChroma(spelling.root));
      // Prefer the chords-db fingering when it has this exact voicing.
      const match = fromDb.find((v) => sameFrets(v, generated));
      voicings = [{ v: match ?? generated, fromDb: !!match }];
      const label = item.source.shapeLabel;
      subtitle = (v) => `${label} at fret ${lowestFretted(v)}`;
      break;
    }
  }
  voicings.sort((a, b) => lowestFretted(a.v) - lowestFretted(b.v));

  const symbol = item.source.kind === 'slash' ? slashName(spelling.root, item.type, item.source.bass) : undefined;
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
  ).map((shape) => (symbol ? { ...shape, symbol } : shape));
}
