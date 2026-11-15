import { LearnView } from '../learn/learnView';
import { href, onRoute } from './router';
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
        <a class="sections__link" href="${href(['learn'])}" aria-current="page">Learn</a>
        <span class="sections__link sections__link--soon" aria-disabled="true">Jam<small>soon</small></span>
        <span class="sections__link sections__link--soon" aria-disabled="true">Songs<small>soon</small></span>
      </nav>
    </header>
    <main id="main" tabindex="-1"></main>
    <footer class="foot">
      <p>Sixline is free and open source. Guitar sound from the FluidR3 soundfont by Frank Wen.</p>
    </footer>`;

  const main = root.querySelector<HTMLElement>('main')!;
  const stage = new Stage();
  const learn = new LearnView(stage);
  main.append(stage.el, learn.el);

  onRoute((route) => {
    // Phase 1 ships only Learn. The key picker arrives in a later step.
    const key = 'A';
    learn.render(route, key);
  });
}
