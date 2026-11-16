import { chordDbIfLoaded, loadChordDb } from '../chords/db';
import type { Shape } from '../core/types';
import { CHORD_GROUPS, CHORD_ITEMS, buildChordShapes } from '../shapes/chordShapes';
import { ARPEGGIO_GROUPS, ARPEGGIO_TYPES, buildArpeggioShapes, spellArpeggio } from '../shapes/arpeggioShapes';
import { buildScaleShapes } from '../shapes/scaleShapes';
import { spellChord } from '../theory/chords';
import { SCALE_GROUPS, SCALE_TYPES, spellScale } from '../theory/scales';
import { STRING_SETS, TRIAD_TYPES, buildTriadShapes } from '../shapes/triadShapes';
import { DROP2_SETS, DROP2_TYPES, buildDrop2Shapes } from '../shapes/drop2Shapes';
import { INTERVAL_TYPES, RUN_TYPES, buildIntervalShapes, buildRunShapes } from '../shapes/intervalShapes';

export type CategoryId = 'chords' | 'scales' | 'arpeggios' | 'triads' | 'drop2' | 'intervals';

export interface Category {
  id: CategoryId;
  label: string;
  /** False until that category is built. */
  ready: boolean;
  /** Subheadings for the item list, in order. */
  groups?: { id: string; label: string; short: string }[];
  /** Loads any data the category needs before it can build shapes. */
  prepare?: () => Promise<unknown>;
  isPrepared?: () => boolean;
}

export const CATEGORIES: readonly Category[] = [
  {
    id: 'chords',
    label: 'Chords',
    ready: true,
    groups: CHORD_GROUPS,
    prepare: loadChordDb,
    isPrepared: () => chordDbIfLoaded() !== null,
  },
  { id: 'scales', label: 'Scales', ready: true, groups: SCALE_GROUPS },
  { id: 'arpeggios', label: 'Arpeggios', ready: true, groups: ARPEGGIO_GROUPS },
  {
    id: 'triads',
    label: 'Triads',
    ready: true,
    groups: STRING_SETS.map((s) => ({ id: s.id, label: s.label, short: s.short })),
  },
  {
    id: 'drop2',
    label: 'Drop 2',
    ready: true,
    groups: DROP2_SETS.map((s) => ({ id: s.id, label: s.label, short: s.short })),
  },
  {
    id: 'intervals',
    label: 'Intervals',
    ready: true,
    groups: [
      { id: 'shapes', label: 'Interval shapes', short: 'Shapes' },
      { id: 'runs', label: 'Double stops in the key', short: 'Double stops' },
    ],
  },
];

export interface CatalogItem {
  id: string;
  category: CategoryId;
  group?: string;
  /** List label in a key, e.g. "A minor pentatonic" or "A major, E shape". */
  label: (root: string) => string;
  /** Chip label for the quick picker. */
  short: (root: string) => string;
  /** Every position or voicing of this item in one key. May be empty. */
  build: (root: string) => Shape[];
  /** Where to send people when this key has no such shape. `text` gets the item's label, e.g. "C# minor". */
  fallback?: { itemId: string; text: (label: string) => string };
}

const OPEN_FALLBACK: Record<string, { itemId: string; text: (label: string) => string }> = {
  'open-major': {
    itemId: 'barre-major-e',
    text: (l) => `${l} has no open shape in standard tuning. The barre version works in every key.`,
  },
  'open-minor': {
    itemId: 'barre-minor-e',
    text: (l) => `${l} has no open shape in standard tuning. The barre version works in every key.`,
  },
  'open-7': {
    itemId: 'dom7',
    text: (l) => `${l} has no open shape in standard tuning. Try one of the movable ${l} voicings.`,
  },
};

export const ITEMS: readonly CatalogItem[] = [
  ...CHORD_ITEMS.map(
    (c): CatalogItem => ({
      id: c.id,
      category: 'chords',
      group: c.group,
      // Labels use the same root spelling as the shapes (C#m rather than Dbm).
      label: (key) => c.label(spellChord(key, c.type).root),
      short: (key) => c.short(spellChord(key, c.type).root),
      build: (root) => {
        const db = chordDbIfLoaded();
        if (!db) throw new Error('Chord data is not loaded yet');
        return buildChordShapes(db, root, c);
      },
      fallback: OPEN_FALLBACK[c.id],
    }),
  ),
  ...SCALE_TYPES.map(
    (t): CatalogItem => ({
      id: t.id,
      category: 'scales',
      group: t.group,
      label: (key) => `${spellScale(key, t).root} ${t.label.toLowerCase()}`,
      short: () => t.label,
      build: (root) => buildScaleShapes(root, t),
    }),
  ),
  // Triads: one item per type on each string set; the positions are the three inversions.
  ...STRING_SETS.flatMap((set) =>
    TRIAD_TYPES.map(
      (t): CatalogItem => ({
        id: `${t.id}-${set.id}`,
        category: 'triads',
        group: set.id,
        label: (key) => `${spellChord(key, t).root} ${t.label} triad, ${set.short}`,
        short: (key) => spellChord(key, t).name,
        build: (key) => buildTriadShapes(key, t, set),
      }),
    ),
  ),
  // Drop 2: one item per chord type on each four-string group; the positions are the four bass notes.
  ...DROP2_SETS.flatMap((set) =>
    DROP2_TYPES.map(
      (t): CatalogItem => ({
        id: `${t.id}-${set.id}`,
        category: 'drop2',
        group: set.id,
        label: (key) => `${spellChord(key, t).name} drop 2, ${set.short}`,
        short: (key) => spellChord(key, t).name,
        build: (key) => buildDrop2Shapes(key, t, set),
      }),
    ),
  ),
  ...INTERVAL_TYPES.map(
    (t): CatalogItem => ({
      id: t.id,
      category: 'intervals',
      group: 'shapes',
      label: () => t.label,
      short: () => t.label,
      build: (key) => buildIntervalShapes(key, t),
    }),
  ),
  ...RUN_TYPES.map(
    (r): CatalogItem => ({
      id: r.id,
      category: 'intervals',
      group: 'runs',
      label: () => r.label.replace(/^./, (c) => c.toUpperCase()),
      short: () => r.short,
      build: (key) => buildRunShapes(key, r),
    }),
  ),
  ...ARPEGGIO_TYPES.map(
    (t): CatalogItem => ({
      id: t.id,
      category: 'arpeggios',
      group: t.group,
      label: (key) => `${spellArpeggio(key, t).root} ${t.label.toLowerCase()}`,
      short: (key) => `${spellArpeggio(key, t).root}${t.symbol}`,
      build: (root) => buildArpeggioShapes(root, t),
    }),
  ),
];

export function itemsIn(category: CategoryId): CatalogItem[] {
  return ITEMS.filter((i) => i.category === category);
}
