import { describe, expect, it } from 'vitest';
import { ledgerSteps, written } from '../src/notation/notation';

describe('guitar notation (treble clef, written an octave up)', () => {
  it.each([
    // [name, sounding MIDI, staff step, sounding label]
    ['E', 40, -7, 'E2'], // low E string: three ledger lines below
    ['A', 45, -4, 'A2'],
    ['D', 50, -1, 'D3'],
    ['G', 55, 2, 'G3'], // G string: second line
    ['B', 59, 4, 'B3'], // B string: middle line
    ['E', 64, 7, 'E4'], // high E string: top space
    ['G', 79, 16, 'G5'], // fret 15 on high E: four ledger lines above
    ['C', 60, 5, 'C4'],
  ])('%s at MIDI %i sits on step %i', (name, midi, step, label) => {
    const w = written(name as string, midi as number);
    expect(w.step).toBe(step);
    expect(w.sounding).toBe(label);
    expect(w.accidental).toBe('');
  });

  it('keeps the spelled letter: Bb and A# share a pitch but not a staff step', () => {
    expect(written('Bb', 58).step).toBe(written('B', 59).step);
    expect(written('A#', 58).step).toBe(written('A', 57).step);
    expect(written('Bb', 58).accidental).toBe('b');
    expect(written('A#', 58).accidental).toBe('#');
  });

  it('puts Cb above B and B# below C', () => {
    expect(written('Cb', 59).step).toBe(written('C', 60).step);
    expect(written('B#', 60).step).toBe(written('B', 59).step);
  });

  it('draws ledger lines only outside the staff', () => {
    expect(ledgerSteps(4)).toEqual([]);
    expect(ledgerSteps(-2)).toEqual([-2]);
    expect(ledgerSteps(-7)).toEqual([-2, -4, -6]);
    expect(ledgerSteps(10)).toEqual([10]);
    expect(ledgerSteps(16)).toEqual([10, 12, 14, 16]);
  });
});
