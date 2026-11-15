import type { PlayerState } from './player';

/**
 * Plays a YouTube video through YouTube's official embedded player (IFrame
 * API), so the artist's own upload is what plays. Uses the privacy-enhanced
 * youtube-nocookie.com host, and loads nothing until a YouTube track is chosen.
 */

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  setPlaybackRate(r: number): void;
  getPlaybackRate(): number;
  getAvailablePlaybackRates(): number[];
  setVolume(v: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  loadVideoById(id: string): void;
  cueVideoById(id: string): void;
  destroy(): void;
}

interface YTNamespace {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => {
      apiPromise = null;
      reject(new Error('YouTube could not load'));
    };
    document.head.append(s);
  });
  return apiPromise;
}

type Listener = (s: PlayerState) => void;

export class YouTubePlayer {
  private yt: YTPlayer | null = null;
  private ready: Promise<void> | null = null;
  private listeners = new Set<Listener>();
  private loop = true;
  private rate = 1;
  private volume = 0.9;
  private raf = 0;
  private videoId = '';

  constructor(private host: HTMLElement) {}

  /** Creates the embedded player for a video (shown in `host`). */
  load(videoId: string): void {
    if (this.videoId === videoId) return;
    this.videoId = videoId;
    if (this.yt) {
      this.yt.cueVideoById(videoId);
      this.emit();
      return;
    }
    const mount = document.createElement('div');
    this.host.replaceChildren(mount);
    this.ready = loadApi().then(
      (YT) =>
        new Promise<void>((resolve) => {
          this.yt = new YT.Player(mount, {
            host: 'https://www.youtube-nocookie.com',
            videoId,
            width: '100%',
            height: '100%',
            playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
            events: {
              onReady: () => {
                this.yt!.setVolume(this.volume * 100);
                this.applyRate();
                resolve();
                this.emit();
              },
              onStateChange: (e: { data: number }) => {
                if (e.data === 0 && this.loop) {
                  this.yt!.seekTo(0, true);
                  this.yt!.playVideo();
                }
                if (e.data === 1) this.tick();
                this.emit();
              },
            },
          });
        }),
    );
  }

  async play(): Promise<void> {
    await this.ready;
    this.yt?.playVideo();
  }

  pause(): void {
    this.yt?.pauseVideo();
  }

  toggle(): Promise<void> | void {
    return this.state.playing ? this.pause() : this.play();
  }

  seek(sec: number): void {
    this.yt?.seekTo(Math.max(0, sec), true);
    this.emit();
  }

  /** YouTube offers set speeds (usually steps of 0.25); the nearest one is used. */
  setSpeed(rate: number): void {
    this.rate = rate;
    this.applyRate();
  }

  setLoop(on: boolean): void {
    this.loop = on;
  }

  setVolume(v: number): void {
    this.volume = v;
    this.yt?.setVolume(Math.round(v * 100));
  }

  /** The speed YouTube is actually playing at. */
  get actualSpeed(): number {
    return this.yt?.getPlaybackRate?.() ?? this.rate;
  }

  get state(): PlayerState {
    const yt = this.yt;
    if (!yt?.getPlayerState) return { playing: false, time: 0, duration: 0, loading: !!this.ready && !yt };
    const s = yt.getPlayerState();
    return { playing: s === 1, time: yt.getCurrentTime() || 0, duration: yt.getDuration() || 0, loading: s === 3 };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  /** Stops and removes the video, e.g. when switching to a recorded track. */
  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.yt?.destroy();
    this.yt = null;
    this.ready = null;
    this.videoId = '';
    this.host.replaceChildren();
  }

  private applyRate() {
    if (!this.yt?.getAvailablePlaybackRates) return;
    const rates = this.yt.getAvailablePlaybackRates();
    const nearest = rates.reduce((a, b) => (Math.abs(b - this.rate) < Math.abs(a - this.rate) ? b : a), 1);
    this.yt.setPlaybackRate(nearest);
  }

  private tick() {
    cancelAnimationFrame(this.raf);
    let last = 0;
    const step = (t: number) => {
      if (!this.state.playing) return;
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
