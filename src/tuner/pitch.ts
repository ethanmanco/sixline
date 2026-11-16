/**
 * Pitch detection for the tuner, using the YIN method (de Cheveigné and
 * Kawahara, 2002): find the time shift at which the signal best matches
 * itself, which is one period of the note. Pure math, so it is tested with
 * synthetic tones.
 */

export interface PitchReading {
  /** Fundamental frequency in Hz. */
  freq: number;
  /** 0 to 1: how periodic the signal is. Plucked strings read above about 0.85. */
  clarity: number;
}

/**
 * Estimates the fundamental of `x` (sampled at `rate`), or null when there is
 * no clear pitch (silence, noise, or two notes at once).
 */
export function detectPitch(x: Float32Array, rate: number, minFreq = 55, maxFreq = 1100, threshold = 0.12): PitchReading | null {
  const tauMin = Math.max(2, Math.floor(rate / maxFreq));
  const tauMax = Math.min(Math.floor(rate / minFreq), Math.floor(x.length / 2));
  const w = x.length - tauMax;
  if (w < tauMax) return null;

  // Difference function and its cumulative mean normalized version.
  const d = new Float64Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let s = 0;
    for (let i = 0; i < w; i++) {
      const diff = x[i] - x[i + tau];
      s += diff * diff;
    }
    d[tau] = s;
  }
  const cmnd = new Float64Array(tauMax + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += d[tau];
    cmnd[tau] = running ? (d[tau] * tau) / running : 1;
  }

  // First dip below the threshold (the smallest period that fits), at its local minimum.
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (cmnd[t] < threshold) {
      while (t + 1 <= tauMax && cmnd[t + 1] < cmnd[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) {
    // Nothing below the threshold: accept the best dip only if it is fairly clear.
    let best = tauMin;
    for (let t = tauMin; t <= tauMax; t++) if (cmnd[t] < cmnd[best]) best = t;
    if (cmnd[best] > 0.35) return null;
    tau = best;
  }

  // Parabolic interpolation around the dip for sub-sample accuracy.
  let shift = 0;
  if (tau > 1 && tau < tauMax) {
    const a = cmnd[tau - 1];
    const b = cmnd[tau];
    const c = cmnd[tau + 1];
    const den = a - 2 * b + c;
    if (den) shift = (0.5 * (a - c)) / den;
  }
  const period = tau + shift;
  return { freq: rate / period, clarity: Math.max(0, 1 - cmnd[tau]) };
}

/** Root mean square level, to ignore silence. */
export function rms(x: Float32Array): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / x.length);
}

/** Halves the sample rate by averaging pairs (a gentle low-pass), to make detection cheaper. */
export function halve(x: Float32Array): Float32Array {
  const out = new Float32Array(Math.floor(x.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = (x[2 * i] + x[2 * i + 1]) / 2;
  return out;
}

export function freqOfMidi(midi: number, a4 = 440): number {
  return a4 * 2 ** ((midi - 69) / 12);
}

/** Cents from `target` to `freq`: negative is flat (too low), positive is sharp (too high). */
export function centsOff(freq: number, target: number): number {
  return 1200 * Math.log2(freq / target);
}

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Nearest note to a frequency: its MIDI number, name, octave, and how far off in cents. */
export function nearestNote(freq: number, a4 = 440): { midi: number; name: string; octave: number; cents: number } {
  const exact = 69 + 12 * Math.log2(freq / a4);
  const midi = Math.round(exact);
  return { midi, name: NAMES[((midi % 12) + 12) % 12], octave: Math.floor(midi / 12) - 1, cents: (exact - midi) * 100 };
}
