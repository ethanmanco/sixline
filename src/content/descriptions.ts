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
