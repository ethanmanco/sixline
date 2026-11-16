/**
 * Microphone input for the tuner. Starts only when the player taps Start (the
 * browser then asks for permission), listens about 20 times a second, and
 * releases the microphone completely on stop. Audio never leaves the device.
 */
export class MicInput {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private timer = 0;

  get active(): boolean {
    return this.stream !== null;
  }

  async start(onFrame: (samples: Float32Array, rate: number) => void): Promise<void> {
    if (this.stream) return;
    // Voice-call processing (echo cancelling, noise suppression, auto gain) distorts pitch; turn it off.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.ctx = new AudioContext();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 4096;
    src.connect(this.analyser);
    const buf = new Float32Array(this.analyser.fftSize);
    const rate = this.ctx.sampleRate;
    this.timer = window.setInterval(() => {
      if (!this.analyser) return;
      this.analyser.getFloatTimeDomainData(buf);
      onFrame(buf, rate);
    }, 50);
  }

  stop(): void {
    window.clearInterval(this.timer);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.analyser = null;
    void this.ctx?.close();
    this.ctx = null;
  }
}
