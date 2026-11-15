import type { LabelMode } from '../core/types';

export interface Settings {
  labelMode: LabelMode;
  lefty: boolean;
  showFretboard: boolean;
}

const STORAGE_KEY = 'sixline.settings.v1';
const DEFAULTS: Settings = { labelMode: 'finger', lefty: false, showFretboard: true };

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      labelMode: ['finger', 'note', 'degree', 'none'].includes(parsed.labelMode as string)
        ? (parsed.labelMode as LabelMode)
        : DEFAULTS.labelMode,
      lefty: typeof parsed.lefty === 'boolean' ? parsed.lefty : DEFAULTS.lefty,
      showFretboard: typeof parsed.showFretboard === 'boolean' ? parsed.showFretboard : DEFAULTS.showFretboard,
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
