import type { QuizQuestion } from './socket-lesson';

// Chapter 3: supply and earthing. Original wording. Figures are "typical" values for teaching, not
// design limits: always use the declared or measured values for a real installation.

export type ArrangementId = 'tns' | 'tncs' | 'tt';

export interface Arrangement {
  id: ArrangementId;
  name: string;
  aka?: string;
  /** The letters, each with what it stands for. */
  letters: { l: string; means: string }[];
  /** Typical maximum Ze declared by the supplier, in ohms. */
  ze: number;
  summary: string;
  returnPath: string;
  note: string;
}

export const arrangements: Arrangement[] = [
  {
    id: 'tns',
    name: 'TN-S',
    letters: [
      { l: 'T', means: 'terra: the supply’s star point is earthed' },
      { l: 'N', means: 'your earth is joined to that neutral point' },
      { l: 'S', means: 'separate: earth and neutral run apart' },
    ],
    ze: 0.8,
    summary:
      'The supplier gives you a separate earth all the way back to the transformer, usually the metal sheath of the old lead or steel-armoured street cable. Common in older streets.',
    returnPath: 'Back along the cable sheath to the transformer’s star point.',
    note: 'The earth clamp is usually on the cable sheath, just below the cutout.',
  },
  {
    id: 'tncs',
    name: 'TN-C-S',
    aka: 'PME',
    letters: [
      { l: 'T', means: 'terra: the supply’s star point is earthed' },
      { l: 'N', means: 'your earth is joined to that neutral point' },
      { l: 'C', means: 'combined: one PEN conductor in the street' },
      { l: 'S', means: 'separate: they split at your cutout' },
    ],
    ze: 0.35,
    summary:
      'In the street, neutral and earth share one conductor (the PEN). At your cutout they split into a separate neutral and earth. The supplier earths the PEN at many points along the way, hence “protective multiple earthing”. The most common arrangement in UK homes today.',
    returnPath: 'Through the earth terminal at the cutout, then back along the combined PEN conductor.',
    note: 'Because your earth is tied to the supply neutral, good main bonding matters a lot on PME.',
  },
  {
    id: 'tt',
    name: 'TT',
    letters: [
      { l: 'T', means: 'terra: the supply’s star point is earthed' },
      { l: 'T', means: 'terra: you have your own earth rod' },
    ],
    ze: 21,
    summary:
      'The supplier gives you no earth at all. The house has its own earth rod, and fault current has to find its way back to the transformer through the ground. Common in rural areas with overhead lines.',
    returnPath: 'Into your earth rod, through the soil, and up the transformer’s own earth electrode.',
    note: 'The ground is a poor conductor, so Ze is high and the fault current is small. An RCD is essential.',
  },
];

export const arrangementById = (id: ArrangementId) => arrangements.find((a) => a.id === id)!;

/** R1 + R2 of the faulty circuit (line plus protective conductor), fixed for this lesson. */
export const R1R2 = 0.5;
/** The nominal UK supply voltage. */
export const U0 = 230;
/** The circuit breaker in this lesson: a 32 A type B. */
export const MCB_IN = 32;
/** A type B breaker trips "instantly" (magnetically) by about 5 × In. */
export const MCB_INSTANT = 5 * MCB_IN;
/** A 30 mA RCD. */
export const RCD_TRIP = 0.03;

export type BreakerResponse = 'instant' | 'slow' | 'none';

export interface FaultResult {
  zs: number;
  current: number;
  mcb: BreakerResponse;
  rcdTrips: boolean;
  cleared: boolean;
}

/** Earth fault current from Ohm's law: I = U0 ÷ (Ze + R1 + R2). */
export function faultCurrent(ze: number, r1r2 = R1R2, u0 = U0) {
  return u0 / (ze + r1r2);
}

/** What happens when line touches the earthed metal case. */
export function analyseFault(ze: number, rcd: boolean): FaultResult {
  const zs = ze + R1R2;
  const current = faultCurrent(ze);
  const mcb: BreakerResponse = current >= MCB_INSTANT ? 'instant' : current > MCB_IN ? 'slow' : 'none';
  const rcdTrips = rcd && current > RCD_TRIP;
  return { zs, current, mcb, rcdTrips, cleared: mcb === 'instant' || rcdTrips };
}

/** The Ze slider is logarithmic so both 0.1 Ω and 20 Ω are easy to reach. Position 0..1000. */
export const ZE_MIN = 0.05;
export const ZE_MAX = 40;
export const zeFromSlider = (v: number) => ZE_MIN * Math.pow(ZE_MAX / ZE_MIN, v / 1000);
export const sliderFromZe = (ze: number) => Math.round((1000 * Math.log(ze / ZE_MIN)) / Math.log(ZE_MAX / ZE_MIN));

/* ------------------------------- bonding game ------------------------------- */

export type PipeId = 'gas' | 'water';

export interface BondSpot {
  id: string;
  pipe: PipeId;
  /** Height relative to the ground line (negative is up), in scene units. */
  dy: number;
  ok: boolean;
  name: string;
  reason: string;
}

export const bondSpots: BondSpot[] = [
  {
    id: 'g-plastic',
    pipe: 'gas',
    dy: -14,
    ok: false,
    name: 'gas: yellow service pipe',
    reason:
      'That is the yellow plastic service pipe, on the supplier’s side of the meter. Plastic does not conduct, so a clamp here bonds nothing.',
  },
  {
    id: 'g-outlet',
    pipe: 'gas',
    dy: -95,
    ok: true,
    name: 'gas: copper just after the meter',
    reason:
      'Spot on. Hard metal pipe on your side of the meter, before any branch, and typically within about 600 mm of the meter outlet.',
  },
  {
    id: 'g-branch',
    pipe: 'gas',
    dy: -158,
    ok: false,
    name: 'gas: up past the branch',
    reason:
      'Too far along. This is past the branch to the boiler, so that branch is not bonded through here. Clamp close to the meter, before any branch.',
  },
  {
    id: 'w-buried',
    pipe: 'water',
    dy: 40,
    ok: false,
    name: 'water: outside, underground',
    reason:
      'That is buried outside. Bonding connections must stay accessible for inspection, so the clamp goes indoors, close to where the pipe comes in.',
  },
  {
    id: 'w-supply',
    pipe: 'water',
    dy: -14,
    ok: false,
    name: 'water: below the stop tap',
    reason:
      'That is the supply side of the stop tap. Typically the clamp goes on the house side, so the pipes indoors stay bonded even if the incoming pipe is later replaced with plastic.',
  },
  {
    id: 'w-entry',
    pipe: 'water',
    dy: -60,
    ok: true,
    name: 'water: just above the stop tap',
    reason: 'Spot on. Indoors, close to where the pipe enters, on the house side of the stop tap and before any branch.',
  },
  {
    id: 'w-branch',
    pipe: 'water',
    dy: -172,
    ok: false,
    name: 'water: up past the branch',
    reason: 'Too far along. This is past the branch to the taps. Bond close to the point of entry, before any branch.',
  },
];

export const lesson = {
  title: 'Why we earth',
  intro:
    'If the line conductor touches an appliance’s metal case, the case becomes live. Earthing gives that fault current an easy path home to the transformer, so a big current flows and the breaker trips before anyone gets a shock. How that path gets home depends on how your supply is earthed.',
  bondTitle: 'Main bonding',
  bondIntro:
    'Metal gas and water pipes come in from outside and can bring a different voltage with them. Main protective bonding conductors join them to the main earth terminal (MET), so in a fault everything you can touch rises together. No difference in voltage means no shock between a tap and a washing machine.',
};

export const quiz: QuizQuestion[] = [
  {
    q: 'In “TN-C-S”, what does the C stand for?',
    options: ['Copper', 'Combined: neutral and earth share one conductor', 'Consumer'],
    answer: 1,
    why: 'In the street, one PEN conductor does the job of both neutral and earth. It splits into separate (S) neutral and earth at your cutout.',
  },
  {
    q: 'Which arrangement gets no earth from the supplier at all?',
    options: ['TN-S', 'TN-C-S', 'TT'],
    answer: 2,
    why: 'With TT the property provides its own earth through an earth rod, and fault current returns to the transformer through the ground.',
  },
  {
    q: 'Ze is 0.35 Ω and R1 + R2 is 0.5 Ω. Roughly what earth fault current flows?',
    options: ['About 27 A', 'About 270 A', 'About 2,700 A'],
    answer: 1,
    why: '230 ÷ (0.35 + 0.5) = 230 ÷ 0.85, which is about 270 A. That is well over the 160 A a 32 A type B breaker needs to trip almost instantly.',
  },
  {
    q: 'In a TT house a fault only lets about 10 A flow. What disconnects it quickly?',
    options: ['The 32 A breaker', 'The main fuse in the cutout', 'An RCD'],
    answer: 2,
    why: '10 A is less than the breaker’s own rating, so it will never trip. An RCD notices that current is leaking to earth and trips at just 30 mA.',
  },
  {
    q: 'Where does the main bonding clamp go on a gas pipe?',
    options: [
      'On the yellow plastic pipe outside',
      'On the metal pipe on your side of the meter, close to it and before any branch',
      'Next to the boiler',
    ],
    answer: 1,
    why: 'Bond the hard metal pipework on the consumer’s side of the meter, before any branch, typically within about 600 mm of the meter outlet.',
  },
];
