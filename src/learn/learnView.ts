import type { Stage } from '../app/stage';
import type { Route } from '../app/router';
import { href } from '../app/router';
import type { Shape } from '../core/types';
import { renderTab, tabAscii } from '../tab/tab';
import { CATEGORIES, itemsIn, type CategoryId } from './catalog';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * Learn: category tabs, a list of items with tab previews, and a detail panel.
 * It hands the selected shape to the shared Stage (fretboard + audio).
 */
export class LearnView {
  readonly el: HTMLElement;
  private unStep: (() => void) | null = null;

  constructor(private stage: Stage) {
    this.el = document.createElement('section');
    this.el.className = 'learn';
    this.el.setAttribute('aria-labelledby', 'learn-title');
  }

  render(route: Route, root: string): void {
    const category = (CATEGORIES.find((c) => c.id === route.category && c.ready)?.id ?? 'scales') as CategoryId;
    const items = itemsIn(category);
    const item = items.find((i) => i.id === route.item) ?? items[0];
    const shapes = item.build(root);
    const posParam = Number(route.params.get('pos') ?? '1');
    const shape = shapes[Math.min(Math.max(1, posParam), shapes.length) - 1];

    this.stage.setRoot(root);
    this.stage.setShape(shape);

    this.el.innerHTML = `
      <h1 id="learn-title" class="visually-hidden">Learn</h1>
      <nav class="cats" aria-label="Learn categories">
        ${CATEGORIES.map((c) =>
          c.ready
            ? `<a class="cats__tab" href="${href(['learn', c.id])}" ${c.id === category ? 'aria-current="page"' : ''}>${c.label}</a>`
            : `<span class="cats__tab cats__tab--soon" aria-disabled="true">${c.label}<small>soon</small></span>`,
        ).join('')}
      </nav>
      <div class="learn__body">
        <div class="items-wrap">
          <h2 class="items__title">${esc(CATEGORIES.find((c) => c.id === category)!.label)} in ${esc(root)}</h2>
          <ul class="items" role="list"></ul>
        </div>
        <article class="detail" aria-labelledby="detail-title"></article>
      </div>`;

    const list = this.el.querySelector<HTMLUListElement>('.items')!;
    for (const it of items) {
      const preview = it.build(root)[0];
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'item';
      a.href = href(['learn', category, it.id]);
      if (it.id === item.id) a.setAttribute('aria-current', 'true');
      a.innerHTML = `<span class="item__name">${esc(root)} ${esc(it.label.toLowerCase())}</span>`;
      const tab = renderTab(preview, { size: 'mini' });
      tab.el.setAttribute('aria-hidden', 'true');
      tab.el.removeAttribute('role');
      a.append(tab.el);
      li.append(a);
      list.append(li);
    }

    this.renderDetail(shape, shapes, category, item.id);
  }

  private renderDetail(shape: Shape, all: Shape[], category: CategoryId, itemId: string): void {
    const d = this.el.querySelector<HTMLElement>('.detail')!;
    const pos = shape.position;
    d.innerHTML = `
      <header class="detail__head">
        <h2 id="detail-title">${esc(shape.name)}</h2>
        ${pos ? `<p class="detail__sub">Position ${pos.index} of ${pos.count}, starting at fret ${pos.startFret}</p>` : ''}
      </header>
      ${
        all.length > 1
          ? `<nav class="positions" aria-label="Positions">
              ${all
                .map(
                  (s, i) =>
                    `<a class="positions__btn" href="${href(['learn', category, itemId], { pos: i + 1 })}" ${s === shape ? 'aria-current="true"' : ''} aria-label="Position ${i + 1}, fret ${s.position?.startFret}">${i + 1}</a>`,
                )
                .join('')}
            </nav>`
          : ''
      }
      <dl class="facts">
        <div><dt>Notes</dt><dd class="facts__chips">${shape.info.noteNames.map((n, i) => `<span class="chip${i === 0 ? ' chip--root' : ''}">${esc(n)}</span>`).join('')}</dd></div>
        <div><dt>Intervals</dt><dd class="facts__chips">${shape.info.intervals.map((n, i) => `<span class="chip${i === 0 ? ' chip--root' : ''}">${esc(n)}</span>`).join('')}</dd></div>
        <div><dt>${shape.fingeringSource === 'suggested' ? 'Suggested fingering' : 'Fingering'}</dt><dd>${esc(shape.info.fingeringNote ?? '')}</dd></div>
      </dl>
      <div class="detail__tab" data-tab></div>
      <details class="ascii">
        <summary>Text tab</summary>
        <pre>${esc(tabAscii(shape))}</pre>
      </details>
      <div class="prose">
        <h3>How it sounds</h3>
        <p>${esc(shape.info.sound)}</p>
        <h3>When to use it</h3>
        <p>${esc(shape.info.useWhen)}</p>
      </div>`;

    const tab = renderTab(shape, { size: 'full' });
    d.querySelector('[data-tab]')!.append(tab.el);
    this.unStep?.();
    this.unStep = this.stage.onStep((i) => tab.highlight(i));
  }
}
