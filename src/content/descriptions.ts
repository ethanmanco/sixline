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
  'major-blues': {
    sound: 'The major pentatonic with a flat 3 slipped in. Sunny, but with a bluesy bend in its voice.',
    useWhen: 'Country, Southern rock, and major-key blues. Slide or bend from the flat 3 up to the 3.',
  },
  major: {
    sound: 'Bright and familiar: the do re mi sound. Every note has a clear job, so it can sound plain if you run it straight.',
    useWhen: 'Melodies over major keys in pop, folk, and country. It is also the parent of all the modes. Also called Ionian.',
  },
  'natural-minor': {
    sound: 'Sad, serious, and dramatic. Same notes as the major scale that starts three frets higher.',
    useWhen: 'Rock and metal solos, ballads, and any minor key. Also called Aeolian.',
  },
  'harmonic-minor': {
    sound: 'Natural minor with a raised 7th. The wide jump from the flat 6 to the 7 gives it a dramatic, old-world sound.',
    useWhen: 'Neoclassical rock and metal, Middle Eastern flavors, and over the V chord in a minor key.',
  },
  'melodic-minor': {
    sound: 'Natural minor with a raised 6th and 7th. Smooth and modern, minor on the bottom and major on top.',
    useWhen: 'Jazz soloing, and minor-key lines that need to climb smoothly to the root. Jazz players use it in both directions.',
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
  'phrygian-dominant': {
    sound: 'Phrygian with a major 3rd. Exotic and fiery, the classic flamenco and snake-charmer sound.',
    useWhen: 'Flamenco, Middle Eastern melodies, and metal riffs. Also over the V chord in a minor key, since it is the 5th mode of harmonic minor.',
  },
  'whole-tone': {
    sound: 'Six notes, all a whole step apart. With no half steps there is no pull toward home, so it floats and sounds dreamlike.',
    useWhen: 'Over augmented and 7 sharp 5 chords, and for dream-sequence moments. The shape repeats every two frets.',
  },
  'diminished-wh': {
    sound: 'Eight notes alternating whole and half steps. Tense, twisting, and symmetrical.',
    useWhen: 'Over diminished 7 chords. The pattern repeats every three frets, so one shape covers four keys.',
  },
  'diminished-hw': {
    sound: 'Eight notes alternating half and whole steps. Jazzy and biting, with both a flat 9 and a sharp 9.',
    useWhen: 'Over dominant 7 chords with altered tones in jazz and fusion. Like its twin, it repeats every three frets.',
  },
};

export const TRIAD_DESCRIPTIONS: Record<string, Description> = {
  major: {
    sound: 'Just the three notes of a major chord, packed onto three strings. Bright, clear, and light.',
    useWhen: 'Fills and riffs, a second guitar part that sits above the band, and funk and reggae chops. Learn all three inversions to play any major chord anywhere on the neck.',
  },
  minor: {
    sound: 'The three notes of a minor chord on three strings. Darker than major but still light and clean.',
    useWhen: 'Melodic rhythm parts and soft fills. Moving between inversions gives a smooth line on top of the chords.',
  },
  dim: {
    sound: 'Two minor thirds stacked. Small, tense, and unstable.',
    useWhen: 'Quick passing chords between two triads a step apart, and the vii chord of a major key.',
  },
  aug: {
    sound: 'Two major thirds stacked. Every inversion has the same shape, so it slides up four frets to the same notes.',
    useWhen: 'Moments of suspense, and as a step between a major chord and the next chord up.',
  },
};

export const INTERVAL_DESCRIPTIONS: Record<string, Description> = {
  m3: {
    sound: 'Three half steps. The sound at the heart of every minor chord: soft and a little sad.',
    useWhen: 'Bluesy double stops and minor riffs. Bending or sliding into it is a classic move.',
  },
  M3: {
    sound: 'Four half steps. The bright, happy sound at the heart of every major chord.',
    useWhen: 'Sweet country and soul double stops, and harmonizing a melody a third above.',
  },
  P4: {
    sound: 'Five half steps. Open and strong, a little hollow.',
    useWhen: 'Blues and rock double stops. Most pairs of strings are a 4th apart, so it lies flat under one finger.',
  },
  TT: {
    sound: 'Six half steps, exactly half an octave. Tense and edgy, it wants to move.',
    useWhen: 'The heart of a dominant 7 chord, metal riffs, and blues tension right before a resolution.',
  },
  P5: {
    sound: 'Seven half steps. Stable and powerful, neither major nor minor.',
    useWhen: 'This is the power chord. Use it for rock riffs and to thicken a melody.',
  },
  m6: {
    sound: 'Eight half steps. Bittersweet and a little dark.',
    useWhen: 'Moody double stops with one string skipped, and minor-key fills.',
  },
  M6: {
    sound: 'Nine half steps. Warm and sweet, a classic soul sound.',
    useWhen: 'Soul and R&B fills, often slid into from one fret below, and country leads.',
  },
  P8: {
    sound: 'The same note twelve half steps higher. Full and bold.',
    useWhen: 'Jazz-style octave melodies and thick single-note lines. Mute the string in between.',
  },
  '3rds-be': {
    sound: 'Pairs of notes a third apart, climbing the major scale. Sweet and singing.',
    useWhen: 'Country and pop fills, harmonizing a melody, and intros that walk up the neck.',
  },
  '3rds-gb': {
    sound: 'Pairs of 3rds a little lower and warmer than on the top strings.',
    useWhen: 'Rhythm fills under a singer, and connecting chords with a harmonized line.',
  },
  '6ths-ge': {
    sound: 'Pairs of notes a sixth apart with a string skipped. Warm, open, and soulful.',
    useWhen: 'Soul, R&B, and country fills. Slide into each pair from one fret below for the classic sound.',
  },
  '6ths-db': {
    sound: 'The same 6ths on a lower string pair. Fuller and darker.',
    useWhen: 'Fills under a melody, and when the top strings are busy with a singer or another guitar.',
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
  dim: {
    sound: 'Two stacked minor thirds. Tense and unstable.',
    useWhen: 'Outline the vii chord in a major key, or add bite to a passing chord.',
  },
  aug: {
    sound: 'Two stacked major thirds. The shape repeats every four frets and sounds dreamy and unresolved.',
    useWhen: 'Over augmented chords and in whole-tone flavored lines.',
  },
  mmaj7: {
    sound: 'A minor triad with a major 7th. Dark, glamorous, and very cinematic.',
    useWhen: 'Spy-movie and film-noir moods, and descending minor lines in jazz.',
  },
  six: {
    sound: 'A major triad plus the 6th. Sweet and old-fashioned.',
    useWhen: 'Swing and rockabilly lines over major chords.',
  },
  m6: {
    sound: 'A minor triad plus a major 6th. Cool and mysterious.',
    useWhen: 'Jazz and bossa nova over minor chords, and Dorian-flavored solos.',
  },
  nine: {
    sound: 'A dominant 7 arpeggio plus the 9th. Rich and funky.',
    useWhen: 'Funk and blues lines over 7 and 9 chords.',
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
  m7b5: {
    sound: 'A minor 7 with a flat 5th. Dark and searching, sometimes called half-diminished.',
    useWhen: 'The ii chord in a minor key, as in ii V i. Also a moody color in ballads and jazz standards.',
  },
  sus7: {
    sound: 'A dominant 7 with the 4th in place of the 3rd. Open but restless.',
    useWhen: 'Funk vamps, gospel, and right before a plain 7 chord. Classic rock intros lean on it too.',
  },
  dim: {
    sound: 'Two minor thirds stacked up. Tight, tense, and unstable.',
    useWhen: 'As a quick passing chord between two chords a whole step apart, and as the vii chord in a major key.',
  },
  dim7: {
    sound: 'Four notes, each a minor third apart. Spooky and dramatic, like a silent-movie villain.',
    useWhen: 'Passing chords in jazz, blues, and old pop. Move the shape up three frets and you get the same notes.',
  },
  aug: {
    sound: 'A major chord with the 5th pushed up. Dreamy and suspenseful, like a question.',
    useWhen: 'Between a chord and the next one up, for example C, C aug, then F. Common in old pop and Beatles-style songs.',
  },
  six: {
    sound: 'A major chord with the 6th added. Sweet and vintage.',
    useWhen: 'Swing, surf, and early rock and roll, and as a softer ending chord than a major 7.',
  },
  m6: {
    sound: 'A minor chord with a major 6th. Mysterious and a little noir.',
    useWhen: 'Jazz, bossa nova, and spy-movie moods, often as the home chord in a minor key.',
  },
  nine: {
    sound: 'A dominant 7 with the 9th on top. Funky and full.',
    useWhen: 'Funk, soul, and blues. Swap it in for a plain 7 chord for a richer sound.',
  },
  'slash-major-3rd': {
    sound: 'The same major chord with its 3rd as the lowest note. Lighter, and it seems to lean forward.',
    useWhen: 'Walking bass lines between chords, like G to G/B to C. It smooths out the jump from one chord to the next.',
  },
  'slash-major-5th': {
    sound: 'A major chord sitting on its own 5th. Strong but not settled, like a held breath.',
    useWhen: 'Right before a song resolves, and in descending bass lines. Very common in hymns, folk, and ballads.',
  },
  'slash-minor-3rd': {
    sound: 'A minor chord with its flat 3rd in the bass. Soft and a bit wistful.',
    useWhen: 'Passing bass lines in ballads, like Am to Am/C to D.',
  },
  'slash-minor-5th': {
    sound: 'A minor chord over its 5th. Hollow and suspended.',
    useWhen: 'Descending bass lines in minor keys, like Am, Am/G, then Am/E with the bass walking down.',
  },
};

export const DROP2_DESCRIPTIONS: Record<string, Description> = {
  maj7: {
    sound: 'A major 7 chord spread over four strings: open, warm, and glassy.',
    useWhen: 'Jazz comping, soul, and bossa nova. Move between the four inversions to keep the top note singing a melody.',
  },
  dom7: {
    sound: 'A dominant 7 with every note clear and separate. Bluesy and ready to move.',
    useWhen: 'Comping over blues and the V chord in jazz. Slide one inversion up to the next for a classic walk-up.',
  },
  m7: {
    sound: 'A minor 7 that sounds smooth and full without getting muddy.',
    useWhen: 'Funk, neo soul, and the ii chord in a ii V I. Pairs naturally with the dominant 7 shapes on the same strings.',
  },
  m7b5: {
    sound: 'A half-diminished chord with a dark, searching color.',
    useWhen: 'The ii chord in a minor key ii V i, and moody ballads.',
  },
  dim7: {
    sound: 'Stacked minor thirds, so every inversion has the same shape, three frets apart.',
    useWhen: 'Passing chords between diatonic chords. Slide the shape up three frets for the same notes in a new order.',
  },
  six: {
    sound: 'A major 6 chord: sweet, a little vintage, and lighter than a major 7.',
    useWhen: 'Swing, Western swing, and as a softer home chord in jazz and pop.',
  },
  m6: {
    sound: 'A minor 6 chord: cool, mysterious, a little noir.',
    useWhen: 'Minor-key home chords in jazz and bossa nova, and Dorian vamps.',
  },
};
