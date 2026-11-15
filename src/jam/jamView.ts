import type { Route } from '../app/router';
import { href } from '../app/router';
import type { Stage } from '../app/stage';
import type { Shape } from '../core/types';
import { buildScaleShapes } from '../shapes/scaleShapes';
import { scaleType } from '../theory/scales';
import { TrackPlayer } from './player';
import { STYLE_LABELS, TRACKS, creditText, formatTime, trackById, type Track, type TrackStyle } from './tracks';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const SPEEDS = [1, 0.9, 0.8, 0.75, 0.7, 0.6, 0.5];

/**
 * Jam: pick a recorded backing track, play it (slower if you like), and see
 * scales that fit it on the shared fretboard.
 */
export class JamView {
  /** Transport card, shown above the fretboard. */
  readonly top: HTMLElement;
  /** Track library, shown below the fretboard. */
  readonly bottom: HTMLElement;
  private player = new TrackPlayer();
  private track: Track = TRACKS[0];
  private scaleId = TRACKS[0].scales[0];
  private pos = 0;
  private seeking = false;

  constructor(private stage: Stage) {
    this.top = document.createElement('section');
    this.top.className = 'jam-transport';
    this.top.setAttribute('aria-labelledby', 'jam-title');
    this.top.innerHTML = `
      <div class="jt__head">
        <p class="jt__eyebrow">Backing track</p>
        <h1 class="jt__title" id="jam-title"></h1>
        <p class="jt__meta"></p>
      </div>
      <div class="jt__controls">
        <button type="button" class="btn btn--play jt__play" data-jt-play>
          <svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path data-i-play d="M4 2.5v11l9-5.5z"/><path data-i-pause d="M4 3h3v10H4zM9 3h3v10H9z" hidden/></svg>
          <span data-jt-play-text>Play track</span>
        </button>
        <span class="jt__time" data-jt-time>0:00</span>
        <input class="jt__seek" type="range" min="0" max="100" step="0.1" value="0" data-jt-seek aria-label="Position in the track" />
        <span class="jt__time" data-jt-dur>0:00</span>
      </div>
      <div class="jt__opts">
        <label class="jt__opt">Speed
          <select data-jt-speed>${SPEEDS.map((s) => `<option value="${s}">${Math.round(s * 100)}%</option>`).join('')}</select>
        </label>
        <button type="button" class="btn btn--toggle" data-jt-loop aria-pressed="true">Loop</button>
        <label class="jt__opt">Volume
          <input type="range" min="0" max="1" step="0.05" value="0.9" data-jt-vol />
        </label>
      </div>
      <p class="jt__credit" data-jt-credit></p>
      <p class="jt__estimate" data-jt-estimate hidden></p>`;

    this.bottom = document.createElement('section');
    this.bottom.className = 'jam-library';
    this.bottom.setAttribute('aria-labelledby', 'jam-lib-title');

    const playBtn = this.top.querySelector<HTMLButtonElement>('[data-jt-play]')!;
    playBtn.addEventListener('click', () => {
      Promise.resolve(this.player.toggle()).catch(() => this.say('The track could not play. Check your connection and try again.'));
    });
    const seek = this.top.querySelector<HTMLInputElement>('[data-jt-seek]')!;
    seek.addEventListener('input', () => {
      this.seeking = true;
      this.top.querySelector('[data-jt-time]')!.textContent = formatTime(Number(seek.value));
    });
    seek.addEventListener('change', () => {
      this.player.seek(Number(seek.value));
      this.seeking = false;
    });
    this.top.querySelector<HTMLSelectElement>('[data-jt-speed]')!.addEventListener('change', (e) => {
      this.player.setSpeed(Number((e.target as HTMLSelectElement).value));
      this.updateMeta();
    });
    const loop = this.top.querySelector<HTMLButtonElement>('[data-jt-loop]')!;
    loop.addEventListener('click', () => {
      const on = loop.getAttribute('aria-pressed') !== 'true';
      loop.setAttribute('aria-pressed', String(on));
      this.player.setLoop(on);
    });
    this.top.querySelector<HTMLInputElement>('[data-jt-vol]')!.addEventListener('input', (e) => {
      this.player.setVolume(Number((e.target as HTMLInputElement).value));
    });
    this.player.setVolume(0.9);

    this.player.subscribe((s) => {
      playBtn.classList.toggle('is-playing', s.playing);
      playBtn.querySelector('[data-i-play]')!.toggleAttribute('hidden', s.playing);
      playBtn.querySelector('[data-i-pause]')!.toggleAttribute('hidden', !s.playing);
      playBtn.querySelector('[data-jt-play-text]')!.textContent = s.loading ? 'Loading...' : s.playing ? 'Pause' : 'Play track';
      const dur = s.duration || this.track.durationSec;
      seek.max = String(dur);
      if (!this.seeking) {
        seek.value = String(s.time);
        this.top.querySelector('[data-jt-time]')!.textContent = formatTime(s.time);
      }
      seek.setAttribute('aria-valuetext', `${formatTime(s.time)} of ${formatTime(dur)}`);
      this.top.querySelector('[data-jt-dur]')!.textContent = formatTime(dur);
    });
  }

  /** Stops the track, e.g. when leaving Jam. */
  stop(): void {
    this.player.pause();
  }

  render(route: Route): void {
    const next = trackById(route.category);
    const changed = next.id !== this.track.id || !this.top.querySelector('.jt__title')!.textContent;
    if (changed) {
      const wasPlaying = this.player.state.playing;
      this.track = next;
      this.scaleId = next.scales[0];
      this.pos = 0;
      this.player.load(`${import.meta.env.BASE_URL}jam/${next.file}`);
      if (wasPlaying) this.player.play().catch(() => undefined);
    }
    this.renderTrack();
    this.renderLibrary();
    this.showScale();
  }

  private renderTrack(): void {
    const t = this.track;
    this.top.querySelector('.jt__title')!.textContent = t.title;
    this.updateMeta();
    this.top.querySelector('[data-jt-credit]')!.innerHTML =
      `${esc(creditText(t))}. <a href="${t.source}" target="_blank" rel="noopener">Original</a> · <a href="${t.license.url}" target="_blank" rel="noopener">License</a>`;
    const est = this.top.querySelector<HTMLElement>('[data-jt-estimate]')!;
    const parts = [t.estimated?.key ? 'key' : '', t.estimated?.tempo ? 'tempo' : ''].filter(Boolean);
    est.hidden = parts.length === 0;
    est.textContent = parts.length ? `The ${parts.join(' and ')} here ${parts.length > 1 ? 'were' : 'was'} estimated from the audio, since the track's page does not say.` : '';
  }

  private updateMeta(): void {
    const t = this.track;
    const speed = Number(this.top.querySelector<HTMLSelectElement>('[data-jt-speed]')!.value);
    const bpm = t.bpm ? `${Math.round(t.bpm * speed)} BPM${speed !== 1 ? ` (${t.bpm} at full speed)` : ''}` : 'tempo not stated';
    this.top.querySelector('.jt__meta')!.textContent = `${STYLE_LABELS[t.style]}, key of ${t.keyLabel}, ${bpm}${t.feel === 'shuffle' ? ', shuffle feel' : ''}, by ${t.artist}`;
  }

  private renderLibrary(): void {
    const styles = [...new Set(TRACKS.map((t) => t.style))] as TrackStyle[];
    this.bottom.innerHTML = `
      <h2 class="jam-library__title" id="jam-lib-title">Backing tracks</h2>
      <p class="jam-library__intro">Recorded by real musicians and shared under Creative Commons licenses. The original lead guitar is left out, so the space is yours.</p>
      ${styles
        .map(
          (style) => `
        <h3 class="items__group">${esc(STYLE_LABELS[style])}</h3>
        <ul class="tracks" role="list">
          ${TRACKS.filter((t) => t.style === style)
            .map(
              (t) => `<li><a class="track" href="${href(['jam', t.id])}" ${t.id === this.track.id ? 'aria-current="true"' : ''}>
                <span class="track__title">${esc(t.title)}</span>
                <span class="track__meta">Key of ${esc(t.keyLabel)}${t.estimated?.key ? ' (est.)' : ''}, ${t.bpm ? `${t.bpm} BPM` : 'tempo not stated'}, ${formatTime(t.durationSec)}</span>
                <span class="track__by">${esc(t.artist)}, ${esc(t.license.name)}</span>
              </a></li>`,
            )
            .join('')}
        </ul>`,
        )
        .join('')}`;
  }

  /** Puts the chosen scale on the fretboard, with a picker for scales and positions. */
  private showScale(): void {
    const t = this.track;
    const shapes = buildScaleShapes(t.root, scaleType(this.scaleId));
    const shape: Shape = shapes[Math.min(this.pos, shapes.length - 1)];
    this.stage.setRoot(t.root);
    this.stage.setShape(shape);

    const nav = document.createElement('nav');
    nav.className = 'picker__nav';
    nav.setAttribute('aria-label', 'Scales to try over this track');
    const scaleRow = t.scales
      .map((id) => {
        const label = buildScaleShapes(t.root, scaleType(id))[0].name;
        return `<button type="button" class="pickgroup" data-scale="${id}" aria-pressed="${id === this.scaleId}">${esc(label)}</button>`;
      })
      .join('');
    const posRow = shapes
      .map((s, i) => {
        const text = s.position ? String(i + 1) : 'Whole neck';
        const label = s.position ? `Position ${i + 1}, fret ${s.position.startFret}` : 'Whole neck, every note';
        return `<button type="button" class="pick${s.position ? ' pick--num' : ''}" data-pos="${i}" aria-label="${label}" aria-pressed="${i === this.pos}">${text}</button>`;
      })
      .join('');
    nav.innerHTML = `
      <div class="picker__groups" role="group" aria-label="Scales">${scaleRow}</div>
      <div class="picker__items"><div class="picker__group picker__group--pos"><span class="picker__label" aria-hidden="true">Position</span>${posRow}</div></div>`;
    nav.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!el) return;
      if (el.dataset.scale) {
        this.scaleId = el.dataset.scale;
        this.pos = 0;
      } else if (el.dataset.pos) {
        this.pos = Number(el.dataset.pos);
      } else return;
      const key = el.dataset.scale ? `[data-scale="${el.dataset.scale}"]` : `[data-pos="${el.dataset.pos}"]`;
      this.showScale();
      this.stage.el.querySelector<HTMLElement>(`.picker ${key}`)?.focus();
    });
    this.stage.setPicker(nav);
  }

  private say(text: string): void {
    this.top.querySelector('[data-jt-estimate]')!.textContent = text;
    this.top.querySelector<HTMLElement>('[data-jt-estimate]')!.hidden = false;
  }
}
