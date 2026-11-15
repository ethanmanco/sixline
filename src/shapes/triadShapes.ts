import type { FretNote, FretPos, Shape, StringIndex } from '../core/types';
import { TRIAD_DESCRIPTIONS } from '../content/descriptions';
import { assignFingers } from '../fingering/fingers';
import { CHORD_TYPES, spellChord, type ChordType } from '../theory/chords';
import { MAX_FRET, OPEN_MIDI, chromaOf, stringName } from '../theory/guitar';
import { noteChroma } from '../theory/spelling';

/**
 * Triads: three-note chords played on three neighboring strings, in root
 * position and both inversions. They are the small shapes that fill out riffs
 * and rhythm parts all over the neck.
 */

export interface StringSet {
  id: string;
  /** Lowest string of the three. */
  low: StringIndex;
  label: string;
  short: string;
}

export const STRING_SETS: readonly StringSet[] = [
  { id: 'gbe', low: 3, label: 'G, B, and high E strings', short: 'G B e' },
  { id: 'dgb', low: 2, label: 'D, G, and B strings', short: 'D G B' },
  { id: 'adg', low: 1, label: 'A, D, and G strings', short: 'A D G' },
  { id: 'ead', low: 0, label: 'Low E, A, and D strings', short: 'E A D' },
];

export const TRIAD_TYPES: readonly ChordType[] = [CHORD_TYPES.major, CHORD_TYPES.minor, CHORD_TYPES.dim, CHORD_TYPES.aug];

export const INVERSIONS = ['Root position', '1st inversion', '2nd inversion'];
const BASS_WORD = ['root', '3rd', '5th'];

/**
 * Places a close triad on three neighboring strings: the chosen bass note on
 * the lowest string, then each next chord tone above it on the next string.
 * Tries the shape in both octaves and keeps the lowest one that stays on frets
 * 1 to 15 (or uses an open string only when nothing else fits).
 */
export function placeTriad(chordChromas: readonly number[], low: StringIndex, inversion: number): FretPos[] | null {
  const order = [0, 1, 2].map((i) => chordChromas[(inversion + i) % 3]);
  const base = (((order[0] - OPEN_MIDI[low]) % 12) + 12) % 12;
  const candidates: FretPos[][] = [];
  for (const start of [base, base + 12]) {
    const out: FretPos[] = [{ string: low, fret: start }];
    let prev = OPEN_MIDI[low] + start;
    for (let k = 1; k < 3; k++) {
      const s = (low + k) as StringIndex;
      let midi = prev + 1;
      while (chromaOf(midi) !== order[k]) midi++;
      out.push({ string: s, fret: midi - OPEN_MIDI[s] });
      prev = midi;
    }
    const frets = out.map((p) => p.fret);
    if (Math.min(...frets) >= 0 && Math.max(...frets) <= MAX_FRET && Math.max(...frets) - Math.min(...frets) <= 4) {
      candidates.push(out);
    }
  }
  return candidates.find((c) => c.every((p) => p.fret >= 1)) ?? candidates[0] ?? null;
}

export function buildTriadShapes(key: string, type: ChordType, set: StringSet): Shape[] {
  const spelling = spellChord(key, type);
  const chromas = spelling.notes.map(noteChroma);
  const desc = TRIAD_DESCRIPTIONS[type.id] ?? { sound: '', useWhen: '' };
  const shapes: Shape[] = [];
  INVERSIONS.forEach((invName, inv) => {
    const box = placeTriad(chromas, set.low, inv);
    if (!box) return;
    const hand = assignFingers(box, box[0].fret);
    const notes: FretNote[] = box.map((p, i) => {
      const midi = OPEN_MIDI[p.string] + p.fret;
      const idx = chromas.indexOf(chromaOf(midi));
      return {
        ...p,
        midi,
        note: spelling.notes[idx],
        degree: spelling.degrees[idx],
        isRoot: idx === 0,
        finger: hand.fingers[i].finger,
        ...(hand.fingers[i].shift ? { shift: hand.fingers[i].shift } : {}),
      };
    });
    const bassName = spelling.notes[inv];
    const sameFret = notes.filter((n, i) => notes.some((m, j) => j !== i && m.fret === n.fret && m.fret > 0 && m.finger === n.finger));
    const fingerText = [
      `${invName}: the ${BASS_WORD[inv]} (${bassName}) is the lowest note, on the ${stringName(set.low)} string.`,
      sameFret.length ? `Flatten finger ${sameFret[0].finger} across the two notes at fret ${sameFret[0].fret}.` : '',
      'Suggested fingering uses one finger per fret.',
    ]
      .filter(Boolean)
      .join(' ');
    shapes.push({
      id: `triad-${type.id}-${set.id}-${inv}`,
      kind: 'chord',
      name: `${spelling.root} ${type.label} triad`,
      symbol: inv === 0 ? spelling.name : `${spelling.name}/${bassName}`,
      subtitle: `${invName} on the ${set.label}, frets ${Math.min(...box.map((p) => p.fret))} to ${Math.max(...box.map((p) => p.fret))}`,
      root: spelling.root,
      notes,
      muted: ([0, 1, 2, 3, 4, 5] as StringIndex[]).filter((s) => s < set.low || s > set.low + 2),
      position: { index: inv + 1, count: INVERSIONS.length, startFret: Math.min(...box.map((p) => p.fret)), label: ['Root', '1st', '2nd'][inv] },
      positionUnit: 'Inversion',
      fingeringSource: 'suggested',
      info: {
        intervals: spelling.degrees,
        noteNames: spelling.notes,
        sound: desc.sound,
        useWhen: desc.useWhen,
        fingeringNote: fingerText,
      },
    });
  });
  return shapes;
}
