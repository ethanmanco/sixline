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
/** Not a license to copy: the video plays from YouTube in YouTube's own player. */
export const YOUTUBE_EMBED: License = { name: 'Played from YouTube', url: 'https://www.youtube.com/t/terms' };

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
  /** A recording bundled with the app, or a YouTube video played in YouTube's own player. */
  kind?: 'audio' | 'youtube';
  youtubeId?: string;
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
    id: 'morning-blues',
    title: 'Morning Blues',
    artist: AB,
    source: 'https://ccmixter.org/files/admiralbob77/59680',
    license: CC_BY_3,
    changes: 'mixed from the original parts',
    file: 'morning-blues.mp3',
    style: 'slow-blues',
    root: 'A',
    keyLabel: 'A minor',
    bpm: 55,
    feel: 'straight',
    durationSec: 226,
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
    id: 'one-man-jam',
    title: 'One Man Jam Session',
    artist: 'BaDoink',
    source: 'https://freesound.org/people/BaDoink/sounds/577102/',
    license: CC_BY_3,
    changes: 'volume matched',
    file: 'one-man-jam.mp3',
    style: 'funk',
    root: 'E',
    keyLabel: 'E',
    bpm: 104,
    feel: 'straight',
    durationSec: 282,
    scales: ['minor-pentatonic', 'dorian', 'blues', 'mixolydian'],
    estimated: { tempo: true },
  },
  {
    id: 'hard-rock-loop',
    title: 'Hard Rock Loop',
    artist: 'BaDoink',
    source: 'https://freesound.org/people/BaDoink/sounds/524240/',
    license: CC0,
    changes: 'volume matched',
    file: 'hard-rock-loop.mp3',
    style: 'rock',
    root: 'D',
    keyLabel: 'D',
    bpm: 120,
    feel: 'straight',
    durationSec: 109,
    scales: ['minor-pentatonic', 'blues', 'natural-minor', 'mixolydian'],
    estimated: { key: true },
  },
  {
    id: 'strange-love',
    title: 'Strange Love 120 Am',
    artist: 'BaDoink',
    source: 'https://freesound.org/people/BaDoink/sounds/572501/',
    license: CC0,
    changes: 'volume matched',
    file: 'strange-love.mp3',
    style: 'rock',
    root: 'A',
    keyLabel: 'A minor',
    bpm: 120,
    feel: 'straight',
    durationSec: 98,
    scales: ['minor-pentatonic', 'natural-minor', 'dorian', 'blues'],
  },
  {
    id: 'dry-mix-loop',
    title: 'Dry Mix Loop',
    artist: 'BaDoink',
    source: 'https://freesound.org/people/BaDoink/sounds/564458/',
    license: CC0,
    changes: 'volume matched',
    file: 'dry-mix-loop.mp3',
    style: 'rock',
    root: 'E',
    keyLabel: 'E minor',
    bpm: null,
    feel: 'straight',
    durationSec: 123,
    scales: ['minor-pentatonic', 'natural-minor', 'dorian', 'blues'],
    estimated: { key: true, tempo: true },
  },
  {
    id: 'scottys-tickertape',
    title: 'scottys tickertape',
    artist: 'grtgtrplyr2',
    source: 'https://freesound.org/people/grtgtrplyr2/sounds/488574/',
    license: CC0,
    changes: 'volume matched',
    file: 'scottys-tickertape.mp3',
    style: 'metal',
    root: 'E',
    keyLabel: 'E minor',
    bpm: null,
    feel: 'straight',
    durationSec: 132,
    scales: ['minor-pentatonic', 'natural-minor', 'phrygian', 'harmonic-minor'],
    estimated: { key: true, tempo: true },
  },
  {
    id: 'summer-days-e',
    kind: 'youtube',
    youtubeId: 'sNx4oNsbPNE',
    title: 'Summer Days Guitar Backing Track Jam in E',
    artist: 'Elevated Jam Tracks',
    source: 'https://www.youtube.com/watch?v=sNx4oNsbPNE',
    support: 'https://elevatedjamtracks.bandcamp.com/',
    license: YOUTUBE_EMBED,
    changes: 'played from YouTube',
    file: '',
    style: 'ballad',
    root: 'E',
    keyLabel: 'E major',
    key: { root: 'E', minor: false },
    bpm: null,
    feel: 'straight',
    durationSec: 0,
    scales: ['major', 'phrygian-dominant', 'melodic-minor', 'major-pentatonic'],
    // Chord chart as the artist lists it with the video.
    progression: {
      sections: [
        { name: 'A', chords: ['Emaj7', 'C#sus9', 'C#7b9', 'Amaj7', 'Am6', 'G#m7', 'C#9', 'F#m7', 'G#m7', 'Amaj7', 'Bsus9'] },
        {
          name: 'B',
          chords: [
            'Amaj7', 'Am6', 'Emaj7', 'C#7b9',
            'F#m7', 'Bsus9', 'Emaj7', 'C#7sus', 'C#7',
            'Amaj7', 'Am6', 'Emaj7', 'C#7b9',
            'F#m7', 'G#m7', 'Amaj7', 'Bsus9', 'Emaj7',
          ],
        },
      ],
    },
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
  if (t.kind === 'youtube') return `"${t.title}" by ${t.artist}, played from YouTube in YouTube's own player`;
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
