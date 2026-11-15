import * as Tone from 'tone';

/**
 * Guitar sound. Nothing loads or plays until a user action calls
 * `ensureReady()`, which is also what browsers require before audio can start.
 */

const FIRST_SAMPLE = 40; // E2
const LAST_SAMPLE = 79; // G5
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function sampleUrls(): Record<number, string> {
  const urls: Record<number, string> = {};
  for (let m = FIRST_SAMPLE; m <= LAST_SAMPLE; m++) {
    urls[m] = `${FLAT_NAMES[m % 12]}${Math.floor(m / 12) - 1}.mp3`;
  }
  return urls;
}

export interface SequenceOptions {
  /** Seconds between notes. */
  step?: number;
  /** Called in sync with the sound, once per note. */
  onNote?: (index: number) => void;
  /** Called after the last note, or when the sequence is stopped. */
  onEnd?: () => void;
}

export interface StrumOptions {
  /** Seconds between strings in the strum. */
  spread?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

class GuitarSound {
  private sampler: Tone.Sampler | null = null;
  private loading: Promise<void> | null = null;
  private endCurrent: (() => void) | null = null;
  private listeners = new Set<(state: 'loading' | 'ready' | 'error') => void>();

  /** Subscribe to loading state, e.g. to show "Loading sound". */
  onState(fn: (state: 'loading' | 'ready' | 'error') => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  get isReady(): boolean {
    return this.sampler?.loaded ?? false;
  }

  /** Must be called from a user gesture (click, tap, key press). */
  async ensureReady(): Promise<void> {
    await Tone.start();
    if (!this.loading) {
      this.emit('loading');
      this.loading = new Promise<void>((resolve, reject) => {
        const reverb = new Tone.Reverb({ decay: 1.6, wet: 0.14 }).toDestination();
        this.sampler = new Tone.Sampler({
          urls: sampleUrls(),
          baseUrl: `${import.meta.env.BASE_URL}samples/guitar/`,
          release: 1.2,
          onload: () => {
            this.emit('ready');
            resolve();
          },
          onerror: (err) => {
            this.emit('error');
            this.loading = null;
            reject(err);
          },
        }).connect(reverb);
        this.sampler.volume.value = -4;
      });
    }
    return this.loading;
  }

  /** Plays one note right away. */
  async play(midi: number, duration = 1.6): Promise<void> {
    await this.ensureReady();
    this.sampler?.triggerAttackRelease(Tone.Frequency(midi, 'midi').toFrequency(), duration);
  }

  /**
   * Plays steps one after another, with a callback in time with each step.
   * A step is one note, or several notes strummed low to high.
   */
  async sequence(steps: readonly (number | readonly number[])[], opts: SequenceOptions = {}): Promise<void> {
    await this.ensureReady();
    this.stop();
    const step = opts.step ?? 0.3;
    const transport = Tone.getTransport();
    const draw = Tone.getDraw();
    const sampler = this.sampler!;
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      if (this.endCurrent === end) this.endCurrent = null;
      opts.onEnd?.();
    };
    this.endCurrent = end;

    steps.forEach((notes, i) => {
      const chord = typeof notes === 'number' ? [notes] : notes;
      const last = i === steps.length - 1;
      transport.scheduleOnce((time) => {
        chord.forEach((midi, k) => {
          sampler.triggerAttackRelease(Tone.Frequency(midi, 'midi').toFrequency(), last ? 2.4 : step * 2.4, time + k * 0.035);
        });
        draw.schedule(() => {
          if (!ended) opts.onNote?.(i);
        }, time);
      }, i * step);
    });
    const tail = typeof steps[steps.length - 1] === 'number' ? 0.1 : 1.2;
    transport.scheduleOnce((time) => draw.schedule(end, time), (steps.length - 1) * step + step + tail);
    transport.position = 0;
    transport.start('+0.05');
  }

  /** Strums notes low to high, like a chord. */
  async strum(midis: readonly number[], opts: StrumOptions = {}): Promise<void> {
    await this.ensureReady();
    this.stop();
    const spread = opts.spread ?? 0.035;
    const now = Tone.now() + 0.03;
    midis.forEach((midi, i) => {
      this.sampler?.triggerAttackRelease(Tone.Frequency(midi, 'midi').toFrequency(), 2.4, now + i * spread);
    });
    opts.onStart?.();
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      if (this.endCurrent === end) this.endCurrent = null;
      opts.onEnd?.();
    };
    this.endCurrent = end;
    Tone.getDraw().schedule(end, now + 1.2);
  }

  /** Stops any sequence in progress. */
  stop(): void {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel(0);
    this.sampler?.releaseAll();
    const end = this.endCurrent;
    this.endCurrent = null;
    end?.();
  }

  get isPlaying(): boolean {
    return this.endCurrent !== null;
  }

  private emit(state: 'loading' | 'ready' | 'error') {
    for (const fn of this.listeners) fn(state);
  }
}

/** One shared guitar for the whole app (Learn now, Jam and Songs later). */
export const guitar = new GuitarSound();
