import type { QuizQuestion } from './socket-lesson';

// Chapter 2: the power network. Original wording.

export const network = {
  title: 'Power station to plug',
  intro:
    'Follow the guide on the map, or click any stage. The card below gives the detail for the stage you are on.',
};

export type Owner = 'gen' | 'tx' | 'dno' | 'supplier' | 'you';

export const owners: Record<Owner, { label: string; short: string; colour: string; text: string }> = {
  gen: {
    label: 'Generating company',
    short: 'Generator',
    colour: '#6f7883',
    text: 'The company that runs the power station, wind farm or solar farm.',
  },
  tx: {
    label: 'Transmission company',
    short: 'Transmission',
    colour: '#7b4fb5',
    text: 'Runs the national high-voltage grid (National Grid in England and Wales).',
  },
  dno: {
    label: 'Distribution network operator (DNO)',
    short: 'DNO',
    colour: '#c76b1a',
    text: 'The regional network company, such as UK Power Networks. It owns the local network, the service cable and the cut-out.',
  },
  supplier: {
    label: 'Your supplier',
    short: 'Supplier',
    colour: '#1f8a8a',
    text: 'The company you pay for your electricity. It looks after the meter.',
  },
  you: {
    label: 'You',
    short: 'You',
    colour: '#2f8f4f',
    text: 'Everything after the meter: the meter tails, the consumer unit and all the wiring in the house.',
  },
};

export interface Stage {
  id: string;
  title: string;
  /** Voltage as the pulse arrives at this stage. */
  vIn: string;
  /** Voltage as it leaves (differs only where there is a transformer). */
  vOut: string;
  /** Small print under the voltage. */
  sub?: string;
  owner: Owner;
  text: string;
}

export const stages: Stage[] = [
  {
    id: 'gen',
    title: 'Power station',
    vIn: '≈ 25 kV',
    vOut: '≈ 25 kV',
    sub: 'typical generator voltage',
    owner: 'gen',
    text: 'A big generator spins and makes electricity, typically at up to about 25 kV. Wind and solar farms feed the grid too, often joining it further down.',
  },
  {
    id: 'tx',
    title: 'Transmission',
    vIn: '≈ 25 kV',
    vOut: '400 kV',
    sub: 'or 275 kV',
    owner: 'tx',
    text: 'A step-up transformer at the power station raises the voltage to 400 kV or 275 kV. The pylons carry it across the country. High voltage means a small current, so very little is lost as heat on the way.',
  },
  {
    id: 'gsp',
    title: 'Grid supply point',
    vIn: '400 kV',
    vOut: '132 kV',
    owner: 'tx',
    text: 'The first big substation steps 400 kV down to 132 kV. This is where the regional network company, the DNO, takes over.',
  },
  {
    id: 'bulk',
    title: '33 kV substation',
    vIn: '132 kV',
    vOut: '33 kV',
    owner: 'dno',
    text: 'Smaller towers bring 132 kV to a substation nearer the town, which steps it down to 33 kV.',
  },
  {
    id: 'primary',
    title: 'Primary substation',
    vIn: '33 kV',
    vOut: '11 kV',
    owner: 'dno',
    text: 'Wooden poles or buried cables carry 33 kV to a primary substation, which steps it down again to 11 kV for the local area.',
  },
  {
    id: 'local',
    title: 'Local transformer',
    vIn: '11 kV',
    vOut: '400 V',
    sub: '3-phase · 230 V per phase',
    owner: 'dno',
    text: 'The green box at the end of the road (or a transformer on a pole) is the last step: 11 kV down to 400 V three-phase. Measured from any one phase to neutral, that is the 230 V you get at home.',
  },
  {
    id: 'street',
    title: 'Street cable',
    vIn: '400 V',
    vOut: '400 V',
    sub: '230 V phase to neutral',
    owner: 'dno',
    text: 'A low-voltage cable runs under the pavement with three phases (L1, L2, L3) and a neutral. Houses are shared out across the three phases in turn, so the load on the transformer stays balanced.',
  },
  {
    id: 'service',
    title: 'Service cable',
    vIn: '230 V',
    vOut: '230 V',
    sub: 'one phase + neutral',
    owner: 'dno',
    text: 'A single cable branches off the street main and comes into your house. Most homes get one phase and the neutral: a single-phase 230 V supply.',
  },
  {
    id: 'cutout',
    title: 'Cut-out',
    vIn: '230 V',
    vOut: '230 V',
    sub: 'main fuse, typically 100 A',
    owner: 'dno',
    text: 'The service cable ends in the cut-out: the DNO’s sealed main fuse, typically 60 to 100 A (100 A in most newer homes). It protects the service cable. It is sealed, so never open it: only the DNO may.',
  },
  {
    id: 'meter',
    title: 'Meter',
    vIn: '230 V',
    vOut: '230 V',
    sub: 'counts kilowatt-hours',
    owner: 'supplier',
    text: 'The meter counts the energy you use in kilowatt-hours (kWh). It belongs to your supplier, the company you pay, which may be a different company from the DNO.',
  },
  {
    id: 'cu',
    title: 'Consumer unit',
    vIn: '230 V',
    vOut: '230 V',
    sub: 'now it is yours',
    owner: 'you',
    text: 'The meter tails carry the supply into your consumer unit, which splits it into circuits, each with its own protective device. From here on everything is yours (chapter 4 opens it up).',
  },
];

/** "Spot it" challenge for the journey. Each find accepts one stage. */
export const finds: { ask: string; answer: string; got: string }[] = [
  {
    ask: 'Click the stage where the voltage goes <b>up</b>, not down.',
    answer: 'tx',
    got: 'Yes: the step-up transformer at the power station lifts it to 400 kV for the long trip.',
  },
  {
    ask: 'Click the <b>last transformer</b> before the houses.',
    answer: 'local',
    got: 'Right: the local transformer turns 11 kV into the 400 V / 230 V that homes use.',
  },
  {
    ask: 'Click the first thing in the house that <b>you</b> own.',
    answer: 'cu',
    got: 'Spot on. The cut-out is the DNO’s and the meter is the supplier’s. The consumer unit is yours.',
  },
];

/* ------------------------------ why high voltage ------------------------------ */

export const hvPowers = [
  { w: 100_000, label: '100 kW', note: 'about 33 kettles boiling at once' },
  { w: 1_000_000, label: '1 MW', note: 'about 330 kettles boiling at once' },
  { w: 10_000_000, label: '10 MW', note: 'about 3,300 kettles boiling at once' },
];

export const hvVolts = [
  { v: 230, label: '230 V' },
  { v: 11_000, label: '11 kV' },
  { v: 132_000, label: '132 kV' },
  { v: 400_000, label: '400 kV' },
];

/** The same cable for every voltage, so the heating can be compared fairly. */
export const HV_CABLE_OHMS = 1;

/* --------------------------- will my supply cope? --------------------------- */

export interface Appliance {
  id: string;
  label: string;
  kw: number;
  colour: string;
}

export const appliances: Appliance[] = [
  { id: 'shower', label: 'Electric shower', kw: 10.5, colour: '#1f5fbf' },
  { id: 'ev', label: 'EV charger', kw: 7.4, colour: '#2f8f4f' },
  { id: 'hob', label: 'Hob', kw: 7, colour: '#b3382c' },
  { id: 'kettle', label: 'Kettle', kw: 3, colour: '#c76b1a' },
  { id: 'oven', label: 'Oven', kw: 3, colour: '#8a4b20' },
  { id: 'heatpump', label: 'Heat pump', kw: 3, colour: '#1f8a8a' },
  { id: 'dryer', label: 'Tumble dryer', kw: 2.5, colour: '#7b4fb5' },
  { id: 'lights', label: 'Lights', kw: 0.5, colour: '#c9a210' },
];

export const scenarios: { id: string; label: string; on: string[] }[] = [
  { id: 'quiet', label: 'Quiet evening', on: ['lights', 'heatpump', 'kettle'] },
  { id: 'teatime', label: 'Teatime rush', on: ['lights', 'oven', 'hob', 'shower'] },
  { id: 'all', label: 'Everything on', on: appliances.map((a) => a.id) },
  { id: 'none', label: 'All off', on: [] },
];

export const fuseRatings = [60, 80, 100];

export const quiz: QuizQuestion[] = [
  {
    q: 'Why does the grid carry power at such high voltages?',
    options: [
      'High voltage travels faster',
      'For the same power the current is much smaller, so far less is lost as heat',
      'Pylons can only hold high-voltage cables',
    ],
    answer: 1,
    why: 'Power is V × I, so raising the voltage lowers the current. Heat lost in a cable is I² × R: a tenth of the current means a hundredth of the heat.',
  },
  {
    q: 'What does the transformer at the end of your road do?',
    options: ['Steps 400 kV down to 33 kV', 'Steps 11 kV down to 400 V three-phase', 'Measures how much you use'],
    answer: 1,
    why: 'The local transformer is the last step down: 11 kV in, 400 V three-phase out, which is 230 V from any one phase to neutral.',
  },
  {
    q: 'Who owns the cut-out (the sealed main fuse where the service cable comes in)?',
    options: ['You', 'Your electricity supplier', 'The distribution network operator (DNO)'],
    answer: 2,
    why: 'The DNO owns the service cable and the cut-out. The supplier looks after the meter, and everything after that is yours.',
  },
  {
    q: 'A shower (10.5 kW), kettle (3 kW) and oven (3 kW) all run at once. Roughly what current is that at 230 V?',
    options: ['About 16 A', 'About 72 A', 'About 165 A'],
    answer: 1,
    why: '16.5 kW is 16,500 W. 16,500 ÷ 230 is about 72 A: comfortably under a 100 A cut-out, but a big share of it.',
  },
  {
    q: 'Why are the houses in a street spread across the three phases?',
    options: [
      'To balance the load on the transformer',
      'So each house gets 400 V',
      'Because each phase can only reach three houses',
    ],
    answer: 0,
    why: 'Sharing the houses out (L1, L2, L3, L1 …) keeps the three phases roughly equally loaded. Each house still gets 230 V from its one phase.',
  },
];
