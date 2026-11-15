/**
 * Hash routes, so links work on GitHub Pages without server rewrites.
 * Shape: #/<section>/<category>/<item>?key=A&pos=1
 */
export interface Route {
  section: string;
  category?: string;
  item?: string;
  params: URLSearchParams;
}

export function parseRoute(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '');
  const [path, query = ''] = clean.split('?');
  const [section = 'learn', category, item] = path.split('/').filter(Boolean);
  return { section, category, item, params: new URLSearchParams(query) };
}

export function href(parts: string[], params?: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined) q.set(k, String(v));
  const qs = q.toString();
  return `#/${parts.join('/')}${qs ? `?${qs}` : ''}`;
}

export function onRoute(fn: (r: Route) => void): void {
  const run = () => fn(parseRoute(location.hash));
  window.addEventListener('hashchange', run);
  run();
}
