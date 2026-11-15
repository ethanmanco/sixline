import type { Shape } from '../core/types';
import { STRING_NAMES, TAB_LETTERS } from '../theory/guitar';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface TabOptions {
  size?: 'mini' | 'full';
  /** Show the e B G D A E letters at the start of each line. */
  letters?: boolean;
}

/** One column of tab: which frets sound together, per string. */
export interface TabColumn {
  /** Fret per string, 'x' for a muted string in a chord, null for nothing. */
  frets: (number | 'x' | null)[];
  /** Index into shape.notes for each string, so playback can highlight it. */
  noteIndex: (number | null)[];
  shift: boolean;
}

/** Chords stack into one column; scales and arpeggios get one column per note. */
export function tabColumns(shape: Shape): TabColumn[] {
  if (shape.playSteps) {
    // Double stops: one column per pair, both notes stacked.
    return shape.playSteps.map((ids) => {
      const col: TabColumn = { frets: Array(6).fill(null), noteIndex: Array(6).fill(null), shift: false };
      for (const i of ids) {
        const n = shape.notes[i];
        col.frets[n.string] = n.fret;
        col.noteIndex[n.string] = i;
      }
      return col;
    });
  }
  if (shape.kind === 'chord') {
    const col: TabColumn = { frets: Array(6).fill(null), noteIndex: Array(6).fill(null), shift: false };
    shape.notes.forEach((n, i) => {
      col.frets[n.string] = n.fret;
      col.noteIndex[n.string] = i;
    });
    for (const s of shape.muted ?? []) col.frets[s] = 'x';
    return [col];
  }
  return shape.notes.map((n, i) => {
    const frets: (number | null)[] = Array(6).fill(null);
    const noteIndex: (number | null)[] = Array(6).fill(null);
    frets[n.string] = n.fret;
    noteIndex[n.string] = i;
    return { frets, noteIndex, shift: !!n.shift };
  });
}

/** Spoken version of the tab, string by string, for screen readers. */
export function tabText(shape: Shape): string {
  const byString = new Map<number, number[]>();
  for (const n of shape.notes) {
    byString.set(n.string, [...(byString.get(n.string) ?? []), n.fret]);
  }
  for (const s of shape.muted ?? []) byString.set(s, []);
  const lines = [...byString.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([s, frets]) => `${STRING_NAMES[s]} string: ${frets.length ? frets.join(', ') : 'muted'}`);
  const lead = shape.kind === 'chord' ? 'Tab, played together' : 'Tab';
  return `${lead}. ${lines.join('. ')}.`;
}

/** Plain-text tab, the way it would be typed. High e on top. */
export function tabAscii(shape: Shape): string {
  const cols = tabColumns(shape);
  const rows: string[] = [];
  for (let s = 5; s >= 0; s--) {
    let line = `${TAB_LETTERS[s]}|-`;
    for (const c of cols) {
      const f = c.frets[s];
      const w = Math.max(...c.frets.map((x) => (x === null ? 1 : String(x).length)));
      line += (f === null ? '-'.repeat(w) : String(f).padEnd(w, '-')) + '-';
    }
    rows.push(`${line}|`);
  }
  return rows.join('\n');
}

/**
 * Draws a small tab staff as SVG. Notes that need a hand shift are marked in
 * the accent color. Returns the element plus a function to light up a note.
 */
export function renderTab(shape: Shape, opts: TabOptions = {}): { el: SVGSVGElement; highlight: (i: number | null) => void } {
  const size = opts.size ?? 'mini';
  const letters = opts.letters ?? size === 'full';
  const gap = size === 'mini' ? 9.5 : 14;
  // A chord is a single column, so give it room to read as a tab snippet.
  const single = shape.kind === 'chord' && !shape.playSteps;
  const colW = single ? (size === 'mini' ? 40 : 56) : size === 'mini' ? 15 : 24;
  const font = size === 'mini' ? 9.5 : 13;
  const left = letters ? (size === 'mini' ? 12 : 22) : 4;
  const cols = tabColumns(shape);
  const width = left + 6 + cols.length * colW + 6;
  const height = gap * 5 + gap * 2;
  const top = gap;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('class', `tab tab--${size}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', tabText(shape));

  const el = (name: string, attrs: Record<string, string | number>, text?: string) => {
    const node = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
    if (text !== undefined) node.textContent = text;
    svg.append(node);
    return node;
  };

  // Highlight bar sits under everything else.
  const bar = el('rect', { class: 'tab__bar', x: 0, y: top - gap * 0.6, width: colW, height: gap * 6.2, rx: 3 });
  bar.setAttribute('visibility', 'hidden');

  // Staff lines: high e on top.
  for (let row = 0; row < 6; row++) {
    const s = 5 - row;
    const y = top + row * gap;
    el('line', { class: 'tab__line', x1: left, x2: width - 2, y1: y, y2: y });
    if (letters) {
      el('text', { class: 'tab__letter', x: left - 5, y, 'font-size': font * 0.85, 'text-anchor': 'end', 'dominant-baseline': 'central' }, TAB_LETTERS[s]);
    }
  }
  el('line', { class: 'tab__bound', x1: left, x2: left, y1: top, y2: top + gap * 5 });

  const xOf = (i: number) => left + 6 + i * colW + colW / 2;
  cols.forEach((c, i) => {
    for (let s = 0; s < 6; s++) {
      const f = c.frets[s];
      if (f === null) continue;
      const y = top + (5 - s) * gap;
      el(
        'text',
        {
          class: `tab__n${c.shift ? ' tab__n--shift' : ''}${f === 'x' ? ' tab__n--x' : ''}`,
          x: xOf(i),
          y,
          'font-size': font,
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
        },
        String(f),
      );
    }
  });

  // Map note index to column for highlighting.
  const colOfNote = new Map<number, number>();
  cols.forEach((c, ci) => c.noteIndex.forEach((ni) => ni !== null && colOfNote.set(ni, ci)));

  const highlight = (i: number | null) => {
    const ci = i === null ? undefined : colOfNote.get(i);
    if (ci === undefined) {
      bar.setAttribute('visibility', 'hidden');
      return;
    }
    bar.setAttribute('x', String(xOf(ci) - colW / 2));
    bar.setAttribute('visibility', 'visible');
  };

  return { el: svg, highlight };
}
