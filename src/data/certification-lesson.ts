import type { QuizQuestion } from './socket-lesson';
import type { Verdict } from '../chapters/certification-model';

// Chapter 11: certification and fault-finding. Original wording.

export const certification = {
  title: 'Prove it, then record it',
  intro:
    'New wiring is not finished until it has been tested and the results written down. On this workshop board you do the tests yourself: dead tests first with everything switched off, then live tests with the power on.',
  faultsIntro:
    'This board has some hidden faults. Run the tests, log each reading, and say what you think it shows. Readings that do not fit a healthy installation get a gentle nudge. When you are ready, reveal the answers.',
};

export const verdicts: { id: Verdict; label: string }[] = [
  { id: 'ok', label: 'Looks fine' },
  { id: 'polarity', label: 'Polarity reversed (L and N swapped)' },
  { id: 'no-cpc', label: 'CPC not connected' },
  { id: 'dud-socket', label: 'High-resistance joint in the socket' },
  { id: 'broken-ring', label: 'Break in a ring conductor' },
  { id: 'low-ir', label: 'Insulation fault' },
  { id: 'high-zs', label: 'Zs too high' },
  { id: 'slow-rcd', label: 'RCD too slow' },
];

/** The order of tests and what each one proves. */
export const reference: { n: number; title: string; live: boolean; proves: string; how: string; pass: string }[] = [
  {
    n: 1,
    title: 'Continuity of protective conductors',
    live: false,
    proves: 'The CPC is unbroken from the board to every point, so a fault has a path to earth.',
    how: 'Low-resistance ohmmeter on its lowest (about 20 Ω) range. Null the leads first. Link line to CPC at the board and read line to CPC at each point.',
    pass: 'A low, sensible reading everywhere. The highest one is R1 + R2.',
  },
  {
    n: 2,
    title: 'Ring final circuit continuity',
    live: false,
    proves: 'The ring really is a ring, with no breaks, no hidden spurs and no cross-wiring.',
    how: 'Step 1: read each conductor end to end (r1, rn, r2). Step 2: cross line of one leg with neutral of the other and read L–N at each socket. Step 3: do the same with line and CPC and read L–CPC at each socket.',
    pass: 'r1 and rn match closely. Step 2 reads about ¼(r1 + rn) at every socket, step 3 about ¼(r1 + r2). The highest step 3 reading is R1 + R2.',
  },
  {
    n: 3,
    title: 'Insulation resistance',
    live: false,
    proves: 'The insulation between conductors is sound: no leaks, no shorts.',
    how: 'Test at 500 V DC between line–neutral, line–CPC and neutral–CPC. Take lamps out and disconnect or protect electronic equipment first.',
    pass: 'At least 1.0 MΩ. Healthy circuits usually read over-range (such as > 999 MΩ).',
  },
  {
    n: 4,
    title: 'Polarity',
    live: false,
    proves: 'Line goes to the line terminal everywhere, and fuses and single-pole switches are in the line conductor.',
    how: 'Comes out of the R1 + R2 test: with line linked to CPC, a reading between L and CPC at each point shows line is where it should be.',
    pass: 'Every point correct.',
  },
  {
    n: 5,
    title: 'Earth fault loop impedance (Zs)',
    live: true,
    proves: 'If a fault happens, enough current flows to trip the breaker quickly enough.',
    how: 'Power on. Measure at the furthest point of each circuit. Also gives the prospective fault current.',
    pass: 'No more than 80% of the tabulated maximum for the device (the cable is cold during testing and warmer in use).',
  },
  {
    n: 6,
    title: 'RCD operation',
    live: true,
    proves: 'The RCD trips fast enough to protect people.',
    how: 'For a 30 mA RCD: half rating (should not trip), 1× (within 300 ms), 5× (within 40 ms), optionally a ramp test (should trip between 15 and 30 mA). Finally press the test button.',
    pass: 'All within limits, and the test button works.',
  },
];

/** Maximum Zs for type B MCBs at 0.4 s, ohms, and the 80% figure to compare a measurement with. */
export const zsTable: { rating: number; max: number }[] = [
  { rating: 6, max: 7.28 },
  { rating: 10, max: 4.37 },
  { rating: 16, max: 2.73 },
  { rating: 20, max: 2.19 },
  { rating: 25, max: 1.75 },
  { rating: 32, max: 1.37 },
];

/** Simplified schedule of inspections. */
export const inspections: string[] = [
  'Consumer unit suitable, secure and labelled',
  'Main earthing conductor and main protective bonding present',
  'RCD protection for socket-outlets',
  'Cables supported, protected and correctly sized',
  'Accessories secure, undamaged and correctly connected',
  'Warning notices fitted (RCD test, periodic inspection)',
];

export const quiz: QuizQuestion[] = [
  {
    q: 'You have finished wiring a new circuit. Which tests come first?',
    options: ['The live tests: Zs and RCD', 'The dead tests: continuity, insulation and polarity', 'It does not matter'],
    answer: 1,
    why: 'Dead tests come first. They prove the circuit is safe to switch on: you want to find a missing earth or a short before putting 230 V on it.',
  },
  {
    q: 'A ring reads r1 = 0.50 Ω and rn = 0.50 Ω end to end. With line and neutral cross-connected, what should each socket read?',
    options: ['About 0.25 Ω', 'About 0.50 Ω', 'About 1.00 Ω'],
    answer: 0,
    why: 'About a quarter of (r1 + rn): (0.50 + 0.50) ÷ 4 = 0.25 Ω, and roughly the same at every socket. A socket that stands out is a clue.',
  },
  {
    q: 'What is the minimum insulation resistance for a 230 V circuit, tested at 500 V DC?',
    options: ['0.5 MΩ', '1.0 MΩ', '100 MΩ'],
    answer: 1,
    why: '1.0 MΩ for circuits up to 500 V. In practice healthy circuits usually read far higher, often off the top of the scale.',
  },
  {
    q: 'A 32 A type B ring has a tabulated maximum Zs of 1.37 Ω. You measure 1.21 Ω. Is that acceptable?',
    options: ['Yes, it is under 1.37 Ω', 'No, it is over 80% of 1.37 Ω (about 1.10 Ω)'],
    answer: 1,
    why: 'Measured values are compared with 80% of the table, because the cable is cold during the test and its resistance rises when it carries current.',
  },
  {
    q: 'You are inspecting an existing house, not new work. Which document do you issue?',
    options: ['An Electrical Installation Certificate (EIC)', 'An Electrical Installation Condition Report (EICR)', 'A Minor Works certificate'],
    answer: 1,
    why: 'An EICR reports on the condition of an existing installation. An EIC is issued after new work, with its schedule of inspections and schedule of test results.',
  },
];
