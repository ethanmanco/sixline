import { guitar } from '../audio/guitar';
import type { LabelMode, Shape } from '../core/types';
import { Fretboard } from '../fretboard/fretboard';
import { prefersSharps, spellMidi } from '../theory/spelling';
import { settings, type ChordPlay } from './settings';

const CHORD_PLAY: { id: ChordPlay; label: string }[] = [
  { id: 'strum', label: 'Strum' },
  { id: 'pick', label: 'One by one' },
  { id: 'both', label: 'Both' },
];

const LABEL_MODES: { id: LabelMode; label: string }[] = [
  { id: 'finger', label: 'Finger' },
  { id: 'note', label: 'Note' },
  { id: 'degree', label: 'Degree' },
  { id: 'none', label: 'None' },
];

/**
 * The fretboard plus its controls (labels, play, left-handed, show or hide).
 * Any section can hand it a shape; Learn is the first one.
 */
export class Stage {
  readonly el: HTMLElement;
  readonly fretboard: Fretboard;
  private shape: Shape | null = null;
  private root = 'A';
  private playBtn: HTMLButtonElement;
  private status: HTMLElement;
  private stepListeners = new Set<(indices: number[] | null) => void>();

  constructor() {
    this.fretboard = new Fretboard({
      spell: (midi) => spellMidi(midi, prefersSharps(this.root)),
      onActivate: (_pos, midi) => {
        guitar.play(midi).catch(() => this.say('Sound could not load. Check your connection and try again.'));
      },
    });

    this.el = document.createElement('section');
    this.el.className = 'stage';
    this.el.setAttribute('aria-label', 'Fretboard and playback');
    this.el.innerHTML = `
      <div class="toolbar">
        <button type="button" class="btn btn--play" data-play aria-label="Play">
          <svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path data-icon-play d="M4 2.5v11l9-5.5z"/><path data-icon-stop d="M3.5 3.5h9v9h-9z" hidden/></svg>
          <span data-play-text>Play</span>
        </button>
        <fieldset class="seg" data-chord-play hidden>
          <legend class="seg__legend">How to play the chord</legend>
          ${CHORD_PLAY.map(
            (m) => `<label class="seg__opt"><input type="radio" name="chord-play" value="${m.id}"><span>${m.label}</span></label>`,
          ).join('')}
        </fieldset>
        <fieldset class="seg">
          <legend class="seg__legend">Dot labels</legend>
          ${LABEL_MODES.map(
            (m) => `<label class="seg__opt"><input type="radio" name="label-mode" value="${m.id}"><span>${m.label}</span></label>`,
          ).join('')}
        </fieldset>
        <div class="toolbar__end">
          <button type="button" class="btn btn--toggle" data-lefty aria-pressed="false">Left-handed</button>
          <button type="button" class="btn btn--toggle" data-show aria-expanded="true" aria-controls="fretboard-panel">Hide fretboard</button>
        </div>
        <p class="status" role="status" aria-live="polite"></p>
      </div>
      <div class="picker" data-picker hidden></div>
      <div class="stage__panel" id="fretboard-panel">
        <div class="fb-scroll" data-fb></div>
        <p class="legend" aria-hidden="true">
          <span class="legend__item"><i class="legend__dot legend__dot--root"></i>Root</span>
          <span class="legend__item"><i class="legend__dot"></i><span data-legend-note>Scale note</span></span>
          <span class="legend__item" data-legend-shift><i class="legend__dot legend__dot--shift"></i>Hand shifts one fret</span>
          <span class="legend__item" data-legend-muted hidden><i class="legend__x">×</i>Don't play this string</span>
          <span class="legend__hint">Tap any fret to hear it. Arrow keys move, Enter plays.</span>
        </p>
      </div>`;

    this.el.querySelector('[data-fb]')!.append(this.fretboard.el);
    this.playBtn = this.el.querySelector<HTMLButtonElement>('[data-play]')!;
    this.status = this.el.querySelector<HTMLElement>('.status')!;

    this.playBtn.addEventListener('click', () => this.togglePlay());
    this.el.querySelectorAll<HTMLInputElement>('input[name="chord-play"]').forEach((input) =>
      input.addEventListener('change', () => settings.set({ chordPlay: input.value as ChordPlay })),
    );
    this.el.querySelectorAll<HTMLInputElement>('input[name="label-mode"]').forEach((input) =>
      input.addEventListener('change', () => settings.set({ labelMode: input.value as LabelMode })),
    );
    const lefty = this.el.querySelector<HTMLButtonElement>('[data-lefty]')!;
    lefty.addEventListener('click', () => settings.set({ lefty: !settings.get().lefty }));
    const show = this.el.querySelector<HTMLButtonElement>('[data-show]')!;
    show.addEventListener('click', () => settings.set({ showFretboard: !settings.get().showFretboard }));
    const panel = this.el.querySelector<HTMLElement>('.stage__panel')!;

    settings.subscribe((s) => {
      this.fretboard.setLabelMode(s.labelMode);
      this.fretboard.setLefty(s.lefty);
      this.el.querySelectorAll<HTMLInputElement>('input[name="label-mode"]').forEach((i) => (i.checked = i.value === s.labelMode));
      this.el.querySelectorAll<HTMLInputElement>('input[name="chord-play"]').forEach((i) => (i.checked = i.value === s.chordPlay));
      lefty.setAttribute('aria-pressed', String(s.lefty));
      show.setAttribute('aria-expanded', String(s.showFretboard));
      show.textContent = s.showFretboard ? 'Hide fretboard' : 'Show fretboard';
      panel.hidden = !s.showFretboard;
    });

    guitar.onState((state) => {
      if (state === 'loading') this.say('Loading guitar sound...');
      if (state === 'ready') this.say('');
      if (state === 'error') this.say('Sound could not load. Check your connection and try again.');
    });

    // Phones held upright get a vertical neck, like a chord chart.
    const portrait = window.matchMedia('(max-width: 700px) and (orientation: portrait)');
    const orient = () => this.fretboard.setOrientation(portrait.matches ? 'vertical' : 'horizontal');
    portrait.addEventListener('change', orient);
    orient();
  }

  setRoot(root: string): void {
    this.root = root;
  }

  setShape(shape: Shape | null): void {
    if (guitar.isPlaying) guitar.stop();
    this.shape = shape;
    this.fretboard.setShape(shape);
    this.playBtn.disabled = !shape;
    this.playBtn.setAttribute('aria-label', shape ? `Play ${this.describe(shape)}` : 'Play');
    const chord = shape?.kind === 'chord';
    this.el.querySelector<HTMLElement>('[data-chord-play]')!.hidden = !chord;
    this.el.querySelector('[data-legend-note]')!.textContent = shape?.kind === 'scale' ? 'Scale note' : 'Chord tone';
    this.el.querySelector<HTMLElement>('[data-legend-shift]')!.hidden = chord;
    this.el.querySelector<HTMLElement>('[data-legend-muted]')!.hidden = !shape?.muted?.length;
  }

  /**
   * A quick picker that sits right above the fretboard, so switching between
   * items never needs a scroll. The section that owns the stage fills it.
   */
  setPicker(content: HTMLElement | null): void {
    const slot = this.el.querySelector<HTMLElement>('[data-picker]')!;
    slot.replaceChildren(...(content ? [content] : []));
    slot.hidden = !content;
  }

  /** Get told which notes are sounding, e.g. to light up a tab column. */
  onStep(fn: (indices: number[] | null) => void): () => void {
    this.stepListeners.add(fn);
    return () => this.stepListeners.delete(fn);
  }

  private describe(s: Shape): string {
    if (!s.position) return s.subtitle ? `${s.name}, whole neck` : s.name;
    if (s.position.count < 2) return s.name;
    return `${s.name}, ${s.kind === 'chord' ? 'voicing' : 'position'} ${s.position.index}`;
  }

  private async togglePlay(): Promise<void> {
    if (guitar.isPlaying) {
      guitar.stop();
      return;
    }
    const shape = this.shape;
    if (!shape) return;
    const all = shape.notes.map((_, i) => i);
    // Each step lists the shape's note indexes that sound together.
    let order: number[][];
    if (shape.kind === 'chord') {
      const picked = all.map((i) => [i]);
      const mode = settings.get().chordPlay;
      order = mode === 'strum' ? [all] : mode === 'pick' ? picked : [...picked, all];
    } else if (shape.playOrder) {
      order = shape.playOrder.map((i) => [i]);
    } else {
      // Up the shape and back down again.
      order = [...all, ...all.slice(0, -1).reverse()].map((i) => [i]);
    }
    this.setPlaying(true);
    try {
      await guitar.sequence(
        order.map((ids) => (ids.length === 1 ? shape.notes[ids[0]].midi : ids.map((i) => shape.notes[i].midi))),
        {
          step: shape.kind === 'chord' ? 0.26 : shape.playOrder ? 0.22 : 0.3,
          onNote: (k) => this.step(order[k]),
          onEnd: () => {
            this.step(null);
            this.setPlaying(false);
          },
        },
      );
    } catch {
      this.setPlaying(false);
      this.say('Sound could not load. Check your connection and try again.');
    }
  }

  private step(indices: number[] | null): void {
    this.fretboard.highlight(indices);
    for (const fn of this.stepListeners) fn(indices);
  }

  private setPlaying(on: boolean): void {
    this.playBtn.classList.toggle('is-playing', on);
    this.playBtn.querySelector('[data-icon-play]')!.toggleAttribute('hidden', on);
    this.playBtn.querySelector('[data-icon-stop]')!.toggleAttribute('hidden', !on);
    this.playBtn.querySelector('[data-play-text]')!.textContent = on ? 'Stop' : 'Play';
    const name = this.shape ? this.describe(this.shape) : '';
    this.playBtn.setAttribute('aria-label', on ? 'Stop' : `Play ${name}`.trim());
  }

  private say(text: string): void {
    this.status.textContent = text;
  }
}
