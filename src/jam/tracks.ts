import type { SongKey } from '../theory/chordScale';
import type { Progression, Timeline } from './timeline';

/**
 * Backing tracks recorded by real musicians, all under Creative Commons
 * licenses that allow sharing them here. Each mix leaves out the original
 * lead guitar where the pack had one, so the space is yours.
 *
 * Keys and tempos come from each track's own page when it states them.
 * Where a page does not say, they were estimated from the audio and are
 * marked `estimated` until confirmed by ear.
 */

export interface License {
  name: string;
  url: string;
}

export const CC_BY_3: License = { name: 'CC BY 3.0', url: 'https://creativecommons.org/licenses/by/3.0/' };
export const CC0: License = { name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' };

export type TrackStyle = 'blues' | 'slow-blues' | 'funk' | 'rock' | 'metal' | 'ballad';

export const STYLE_LABELS: Record<TrackStyle, string> = {
  blues: 'Blues',
  'slow-blues': 'Slow blues',
  funk: 'Funk and R&B',
  rock: 'Rock',
  metal: 'Metal',
  ballad: 'Ballad',
};

export interface Track {
  id: string;
  /** Where to support the artist (e.g. their store). */
  support?: string;
  /** The song's key, for choosing a scale per chord. */
  key?: SongKey;
  /** Chord chart, when known. */
  progression?: Progression;
  /** When each chord starts, made by tapping along. */
  timeline?: Timeline;
  title: string;
  artist: string;
  /** The page the recording came from. */
  source: string;
  license: License;
  /** What was changed, for the credit line. */
  changes: string;
  file: string;
  style: TrackStyle;
  /** Home note of the key, spelled for the scale builders. */
  root: string;
  /** How the key is described to the player, e.g. "A blues" or "C minor". */
  keyLabel: string;
  bpm: number | null;
  feel: 'straight' | 'shuffle';
  durationSec: number;
  /** Scale ids from the Scales section, best first. */
  scales: string[];
  /** Key or tempo was estimated from the audio and still needs a listen. */
  estimated?: { key?: boolean; tempo?: boolean };
}

const AB = 'Admiral Bob';

export const TRACKS: readonly Track[] = [
  {
    id: 'singer-bait-2',
    title: 'Singer Bait 2 (Blues Shuffle in A)',
    artist: AB,
    source: 'https://ccmixter.org/files/admiralbob77/58464',
    license: CC_BY_3,
    changes: 'solo guitar left out',
    file: 'singer-bait-2.mp3',
    style: 'blues',
    root: 'A',
    keyLabel: 'A blues',
    bpm: 120,
    feel: 'shuffle',
    durationSec: 214,
    scales: ['minor-pentatonic', 'blues', 'major-pentatonic', 'mixolydian'],
  },
  {
    id: 'bebest-blues',
    title: 'BeBest Blues',
    artist: AB,
    source: 'https://ccmixter.org/files/admiralbob77/58481',
    license: CC_BY_3,
    changes: 'solo guitar left out',
    file: 'bebest-blues.mp3',
    style: 'blues',
    root: 'B',
    keyLabel: 'B blues',
    bpm: 78,
    feel: 'straight',
    durationSec: 250,
    scales: ['minor-pentatonic', 'blues', 'major-pentatonic', 'mixolydian'],
  },
  {
    id: 'slow-blues-cm',
    title: 'Slow Blues Backing Track in Cm',
    artist: AB,
    source: 'https://ccmixter.org/files/admiralbob77/28495',
    license: CC_BY_3,
    changes: 'lead guitar left out',
    file: 'slow-blues-cm.mp3',
    style: 'slow-blues',
    root: 'C',
    keyLabel: 'C minor',
    bpm: 55,
    feel: 'straight',
    durationSec: 283,
    scales: ['minor-pentatonic', 'blues', 'natural-minor', 'dorian'],
  },
  {
    id: 'singer-bait-funk',
    title: 'Singer Bait (funk blues in C)',
    artist: AB,
    source: 'https://ccmixter.org/files/admiralbob77/58293',
    license: CC_BY_3,
    changes: 'guitar solo left out',
    file: 'singer-bait-funk.mp3',
    style: 'funk',
    root: 'C',
    keyLabel: 'C funk blues',
    bpm: 120,
    feel: 'straight',
    durationSec: 198,
    scales: ['minor-pentatonic', 'blues', 'mixolydian', 'dorian'],
  },
  {
    id: 'vintage-ballad',
    title: 'Slow vintage ballad songwriting kit',
    artist: AB,
    source: 'https://ccmixter.org/files/admiralbob77/30491',
    license: CC_BY_3,
    changes: 'lead guitar left out',
    file: 'vintage-ballad.mp3',
    style: 'ballad',
    root: 'D',
    keyLabel: 'D major',
    bpm: 68,
    feel: 'straight',
    durationSec: 212,
    scales: ['major-pentatonic', 'major', 'minor-pentatonic', 'mixolydian'],
  },
];

export function trackById(id: string | undefined): Track {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
}

/** Credit line in the form the licenses ask for. */
export function creditText(t: Track): string {
  return `"${t.title}" by ${t.artist}, ${t.license.name}, ${t.changes}`;
}

/** The song's key for chord-by-chord scales: given, or read from the track's key label. */
export function songKey(t: Track): SongKey {
  return t.key ?? { root: t.root, minor: /minor/.test(t.keyLabel) };
}

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
