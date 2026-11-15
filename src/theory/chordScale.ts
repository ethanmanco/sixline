import { Chord, Note, Scale } from 'tonal';
import { scaleType, spellScale } from './scales';

/**
 * Chord-scale suggestions: which scale fits the chord that is playing right
 * now, given the song's key.
 *
 * The rule of thumb jazz and fusion players use, written as code:
 * 1. If every note of the chord is in the key's scale, keep playing the key's
 *    scale (less switching, and it already fits).
 * 2. Otherwise pick the scale that matches the chord's outside notes:
 *    7b9 chords get Phrygian dominant, minor 6 chords get melodic minor, a
 *    dominant chord pulling to a minor chord gets that minor chord's melodic
 *    minor, and so on.
 * 3. Whatever the rule picks must contain every chord tone; if not, the first
 *    scale from a fallback list that does is used.
 */

export interface SongKey {
  root: string;
  minor: boolean;
}

export interface ChordScale {
  /** Scale id from the Scales section. */
  scaleId: string;
  /** Root of that scale, spelled. */
  root: string;
  /** E.g. "C# Phrygian dominant". */
  label: string;
  /** For key-scale picks: the mode this chord sees, e.g. "F# Dorian". */
  modeOverChord?: string;
  /** One plain-English sentence on why. */
  why: string;
  /** True when it is the song's key scale, not a switch. */
  isKeyScale: boolean;
}

/** Guitarists write chords a few ways tonal does not read; translate them. */
export function normalizeSymbol(sym: string): string {
  return sym
    .trim()
    .replace(/sus9$/, '9sus4')
    .replace(/7sus$/, '7sus4')
    .replace(/m\(maj7\)$/, 'mMaj7')
    .replace(/min/, 'm');
}

export function parseChord(sym: string) {
  const c = Chord.get(normalizeSymbol(sym));
  if (c.empty || !c.tonic) throw new Error(`Cannot read chord symbol "${sym}"`);
  return c;
}

/** Pitch classes (0 to 11) of a chord symbol. */
export function chordChromas(sym: string): number[] {
  return parseChord(sym).notes.map((n) => Note.chroma(n) as number);
}

const MAJOR_MODES = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'];
const LABEL: Record<string, string> = {
  major: 'major (Ionian)',
  'natural-minor': 'natural minor (Aeolian)',
};

function scaleLabel(root: string, id: string): string {
  const spelled = spellScale(root, scaleType(id)).root;
  return `${spelled} ${LABEL[id] ?? scaleType(id).label}`;
}

function scaleChromas(root: string, id: string): number[] {
  return Scale.get(`${root} ${scaleType(id).tonalName}`).notes.map((n) => Note.chroma(n) as number);
}

function containsAll(scale: number[], chord: number[]): boolean {
  return chord.every((c) => scale.includes(c));
}

const FALLBACKS = ['major', 'mixolydian', 'lydian', 'dorian', 'melodic-minor', 'harmonic-minor', 'phrygian-dominant', 'diminished-hw', 'whole-tone', 'diminished-wh'];

export function chordScaleFor(sym: string, key: SongKey): ChordScale {
  const c = parseChord(sym);
  const root = c.tonic as string;
  const tones = c.notes.map((n) => Note.chroma(n) as number);
  const ivs = new Set(c.intervals.map((i) => i.replace(/^(\d+)/, (n) => String(((Number(n) - 1) % 7) + 1))));
  const has = (i: string) => ivs.has(i);

  // 1. Stay in the key when the chord fits.
  const keyId = key.minor ? 'natural-minor' : 'major';
  const keyNotes = scaleChromas(key.root, keyId);
  if (containsAll(keyNotes, tones)) {
    const keySpelled = Scale.get(`${key.root} ${scaleType(keyId).tonalName}`).notes;
    const degree = keySpelled.findIndex((n) => Note.chroma(n) === Note.chroma(root));
    const offset = key.minor ? 5 : 0;
    const mode = degree >= 0 ? `${root} ${MAJOR_MODES[(degree + offset) % 7]}` : undefined;
    return {
      scaleId: keyId,
      root: key.root,
      label: scaleLabel(key.root, keyId),
      modeOverChord: mode,
      why: `Every note of ${sym} is in the key, so the key's scale fits${mode ? ` (it sounds as ${mode} over this chord)` : ''}.`,
      isKeyScale: true,
    };
  }

  // Is the chord a fifth above a chord that is minor in this key? (a "secondary dominant" to a minor chord)
  const target = Note.pitchClass(Note.transpose(root, '-5P'));
  const targetDegree = keyNotes.indexOf(Note.chroma(target) as number);
  const minorDegrees = key.minor ? [0, 3, 4] : [1, 2, 5];
  const pullsToMinor = targetDegree >= 0 && minorDegrees.includes(targetDegree);

  let pick: { id: string; root: string; why: string };
  const third3M = has('3M');
  const third3m = has('3m');
  if (has('3m') && has('5d') && has('7d')) {
    pick = { id: 'diminished-wh', root, why: `${sym} is built from stacked minor thirds, and the whole-half diminished scale is too.` };
  } else if (third3m && has('5d')) {
    pick = { id: 'locrian', root, why: `${sym} has a minor 3rd and a flat 5, the sound of Locrian.` };
  } else if (third3M && has('5A') && !has('7m')) {
    pick = { id: 'whole-tone', root, why: `${sym} has a raised 5th, which the whole tone scale contains.` };
  } else if (third3M && has('7m') && (has('2m') || has('6m'))) {
    pick = { id: 'phrygian-dominant', root, why: `${sym} adds a flat 9 (or flat 13) to a dominant chord, exactly the notes of Phrygian dominant.` };
  } else if (third3M && has('7m') && has('2A')) {
    pick = { id: 'diminished-hw', root, why: `${sym} has a sharp 9; the half-whole diminished scale holds the 3rd, flat 7, and both altered 9ths.` };
  } else if (third3M && has('7m') && key.minor && targetDegree === 0) {
    pick = { id: 'phrygian-dominant', root, why: `${sym} is the V7 of this minor key; Phrygian dominant is its classic sound.` };
  } else if (third3M && has('7m') && pullsToMinor) {
    pick = {
      id: 'melodic-minor',
      root: target,
      why: `${sym} pulls toward ${target} minor, so ${target} melodic minor fits (its 5th mode is the dominant sound over ${root}).`,
    };
  } else if ((third3M && has('7m')) || (!third3M && !third3m && has('4P'))) {
    pick = { id: 'mixolydian', root, why: `${sym} is a dominant or suspended chord, the home of Mixolydian.` };
  } else if (third3m && (has('6M') || has('7M'))) {
    pick = { id: 'melodic-minor', root, why: `${sym} is minor with a major 6th or 7th, which is melodic minor.` };
  } else if (third3m) {
    pick = { id: 'dorian', root, why: `${sym} is a minor chord from outside the key; Dorian is the usual choice.` };
  } else {
    pick = { id: 'lydian', root, why: `${sym} is a major chord borrowed from outside the key; Lydian keeps it bright.` };
  }

  // 3. Must contain every chord tone.
  if (!containsAll(scaleChromas(pick.root, pick.id), tones)) {
    const id = FALLBACKS.find((f) => containsAll(scaleChromas(root, f), tones)) ?? 'major';
    pick = { id, root, why: `${scaleType(id).label} is the first common scale that holds every note of ${sym}.` };
  }
  return { scaleId: pick.id, root: pick.root, label: scaleLabel(pick.root, pick.id), why: pick.why, isKeyScale: false };
}
