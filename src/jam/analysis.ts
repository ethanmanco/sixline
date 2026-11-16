/**
 * Estimates a recording's key and tempo from its samples. Pure math, so it
 * runs in a Web Worker and in tests.
 *
 * Key: a chromagram (how much of each of the 12 notes sounds over the whole
 * track), compared with the Krumhansl-Schmuckler major and minor key
 * profiles. Tempo: how often note onsets repeat (autocorrelation of spectral
 * flux), searched between 50 and 200 BPM.
 */

export const ANALYSIS_RATE = 11025;
const KEY_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/** In-place radix-2 FFT. `re` and `im` must have a power-of-two length. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const ai = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k + len / 2] = re[i + k] - ar;
        im[i + k + len / 2] = im[i + k] - ai;
        re[i + k] += ar;
        im[i + k] += ai;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

/** Magnitude spectra of overlapping, Hann-windowed frames. Calls `each` per frame to save memory. */
function frames(x: Float32Array, size: number, hop: number, each: (mag: Float64Array) => void): void {
  const win = new Float64Array(size).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size));
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const mag = new Float64Array(size / 2);
  for (let start = 0; start + size <= x.length; start += hop) {
    for (let i = 0; i < size; i++) {
      re[i] = x[start + i] * win[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k < size / 2; k++) mag[k] = Math.hypot(re[k], im[k]);
    each(mag);
  }
}

/** Share of the track's energy in each pitch class (C = 0), from 55 Hz to 2 kHz. */
export function chromaProfile(x: Float32Array, rate = ANALYSIS_RATE): number[] {
  const size = 4096;
  const pcOfBin: number[] = [];
  for (let k = 0; k < size / 2; k++) {
    const f = (k * rate) / size;
    pcOfBin.push(f > 55 && f < 2000 ? (((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12) : -1);
  }
  const prof = new Array(12).fill(0);
  frames(x, size, 2048, (mag) => {
    for (let k = 0; k < mag.length; k++) if (pcOfBin[k] >= 0) prof[pcOfBin[k]] += mag[k];
  });
  const total = prof.reduce((a, b) => a + b, 0) || 1;
  return prof.map((v) => v / total);
}

function correlate(a: number[], b: number[]): number {
  const ma = a.reduce((s, v) => s + v, 0) / a.length;
  const mb = b.reduce((s, v) => s + v, 0) / b.length;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db || 1);
}

export interface KeyGuess {
  root: string;
  minor: boolean;
  /** Correlation with the key profile, -1 to 1. */
  score: number;
}

/** The three most likely keys for a chroma profile, best first. */
export function detectKey(profile: number[]): KeyGuess[] {
  const out: KeyGuess[] = [];
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const [minor, tmpl] of [
      [false, MAJOR],
      [true, MINOR],
    ] as const) {
      const rotated = tmpl.map((_, i) => tmpl[(i - tonic + 12) % 12]);
      out.push({ root: KEY_NAMES[tonic], minor, score: correlate(profile, rotated) });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 3);
}

/** Tempo in BPM (50 to 200) from onset strength, or null if no clear beat. */
export function detectTempo(x: Float32Array, rate = ANALYSIS_RATE): number | null {
  const size = 512;
  const hop = 128;
  const flux: number[] = [];
  let prev: Float64Array | null = null;
  frames(x, size, hop, (mag) => {
    const cur = mag.map((v) => Math.log1p(v));
    if (prev) {
      let f = 0;
      for (let k = 0; k < cur.length; k++) f += Math.max(0, cur[k] - prev[k]);
      flux.push(f);
    }
    prev = cur;
  });
  if (flux.length < 64) return null;
  const mean = flux.reduce((a, b) => a + b, 0) / flux.length;
  const d = flux.map((v) => v - mean);
  const fps = rate / hop;
  const minLag = Math.floor((60 * fps) / 200);
  const maxLag = Math.ceil((60 * fps) / 50);
  let best = 0;
  let bestLag = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = 0; i + lag < d.length; i++) s += d[i] * d[i + lag];
    s /= d.length - lag;
    // Gentle preference for common tempos around 100 BPM, to settle half/double-time ties.
    const bpm = (60 * fps) / lag;
    const weight = Math.exp(-0.5 * Math.log2(bpm / 100) ** 2 / 0.8);
    if (s * weight > best) {
      best = s * weight;
      bestLag = lag;
    }
  }
  if (!bestLag || best <= 0) return null;
  return Math.round((60 * fps) / bestLag);
}

export interface Analysis {
  keys: KeyGuess[];
  bpm: number | null;
}

export function analyze(x: Float32Array, rate = ANALYSIS_RATE): Analysis {
  return { keys: detectKey(chromaProfile(x, rate)), bpm: detectTempo(x, rate) };
}

/** Mixes channels to mono and reduces to about ANALYSIS_RATE by averaging. */
export function toAnalysisRate(channels: Float32Array[], rate: number, maxSeconds = 240): Float32Array {
  const factor = Math.max(1, Math.round(rate / ANALYSIS_RATE));
  const len = Math.min(channels[0].length, Math.floor(rate * maxSeconds));
  const out = new Float32Array(Math.floor(len / factor));
  for (let i = 0; i < out.length; i++) {
    let s = 0;
    for (let j = 0; j < factor; j++) for (const ch of channels) s += ch[i * factor + j];
    out[i] = s / (factor * channels.length);
  }
  return out;
}
