import type { Route } from '../app/router';
import { href } from '../app/router';
import type { Stage } from '../app/stage';
import type { Shape } from '../core/types';
import { buildScaleShapes } from '../shapes/scaleShapes';
import { chordScaleFor, parseChord, type ChordScale } from '../theory/chordScale';
import { scaleType } from '../theory/scales';
import { noteChroma } from '../theory/spelling';
import { TrackPlayer, type PlayerState } from './player';
import {
  flatten,
  loadSavedTimeline,
  markAt,
  normalize,
  parseTimeline,
  saveTimeline,
  sectionStarts,
  serializeTimeline,
  type ChartChord,
  type Timeline,
} from './timeline';
import { STYLE_LABELS, TRACKS, creditText, formatTime, songKey, trackById, type Track, type TrackStyle } from './tracks';
import { YouTubePlayer } from './youtube';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const SPEEDS = [1, 0.9, 0.8, 0.75, 0.7, 0.6, 0.5];

interface Player {
  play(): Promise<void>;
  pause(): void;
  toggle(): Promise<void> | void;
  seek(s: number): void;
  setSpeed(r: number): void;
  setLoop(on: boolean): void;
  setVolume(v: number): void;
  readonly state: PlayerState;
  subscribe(fn: (s: PlayerState) => void): () => void;
}

type Mode = 'key' | 'chords';

/**
 * Jam: pick a backing track, play it (slower if you like), and see what to
 * play over it. "Scales for the key" shows one scale for the whole song;
 * "Follow the chords" switches to the best scale for each chord as it plays
 * and rings that chord's notes.
 */
export class JamView {
  /** Transport card, shown above the fretboard. */
  readonly top: HTMLElement;
  /** Track library and the chord-sync tool, shown below the fretboard. */
  readonly bottom: HTMLElement;
  private audio = new TrackPlayer();
  private yt: YouTubePlayer;
  private player: Player = this.audio;
  private unsub: (() => void) | null = null;
  private track: Track = TRACKS[0];
  private mode: Mode = 'key';
  private scaleId = TRACKS[0].scales[0];
  private pos = 0;
  /** Fret where the current position starts, so a new scale lands in the same area. */
  private anchorFret = -1;
  private chart: ChartChord[] = [];
  private timeline: Timeline = { marks: [] };
  /** Chord shown in follow mode (index into the chart). */
  private current = -1;
  /** Where the next tap goes when you jump to a section. */
  private nextTap: number | null = null;
  private raf = 0;
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
      <div class="jt__video" data-jt-video hidden></div>
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

    this.bottom = document.createElement('div');
    this.bottom.className = 'jam-bottom';

    this.yt = new YouTubePlayer(this.top.querySelector<HTMLElement>('[data-jt-video]')!);

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
      this.syncToTime(Number(seek.value));
    });
    this.top.querySelector<HTMLSelectElement>('[data-jt-speed]')!.addEventListener('change', (e) => {
      this.player.setSpeed(Number((e.target as HTMLSelectElement).value));
      this.updateMeta();
    });
    const loop = this.top.querySelector<HTMLButtonElement>('[data-jt-loop]')!;
    loop.addEventListener('click', () => {
      const on = loop.getAttribute('aria-pressed') !== 'true';
      loop.setAttribute('aria-pressed', String(on));
      this.audio.setLoop(on);
      this.yt.setLoop(on);
    });
    this.top.querySelector<HTMLInputElement>('[data-jt-vol]')!.addEventListener('input', (e) => {
      const v = Number((e.target as HTMLInputElement).value);
      this.audio.setVolume(v);
      this.yt.setVolume(v);
    });
    this.audio.setVolume(0.9);

    // Tap along: T steps the chord timeline when the tap tool is open.
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() !== 't' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t instanceof Element && t.closest('input, select, textarea, [contenteditable]')) return;
      if (this.top.hidden || !this.chart.length || !this.bottom.querySelector('.sync[open]')) return;
      e.preventDefault();
      this.tap();
    });
  }

  /** Stops the track, e.g. when leaving Jam. */
  stop(): void {
    this.player.pause();
  }

  render(route: Route): void {
    const next = trackById(route.category);
    const first = !this.top.querySelector('.jt__title')!.textContent;
    if (next.id !== this.track.id || first) this.selectTrack(next);
    this.renderLibrary();
    this.showFretboard();
  }

  // ---------------------------------------------------------------------------
  // Tracks and playback

  private selectTrack(next: Track): void {
    const wasPlaying = this.player.state.playing;
    this.player.pause();
    this.track = next;
    this.scaleId = next.scales[0];
    this.pos = 0;
    this.anchorFret = -1;
    this.chart = next.progression ? flatten(next.progression) : [];
    this.timeline = loadSavedTimeline(next.id, this.chart.length) ?? next.timeline ?? { marks: [] };
    this.current = this.chart.length ? 0 : -1;
    this.nextTap = null;
    this.mode = this.chart.length ? 'chords' : 'key';

    const video = this.top.querySelector<HTMLElement>('[data-jt-video]')!;
    if (next.kind === 'youtube' && next.youtubeId) {
      video.hidden = false;
      this.yt.load(next.youtubeId);
      this.player = this.yt;
    } else {
      this.yt.destroy();
      video.hidden = true;
      this.audio.load(`${import.meta.env.BASE_URL}jam/${next.file}`);
      this.player = this.audio;
    }
    this.player.setSpeed(Number(this.top.querySelector<HTMLSelectElement>('[data-jt-speed]')!.value));
    this.unsub?.();
    this.unsub = this.player.subscribe((s) => this.onState(s));
    if (wasPlaying && next.kind !== 'youtube') this.player.play().catch(() => undefined);
    this.renderTrack();
  }

  private onState(s: PlayerState): void {
    const playBtn = this.top.querySelector<HTMLButtonElement>('[data-jt-play]')!;
    const seek = this.top.querySelector<HTMLInputElement>('[data-jt-seek]')!;
    playBtn.classList.toggle('is-playing', s.playing);
    playBtn.querySelector('[data-i-play]')!.toggleAttribute('hidden', s.playing);
    playBtn.querySelector('[data-i-pause]')!.toggleAttribute('hidden', !s.playing);
    playBtn.querySelector('[data-jt-play-text]')!.textContent = s.loading ? 'Loading...' : s.playing ? 'Pause' : 'Play track';
    const dur = s.duration || this.track.durationSec;
    seek.max = String(dur || 1);
    if (!this.seeking) {
      seek.value = String(s.time);
      this.top.querySelector('[data-jt-time]')!.textContent = formatTime(s.time);
    }
    seek.setAttribute('aria-valuetext', `${formatTime(s.time)} of ${formatTime(dur)}`);
    this.top.querySelector('[data-jt-dur]')!.textContent = dur ? formatTime(dur) : '--:--';
    if (s.playing) this.follow();
    this.renderSyncStatus();
  }

  /** While playing, checks every frame whether the chord changed. */
  private follow(): void {
    cancelAnimationFrame(this.raf);
    const step = () => {
      const s = this.player.state;
      this.syncToTime(s.time);
      if (s.playing) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  private syncToTime(t: number): void {
    if (!this.chart.length || !this.timeline.marks.length) return;
    const m = markAt(this.timeline, t);
    const chord = m >= 0 ? this.timeline.marks[m].chord : this.current;
    if (chord !== this.current) {
      this.current = chord;
      this.showFretboard();
    }
  }

  private renderTrack(): void {
    const t = this.track;
    this.top.querySelector('.jt__title')!.textContent = t.title;
    this.updateMeta();
    const links = [`<a href="${t.source}" target="_blank" rel="noopener">${t.kind === 'youtube' ? 'Watch on YouTube' : 'Original'}</a>`];
    if (t.kind !== 'youtube') links.push(`<a href="${t.license.url}" target="_blank" rel="noopener">License</a>`);
    if (t.support) links.push(`<a href="${t.support}" target="_blank" rel="noopener">Support the artist</a>`);
    this.top.querySelector('[data-jt-credit]')!.innerHTML = `${esc(creditText(t))}. ${links.join(' · ')}`;
    const est = this.top.querySelector<HTMLElement>('[data-jt-estimate]')!;
    const parts = [t.estimated?.key ? 'key' : '', t.estimated?.tempo ? 'tempo' : ''].filter(Boolean);
    est.hidden = parts.length === 0;
    est.textContent = parts.length ? `The ${parts.join(' and ')} here ${parts.length > 1 ? 'were' : 'was'} estimated from the audio, since the track's page does not say.` : '';
  }

  private updateMeta(): void {
    const t = this.track;
    const speed = Number(this.top.querySelector<HTMLSelectElement>('[data-jt-speed]')!.value);
    const bpm = t.bpm ? `${Math.round(t.bpm * speed)} BPM${speed !== 1 ? ` (${t.bpm} at full speed)` : ''}` : t.kind === 'youtube' ? '' : 'tempo not stated';
    const bits = [STYLE_LABELS[t.style], `key of ${t.keyLabel}`, bpm, t.feel === 'shuffle' ? 'shuffle feel' : '', `by ${t.artist}`].filter(Boolean);
    this.top.querySelector('.jt__meta')!.textContent = bits.join(', ');
  }

  // ---------------------------------------------------------------------------
  // Fretboard and picker

  /** The scale to show right now: the chosen key scale, or the scale for the current chord. */
  private currentScale(): { root: string; id: string; pick?: ChordScale; chord?: ChartChord } {
    const t = this.track;
    if (this.mode === 'chords' && this.current >= 0 && this.chart[this.current]) {
      const chord = this.chart[this.current];
      try {
        const pick = chordScaleFor(chord.symbol, songKey(t));
        return { root: pick.root, id: pick.scaleId, pick, chord };
      } catch {
        return { root: t.root, id: t.scales[0], chord };
      }
    }
    // Key mode still rings the current chord, so outside notes show up as hollow dots.
    const chord = this.chart.length && this.current >= 0 ? this.chart[this.current] : undefined;
    return { root: t.root, id: this.scaleId, chord };
  }

  private showFretboard(): void {
    const t = this.track;
    const { root, id, pick, chord } = this.currentScale();
    const shapes = buildScaleShapes(root, scaleType(id));
    // Keep the hand in the same area when the scale changes.
    if (this.anchorFret >= 0) {
      let best = this.pos;
      let dist = Infinity;
      shapes.forEach((s, i) => {
        if (!s.position) return;
        const d = Math.abs(s.position.startFret - this.anchorFret);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      if (shapes[this.pos]?.position || this.pos >= shapes.length) this.pos = best;
    }
    this.pos = Math.min(this.pos, shapes.length - 1);
    const shape: Shape = shapes[this.pos];
    if (shape.position && this.anchorFret < 0) this.anchorFret = shape.position.startFret;
    this.stage.setRoot(root);
    this.stage.setShape(shape);

    let targets: { chroma: number; name: string }[] | null = null;
    if (chord) {
      try {
        targets = parseChord(chord.symbol).notes.map((n) => ({ chroma: noteChroma(n), name: n }));
      } catch {
        targets = null;
      }
    }
    this.stage.fretboard.setTargets(targets);
    this.stage.setTargetLegend(!!targets);
    this.renderPicker(t, shapes, pick, chord);
  }

  private renderPicker(t: Track, shapes: Shape[], pick?: ChordScale, chord?: ChartChord): void {
    const nav = document.createElement('nav');
    nav.className = 'picker__nav jam-picker';
    nav.setAttribute('aria-label', 'What to play over this track');

    const modeRow = this.chart.length
      ? `<div class="picker__groups" role="group" aria-label="Scale mode">
          <button type="button" class="pickgroup" data-mode="key" aria-pressed="${this.mode === 'key'}">Scales for the key</button>
          <button type="button" class="pickgroup" data-mode="chords" aria-pressed="${this.mode === 'chords'}">Follow the chords</button>
        </div>`
      : '';

    let body = '';
    if (this.mode === 'key') {
      body += `<div class="picker__groups" role="group" aria-label="Scales">${t.scales
        .map((id) => {
          const label = buildScaleShapes(t.root, scaleType(id))[0].name;
          return `<button type="button" class="pickgroup" data-scale="${id}" aria-pressed="${id === this.scaleId}">${esc(label)}</button>`;
        })
        .join('')}</div>`;
    } else {
      const nextIdx = this.chart.length ? (this.current + 1) % this.chart.length : -1;
      const next = nextIdx >= 0 ? this.chart[nextIdx] : undefined;
      const synced = this.timeline.marks.length > 0;
      body += `
        <div class="now" aria-live="polite">
          <div class="now__chord"><span class="now__label">Now</span><strong>${esc(chord?.symbol ?? '')}</strong></div>
          <div class="now__scale"><span class="now__label">Play</span><strong>${esc(pick?.label ?? '')}</strong>${pick?.modeOverChord ? `<span class="now__mode">${esc(pick.modeOverChord)} over this chord</span>` : ''}</div>
          <div class="now__next"><span class="now__label">Next</span><strong>${esc(next?.symbol ?? '')}</strong></div>
        </div>
        <p class="now__why">${esc(pick?.why ?? '')}${synced ? '' : ' Tap a chord to see its scale, or sync the chart below so it follows the music.'}</p>
        ${this.chartHtml()}`;
    }
    const posRow = shapes
      .map((s, i) => {
        const text = s.position ? String(i + 1) : 'Whole neck';
        const label = s.position ? `Position ${i + 1}, fret ${s.position.startFret}` : 'Whole neck, every note';
        return `<button type="button" class="pick${s.position ? ' pick--num' : ''}" data-pos="${i}" aria-label="${label}" aria-pressed="${i === this.pos}">${text}</button>`;
      })
      .join('');
    nav.innerHTML = `${modeRow}${body}<div class="picker__items"><div class="picker__group picker__group--pos"><span class="picker__label" aria-hidden="true">Position</span>${posRow}</div></div>`;

    nav.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!el) return;
      let focusSel = '';
      if (el.dataset.mode) {
        this.mode = el.dataset.mode as Mode;
        focusSel = `[data-mode="${el.dataset.mode}"]`;
        if (this.mode === 'chords') this.syncToTime(this.player.state.time);
      } else if (el.dataset.scale) {
        this.scaleId = el.dataset.scale;
        focusSel = `[data-scale="${el.dataset.scale}"]`;
      } else if (el.dataset.pos) {
        this.pos = Number(el.dataset.pos);
        this.anchorFret = -1;
        focusSel = `[data-pos="${el.dataset.pos}"]`;
      } else if (el.dataset.chord) {
        this.current = Number(el.dataset.chord);
        focusSel = `[data-chord="${el.dataset.chord}"]`;
        // With a timeline, jump the track to where this chord next starts.
        const mark = this.timeline.marks.find((m) => m.chord === this.current && m.t >= this.player.state.time) ?? this.timeline.marks.find((m) => m.chord === this.current);
        if (mark) this.player.seek(mark.t);
      } else return;
      this.showFretboard();
      this.stage.el.querySelector<HTMLElement>(`.picker ${focusSel}`)?.focus();
    });
    this.stage.setPicker(nav);
  }

  private chartHtml(): string {
    const p = this.track.progression;
    if (!p) return '';
    let i = 0;
    return `<div class="chart" role="group" aria-label="Chord chart">${p.sections
      .map(
        (s) => `<div class="chart__section"><span class="picker__label">${esc(s.name)}</span>${s.chords
          .map((sym) => {
            const idx = i++;
            return `<button type="button" class="pick chart__chord" data-chord="${idx}" aria-pressed="${idx === this.current}">${esc(sym)}</button>`;
          })
          .join('')}</div>`,
      )
      .join('')}</div>`;
  }

  // ---------------------------------------------------------------------------
  // Library and tap-to-sync

  private renderLibrary(): void {
    const styles = [...new Set(TRACKS.map((t) => t.style))] as TrackStyle[];
    const t = this.track;
    const sync = this.chart.length
      ? `<details class="sync" ${this.timeline.marks.length ? '' : 'open'}>
          <summary><h2 class="sync__title">Sync the chords to this track</h2></summary>
          <p class="sync__help">Play the track and tap <strong>Next chord</strong> (or press <kbd>T</kbd>) right as each chord starts. Taps walk through the chart in order. If the song jumps to a section, press its button first. It works at any speed, and it is saved in this browser.</p>
          <div class="sync__controls">
            <button type="button" class="btn btn--play" data-sync="tap">Next chord <kbd>T</kbd></button>
            ${(t.progression?.sections ?? []).map((s, i) => `<button type="button" class="btn" data-sync="jump" data-section="${i}">Next is ${esc(s.name)}</button>`).join('')}
            <button type="button" class="btn" data-sync="undo">Undo tap</button>
            <button type="button" class="btn" data-sync="clear">Clear</button>
          </div>
          <p class="sync__status" data-sync-status></p>
          <div class="sync__share">
            <button type="button" class="btn" data-sync="copy">Copy timing</button>
            <button type="button" class="btn" data-sync="paste">Paste timing</button>
            <span class="sync__note" data-sync-note></span>
          </div>
        </details>`
      : `<p class="sync__none">This track has no chord chart yet, so it uses scales for the whole key.</p>`;

    this.bottom.innerHTML = `
      <section class="jam-sync-wrap" aria-label="Chord timing">${sync}</section>
      <section class="jam-library" aria-labelledby="jam-lib-title">
        <h2 class="jam-library__title" id="jam-lib-title">Backing tracks</h2>
        <p class="jam-library__intro">Recorded by real musicians. Most are shared under Creative Commons licenses with the original lead guitar left out; YouTube tracks play from YouTube in YouTube's own player.</p>
        ${styles
          .map(
            (style) => `
          <h3 class="items__group">${esc(STYLE_LABELS[style])}</h3>
          <ul class="tracks" role="list">
            ${TRACKS.filter((x) => x.style === style)
              .map(
                (x) => `<li><a class="track" href="${href(['jam', x.id])}" ${x.id === t.id ? 'aria-current="true"' : ''}>
                  <span class="track__title">${esc(x.title)}</span>
                  <span class="track__meta">Key of ${esc(x.keyLabel)}${x.estimated?.key ? ' (est.)' : ''}${x.bpm ? `, ${x.bpm} BPM` : ''}${x.durationSec ? `, ${formatTime(x.durationSec)}` : ''}${x.progression ? ', chord chart' : ''}</span>
                  <span class="track__by">${esc(x.artist)}, ${esc(x.license.name)}</span>
                </a></li>`,
              )
              .join('')}
          </ul>`,
          )
          .join('')}
      </section>`;

    this.bottom.querySelector('.sync')?.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-sync]');
      if (!el) return;
      switch (el.dataset.sync) {
        case 'tap':
          this.tap();
          break;
        case 'jump':
          this.nextTap = sectionStarts(this.track.progression!)[Number(el.dataset.section)];
          this.renderSyncStatus();
          break;
        case 'undo':
          this.nextTap = null;
          this.timeline = { marks: this.timeline.marks.slice(0, -1) };
          this.commitTimeline();
          break;
        case 'clear':
          if (this.timeline.marks.length && !window.confirm('Clear all the chord timing for this track?')) return;
          this.timeline = { marks: [] };
          this.commitTimeline();
          break;
        case 'copy':
          navigator.clipboard
            ?.writeText(serializeTimeline(this.timeline))
            .then(() => this.note('Copied. Paste it in a message to share it.'))
            .catch(() => this.note('Could not copy here.'));
          break;
        case 'paste': {
          const text = window.prompt('Paste a chord timing here:');
          if (!text) return;
          const tl = parseTimeline(text, this.chart.length);
          if (!tl) {
            this.note('That does not look like a timing for this chart.');
            return;
          }
          this.timeline = tl;
          this.commitTimeline();
          this.note('Timing loaded.');
          break;
        }
      }
    });
    this.renderSyncStatus();
  }

  /** Marks "the next chord starts now". */
  private tap(): void {
    if (!this.chart.length) return;
    const last = this.timeline.marks.at(-1);
    const chord = this.nextTap ?? (last ? (last.chord + 1) % this.chart.length : 0);
    this.nextTap = null;
    this.timeline = normalize({ marks: [...this.timeline.marks, { t: this.player.state.time, chord }] });
    this.mode = 'chords';
    this.current = chord;
    this.commitTimeline();
    this.showFretboard();
  }

  private commitTimeline(): void {
    saveTimeline(this.track.id, this.timeline);
    this.renderSyncStatus();
  }

  private renderSyncStatus(): void {
    const el = this.bottom.querySelector('[data-sync-status]');
    if (!el) return;
    const n = this.timeline.marks.length;
    const last = this.timeline.marks.at(-1);
    const upcoming = this.nextTap ?? (last ? (last.chord + 1) % this.chart.length : 0);
    el.textContent = n
      ? `${n} chord change${n === 1 ? '' : 's'} marked. Last: ${this.chart[last!.chord]?.symbol} at ${formatTime(last!.t)}. Next tap: ${this.chart[upcoming]?.symbol}.`
      : `No timing yet. The first tap marks ${this.chart[upcoming]?.symbol ?? 'the first chord'}.`;
  }

  private note(text: string): void {
    const el = this.bottom.querySelector('[data-sync-note]');
    if (el) el.textContent = text;
  }

  private say(text: string): void {
    const el = this.top.querySelector<HTMLElement>('[data-jt-estimate]')!;
    el.textContent = text;
    el.hidden = false;
  }
}
