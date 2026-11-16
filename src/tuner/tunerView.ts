import { guitar } from '../audio/guitar';
import { settings } from '../app/settings';
import { MicInput } from './mic';
import { centsOff, detectPitch, freqOfMidi, halve, nearestNote, rms } from './pitch';
import { TUNINGS, nearestString, pitchName, tuningById, tuningMidis, type Tuning } from './tunings';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const A4_CHOICES = [432, 435, 438, 439, 440, 441, 442, 443, 444, 446];
const IN_TUNE = 5; // cents either side counts as in tune
const HOLD_MS = 700; // how long a string must stay in tune to get its check mark
const STRING_NUMBERS = ['6th', '5th', '4th', '3rd', '2nd', '1st'];

/**
 * Tune: a chromatic guitar tuner that listens through the microphone.
 *
 * Layout, top to bottom, in the order your eyes need it: the big note and a
 * wide flat/sharp gauge with a clear in-tune zone, a plain instruction
 * (tighten, loosen, in tune), then the six strings of the chosen tuning,
 * each with a check mark once it is in tune and a button to hear it.
 */
export class TunerView {
  readonly el: HTMLElement;
  private mic = new MicInput();
  private tuning: Tuning = tuningById(settings.get().tuning);
  private a4 = settings.get().a4;
  private locked: number | null = null;
  private done = new Set<number>();
  private history: number[] = [];
  private needle = 0;
  private inTuneSince = 0;
  private lastSpoken = 0;
  private lastHeard = 0;
  private current = -1;

  constructor() {
    this.el = document.createElement('section');
    this.el.className = 'tuner';
    this.el.setAttribute('aria-labelledby', 'tuner-title');
    this.render();
  }

  /** Releases the microphone, e.g. when leaving the tuner. */
  stop(): void {
    if (this.mic.active) {
      this.mic.stop();
      this.renderMicButton();
      this.showIdle('Tap Start tuner and play a string.');
    }
  }

  private render(): void {
    const t = this.tuning;
    this.el.innerHTML = `
      <h1 class="visually-hidden" id="tuner-title">Guitar tuner</h1>
      <div class="tuner__bar">
        <label class="jt__opt">Tuning
          <select data-t="tuning">${TUNINGS.map((x) => `<option value="${x.id}" ${x.id === t.id ? 'selected' : ''}>${esc(x.label)} (${x.notes.map(pitchName).join(' ')})</option>`).join('')}</select>
        </label>
        <label class="jt__opt">Reference
          <select data-t="a4" aria-label="Reference pitch for A">${A4_CHOICES.map((f) => `<option value="${f}" ${f === this.a4 ? 'selected' : ''}>A = ${f} Hz</option>`).join('')}</select>
        </label>
      </div>
      <p class="tuner__about">${esc(t.about)}</p>

      <div class="tuner__display">
        <button type="button" class="btn btn--play tuner__mic" data-t="mic"></button>
        <div class="tuner__readout" aria-hidden="true">
          <div class="tuner__note"><span data-t="name">-</span><small data-t="octave"></small></div>
          <svg class="gauge" viewBox="0 0 400 86" role="presentation">
            <rect class="gauge__zone" x="${200 - IN_TUNE * 3.6}" y="10" width="${IN_TUNE * 7.2}" height="52" rx="6"/>
            ${Array.from({ length: 21 }, (_, i) => {
              const c = -50 + i * 5;
              const x = 200 + c * 3.6;
              const big = c % 25 === 0;
              return `<line class="gauge__tick${big ? ' gauge__tick--big' : ''}" x1="${x}" x2="${x}" y1="${big ? 14 : 24}" y2="${big ? 58 : 48}"/>`;
            }).join('')}
            <text class="gauge__label" x="20" y="80">♭ flat</text>
            <text class="gauge__label" x="380" y="80" text-anchor="end">sharp ♯</text>
            <text class="gauge__label" x="200" y="80" text-anchor="middle">0</text>
            <g class="gauge__needle" data-t="needle"><line x1="200" x2="200" y1="4" y2="68"/><circle cx="200" cy="4" r="5"/></g>
          </svg>
          <p class="tuner__cents" data-t="cents">&nbsp;</p>
        </div>
        <p class="tuner__hint" data-t="hint" aria-hidden="true"></p>
        <p class="visually-hidden" data-t="say" role="status" aria-live="polite"></p>
      </div>

      <div class="tuner__strings" role="group" aria-label="Strings in ${esc(t.label)} tuning">
        ${t.notes
          .map(
            (n, i) => `<div class="tstring" data-i="${i}">
              <button type="button" class="tstring__pick" data-t="lock" data-i="${i}" aria-pressed="false" aria-label="${STRING_NUMBERS[i]} string, ${esc(pitchName(n))}. Tune only this string">
                <span class="tstring__num">${STRING_NUMBERS[i]}</span>
                <span class="tstring__note">${esc(pitchName(n))}<small>${n.replace(/^[A-G][#b]?/, '')}</small></span>
                <span class="tstring__check" aria-hidden="true">✓</span>
              </button>
              <button type="button" class="tstring__hear" data-t="hear" data-i="${i}" aria-label="Hear ${esc(pitchName(n))}, the ${STRING_NUMBERS[i]} string">Hear</button>
            </div>`,
          )
          .join('')}
      </div>
      <p class="tuner__mode" data-t="mode"></p>
      <details class="tuner__tips">
        <summary>Tuning tips</summary>
        <ul>
          <li>Pluck one string at a time and let it ring. Mute the others with your hand.</li>
          <li>Tune up to the note: if a string is sharp, loosen it below the note, then tighten back up. It holds its tuning better.</li>
          <li>Tap a string above to tune only that one. Tap it again to go back to automatic.</li>
          <li>Your microphone is only used while the tuner is on, and the sound never leaves your device.</li>
        </ul>
      </details>`;

    this.el.querySelector<HTMLSelectElement>('[data-t="tuning"]')!.addEventListener('change', (e) => {
      this.tuning = tuningById((e.target as HTMLSelectElement).value);
      settings.set({ tuning: this.tuning.id });
      this.locked = null;
      this.done.clear();
      this.resetReadings();
      const wasOn = this.mic.active;
      this.render();
      if (!wasOn) this.showIdle('Tap Start tuner and play a string.');
    });
    this.el.querySelector<HTMLSelectElement>('[data-t="a4"]')!.addEventListener('change', (e) => {
      this.a4 = Number((e.target as HTMLSelectElement).value);
      settings.set({ a4: this.a4 });
      this.done.clear();
      this.resetReadings();
      this.paintStrings();
    });
    this.el.querySelector('[data-t="mic"]')!.addEventListener('click', () => void this.toggleMic());
    this.el.querySelector('.tuner__strings')!.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!b) return;
      const i = Number(b.dataset.i);
      if (b.dataset.t === 'lock') {
        this.locked = this.locked === i ? null : i;
        this.resetReadings();
        this.paintStrings();
      } else if (b.dataset.t === 'hear') {
        void guitar.play(tuningMidis(this.tuning)[i], 2.5);
      }
    });
    this.renderMicButton();
    this.paintStrings();
    if (!this.mic.active) this.showIdle('Tap Start tuner and play a string.');
  }

  /** Forget recent readings, so a new tuning or string starts fresh. */
  private resetReadings(): void {
    this.history = [];
    this.inTuneSince = 0;
    this.needle = 0;
  }

  private renderMicButton(): void {
    const b = this.el.querySelector<HTMLButtonElement>('[data-t="mic"]');
    if (!b) return;
    b.textContent = this.mic.active ? 'Stop tuner' : 'Start tuner';
    b.classList.toggle('is-on', this.mic.active);
    b.setAttribute('aria-label', this.mic.active ? 'Stop the tuner and turn off the microphone' : 'Start the tuner. It uses your microphone.');
  }

  private async toggleMic(): Promise<void> {
    if (this.mic.active) {
      this.stop();
      return;
    }
    try {
      await this.mic.start((x, rate) => this.onFrame(x, rate));
      this.renderMicButton();
      this.showIdle('Listening. Play a string.');
    } catch (err) {
      const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      this.showIdle(
        denied
          ? 'The microphone is blocked. Allow it for this site in your browser settings, then tap Start tuner again.'
          : 'No microphone was found, or it is in use by another app.',
      );
    }
  }

  private paintStrings(): void {
    this.el.querySelectorAll<HTMLElement>('.tstring').forEach((el) => {
      const i = Number(el.dataset.i);
      el.classList.toggle('is-done', this.done.has(i));
      el.classList.toggle('is-current', i === this.current);
      el.querySelector('.tstring__pick')!.setAttribute('aria-pressed', String(this.locked === i));
    });
    const mode = this.el.querySelector('[data-t="mode"]');
    if (mode) {
      mode.textContent =
        this.locked === null
          ? `Automatic: the tuner works out which string you are playing. ${this.done.size} of 6 strings in tune.`
          : `Tuning only the ${STRING_NUMBERS[this.locked]} string (${pitchName(this.tuning.notes[this.locked])}). Tap it again for automatic.`;
    }
  }

  private showIdle(hint: string): void {
    const q = (s: string) => this.el.querySelector<HTMLElement>(`[data-t="${s}"]`);
    if (q('name')) q('name')!.textContent = '-';
    if (q('octave')) q('octave')!.textContent = '';
    if (q('cents')) q('cents')!.innerHTML = '&nbsp;';
    if (q('hint')) q('hint')!.textContent = hint;
    if (q('say')) q('say')!.textContent = hint;
    this.el.classList.remove('is-flat', 'is-sharp', 'is-tuned');
    this.setNeedle(0, false);
    this.current = -1;
    this.paintStrings();
  }

  private setNeedle(cents: number, visible = true): void {
    const n = this.el.querySelector<SVGGElement>('[data-t="needle"]');
    if (!n) return;
    const c = Math.max(-50, Math.min(50, cents));
    n.style.transform = `translateX(${c * 3.6}px)`;
    n.style.opacity = visible ? '1' : '0.25';
  }

  /** About 20 times a second while the tuner is on. */
  private onFrame(raw: Float32Array, rate: number): void {
    const now = performance.now();
    let x = raw;
    let r = rate;
    while (r > 30000) {
      x = halve(x);
      r /= 2;
    }
    const reading = rms(x) > 0.008 ? detectPitch(x, r, 55, 1100) : null;
    if (!reading || reading.clarity < 0.8) {
      // Keep the last reading on screen briefly as the note rings out.
      if (now - this.lastHeard > 1200) {
        this.history = [];
        if (this.current !== -1) this.showIdle('Listening. Play a string.');
      }
      return;
    }
    this.lastHeard = now;
    this.history.push(reading.freq);
    if (this.history.length > 5) this.history.shift();
    const freq = [...this.history].sort((a, b) => a - b)[Math.floor(this.history.length / 2)];

    const midis = tuningMidis(this.tuning);
    const note = nearestNote(freq, this.a4);
    const midiCents = note.midi * 100 + note.cents;
    const i = this.locked ?? nearestString(midiCents, midis);
    const target = freqOfMidi(midis[i], this.a4);
    const cents = centsOff(freq, target);
    this.current = i;

    this.needle += (cents - this.needle) * 0.35;
    const shown = Math.abs(cents) > 99 ? cents : this.needle;
    const tuned = Math.abs(cents) <= IN_TUNE;
    if (tuned) {
      this.inTuneSince ||= now;
      if (now - this.inTuneSince > HOLD_MS) this.done.add(i);
    } else this.inTuneSince = 0;

    const q = (s: string) => this.el.querySelector<HTMLElement>(`[data-t="${s}"]`)!;
    const name = pitchName(this.tuning.notes[i]);
    q('name').textContent = name;
    q('octave').textContent = this.tuning.notes[i].replace(/^[A-G][#b]?/, '');
    const sign = cents > 0 ? '+' : '';
    const offNote = ((note.midi % 12) + 12) % 12 !== ((midis[i] % 12) + 12) % 12;
    q('cents').textContent = `${sign}${Math.round(cents)} cents · ${freq.toFixed(1)} Hz${offNote ? ` (hearing ${note.name}${note.octave})` : ''}`;
    this.el.classList.toggle('is-tuned', tuned);
    this.el.classList.toggle('is-flat', !tuned && cents < 0);
    this.el.classList.toggle('is-sharp', !tuned && cents > 0);
    this.setNeedle(shown);
    const hint = tuned
      ? `✓ ${STRING_NUMBERS[i]} string (${name}) is in tune`
      : Math.abs(cents) > 99
        ? `Far from ${name}. ${cents < 0 ? 'Tighten' : 'Loosen'} a lot, or check you are on the ${STRING_NUMBERS[i]} string.`
        : cents < 0
          ? `▲ Tighten the ${STRING_NUMBERS[i]} string (${name}): ${Math.round(-cents)} cents flat`
          : `▼ Loosen the ${STRING_NUMBERS[i]} string (${name}): ${Math.round(cents)} cents sharp`;
    // The visible hint updates every frame; screen readers hear it at most every 1.5 seconds.
    q('hint').textContent = hint;
    const say = q('say');
    if (now - this.lastSpoken > 1500 || tuned !== !!say.textContent?.startsWith('✓')) {
      say.textContent = hint;
      this.lastSpoken = now;
    }
    this.paintStrings();
  }
}
