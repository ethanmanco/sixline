import type { LabelMode } from '../core/types';
import { normalizeKey } from '../theory/keys';

export type ChordPlay = 'strum' | 'pick' | 'both';

export interface Settings {
  labelMode: LabelMode;
  /** How Play sounds a chord: all at once, one string at a time, or one at a time then all together. */
  chordPlay: ChordPlay;
  lefty: boolean;
  showFretboard: boolean;
  /** Last key picked, used when a link does not name one. */
  key: string;
  /** Tuner: tuning id and the reference pitch for A4 in Hz. */
  tuning: string;
  a4: number;
}

const STORAGE_KEY = 'sixline.settings.v1';
const DEFAULTS: Settings = { labelMode: 'finger', chordPlay: 'both', lefty: false, showFretboard: true, key: 'A', tuning: 'standard', a4: 440 };

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      labelMode: ['finger', 'note', 'degree', 'none'].includes(parsed.labelMode as string)
        ? (parsed.labelMode as LabelMode)
        : DEFAULTS.labelMode,
      chordPlay: ['strum', 'pick', 'both'].includes(parsed.chordPlay as string)
        ? (parsed.chordPlay as ChordPlay)
        : DEFAULTS.chordPlay,
      lefty: typeof parsed.lefty === 'boolean' ? parsed.lefty : DEFAULTS.lefty,
      showFretboard: typeof parsed.showFretboard === 'boolean' ? parsed.showFretboard : DEFAULTS.showFretboard,
      key: normalizeKey(parsed.key) ?? DEFAULTS.key,
      tuning: typeof parsed.tuning === 'string' ? parsed.tuning : DEFAULTS.tuning,
      a4: typeof parsed.a4 === 'number' && parsed.a4 >= 400 && parsed.a4 <= 480 ? parsed.a4 : DEFAULTS.a4,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

type Listener = (s: Settings) => void;

/** Small settings store, remembered per browser. Shared by every section. */
class SettingsStore {
  private value = load();
  private listeners = new Set<Listener>();

  get(): Settings {
    return this.value;
  }

  set(patch: Partial<Settings>): void {
    this.value = { ...this.value, ...patch };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.value));
    } catch {
      // Storage can be blocked; the setting still applies for this visit.
    }
    for (const fn of this.listeners) fn(this.value);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.value);
    return () => this.listeners.delete(fn);
  }
}

export const settings = new SettingsStore();
