import type { FretNote, FretPos, LabelMode, Shape, StringIndex } from '../core/types';
import { MAX_FRET, STRINGS, STRING_NAMES, midiAt } from '../theory/guitar';

export interface FretboardOptions {
  /** Called when a position is tapped, clicked, or activated from the keyboard. */
  onActivate?: (pos: FretPos, midi: number, note: FretNote | null) => void;
  /** Names a pitch that is not part of the current shape. */
  spell?: (midi: number) => string;
}

type Orientation = 'horizontal' | 'vertical';

const INLAYS = [3, 5, 7, 9, 12, 15];
const key = (s: number, f: number) => `${s}:${f}`;

/**
 * Interactive six-string neck, frets 0 to 15.
 *
 * Built as an ARIA grid of focusable cells (rows are strings, columns are
 * frets) laid out with CSS grid, so the same DOM can be drawn horizontally or
 * vertically, right- or left-handed. Arrow keys follow what you see on screen.
 */
export class Fretboard {
  readonly el: HTMLElement;
  private grid: HTMLElement;
  private cells = new Map<string, HTMLElement>();
  private decor: HTMLElement[] = [];
  private shape: Shape | null = null;
  private noteAt = new Map<string, number>();
  private labelMode: LabelMode = 'finger';
  private lefty = false;
  private orientation: Orientation = 'horizontal';
  private focusPos: FretPos = { string: 0, fret: 0 };
  /** Visual (row, col) of every cell, for arrow-key moves. */
  private visual = new Map<string, FretPos>();
  private sounding: HTMLElement | null = null;
  private opts: FretboardOptions;

  constructor(opts: FretboardOptions = {}) {
    this.opts = opts;
    this.el = document.createElement('div');
    this.el.className = 'fb';
    this.grid = document.createElement('div');
    this.grid.className = 'fb__grid';
    this.grid.setAttribute('role', 'grid');
    this.grid.setAttribute('aria-label', `Fretboard, standard tuning, frets 0 to ${MAX_FRET}`);
    this.grid.setAttribute('aria-rowcount', '6');
    this.grid.setAttribute('aria-colcount', String(MAX_FRET + 1));
    this.el.append(this.grid);
    this.build();
    this.layout();
    this.grid.addEventListener('keydown', (e) => this.onKey(e));
    this.grid.addEventListener('click', (e) => {
      const cell = (e.target as HTMLElement).closest<HTMLElement>('.fb__cell');
      if (cell) this.activate(this.posOf(cell), cell);
    });
    this.grid.addEventListener('focusin', (e) => {
      const cell = (e.target as HTMLElement).closest<HTMLElement>('.fb__cell');
      if (cell) this.setFocus(this.posOf(cell), false);
    });
  }

  setShape(shape: Shape | null): void {
    this.shape = shape;
    this.noteAt.clear();
    shape?.notes.forEach((n, i) => this.noteAt.set(key(n.string, n.fret), i));
    this.el.dataset.kind = shape?.kind ?? '';
    this.highlight(null);
    if (shape && shape.notes.length > 0) {
      this.setFocus({ string: shape.notes[0].string, fret: shape.notes[0].fret }, false);
    }
    this.paint();
  }

  setLabelMode(mode: LabelMode): void {
    this.labelMode = mode;
    this.paint();
  }

  setLefty(lefty: boolean): void {
    this.lefty = lefty;
    this.layout();
  }

  setOrientation(o: Orientation): void {
    this.orientation = o;
    this.layout();
  }

  /** Lights the dot for one note of the shape (by index), or clears it. */
  highlight(index: number | null): void {
    this.sounding?.classList.remove('is-sounding');
    this.sounding = null;
    if (index === null || !this.shape) return;
    const n = this.shape.notes[index];
    const cell = n && this.cells.get(key(n.string, n.fret));
    if (cell) {
      cell.classList.add('is-sounding');
      this.sounding = cell;
    }
  }

  /** Lights several dots at once, e.g. a strummed chord. */
  highlightAll(on: boolean): void {
    this.highlight(null);
    this.el.classList.toggle('is-strumming', on);
  }

  // ---------------------------------------------------------------------------

  private build(): void {
    const neck = document.createElement('div');
    neck.className = 'fb__neck';
    neck.setAttribute('aria-hidden', 'true');
    this.decor.push(neck);
    this.grid.append(neck);

    for (const f of INLAYS) {
      const inlay = document.createElement('div');
      inlay.className = `fb__inlay${f === 12 ? ' fb__inlay--double' : ''}`;
      inlay.dataset.f = String(f);
      inlay.setAttribute('aria-hidden', 'true');
      inlay.innerHTML = f === 12 ? '<i></i><i></i>' : '<i></i>';
      this.decor.push(inlay);
      this.grid.append(inlay);
    }

    for (let f = 0; f <= MAX_FRET; f++) {
      const num = document.createElement('div');
      num.className = 'fb__num';
      num.dataset.f = String(f);
      num.textContent = String(f);
      num.setAttribute('aria-hidden', 'true');
      this.decor.push(num);
      this.grid.append(num);
    }

    // DOM order: high E first, the way tab is written.
    for (const s of [...STRINGS].reverse()) {
      const row = document.createElement('div');
      row.className = 'fb__row';
      row.setAttribute('role', 'row');
      row.setAttribute('aria-rowindex', String(6 - s));
      for (let f = 0; f <= MAX_FRET; f++) {
        const cell = document.createElement('div');
        cell.className = 'fb__cell';
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-colindex', String(f + 1));
        cell.tabIndex = -1;
        cell.dataset.s = String(s);
        cell.dataset.f = String(f);
        cell.innerHTML = '<span class="fb__string"></span><span class="fb__dot" aria-hidden="true"><span class="fb__label"></span></span>';
        this.cells.set(key(s, f), cell);
        row.append(cell);
      }
      this.grid.append(row);
    }
    this.setFocus(this.focusPos, false);
    this.paint();
  }

  /** Places every cell for the current orientation and handedness. */
  private layout(): void {
    const vertical = this.orientation === 'vertical';
    this.el.classList.toggle('fb--vertical', vertical);
    this.el.classList.toggle('fb--horizontal', !vertical);
    this.el.classList.toggle('fb--lefty', this.lefty);

    // Frets get narrower up the neck, like a real guitar.
    const tracks: string[] = ['var(--fb-open)'];
    for (let f = 1; f <= MAX_FRET; f++) tracks.push(`${Math.pow(0.955, f - 1).toFixed(3)}fr`);
    if (this.lefty && !vertical) tracks.reverse();

    // Grid line of each fret along the neck axis, and of each string across it.
    const fretLine = (f: number) => (this.lefty && !vertical ? MAX_FRET - f : f) + 1;
    // Horizontal: high E on top (like tab). Vertical: low E on the left (like a chord chart).
    const stringLine = (s: number) => {
      if (!vertical) return 6 - s;
      return (this.lefty ? 5 - s : s) + 2;
    };

    if (vertical) {
      this.grid.style.gridTemplateColumns = 'var(--fb-num) repeat(6, minmax(var(--fb-string-min), 1fr))';
      this.grid.style.gridTemplateRows = tracks.map((t) => (t.endsWith('fr') ? `calc(var(--fb-fret) * ${parseFloat(t)})` : t)).join(' ');
    } else {
      this.grid.style.gridTemplateColumns = tracks.join(' ');
      this.grid.style.gridTemplateRows = 'repeat(6, var(--fb-row)) var(--fb-num)';
    }

    this.visual.clear();
    for (const cell of this.cells.values()) {
      const { string: s, fret: f } = this.posOf(cell);
      const a = fretLine(f);
      const b = stringLine(s);
      const [row, col] = vertical ? [a, b] : [b, a];
      cell.style.gridRow = String(row);
      cell.style.gridColumn = String(col);
      this.visual.set(`${row},${col}`, { string: s, fret: f });
    }

    for (const d of this.decor) {
      if (d.classList.contains('fb__neck')) {
        const [from, to] = this.lefty && !vertical ? [1, MAX_FRET + 1] : [2, MAX_FRET + 2];
        if (vertical) {
          d.style.gridRow = `${from} / ${to}`;
          d.style.gridColumn = '2 / 8';
        } else {
          d.style.gridColumn = `${from} / ${to}`;
          d.style.gridRow = '1 / 7';
        }
        continue;
      }
      const f = Number(d.dataset.f);
      const line = fretLine(f);
      if (d.classList.contains('fb__num')) {
        d.style.gridRow = vertical ? String(line) : '7';
        d.style.gridColumn = vertical ? '1' : String(line);
      } else {
        d.style.gridRow = vertical ? String(line) : '1 / 7';
        d.style.gridColumn = vertical ? '2 / 8' : String(line);
      }
    }
  }

  /** Updates dots, labels, and accessible names. */
  private paint(): void {
    for (const cell of this.cells.values()) {
      const pos = this.posOf(cell);
      const idx = this.noteAt.get(key(pos.string, pos.fret));
      const note = idx !== undefined && this.shape ? this.shape.notes[idx] : null;
      const midi = midiAt(pos);
      const name = note?.note ?? this.opts.spell?.(midi) ?? '';

      cell.classList.toggle('has-note', !!note);
      cell.classList.toggle('is-root', !!note?.isRoot);
      cell.classList.toggle('is-shift', !!note?.shift);
      const label = cell.querySelector<HTMLElement>('.fb__label')!;
      label.textContent = note ? this.labelFor(note) : '';
      cell.querySelector<HTMLElement>('.fb__dot')!.dataset.label = label.textContent;

      cell.setAttribute('aria-label', this.ariaFor(pos, name, note));
    }
  }

  private labelFor(n: FretNote): string {
    switch (this.labelMode) {
      case 'finger':
        return n.finger === null ? '' : n.finger === 0 ? 'O' : String(n.finger);
      case 'note':
        return n.note;
      case 'degree':
        return n.degree;
      case 'none':
        return '';
    }
  }

  private ariaFor(pos: FretPos, name: string, n: FretNote | null): string {
    const parts = [`${STRING_NAMES[pos.string]} string`, pos.fret === 0 ? 'open' : `fret ${pos.fret}`, name];
    if (n) {
      if (n.finger === 'T') parts.push('thumb');
      else if (n.finger === 0) parts.push('no finger');
      else if (n.finger !== null) parts.push(`finger ${n.finger}`);
      parts.push(n.isRoot ? 'root' : `degree ${n.degree}`);
      if (n.shift) parts.push(n.shift === 'up' ? 'shift up one fret' : 'shift back one fret');
    }
    return parts.filter(Boolean).join(', ');
  }

  private posOf(cell: HTMLElement): FretPos {
    return { string: Number(cell.dataset.s) as StringIndex, fret: Number(cell.dataset.f) };
  }

  private setFocus(pos: FretPos, move: boolean): void {
    this.cells.get(key(this.focusPos.string, this.focusPos.fret))?.setAttribute('tabindex', '-1');
    this.focusPos = pos;
    const cell = this.cells.get(key(pos.string, pos.fret));
    if (!cell) return;
    cell.setAttribute('tabindex', '0');
    if (move) cell.focus();
  }

  private activate(pos: FretPos, cell: HTMLElement): void {
    const idx = this.noteAt.get(key(pos.string, pos.fret));
    const note = idx !== undefined && this.shape ? this.shape.notes[idx] : null;
    if (!note) {
      // Show which note you just played, briefly.
      const dot = cell.querySelector<HTMLElement>('.fb__dot')!;
      const label = cell.querySelector<HTMLElement>('.fb__label')!;
      label.textContent = this.opts.spell?.(midiAt(pos)) ?? '';
      cell.classList.remove('is-tapped');
      void dot.offsetWidth;
      cell.classList.add('is-tapped');
      window.setTimeout(() => {
        cell.classList.remove('is-tapped');
        if (!cell.classList.contains('has-note')) label.textContent = '';
      }, 700);
    } else {
      cell.classList.add('is-sounding');
      window.setTimeout(() => {
        if (this.sounding !== cell) cell.classList.remove('is-sounding');
      }, 450);
    }
    this.opts.onActivate?.(pos, midiAt(pos), note);
  }

  private onKey(e: KeyboardEvent): void {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.fb__cell');
    if (!cell) return;
    const pos = this.posOf(cell);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.activate(pos, cell);
      return;
    }
    const row = Number(cell.style.gridRow);
    const col = Number(cell.style.gridColumn);
    let target: FretPos | undefined;
    switch (e.key) {
      case 'ArrowUp':
        target = this.visual.get(`${row - 1},${col}`);
        break;
      case 'ArrowDown':
        target = this.visual.get(`${row + 1},${col}`);
        break;
      case 'ArrowLeft':
        target = this.visual.get(`${row},${col - 1}`);
        break;
      case 'ArrowRight':
        target = this.visual.get(`${row},${col + 1}`);
        break;
      case 'Home':
        target = { string: pos.string, fret: 0 };
        break;
      case 'End':
        target = { string: pos.string, fret: MAX_FRET };
        break;
      default:
        return;
    }
    e.preventDefault();
    if (target) this.setFocus(target, true);
  }
}
