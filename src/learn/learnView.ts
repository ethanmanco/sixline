import type { Stage } from '../app/stage';
import type { Route } from '../app/router';
import { href } from '../app/router';
import type { Shape } from '../core/types';
import { renderTab, tabAscii } from '../tab/tab';
import { CATEGORIES, itemsIn, type CatalogItem, type Category } from './catalog';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * Learn: category tabs, a list of items with tab previews, and a detail panel.
 * It hands the selected shape to the shared Stage (fretboard + audio).
 */
export class LearnView {
  readonly el: HTMLElement;
  private unStep: (() => void) | null = null;
  private renderToken = 0;
  private key = 'A';

  /** Link inside Learn that keeps the current key. */
  private link(parts: string[], params: Record<string, string | number | undefined> = {}): string {
    return href(['learn', ...parts], { key: this.key, ...params });
  }

  constructor(private stage: Stage) {
    this.el = document.createElement('section');
    this.el.className = 'learn';
    this.el.setAttribute('aria-labelledby', 'learn-title');
  }

  async render(route: Route, root: string): Promise<void> {
    const token = ++this.renderToken;
    this.key = root;
    // Remember a focused picker chip so keyboard users keep their place after the re-render.
    const focusedPick = (document.activeElement as HTMLElement | null)?.dataset?.pick;
    const category = CATEGORIES.find((c) => c.id === route.category && c.ready) ?? CATEGORIES.find((c) => c.id === 'scales')!;

    this.el.innerHTML = `
      <h1 id="learn-title" class="visually-hidden">Learn</h1>
      <nav class="cats" aria-label="Learn categories">
        ${CATEGORIES.map((c) =>
          c.ready
            ? `<a class="cats__tab" href="${this.link([c.id])}" ${c.id === category.id ? 'aria-current="page"' : ''}>${c.label}</a>`
            : `<span class="cats__tab cats__tab--soon" aria-disabled="true">${c.label}<small>soon</small></span>`,
        ).join('')}
      </nav>
      <div class="learn__body">
        <div class="items-wrap">
          <h2 class="items__title">${esc(category.label)} in ${esc(root)}</h2>
          <div class="items-groups"><p class="loading">Loading...</p></div>
        </div>
        <article class="detail" aria-labelledby="detail-title"></article>
      </div>`;

    if (category.prepare && !category.isPrepared?.()) {
      try {
        await category.prepare();
      } catch {
        if (token === this.renderToken) {
          this.el.querySelector('.items-groups')!.innerHTML = '<p class="loading">Could not load this section. Check your connection and reload.</p>';
        }
        return;
      }
      if (token !== this.renderToken) return;
    }

    const items = itemsIn(category.id);
    const item = items.find((i) => i.id === route.item) ?? items[0];
    const shapes = item.build(root);
    const posParam = Number(route.params.get('pos') ?? '1');
    const shape = shapes.length ? shapes[Math.min(Math.max(1, posParam), shapes.length) - 1] : null;

    this.stage.setRoot(root);
    this.stage.setShape(shape);
    this.renderPicker(category, items, item, shapes, shape, root, focusedPick);
    this.renderList(category, items, item, root);
    if (shape) this.renderDetail(shape);
    else this.renderEmpty(category, item, root);
  }

  /** Chips above the fretboard for every item and voicing, so switching never needs a scroll. */
  private renderPicker(
    category: Category,
    items: CatalogItem[],
    current: CatalogItem,
    shapes: Shape[],
    shape: Shape | null,
    root: string,
    focusedPick: string | undefined,
  ): void {
    const nav = document.createElement('nav');
    nav.className = 'picker__nav';
    nav.setAttribute('aria-label', `Pick ${category.label.toLowerCase()}`);
    const groups = category.groups ?? [{ id: '', label: category.label, short: category.label }];
    let html = '';
    for (const g of groups) {
      const inGroup = items.filter((i) => (g.id ? i.group === g.id : true));
      if (!inGroup.length) continue;
      html += `<div class="picker__group"><span class="picker__label" aria-hidden="true">${esc(g.short)}</span>`;
      for (const it of inGroup) {
        html += `<a class="pick" data-pick="item:${it.id}" href="${this.link([category.id, it.id])}" aria-label="${esc(it.label(root))}" ${it.id === current.id ? 'aria-current="true"' : ''}>${esc(it.short(root))}</a>`;
      }
      html += '</div>';
    }
    if (shape && shapes.length > 1) {
      const unit = shape.kind === 'chord' ? 'Voicing' : 'Position';
      html += `<div class="picker__group picker__group--pos"><span class="picker__label" aria-hidden="true">${unit}</span>`;
      shapes.forEach((s, i) => {
        const where = s.position?.startFret ? `fret ${s.position.startFret}` : 'open';
        const text = s.position ? String(i + 1) : 'Whole neck';
        const label = s.position ? `${unit} ${i + 1}, ${where}` : 'Whole neck, every note';
        html += `<a class="pick${s.position ? ' pick--num' : ''}" data-pick="pos:${i + 1}" href="${this.link([category.id, current.id], { pos: i + 1 })}" aria-label="${label}" ${s === shape ? 'aria-current="true"' : ''}>${text}</a>`;
      });
      html += '</div>';
    }
    nav.innerHTML = html;
    this.stage.setPicker(nav);
    if (focusedPick) nav.querySelector<HTMLElement>(`[data-pick="${focusedPick}"]`)?.focus();
  }

  private renderList(category: Category, items: CatalogItem[], current: CatalogItem, root: string): void {
    const wrap = this.el.querySelector<HTMLElement>('.items-groups')!;
    wrap.innerHTML = '';
    const groups = category.groups ?? [{ id: '', label: '' }];
    for (const g of groups) {
      const inGroup = items.filter((i) => (g.id ? i.group === g.id : true));
      if (!inGroup.length) continue;
      if (g.label) {
        const h = document.createElement('h3');
        h.className = 'items__group';
        h.textContent = g.label;
        wrap.append(h);
      }
      const list = document.createElement('ul');
      list.className = `items items--${category.id}`;
      list.setAttribute('role', 'list');
      for (const it of inGroup) {
        const preview = it.build(root)[0];
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'item';
        a.href = this.link([category.id, it.id]);
        if (it.id === current.id) a.setAttribute('aria-current', 'true');
        a.innerHTML = `<span class="item__name">${esc(it.label(root))}</span>`;
        if (preview) {
          const tab = renderTab(preview, { size: 'mini' });
          tab.el.setAttribute('aria-hidden', 'true');
          tab.el.removeAttribute('role');
          a.append(tab.el);
        } else {
          a.insertAdjacentHTML('beforeend', '<span class="item__none">No open shape in this key</span>');
        }
        li.append(a);
        list.append(li);
      }
      wrap.append(list);
    }
  }

  private renderEmpty(category: Category, item: CatalogItem, root: string): void {
    const d = this.el.querySelector<HTMLElement>('.detail')!;
    const fb = item.fallback;
    d.innerHTML = `
      <header class="detail__head"><h2 id="detail-title">${esc(item.label(root))}</h2></header>
      <p class="detail__empty">${esc(fb ? fb.text(item.label(root)) : 'There is no shape for this in the current key.')}</p>
      ${fb ? `<p><a class="btn" href="${this.link([category.id, fb.itemId])}">Show the movable version</a></p>` : ''}`;
    this.unStep?.();
    this.unStep = null;
  }

  private renderDetail(shape: Shape): void {
    const d = this.el.querySelector<HTMLElement>('.detail')!;
    const pos = shape.position;
    const sub =
      shape.subtitle ??
      (pos ? `Position ${pos.index} of ${pos.count}, starting at fret ${pos.startFret}` : '');
    const fingerLabel = shape.fingeringSource === 'chords-db' ? 'Fingering' : 'Suggested fingering';
    d.innerHTML = `
      <header class="detail__head">
        <h2 id="detail-title">${esc(shape.name)}${shape.symbol && shape.symbol !== shape.name ? ` <span class="detail__symbol">${esc(shape.symbol)}</span>` : ''}</h2>
        ${sub ? `<p class="detail__sub">${esc(sub)}</p>` : ''}
      </header>
      <dl class="facts">
        <div><dt>Notes</dt><dd class="facts__chips">${shape.info.noteNames.map((n, i) => `<span class="chip${i === 0 ? ' chip--root' : ''}">${esc(n)}</span>`).join('')}</dd></div>
        <div><dt>Intervals</dt><dd class="facts__chips">${shape.info.intervals.map((n, i) => `<span class="chip${i === 0 ? ' chip--root' : ''}">${esc(n)}</span>`).join('')}</dd></div>
        <div><dt>${fingerLabel}</dt><dd>${esc(shape.info.fingeringNote ?? '')}</dd></div>
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
    this.unStep = this.stage.onStep((ids) => tab.highlight(ids?.[0] ?? null));
  }
}
