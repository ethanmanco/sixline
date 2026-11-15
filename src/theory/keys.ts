import { noteChroma } from './spelling';

/**
 * The twelve keys in the key picker, spelled the way most guitar music writes
 * them. Everything in Learn is regenerated from theory for whichever one is
 * picked.
 */
export const KEYS: readonly string[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Text for the picker: black keys show both names so sharp and flat readers find theirs. */
export function keyOptionLabel(key: string): string {
  const alt: Record<string, string> = { Db: 'C#', Eb: 'D#', 'F#': 'Gb', Ab: 'G#', Bb: 'A#' };
  return alt[key] ? `${key} / ${alt[key]}` : key;
}

/** Turns anything like "c#", "Gb", or "A" into one of KEYS, or null. */
export function normalizeKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const tidy = raw.trim().replace(/^([a-g])/, (m) => m.toUpperCase()).replace('♯', '#').replace('♭', 'b');
  if (KEYS.includes(tidy)) return tidy;
  try {
    const c = noteChroma(tidy);
    return KEYS.find((k) => noteChroma(k) === c) ?? null;
  } catch {
    return null;
  }
}
