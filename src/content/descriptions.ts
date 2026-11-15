/**
 * Short plain-English descriptions, written for Sixline. Keyed by shape type id.
 */
export interface Description {
  sound: string;
  useWhen: string;
}

export const SCALE_DESCRIPTIONS: Record<string, Description> = {
  'minor-pentatonic': {
    sound:
      'Five notes with no half steps between neighbors, so nothing rubs. It sounds bluesy, open, and a little gritty.',
    useWhen:
      'Your first soloing scale. Reach for it over minor keys, twelve-bar blues, and most rock riffs. Any note you land on will sound fine.',
  },
  'major-pentatonic': {
    sound: 'Sweet, open, and cheerful. The same five-note idea as the minor pentatonic, centered on a major root.',
    useWhen: 'Country licks, classic rock, and pop melodies over major chords. It sits safely over a whole major key.',
  },
  blues: {
    sound: 'The minor pentatonic with one extra note, the flat 5, that adds a gritty, crying tension.',
    useWhen: 'Blues, rock, and funk solos. Use the flat 5 as a passing note on the way to the 4 or the 5 rather than landing on it.',
  },
  major: {
    sound: 'Bright and familiar: the do re mi sound. Every note has a clear job, so it can sound plain if you run it straight.',
    useWhen: 'Melodies over major keys in pop, folk, and country. It is also the parent of all the modes. Also called Ionian.',
  },
  'natural-minor': {
    sound: 'Sad, serious, and dramatic. Same notes as the major scale that starts three frets higher.',
    useWhen: 'Rock and metal solos, ballads, and any minor key. Also called Aeolian.',
  },
  dorian: {
    sound: 'Minor, but with a raised 6th that makes it cooler and less gloomy than natural minor.',
    useWhen: 'Funk, jazz, and Latin grooves, and jams over a minor chord that stays put for a long time.',
  },
  phrygian: {
    sound: 'Dark and tense, with a flat 2nd right above the root that gives it a Spanish or heavy metal flavor.',
    useWhen: 'Flamenco-flavored lines and heavy riffs. Lean on the half step between the root and the flat 2.',
  },
  lydian: {
    sound: 'Major with a raised 4th. Dreamy, floating, and a little otherworldly.',
    useWhen: 'Film-score moods, dreamy pop, and fusion, over a major chord that rings for a while.',
  },
  mixolydian: {
    sound: 'Major with a flat 7th. Bluesy, relaxed, and rocking without sounding sad.',
    useWhen: 'Over dominant 7 chords and in classic rock, jam bands, and folk tunes.',
  },
  locrian: {
    sound: 'Unstable and uneasy, because even its 5th is flattened. Nothing in it feels like home.',
    useWhen: 'Over minor 7 flat 5 chords in jazz, and for brief moments of tension in metal.',
  },
};

export const ARPEGGIO_DESCRIPTIONS: Record<string, Description> = {
  major: {
    sound: 'The three notes of a major chord, one at a time. Bright and strong.',
    useWhen: 'Spell out a major chord in a solo so the melody lines up with the harmony.',
  },
  minor: {
    sound: 'The three notes of a minor chord, one at a time. Moody and round.',
    useWhen: 'Target the notes of a minor chord while soloing, or build simple, singable riffs.',
  },
  dom7: {
    sound: 'Major arpeggio plus a flat 7th. Bluesy and pushy, it wants to move on.',
    useWhen: 'Outline the 7 chords in a blues or a jazz tune. Land on the 3rd for the strongest sound.',
  },
  maj7: {
    sound: 'Major arpeggio plus a major 7th. Smooth, lush, and a little wistful.',
    useWhen: 'Jazz, soul, and bossa nova lines over major 7 chords.',
  },
  m7: {
    sound: 'Minor arpeggio plus a flat 7th. Mellow and soulful.',
    useWhen: 'Funk and R&B lines, and the ii chord in a ii V I progression.',
  },
  m7b5: {
    sound: 'A minor 7 with a flat 5th. Tense and searching, sometimes called half-diminished.',
    useWhen: 'The ii chord in a minor key ii V i. It also sounds great as a dark color in ballads.',
  },
  dim7: {
    sound: 'Stacked minor thirds, all the same distance apart, so the shape repeats every three frets. Spooky and suspenseful.',
    useWhen: 'Passing between chords, and building tension before a resolution. Slide the shape up three frets for the same notes.',
  },
};

export const CHORD_DESCRIPTIONS: Record<string, Description> = {
  major: {
    sound: 'Bright, settled, and complete. This is the sound most songs come home to.',
    useWhen: 'Everywhere: folk, rock, pop, and country lean on it. Strum it when a song should feel happy or resolved.',
  },
  minor: {
    sound: 'Darker and more wistful than major, because its middle note sits a half step lower.',
    useWhen: 'Ballads, moody verses, and any spot where the song wants a little shadow.',
  },
  power: {
    sound:
      'Only the root and fifth, with no third, so it is neither happy nor sad. Heavy and punchy, especially through distortion.',
    useWhen: 'Rock, punk, and metal riffs. Rest the side of your picking hand on the strings for a tight, chugging sound.',
  },
  dom7: {
    sound: 'Bluesy and restless. The flat seventh pulls hard toward the next chord.',
    useWhen: 'Twelve-bar blues, funk vamps, and the chord just before the song lands back home.',
  },
  maj7: {
    sound: 'Soft, dreamy, and a bit jazzy. The seventh sits a half step under the root and shimmers.',
    useWhen: 'Jazz, soul, bossa nova, and mellow pop. Swap it in for a plain major chord when you want a lush feel.',
  },
  m7: {
    sound: 'Smooth and mellow, like a minor chord with the edges sanded off.',
    useWhen: 'Funk, R&B, neo soul, and jazz grooves where a plain minor chord would feel too sad.',
  },
  sus2: {
    sound: 'Open and airy. The second replaces the third, so it floats between major and minor.',
    useWhen: 'Ringing intros, ambient strumming, and as a color before settling on the plain chord.',
  },
  sus4: {
    sound: 'Tense and unfinished. The fourth wants to slip down to the third.',
    useWhen: 'Add motion to a held chord: play the sus4, then the plain chord. A staple of rock and pop intros.',
  },
  add9: {
    sound: 'A major chord with an extra sparkle on top. Bright, modern, and spacious.',
    useWhen: 'Pop, indie, and acoustic ballads. Use it in place of a major chord when you want the chord to ring.',
  },
};
