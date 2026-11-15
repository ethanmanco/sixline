import { guitar } from '../audio/guitar';
import type { LabelMode, Shape } from '../core/types';
import { Fretboard } from '../fretboard/fretboard';
import { prefersSharps, spellMidi } from '../theory/spelling';
import { settings } from './settings';

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
  private stepListeners = new Set<(i: number | null) => void>();

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
      <div class="stage__panel" id="fretboard-panel">
        <div class="fb-scroll" data-fb></div>
        <p class="legend" aria-hidden="true">
          <span class="legend__item"><i class="legend__dot legend__dot--root"></i>Root</span>
          <span class="legend__item"><i class="legend__dot"></i>Scale note</span>
          <span class="legend__item"><i class="legend__dot legend__dot--shift"></i>Hand shifts one fret</span>
          <span class="legend__hint">Tap any fret to hear it. Arrow keys move, Enter plays.</span>
        </p>
      </div>`;

    this.el.querySelector('[data-fb]')!.append(this.fretboard.el);
    this.playBtn = this.el.querySelector<HTMLButtonElement>('[data-play]')!;
    this.status = this.el.querySelector<HTMLElement>('.status')!;

    this.playBtn.addEventListener('click', () => this.togglePlay());
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
  }

  /** Get told which note is sounding, e.g. to light up a tab column. */
  onStep(fn: (i: number | null) => void): () => void {
    this.stepListeners.add(fn);
    return () => this.stepListeners.delete(fn);
  }

  private describe(s: Shape): string {
    return s.position ? `${s.name}, position ${s.position.index}` : s.name;
  }

  private async togglePlay(): Promise<void> {
    if (guitar.isPlaying) {
      guitar.stop();
      return;
    }
    const shape = this.shape;
    if (!shape) return;
    this.setPlaying(true);
    try {
      if (shape.kind === 'chord') {
        await guitar.strum(
          shape.notes.map((n) => n.midi),
          {
            onStart: () => this.fretboard.highlightAll(true),
            onEnd: () => {
              this.fretboard.highlightAll(false);
              this.setPlaying(false);
            },
          },
        );
        return;
      }
      // Up the shape and back down again.
      const up = shape.notes.map((_, i) => i);
      const order = [...up, ...up.slice(0, -1).reverse()];
      await guitar.sequence(
        order.map((i) => shape.notes[i].midi),
        {
          step: 0.3,
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

  private step(i: number | null): void {
    this.fretboard.highlight(i);
    for (const fn of this.stepListeners) fn(i);
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
