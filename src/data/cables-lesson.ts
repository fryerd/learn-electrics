import type { QuizQuestion } from './socket-lesson';

// Chapter 5: cables and circuit design. Original wording.
// The tables are deliberately simplified for learning: 2-core PVC twin-and-earth, copper, 70 °C,
// 30 °C ambient. Real design uses the full tables and every correction factor in BS 7671.

export const NOMINAL_V = 230;

export const cables = {
  title: 'The cable is king',
  intro:
    'Every circuit is a deal between three numbers. The load needs some current, the breaker decides how much is allowed, and the cable has to carry it without getting too hot. Pick an appliance, then choose a breaker and a cable that keep everyone happy.',
};

export type MethodId = 'A' | 'B' | 'C';

/** Cable sizes in mm² (cross-section of each copper core). */
export const SIZES = [1, 1.5, 2.5, 4, 6, 10, 16] as const;
export type Size = (typeof SIZES)[number];

/** Tabulated current-carrying capacity It (amps), by size and reference method. Approximate, for learning. */
export const CAPACITY: Record<Size, Record<MethodId, number>> = {
  1: { A: 11, B: 13, C: 15 },
  1.5: { A: 14, B: 16.5, C: 19.5 },
  2.5: { A: 18.5, B: 23, C: 27 },
  4: { A: 25, B: 30, C: 36 },
  6: { A: 32, B: 38, C: 46 },
  10: { A: 43, B: 52, C: 63 },
  16: { A: 57, B: 69, C: 85 },
};

/** Volt drop in millivolts per amp per metre (2-core cable). */
export const MV_PER_A_M: Record<Size, number> = {
  1: 44,
  1.5: 29,
  2.5: 18,
  4: 11,
  6: 7.3,
  10: 4.4,
  16: 2.8,
};

/** Common breaker (MCB) ratings in amps. */
export const BREAKERS = [6, 10, 16, 20, 25, 32, 40, 45, 50, 63] as const;

export const METHODS: { id: MethodId; name: string; detail: string }[] = [
  { id: 'A', name: 'In insulation', detail: 'Enclosed in an insulated wall. Heat struggles to escape.' },
  { id: 'B', name: 'In conduit', detail: 'Inside conduit or trunking on a wall. Some air around it.' },
  { id: 'C', name: 'Clipped direct', detail: 'Clipped straight onto a wall. Heat escapes most easily.' },
];

/** Grouping: cables bunched together warm each other up. */
export const GROUPING: { n: 1 | 2 | 3; factor: number; label: string }[] = [
  { n: 1, factor: 1, label: 'On its own' },
  { n: 2, factor: 0.8, label: 'Bunched with 1 other' },
  { n: 3, factor: 0.7, label: 'Bunched with 2 others' },
];

export type ApplianceKind = 'shower' | 'immersion' | 'ring' | 'lighting' | 'ev' | 'cooker';

export interface Appliance {
  id: string;
  kind: ApplianceKind;
  label: string;
  short: string;
  /** Design power in watts: Ib = P ÷ 230. */
  watts: number;
  /** Lighting circuits get the tighter 3% volt drop limit. */
  lighting?: boolean;
  /** A ring final circuit: special cable rule and a quarter-length volt drop. */
  ring?: boolean;
  note?: string;
}

export const APPLIANCES: Appliance[] = [
  { id: 'sh72', kind: 'shower', label: '7.2 kW shower', short: 'Shower', watts: 7200 },
  { id: 'sh85', kind: 'shower', label: '8.5 kW shower', short: 'Shower', watts: 8500 },
  { id: 'sh105', kind: 'shower', label: '10.5 kW shower', short: 'Shower', watts: 10500 },
  {
    id: 'imm',
    kind: 'immersion',
    label: '3 kW immersion',
    short: 'Immersion heater',
    watts: 3000,
    note: 'An immersion heater can run flat out for hours, so it gets its own circuit.',
  },
  {
    id: 'ring',
    kind: 'ring',
    label: 'Ring of sockets',
    short: 'Ring of sockets',
    watts: 7360,
    ring: true,
    note: 'We assume the worst case: a full 32 A drawn at the far side of the ring. Because a ring is a loop, the current shares two paths, so the cable rule and the volt drop are different (see the checks).',
  },
  {
    id: 'light',
    kind: 'lighting',
    label: 'Lighting (1 kW)',
    short: 'Lighting circuit',
    watts: 1000,
    lighting: true,
    note: 'Lighting gets a tighter volt drop limit (3%) because lamps are more sensitive to low voltage.',
  },
  {
    id: 'ev',
    kind: 'ev',
    label: '7.4 kW EV charger',
    short: 'EV charger',
    watts: 7360,
    note: 'A charger can draw its full 32 A for hours on end, so there is no allowance for it switching off.',
  },
  {
    id: 'cook',
    kind: 'cooker',
    label: 'Cooker (7 kW)',
    short: 'Cooker',
    watts: 7000,
    note: 'Designers often allow for "diversity" on cookers, because the oven and every ring are rarely on full at once. Here we use the full figure to keep it simple.',
  },
];

export const appliance = (id: string) => APPLIANCES.find((a) => a.id === id) ?? APPLIANCES[0];

export const CHALLENGES = [
  { id: 'shower', text: 'Fit the 8.5 kW shower: get all three checks green.' },
  { id: 'cook', text: 'See why it matters: fit a breaker bigger than the cable can carry, then watch the cable.' },
  { id: 'stretch', text: 'Stretch a lighting run until the volt drop check fails.' },
] as const;
export type ChallengeId = (typeof CHALLENGES)[number]['id'];

export const quiz: QuizQuestion[] = [
  {
    q: 'In the rule Ib ≤ In ≤ Iz, what does Iz stand for?',
    options: [
      'The current the appliance draws',
      'The breaker’s rating',
      'The current the cable can safely carry where it is installed',
    ],
    answer: 2,
    why: 'Iz is the cable’s capacity in its real conditions. Ib is the load and In is the breaker. The breaker sits in the middle: bigger than the load, no bigger than the cable can take.',
  },
  {
    q: 'A 7 kW shower runs on 230 V. Roughly what is its design current Ib?',
    options: ['About 15 A', 'About 30 A', 'About 70 A'],
    answer: 1,
    why: 'Ib = P ÷ V = 7000 ÷ 230, which is about 30.4 A.',
  },
  {
    q: 'Why must the breaker rating In be no bigger than the cable’s capacity Iz?',
    options: [
      'So the breaker trips before the cable overheats',
      'So the appliance gets more voltage',
      'So the breaker never trips',
    ],
    answer: 0,
    why: 'Too much current heats the cable. If the breaker allowed more than the cable can carry, the cable could cook with the breaker still on.',
  },
  {
    q: 'You move the same cable from clipped to a wall into an insulated wall. What happens to the current it can carry?',
    options: ['It goes up', 'It stays the same', 'It goes down'],
    answer: 2,
    why: 'Insulation keeps the heat in, so the cable reaches its temperature limit at a lower current. Grouping cables together has the same effect.',
  },
  {
    q: 'You double the length of a cable run, with the same cable and load. What happens to the volt drop?',
    options: ['It halves', 'It doubles', 'It does not change'],
    answer: 1,
    why: 'Volt drop = mV/A/m × Ib × length ÷ 1000, so it grows in step with length. Twice the run, twice the drop.',
  },
];
