import type { Shape } from '../core/types';
import { buildScaleShapes } from '../shapes/scaleShapes';
import { SCALE_TYPES } from '../theory/scales';

export type CategoryId = 'chords' | 'scales' | 'arpeggios';

export interface Category {
  id: CategoryId;
  label: string;
  blurb: string;
  /** False until that category is built. */
  ready: boolean;
}

export const CATEGORIES: readonly Category[] = [
  { id: 'chords', label: 'Chords', blurb: 'Open, barre, power, 7th, sus, and add9 shapes.', ready: false },
  { id: 'scales', label: 'Scales', blurb: 'Pentatonics in all five positions, plus major, minor, blues, and modes.', ready: true },
  { id: 'arpeggios', label: 'Arpeggios', blurb: 'Chord tones played one at a time.', ready: false },
];

export interface CatalogItem {
  id: string;
  label: string;
  category: CategoryId;
  /** Every position or voicing of this item in one key. */
  build: (root: string) => Shape[];
}

export const ITEMS: readonly CatalogItem[] = [
  ...SCALE_TYPES.map(
    (t): CatalogItem => ({
      id: t.id,
      label: t.label,
      category: 'scales',
      build: (root) => buildScaleShapes(root, t),
    }),
  ),
];

export function itemsIn(category: CategoryId): CatalogItem[] {
  return ITEMS.filter((i) => i.category === category);
}
