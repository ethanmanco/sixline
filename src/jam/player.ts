/**
 * Plays a backing track with the browser's own audio element, which can slow
 * down without changing pitch (preservesPitch) at good quality. Nothing loads
 * until a track is played.
 */
export interface PlayerState {
  playing: boolean;
  time: number;
  duration: number;
  loading: boolean;
}

type Listener = (s: PlayerState) => void;

export class TrackPlayer {
  private audio = new Audio();
  private listeners = new Set<Listener>();
  private src = '';
  private raf = 0;

  constructor() {
    this.audio.preload = 'none';
    this.audio.loop = true;
    this.setPreservePitch(true);
    const emit = () => this.emit();
    for (const ev of ['play', 'pause', 'ended', 'loadedmetadata', 'seeked', 'waiting', 'playing', 'canplay']) {
      this.audio.addEventListener(ev, emit);
    }
    this.audio.addEventListener('play', () => this.tick());
  }

  load(url: string): void {
    if (this.src === url) return;
    this.pause();
    this.src = url;
    this.audio.src = url;
    this.emit();
  }

  /** Must be called from a click or key press. */
  async play(): Promise<void> {
    await this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  toggle(): Promise<void> | void {
    return this.audio.paused ? this.play() : this.pause();
  }

  seek(sec: number): void {
    this.audio.currentTime = Math.max(0, sec);
    this.emit();
  }

  /** 0.5 to 1. Pitch stays the same. */
  setSpeed(rate: number): void {
    this.audio.playbackRate = rate;
    this.audio.defaultPlaybackRate = rate;
  }

  setLoop(on: boolean): void {
    this.audio.loop = on;
  }

  setVolume(v: number): void {
    this.audio.volume = Math.min(1, Math.max(0, v));
  }

  get state(): PlayerState {
    const a = this.audio;
    return {
      playing: !a.paused && !a.ended,
      time: a.currentTime || 0,
      duration: Number.isFinite(a.duration) ? a.duration : 0,
      loading: !a.paused && a.readyState < 3,
    };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  private setPreservePitch(on: boolean) {
    const a = this.audio as HTMLAudioElement & { webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean };
    a.preservesPitch = on;
    a.webkitPreservesPitch = on;
    a.mozPreservesPitch = on;
  }

  /** Time updates a few times a second while playing. */
  private tick() {
    cancelAnimationFrame(this.raf);
    let last = 0;
    const step = (t: number) => {
      if (this.audio.paused) return;
      if (t - last > 200) {
        last = t;
        this.emit();
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  private emit() {
    const s = this.state;
    for (const fn of this.listeners) fn(s);
  }
}
