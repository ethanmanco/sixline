import type { Shape } from '../core/types';
import { GLYPH, accidentalGlyph, ledgerSteps, written } from '../notation/notation';
import { STRING_NAMES, TAB_LETTERS } from '../theory/guitar';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface TabOptions {
  size?: 'mini' | 'full';
  /** Show the e B G D A E letters at the start of each line. */
  letters?: boolean;
  /** Draw standard notation above the tab, each note lined up with its tab column. */
  notation?: boolean;
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
  const notation = !!opts.notation;
  // A chord is a single column, so give it room to read as a tab snippet.
  const single = shape.kind === 'chord' && !shape.playSteps;
  const colW = single ? (size === 'mini' ? 40 : notation ? 84 : 56) : size === 'mini' ? 15 : notation ? 34 : 24;
  const font = size === 'mini' ? 9.5 : 13;
  const left = notation ? 46 : letters ? (size === 'mini' ? 12 : 22) : 4;
  const cols = tabColumns(shape);
  const width = left + 6 + cols.length * colW + 6;

  // Notation layout: one staff space is 8px; room for the highest and lowest ledger lines.
  const space = 10;
  const writtenNotes = notation ? shape.notes.map((n) => written(n.note, n.midi)) : [];
  const steps = writtenNotes.map((w) => w.step);
  const maxStep = Math.max(10, ...steps) + 2;
  const minStep = Math.min(-3, ...steps) - 2;
  const staffBottom = notation ? 6 + (maxStep * space) / 2 : 0;
  const yOfStep = (step: number) => staffBottom - (step * space) / 2;
  const notationHeight = notation ? yOfStep(minStep) + 4 : 0;

  const top = notationHeight + gap;
  const height = top + gap * 5 + gap;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('class', `tab tab--${size}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute(
    'aria-label',
    notation
      ? `Notation, treble clef, sounding an octave lower than written: ${writtenNotes.map((w) => w.sounding).join(', ')}. ${tabText(shape)}`
      : tabText(shape),
  );

  const el = (name: string, attrs: Record<string, string | number>, text?: string) => {
    const node = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
    if (text !== undefined) node.textContent = text;
    svg.append(node);
    return node;
  };

  // Highlight bar sits under everything else.
  const barTop = notation ? 2 : top - gap * 0.6;
  const bar = el('rect', { class: 'tab__bar', x: 0, y: barTop, width: colW, height: top + gap * 5.6 - barTop, rx: 3 });
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

  if (notation) {
    // Five staff lines, the treble clef with an 8 under it, and "TAB" beside the tab staff.
    for (let line = 0; line <= 8; line += 2) {
      el('line', { class: 'nota__line', x1: 4, x2: width - 2, y1: yOfStep(line), y2: yOfStep(line) });
    }
    el('line', { class: 'nota__line', x1: 4, x2: 4, y1: yOfStep(8), y2: yOfStep(0) });
    el('text', { class: 'nota__clef', x: 7, y: yOfStep(2), 'font-size': space * 4.6 }, GLYPH.trebleClef);
    el('text', { class: 'nota__eight', x: 19, y: yOfStep(-4.6), 'font-size': 10, 'text-anchor': 'middle' }, '8');
    el('text', { class: 'tab__word', x: 6, y: top + gap * 2.5, 'font-size': 10, 'dominant-baseline': 'central' }, 'TAB');

    // Notes, column by column, so each one sits right above its tab number.
    const notesByCol = new Map<number, number[]>();
    cols.forEach((c, ci) => c.noteIndex.forEach((ni) => ni !== null && notesByCol.set(ci, [...(notesByCol.get(ci) ?? []), ni])));
    for (const [ci, ids] of notesByCol) {
      const x = xOf(ci);
      const sorted = [...ids].sort((a, b) => writtenNotes[a].step - writtenNotes[b].step);
      // Seconds in a chord: the upper head moves to the right so they do not overlap.
      let prevStep = -99;
      let prevShifted = false;
      const accidentalCols: { step: number; col: number }[] = [];
      for (const ni of sorted) {
        const w = writtenNotes[ni];
        const shifted: boolean = w.step - prevStep === 1 && !prevShifted;
        prevShifted = shifted;
        prevStep = w.step;
        const hx = x + (shifted ? space * 1.25 : 0);
        const y = yOfStep(w.step);
        for (const ls of ledgerSteps(w.step)) {
          el('line', { class: 'nota__ledger', x1: hx - space * 1.05, x2: hx + space * 1.05, y1: yOfStep(ls), y2: yOfStep(ls) });
        }
        el('ellipse', {
          class: `nota__head${shape.notes[ni].isRoot ? ' nota__head--root' : ''}`,
          cx: hx,
          cy: y,
          rx: space * 0.66,
          ry: space * 0.46,
          transform: `rotate(-20 ${hx} ${y})`,
        });
        if (w.accidental) {
          // Stack accidentals in columns to the left when they would collide.
          let col = 0;
          while (accidentalCols.some((a) => a.col === col && Math.abs(a.step - w.step) < 6)) col++;
          accidentalCols.push({ step: w.step, col });
          el(
            'text',
            {
              class: 'nota__acc',
              x: x - space * 1.35 - col * space * 1.1,
              y: y + space * 0.55,
              'font-size': space * 2.5,
              'text-anchor': 'middle',
            },
            accidentalGlyph(w.accidental),
          );
        }
      }
    }
  }

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
