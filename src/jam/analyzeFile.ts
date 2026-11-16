import { toAnalysisRate, type Analysis } from './analysis';

/**
 * Decodes an audio file in the browser and estimates its key and tempo.
 * Only the first four minutes are analyzed, which is plenty for both and
 * keeps memory use reasonable on phones.
 */
export async function analyzeFile(file: Blob): Promise<{ analysis: Analysis; durationSec: number }> {
  const data = await file.arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const audio = await ctx.decodeAudioData(data);
  const channels = Array.from({ length: Math.min(2, audio.numberOfChannels) }, (_, i) => audio.getChannelData(i));
  const samples = toAnalysisRate(channels, audio.sampleRate, 240);
  const worker = new Worker(new URL('./analyze.worker.ts', import.meta.url), { type: 'module' });
  try {
    const analysis = await new Promise<Analysis>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<{ ok: boolean; result?: Analysis; error?: string }>) =>
        e.data.ok ? resolve(e.data.result!) : reject(new Error(e.data.error));
      worker.onerror = (e) => reject(new Error(e.message));
      worker.postMessage({ samples }, [samples.buffer]);
    });
    return { analysis, durationSec: audio.duration };
  } finally {
    worker.terminate();
  }
}
