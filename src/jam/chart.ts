import { parseChord } from '../theory/chordScale';
import type { Progression, Section } from './timeline';

/**
 * Reads a chord chart typed or pasted the way people write them:
 *
 *   A section
 *   Emaj7-C#sus9-C#7b9- Amaj7-Am6
 *   G#m7-C#9- F#m7 - G#m7 - Amaj7 - Bsus9
 *
 *   B: Amaj7 Am6 Emaj7 C#7b9
 *
 * A line with no chords on it starts a new section ("A section", "Chorus").
 * "Name: chords" starts a section too. Chords can be separated by spaces,
 * dashes, commas, or bar lines. Lines before any section name go in section A.
 */
export interface ChartResult {
  progression: Progression;
  /** Words that are not chords, so the person can fix them. */
  unknown: string[];
}

function isChord(token: string): boolean {
  try {
    parseChord(token);
    return true;
  } catch {
    return false;
  }
}

function tokens(line: string): string[] {
  return line
    .split(/[\s,|]+|\s*-\s*/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function parseChart(text: string): ChartResult {
  const sections: Section[] = [];
  const unknown: string[] = [];
  let current: Section | null = null;
  const start = (name: string) => {
    current = { name: name.replace(/\s*section$/i, '').trim() || String.fromCharCode(65 + sections.length), chords: [] };
    sections.push(current);
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const named = /^([^:]{1,30}):\s*(.*)$/.exec(line);
    let body = line;
    if (named) {
      start(named[1]);
      body = named[2];
    }
    const toks = tokens(body);
    const chords = toks.filter(isChord);
    // A label line such as "A section", "Chorus", or "Verse 2": words that are not chords,
    // with at most one chord-looking word ("A" in "A section" is a label, not an A chord).
    if (!named && toks.length && chords.length <= 1 && toks.length > chords.length) {
      start(line);
      continue;
    }
    if (!current) start('A');
    for (const t of toks) {
      if (isChord(t)) current!.chords.push(t);
      else unknown.push(t);
    }
  }
  return { progression: { sections: sections.filter((s) => s.chords.length) }, unknown };
}

/** Writes a progression back as text, one section per line. */
export function chartToText(p: Progression): string {
  return p.sections.map((s) => `${s.name}: ${s.chords.join(' ')}`).join('\n');
}
