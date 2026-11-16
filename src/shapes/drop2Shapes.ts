import type { FretNote, FretPos, Shape, StringIndex } from '../core/types';
import { DROP2_DESCRIPTIONS } from '../content/descriptions';
import { assignFingers } from '../fingering/fingers';
import { CHORD_TYPES, spellChord, type ChordType } from '../theory/chords';
import { MAX_FRET, OPEN_MIDI, chromaOf, stringName } from '../theory/guitar';
import { noteChroma } from '../theory/spelling';

/**
 * Drop 2 voicings: four-note 7th (and 6th) chords on four neighboring
 * strings. Take a close chord (all four notes within an octave) and drop its
 * second-highest note an octave. The result spreads nicely across four
 * strings, and each chord has four of them, one with each chord tone in the
 * bass.
 */

export interface Drop2Set {
  id: string;
  /** Lowest of the four strings. */
  low: StringIndex;
  label: string;
  short: string;
}

export const DROP2_SETS: readonly Drop2Set[] = [
  { id: 'dgbe', low: 2, label: 'D, G, B, and high E strings', short: 'D G B e' },
  { id: 'adgb', low: 1, label: 'A, D, G, and B strings', short: 'A D G B' },
  { id: 'eadg', low: 0, label: 'Low E, A, D, and G strings', short: 'E A D G' },
];

export const DROP2_TYPES: readonly ChordType[] = [
  CHORD_TYPES.maj7,
  CHORD_TYPES.dom7,
  CHORD_TYPES.m7,
  CHORD_TYPES.m7b5,
  CHORD_TYPES.dim7,
  CHORD_TYPES.six,
  CHORD_TYPES.m6,
];

/**
 * Chord tones (by index: 0 root, 1 third, 2 fifth, 3 seventh) from the bass up,
 * for a drop 2 voicing with tone `bass` in the bass. Dropping the second-highest
 * note of a close voicing gives the pattern bass, +2, +3, +1.
 */
export function drop2Order(bass: number): number[] {
  return [bass, (bass + 2) % 4, (bass + 3) % 4, (bass + 1) % 4];
}

/**
 * Places a voicing on neighboring strings: each note is the next pitch above
 * the last with the wanted pitch class, one per string. Tries both octaves
 * and keeps the lowest that stays on frets 1 to 15 within a five-fret span
 * (open strings only when nothing else fits).
 */
export function placeOnStrings(order: readonly number[], low: StringIndex, maxSpan = 4): FretPos[] | null {
  const base = (((order[0] - OPEN_MIDI[low]) % 12) + 12) % 12;
  const fits: FretPos[][] = [];
  for (const start of [base, base + 12]) {
    const out: FretPos[] = [{ string: low, fret: start }];
    let prev = OPEN_MIDI[low] + start;
    for (let k = 1; k < order.length; k++) {
      const s = (low + k) as StringIndex;
      let midi = prev + 1;
      while (chromaOf(midi) !== order[k]) midi++;
      out.push({ string: s, fret: midi - OPEN_MIDI[s] });
      prev = midi;
    }
    const frets = out.map((p) => p.fret);
    if (Math.min(...frets) >= 0 && Math.max(...frets) <= MAX_FRET && Math.max(...frets) - Math.min(...frets) <= maxSpan) fits.push(out);
  }
  return fits.find((c) => c.every((p) => p.fret >= 1)) ?? fits[0] ?? null;
}

export function buildDrop2Shapes(key: string, type: ChordType, set: Drop2Set): Shape[] {
  const spelling = spellChord(key, type);
  const chromas = spelling.notes.map(noteChroma);
  const desc = DROP2_DESCRIPTIONS[type.id] ?? { sound: '', useWhen: '' };
  const shapes: Shape[] = [];
  for (let bass = 0; bass < 4; bass++) {
    const order = drop2Order(bass).map((i) => chromas[i]);
    const box = placeOnStrings(order, set.low);
    if (!box) continue;
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
    const frets = box.map((p) => p.fret);
    const bassDegree = spelling.degrees[bass];
    const bassNote = spelling.notes[bass];
    const label = bass === 0 ? 'Root' : bassDegree;
    shapes.push({
      id: `drop2-${type.id}-${set.id}-${bass}`,
      kind: 'chord',
      name: `${spelling.name} drop 2`,
      symbol: bass === 0 ? spelling.name : `${spelling.name}/${bassNote}`,
      subtitle: `${bass === 0 ? `Root (${bassNote})` : `The ${bassDegree} (${bassNote})`} in the bass, on the ${set.label}, frets ${Math.min(...frets)} to ${Math.max(...frets)}`,
      root: spelling.root,
      notes,
      muted: ([0, 1, 2, 3, 4, 5] as StringIndex[]).filter((s) => s < set.low || s > set.low + 3),
      position: { index: bass + 1, count: 4, startFret: Math.min(...frets), label },
      positionUnit: 'Bass',
      fingeringSource: 'suggested',
      info: {
        intervals: spelling.degrees,
        noteNames: spelling.notes,
        sound: desc.sound,
        useWhen: desc.useWhen,
        fingeringNote: `From the ${stringName(set.low)} string up: ${notes.map((n) => `${n.note} (${n.degree})`).join(', ')}. Suggested fingering uses one finger per fret; two notes on the same fret can share a flattened finger.`,
      },
    });
  }
  return shapes;
}
