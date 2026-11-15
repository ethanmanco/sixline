import { Scale } from 'tonal';
import type { FretNote, FretPos, Shape, ShapeKind } from '../core/types';
import { SCALE_DESCRIPTIONS, type Description } from '../content/descriptions';
import { assignFingers } from '../fingering/fingers';
import { bluesBoxes, pentatonicBoxes, wholeNeck, windowPositions, type Placed } from '../fingering/positions';
import { midiAt, chromaOf, STRING_NAMES, stringName } from '../theory/guitar';
import { spellScale, type ScaleSpelling, type ScaleType } from '../theory/scales';
import { noteChroma } from '../theory/spelling';

/** Note names and degrees for a set of pitches: a scale or an arpeggio. */
export interface Spelling {
  root: string;
  notes: string[];
  degrees: string[];
}

/** Attaches spelling and degree to placed positions (fingers already chosen). */
export function spellPlaced(placed: readonly Placed[], spelling: Spelling): FretNote[] {
  const chromas = spelling.notes.map(noteChroma);
  return placed.map((p): FretNote => {
    const midi = midiAt(p);
    const idx = chromas.indexOf(chromaOf(midi));
    if (idx < 0) throw new Error(`${STRING_NAMES[p.string]} string fret ${p.fret} is not in ${spelling.root}`);
    return {
      string: p.string,
      fret: p.fret,
      midi,
      note: spelling.notes[idx],
      degree: spelling.degrees[idx],
      isRoot: idx === 0,
      finger: p.finger,
      ...(p.shift ? { shift: p.shift } : {}),
    };
  });
}

/** Chooses fingers for a box with the one-finger-per-fret rule, then spells it. */
export function toFretNotes(box: readonly FretPos[], spelling: Spelling): { notes: FretNote[]; lo: number } {
  const hand = assignFingers(box, box[0]?.fret);
  const placed = box.map((p, i): Placed => ({ ...p, ...hand.fingers[i] }));
  return { notes: spellPlaced(placed, spelling), lo: hand.lo };
}

/** Fret under the index finger: found from any fretted note that is not a shift. */
export function handLo(notes: readonly FretNote[]): number {
  const anchored = notes.find((n) => typeof n.finger === 'number' && n.finger > 0 && !n.shift);
  if (!anchored) return 1;
  return anchored.fret - (anchored.finger as number) + 1;
}

export function describeHand(notes: readonly FretNote[], lo: number): string {
  const hasOpen = notes.some((n) => n.fret === 0);
  const shifts = notes.filter((n) => n.shift);
  const parts: string[] = [];
  parts.push(`One finger per fret: index on fret ${lo}, middle on ${lo + 1}, ring on ${lo + 2}, pinky on ${lo + 3}.`);
  if (hasOpen) parts.push('Open strings ring with no finger.');
  if (shifts.length > 0) {
    const where = shifts
      .map((n) => `${stringName(n.string)} string fret ${n.fret} (${n.shift === 'up' ? 'pinky reaches up' : 'index reaches back'})`)
      .join(', ');
    parts.push(`Shift your hand one fret for ${where}.`);
  }
  return parts.join(' ');
}

/** The whole-neck view: every note from fret 0 to 15, no fingering. Plays each pitch once, low to high. */
export function wholeNeckShape(
  spelling: Spelling,
  kind: ShapeKind,
  id: string,
  name: string,
  desc: Description,
  intervals: string[],
): Shape {
  const placed = wholeNeck(spelling.notes.map(noteChroma)).map((p): Placed => ({ ...p, finger: 0 }));
  const notes = spellPlaced(placed, spelling).map((n) => ({ ...n, finger: null }));
  const seen = new Set<number>();
  const order = notes
    .map((n, i) => ({ n, i }))
    .sort((a, b) => a.n.midi - b.n.midi || a.n.string - b.n.string)
    .filter(({ n }) => (seen.has(n.midi) ? false : (seen.add(n.midi), true)))
    .map(({ i }) => i);
  return {
    id,
    kind,
    name,
    subtitle: 'Whole neck: every note from fret 0 to 15',
    root: spelling.root,
    notes,
    playOrder: order,
    fingeringSource: 'suggested',
    info: {
      intervals,
      noteNames: spelling.notes,
      sound: desc.sound,
      useWhen: desc.useWhen,
      fingeringNote: 'No fingering here. This view shows every note so you can see how the positions link up along the neck.',
    },
  };
}

/** Every position of a scale in one key, plus the whole-neck view. */
export function buildScaleShapes(key: string, type: ScaleType): Shape[] {
  const spelling: ScaleSpelling = spellScale(key, type);
  const chromas = spelling.notes.map(noteChroma);
  const desc = SCALE_DESCRIPTIONS[type.id] ?? { sound: '', useWhen: '' };
  const name = `${spelling.root} ${type.label.toLowerCase()}`;

  let boxes: { notes: FretNote[]; lo: number }[];
  switch (type.family) {
    case 'pentatonic':
      boxes = pentatonicBoxes(chromas).map((b) => toFretNotes(b, spelling));
      break;
    case 'blues': {
      const base = Scale.get(`${spelling.root} ${type.base}`).notes.map(noteChroma);
      const blue = chromas.filter((c) => !base.includes(c));
      boxes = bluesBoxes(base, blue).map((b) => toFretNotes(b, spelling));
      break;
    }
    case 'heptatonic':
      boxes = windowPositions(chromas, chromas).map((placed) => {
        const notes = spellPlaced(placed, spelling);
        return { notes, lo: handLo(notes) };
      });
      break;
  }

  const positions = boxes.map(
    ({ notes, lo }, i): Shape => ({
      id: `${type.id}-${i + 1}`,
      kind: 'scale',
      name,
      root: spelling.root,
      notes,
      position: { index: i + 1, count: boxes.length, startFret: notes[0].fret },
      fingeringSource: 'suggested',
      info: {
        intervals: spelling.degrees,
        noteNames: spelling.notes,
        sound: desc.sound,
        useWhen: desc.useWhen,
        fingeringNote: describeHand(notes, lo),
      },
    }),
  );
  return [...positions, wholeNeckShape(spelling, 'scale', `${type.id}-neck`, name, desc, spelling.degrees)];
}
