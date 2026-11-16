/// <reference lib="webworker" />
import { analyze } from './analysis';

/** Runs key and tempo detection off the main thread so the page stays responsive. */
self.onmessage = (e: MessageEvent<{ samples: Float32Array }>) => {
  try {
    (self as unknown as Worker).postMessage({ ok: true, result: analyze(e.data.samples) });
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, error: String(err) });
  }
};
