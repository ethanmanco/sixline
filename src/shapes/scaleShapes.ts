import type { FretNote, FretPos, Shape } from '../core/types';
import { SCALE_DESCRIPTIONS } from '../content/descriptions';
import { assignFingers } from '../fingering/fingers';
import { pentatonicBoxes } from '../fingering/positions';
import { midiAt, chromaOf, STRING_NAMES, stringName } from '../theory/guitar';
import { spellScale, type ScaleSpelling, type ScaleType } from '../theory/scales';
import { noteChroma } from '../theory/spelling';

/** Attaches spelling, degree, and suggested finger to each position in a box. */
export function toFretNotes(box: readonly FretPos[], spelling: ScaleSpelling): { notes: FretNote[]; lo: number } {
  const chromas = spelling.notes.map(noteChroma);
  const hand = assignFingers(box, box[0]?.fret);
  const notes = box.map((p, i): FretNote => {
    const midi = midiAt(p);
    const idx = chromas.indexOf(chromaOf(midi));
    if (idx < 0) throw new Error(`Position ${STRING_NAMES[p.string]} ${p.fret} is not in ${spelling.root} scale`);
    const f = hand.fingers[i];
    return {
      ...p,
      midi,
      note: spelling.notes[idx],
      degree: spelling.degrees[idx],
      isRoot: idx === 0,
      finger: f.finger,
      ...(f.shift ? { shift: f.shift } : {}),
    };
  });
  return { notes, lo: hand.lo };
}

export function describeHand(notes: readonly FretNote[], lo: number): string {
  const hasOpen = notes.some((n) => n.fret === 0);
  const shifts = notes.filter((n) => n.shift);
  const parts: string[] = [];
  parts.push(
    `One finger per fret: index on fret ${lo}, middle on ${lo + 1}, ring on ${lo + 2}, pinky on ${lo + 3}.`,
  );
  if (hasOpen) parts.push('Open strings ring with no finger.');
  if (shifts.length > 0) {
    const where = shifts
      .map((n) => `${stringName(n.string)} string fret ${n.fret} (${n.shift === 'up' ? 'pinky reaches up' : 'index reaches back'})`)
      .join(', ');
    parts.push(`Shift your hand one fret for ${where}.`);
  }
  return parts.join(' ');
}

/** Every position of a scale in one key. */
export function buildScaleShapes(root: string, type: ScaleType): Shape[] {
  const spelling = spellScale(root, type);
  const chromas = spelling.notes.map(noteChroma);
  const desc = SCALE_DESCRIPTIONS[type.id] ?? { sound: '', useWhen: '' };

  let boxes: FretPos[][];
  if (type.family === 'pentatonic') {
    boxes = pentatonicBoxes(chromas);
  } else {
    throw new Error(`No fingering rule yet for ${type.family} scales`);
  }

  return boxes.map((box, i): Shape => {
    const { notes, lo } = toFretNotes(box, spelling);
    return {
      id: `${type.id}-${i + 1}`,
      kind: 'scale',
      name: `${root} ${type.label.toLowerCase()}`,
      root,
      notes,
      position: { index: i + 1, count: boxes.length, startFret: box[0].fret },
      fingeringSource: 'suggested',
      info: {
        intervals: spelling.degrees,
        noteNames: spelling.notes,
        sound: desc.sound,
        useWhen: desc.useWhen,
        fingeringNote: describeHand(notes, lo),
      },
    };
  });
}
