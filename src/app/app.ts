import { JamView } from '../jam/jamView';
import { LearnView } from '../learn/learnView';
import { KEYS, keyOptionLabel, normalizeKey } from '../theory/keys';
import { href, onRoute, parseRoute } from './router';
import { settings } from './settings';
import { Stage } from './stage';

const LOGO = `<svg class="brand__mark" viewBox="0 0 28 28" aria-hidden="true">
  <rect x="1" y="1" width="26" height="26" rx="7" class="brand__bg"/>
  ${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="6" x2="22" y1="${6.5 + i * 3}" y2="${6.5 + i * 3}" class="brand__line"/>`).join('')}
  <circle cx="17" cy="12.5" r="2.6" class="brand__dot"/>
</svg>`;

export function createApp(root: HTMLElement): void {
  root.innerHTML = `
    <a class="skip" href="#main">Skip to content</a>
    <header class="top">
      <a class="brand" href="${href(['learn'])}">${LOGO}<span>Sixline</span></a>
      <nav class="sections" aria-label="Sections">
        <a class="sections__link" data-section="learn" href="${href(['learn'])}">Learn</a>
        <a class="sections__link" data-section="jam" href="${href(['jam'])}">Jam</a>
        <span class="sections__link sections__link--soon" aria-disabled="true">Songs<small>soon</small></span>
      </nav>
    </header>
    <main id="main" tabindex="-1"></main>
    <footer class="foot">
      <p>Sixline is free and open source. Guitar sound from the FluidR3 soundfont by Frank Wen. Jam backing tracks by Admiral Bob under a Creative Commons license.</p>
    </footer>`;

  const main = root.querySelector<HTMLElement>('main')!;
  const stage = new Stage();
  const learn = new LearnView(stage);
  const jam = new JamView(stage);
  main.append(jam.top, stage.el, learn.el, jam.bottom);

  // Key picker: lives next to Play, so it is always in reach.
  const keyLabel = document.createElement('label');
  keyLabel.className = 'keypick';
  keyLabel.innerHTML = `<span class="keypick__text">Key</span>
    <select class="keypick__select">
      ${KEYS.map((k) => `<option value="${k}">${keyOptionLabel(k)}</option>`).join('')}
    </select>`;
  const select = keyLabel.querySelector('select')!;
  stage.setKeyControl(keyLabel);
  select.addEventListener('change', () => {
    // Same page, new key. The position number is kept; it is clamped if the new key has fewer.
    const route = parseRoute(location.hash);
    const params: Record<string, string> = {};
    route.params.forEach((v, k) => (params[k] = v));
    params.key = select.value;
    location.hash = href([route.section, route.category, route.item].filter((p): p is string => !!p), params);
  });

  onRoute((route) => {
    const inJam = route.section === 'jam';
    root.querySelectorAll<HTMLElement>('.sections__link[data-section]').forEach((a) => {
      if (a.dataset.section === route.section || (!inJam && a.dataset.section === 'learn')) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    jam.top.hidden = !inJam;
    jam.bottom.hidden = !inJam;
    learn.el.hidden = inJam;
    // In Jam the key belongs to the track, so the key picker steps aside.
    keyLabel.hidden = inJam;
    stage.setPlayText(inJam ? 'Hear scale' : 'Play');
    if (inJam) {
      jam.render(route);
      return;
    }
    jam.stop();
    // The link's key wins (so shared links open in the right key), then the last key used.
    const fromLink = normalizeKey(route.params.get('key'));
    const key = fromLink ?? settings.get().key;
    if (fromLink && fromLink !== settings.get().key) settings.set({ key: fromLink });
    select.value = key;
    learn.render(route, key);
  });
}
