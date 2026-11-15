/**
 * Independent music math for tests, so they do not just echo tonal back.
 */
const LETTER_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function chromaOfName(name: string): number {
  const letter = name[0];
  let c = LETTER_SEMITONES[letter];
  if (c === undefined) throw new Error(`bad note ${name}`);
  for (const ch of name.slice(1)) {
    if (ch === '#') c++;
    else if (ch === 'b') c--;
    else throw new Error(`bad note ${name}`);
  }
  return ((c % 12) + 12) % 12;
}

/** The 12 keys a guitarist is likely to pick, in the spelling the key picker will use. */
export const ALL_ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export const OPEN = [40, 45, 50, 55, 59, 64];
