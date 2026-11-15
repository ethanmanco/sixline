import { chordDbIfLoaded, loadChordDb } from '../chords/db';
import type { Shape } from '../core/types';
import { CHORD_GROUPS, CHORD_ITEMS, buildChordShapes } from '../shapes/chordShapes';
import { buildScaleShapes } from '../shapes/scaleShapes';
import { SCALE_TYPES } from '../theory/scales';

export type CategoryId = 'chords' | 'scales' | 'arpeggios';

export interface Category {
  id: CategoryId;
  label: string;
  /** False until that category is built. */
  ready: boolean;
  /** Subheadings for the item list, in order. */
  groups?: { id: string; label: string }[];
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
  { id: 'scales', label: 'Scales', ready: true },
  { id: 'arpeggios', label: 'Arpeggios', ready: false },
];

export interface CatalogItem {
  id: string;
  category: CategoryId;
  group?: string;
  /** List label in a key, e.g. "A minor pentatonic" or "A major, E shape". */
  label: (root: string) => string;
  /** Every position or voicing of this item in one key. May be empty. */
  build: (root: string) => Shape[];
  /** Where to send people when this key has no such shape. */
  fallback?: { itemId: string; text: (root: string) => string };
}

const OPEN_FALLBACK: Record<string, { itemId: string; text: (root: string) => string }> = {
  'open-major': {
    itemId: 'barre-major-e',
    text: (r) => `${r} major has no open shape in standard tuning. The barre version works in every key.`,
  },
  'open-minor': {
    itemId: 'barre-minor-e',
    text: (r) => `${r} minor has no open shape in standard tuning. The barre version works in every key.`,
  },
  'open-7': {
    itemId: 'dom7',
    text: (r) => `${r}7 has no open shape in standard tuning. Try one of the movable ${r}7 voicings.`,
  },
};

export const ITEMS: readonly CatalogItem[] = [
  ...CHORD_ITEMS.map(
    (c): CatalogItem => ({
      id: c.id,
      category: 'chords',
      group: c.group,
      label: c.label,
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
      label: (root) => `${root} ${t.label.toLowerCase()}`,
      build: (root) => buildScaleShapes(root, t),
    }),
  ),
];

export function itemsIn(category: CategoryId): CatalogItem[] {
  return ITEMS.filter((i) => i.category === category);
}
