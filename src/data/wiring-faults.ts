import type { WireId } from '../scene/socket';

// What happens when a core is connected to a terminal. Used for instant feedback in "Wire it".
// Everything here is original wording. Keys are `${core}>${terminal}`.

export type Level = 'ok' | 'warn' | 'danger';

export interface Fault {
  level: Level;
  /** Short name of the situation. */
  title: string;
  /** One or two plain sentences. */
  text: string;
}

const FAULTS: Record<string, Fault> = {
  'line>line': {
    level: 'ok',
    title: 'Correct',
    text: 'The line conductor goes to L. It carries current from the supply to the appliance.',
  },
  'neutral>neutral': {
    level: 'ok',
    title: 'Correct',
    text: 'The neutral goes to N. It completes the circuit back to the supply.',
  },
  'earth>earth': {
    level: 'ok',
    title: 'Correct',
    text: 'The earth goes to E. It is the safety path that lets a fault trip the breaker.',
  },
  'line>neutral': {
    level: 'warn',
    title: 'Polarity error',
    text: 'Line is on the neutral terminal. The appliance may still work, but its fuse and switch now sit in the neutral, so parts stay live when it is switched off.',
  },
  'neutral>line': {
    level: 'warn',
    title: 'Polarity error',
    text: 'Neutral is on the line terminal. The appliance may still work, but its fuse and switch now sit in the neutral, so parts stay live when it is switched off.',
  },
  'line>earth': {
    level: 'danger',
    title: 'Line on earth (live earth)',
    text: 'Line is on the earth terminal. The earth pin, and any metal case plugged in, would be live. Dangerous.',
  },
  'neutral>earth': {
    level: 'danger',
    title: 'Neutral and earth swapped',
    text: 'Neutral is on the earth terminal. The earth now carries load current, so there is no safe fault path, and an RCD can trip. Dangerous.',
  },
  'earth>line': {
    level: 'danger',
    title: 'Earth on line (earth energised)',
    text: 'The earth is on the line terminal, so the whole earthing system, back box included, is live. It acts like a line to earth short and should trip the breaker.',
  },
  'earth>neutral': {
    level: 'danger',
    title: 'Earth and neutral swapped',
    text: 'The earth is being used as the neutral, so load current runs in the protective conductor and the real neutral is left unprotected. Dangerous.',
  },
};

export function faultFor(core: WireId, terminal: WireId): Fault {
  return FAULTS[`${core}>${terminal}`];
}

/** A pair-level name when two cores have simply traded places. */
export function swapNote(assignments: Record<WireId, WireId | null>): string | null {
  if (assignments.line === 'neutral' && assignments.neutral === 'line') return 'Line and neutral swapped: reversed polarity.';
  if (assignments.neutral === 'earth' && assignments.earth === 'neutral') return 'Neutral and earth swapped.';
  if (assignments.line === 'earth' && assignments.earth === 'line') return 'Line and earth swapped.';
  return null;
}
