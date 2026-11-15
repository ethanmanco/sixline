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
