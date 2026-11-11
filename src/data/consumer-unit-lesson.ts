import type { QuizQuestion } from './socket-lesson';

// Chapter 4: the consumer unit. Original wording throughout.

export const intro = {
  title: 'The consumer unit',
  text: 'Where the supply is split into circuits, each with its own protection. Follow the guide on the board, or tap any part to find out what it does.',
};

/* ------------------------------------------------------------------ parts */

export type PartId =
  | 'main'
  | 'rcd'
  | 'mcb'
  | 'rcbo'
  | 'test'
  | 'busbar'
  | 'rcdbus'
  | 'neutral'
  | 'earth'
  | 'tails'
  | 'cables'
  | 'cover';

export interface PartInfo {
  id: PartId;
  title: string;
  text: string;
  points: string[];
  uk?: string;
}

export const parts: Record<PartId, PartInfo> = {
  main: {
    id: 'main',
    title: 'Main switch',
    text: 'One big switch that cuts off every circuit in the house at once. It is how you isolate the whole installation before working on it.',
    points: [
      'It breaks both the line and the neutral (it is "double-pole").',
      'It is a switch, not a protective device: it does not trip on a fault.',
      'The meter tails from the electricity meter land on it.',
    ],
    uk: 'In a home the main switch must be easy to reach and must disconnect both line and neutral.',
  },
  rcd: {
    id: 'rcd',
    title: 'RCD (residual current device)',
    text: 'An RCD compares the current going out on the line with the current coming back on the neutral. They should match. If some is missing, it is leaking somewhere, perhaps through a person to earth, and the RCD trips in a few hundredths of a second.',
    points: [
      '30 mA is the usual rating for protecting people ("additional protection").',
      'It does not protect against overload: it cannot tell a kettle from a kettle and a heater.',
      'One RCD often covers several circuits, so one fault turns them all off.',
      'Press its T button to check it trips. Try it on the picture.',
    ],
    uk: 'BS 7671 asks for 30 mA RCD protection on sockets up to 32 A, lighting in homes, bathroom circuits and cables buried shallowly in walls, among others. In a new home that means almost every circuit.',
  },
  mcb: {
    id: 'mcb',
    title: 'MCB (miniature circuit breaker)',
    text: 'An MCB protects the cable of one circuit. It trips if too much current flows: slowly for a mild overload, almost instantly for a short circuit.',
    points: [
      'The number is its rating, In: B32 means type B, 32 A.',
      'A bimetal strip heats up and bends on overload (slow). A magnetic coil snaps it open on a big fault (fast).',
      'Common ratings: 6, 10, 16, 20, 25, 32, 40, 45 and 50 A.',
      'It does not detect earth leakage. That is the RCD’s job.',
    ],
    uk: 'Breakers in homes are nearly always type B. Types C and D are for motors and other loads with a big switch-on surge.',
  },
  rcbo: {
    id: 'rcbo',
    title: 'RCBO',
    text: 'An RCBO is an RCD and an MCB in one module, protecting a single circuit. If that circuit has a fault, only it goes off. The rest of the house stays on.',
    points: [
      'It has a rating and curve like an MCB (B32) and a trip current like an RCD (30 mA).',
      'Many RCBOs take the circuit neutral too, with a thin flying lead to the neutral bar.',
      'A board of RCBOs costs more, but a single fault never blacks out the whole house.',
    ],
    uk: 'Many electricians now fit an RCBO on every circuit, so each one has its own 30 mA protection.',
  },
  test: {
    id: 'test',
    title: 'The T (test) button',
    text: 'Pressing T sends a small, deliberate leak past the RCD so you can see that its trip mechanism works. It is a quick check, not a measurement.',
    points: [
      'If it does not trip, the RCD is faulty: get an electrician.',
      'It does not prove the trip time. That needs an RCD tester (see the RCDs tab).',
    ],
    uk: 'The label on the board asks the user to press the test button every six months.',
  },
  busbar: {
    id: 'busbar',
    title: 'Busbar',
    text: 'A copper comb that carries line from the main switch along to every device, so each breaker does not need its own wire from the main switch.',
    points: [
      'Its pins clamp into the top terminal of each device.',
      'When the main switch is off, the busbar is dead.',
    ],
  },
  rcdbus: {
    id: 'rcdbus',
    title: 'RCD busbar',
    text: 'A second, shorter busbar fed from the RCD. Everything on it is protected by that RCD, so when the RCD trips, all of these breakers lose their supply together.',
    points: ['This is how a "split-load" board shares one RCD between several circuits.'],
  },
  neutral: {
    id: 'neutral',
    title: 'Neutral bar',
    text: 'Every circuit’s blue neutral is screwed to a neutral bar. A board with RCDs has a separate neutral bar for each RCD.',
    points: [
      'A circuit’s neutral must go to the bar of the same RCD that feeds its line. Mix them up and the RCD sees an imbalance and trips.',
      'The neutral is a live conductor: it carries the same current as the line.',
    ],
  },
  earth: {
    id: 'earth',
    title: 'Earth bar',
    text: 'Every circuit’s green-and-yellow protective conductor ends here. The main earthing conductor connects this bar to the earth from the supply.',
    points: [
      'In normal use it carries no current.',
      'In a fault it gives the current an easy path home, so the breaker or RCD trips quickly.',
    ],
  },
  tails: {
    id: 'tails',
    title: 'Meter tails',
    text: 'Two thick single cables, brown line and blue neutral, that bring the supply from the meter into the main switch.',
    points: [
      'They are live even when the main switch is off. Only the supplier’s fuse can isolate them.',
      'Next to them, the main earthing conductor brings earth in.',
    ],
  },
  cables: {
    id: 'cables',
    title: 'Circuit cables',
    text: 'Each circuit leaves the board as one cable with three cores: brown line from its breaker, blue neutral from the neutral bar and green-and-yellow earth from the earth bar.',
    points: ['Watch the little lamps under each cable: they show which circuits have power.'],
  },
  cover: {
    id: 'cover',
    title: 'The cover',
    text: 'The cover keeps fingers off live parts and leaves only the switches showing. Under it, the copper is live whenever the supply is on.',
    points: ['The chart on the cover says which breaker feeds which circuit. Keep it up to date.'],
    uk: 'Consumer units in homes must have a non-combustible enclosure, which in practice means a steel box.',
  },
};

export const partOrder: PartId[] = ['main', 'rcd', 'mcb', 'rcbo', 'test', 'busbar', 'rcdbus', 'neutral', 'earth', 'tails', 'cables', 'cover'];

/** Little goals on the Explore tab. Ticked off instantly as the learner does them. */
export const exploreGoals = [
  { id: 'cover', text: 'Take the cover off.' },
  { id: 'rcdtest', text: 'Press the RCD’s T button. Which circuits go dark?' },
  { id: 'rcbo', text: 'Switch off one RCBO. Does anything else go off?' },
  { id: 'main', text: 'Switch off the main switch.' },
  { id: 'busbar', text: 'Find the part that carries line to every breaker.' },
] as const;
export type GoalId = (typeof exploreGoals)[number]['id'];

/* ------------------------------------------------------------- the build */

export type RcdType = 'AC' | 'A' | 'F' | 'B';
export type Protection = 'none' | RcdType;
export const RCD_ORDER: RcdType[] = ['AC', 'A', 'F', 'B'];

export interface CircuitSpec {
  id: string;
  name: string;
  /** Two short lines for the label under the board. */
  label: [string, string];
  /** One line on the card. */
  detail: string;
  rating: number;
  /** Ratings that are workable but not the usual choice. */
  okRatings?: number[];
  /** The least capable RCD type that suits it. */
  rcd: RcdType;
  ratingWhy: string;
  tooSmall: string;
  rcdWhy: string;
}

export const circuits: CircuitSpec[] = [
  {
    id: 'ring',
    name: 'Ring final, sockets',
    label: ['Ring', 'sockets'],
    detail: 'Downstairs sockets, 2.5 mm² ring',
    rating: 32,
    rcd: 'A',
    ratingWhy: 'A ring final in 2.5 mm² cable is protected at 32 A.',
    tooSmall: 'A kettle, a heater and a few other things at once would trip it in normal use.',
    rcdWhy: 'Sockets feed phone chargers, TVs and computers. Their electronics can leak pulsating DC, which can stop a type AC working. Type A is the minimum.',
  },
  {
    id: 'radial',
    name: 'Radial sockets',
    label: ['Radial', 'sockets'],
    detail: 'Home office, 2.5 mm² radial',
    rating: 20,
    rcd: 'A',
    ratingWhy: 'A radial socket circuit in 2.5 mm² cable is commonly protected at 20 A.',
    tooSmall: 'A heater and a kettle together would trip it in normal use.',
    rcdWhy: 'Computers and chargers are electronic loads, so it needs at least type A.',
  },
  {
    id: 'lights',
    name: 'Lighting',
    label: ['Lights', ''],
    detail: 'LED downlights and dimmers',
    rating: 6,
    okRatings: [10],
    rcd: 'A',
    ratingWhy: 'Lighting circuits are usually 6 A: lamps draw very little and the cable is thin.',
    tooSmall: '',
    rcdWhy: 'LED drivers and dimmers are electronic, so type A is the minimum.',
  },
  {
    id: 'shower',
    name: 'Electric shower',
    label: ['Shower', ''],
    detail: '10.5 kW, plain (non-electronic)',
    rating: 45,
    rcd: 'AC',
    ratingWhy: 'Showers are rated at 240 V. At our 230 V a 10.5 kW unit draws about 42 A, so the next size up is 45 A.',
    tooSmall: 'It draws about 42 A, so a 40 A breaker would trip, or run hot, every time someone showers.',
    rcdWhy: 'A plain shower is just a heating element, a resistive load, so type AC is allowed. Type A is fine too.',
  },
  {
    id: 'cooker',
    name: 'Cooker',
    label: ['Cooker', ''],
    detail: 'Oven and induction hob',
    rating: 32,
    rcd: 'A',
    ratingWhy: 'A typical home cooker circuit is 32 A. Not every ring and element is on at full power at once.',
    tooSmall: 'With the oven and several rings on, it would trip mid-dinner.',
    rcdWhy: 'An induction hob is full of power electronics, so it needs at least type A.',
  },
  {
    id: 'immersion',
    name: 'Immersion heater',
    label: ['Hot', 'water'],
    detail: '3 kW hot-water element',
    rating: 16,
    okRatings: [20],
    rcd: 'AC',
    ratingWhy: '3 kW at 230 V is about 13 A, so 16 A is the usual breaker.',
    tooSmall: 'It draws about 13 A for hours on end, so a 10 A breaker would trip.',
    rcdWhy: 'An immersion heater is a plain resistive element, so type AC is allowed. Type A is fine too.',
  },
  {
    id: 'smoke',
    name: 'Smoke alarms',
    label: ['Smoke', 'alarms'],
    detail: 'Mains alarms, linked together',
    rating: 6,
    okRatings: [10],
    rcd: 'A',
    ratingWhy: 'Smoke alarms draw almost nothing, so 6 A is plenty.',
    tooSmall: '',
    rcdWhy: 'The alarms contain electronics, so type A is the minimum.',
  },
  {
    id: 'ev',
    name: 'EV charger',
    label: ['EV', 'charger'],
    detail: '7 kW, with built-in DC detection',
    rating: 32,
    rcd: 'A',
    ratingWhy: '7 kW at 230 V is about 30 A, and the charger can run at that for hours, so 32 A.',
    tooSmall: 'It draws about 30 A for hours, so anything smaller would trip.',
    rcdWhy: 'A car charger can leak smooth DC. This one detects DC leakage itself, so a type A RCD is enough. A charger without that would need type B.',
  },
];

export const BUILD_RATINGS = [6, 10, 16, 20, 25, 32, 40, 45, 50];

export const buildIntro = {
  title: 'Build a board',
  text: 'Eight empty ways and eight circuits. Drag each card onto a way (or tap a card, then tap a way), then pick its breaker size and RCD type. Every way here is an RCBO. Get them all right and power it up.',
};

/* ------------------------------------------------------------ trip curves */

export const curveIntro = {
  title: 'Trip curves',
  text: 'How fast does a breaker trip? It depends how far over its rating the current is. Slide the current up and watch the marker on the chart.',
};

export const curvePresets = [
  { id: 'normal', label: 'Normal load', m: 0.8 },
  { id: 'overload', label: 'Mild overload', m: 1.5 },
  { id: 'big', label: 'Big overload', m: 2.55 },
  { id: 'short', label: 'Short circuit', m: 25 },
];

/* ------------------------------------------------------------------- RCDs */

export const rcdIntro = {
  title: 'Test an RCD',
  text: 'An electrician proves an RCD with a tester plugged into a socket. It leaks a set current to earth and times how long the RCD takes to trip. Run each test and see whether this 30 mA RCD passes.',
};

export interface RcdGameItem {
  id: string;
  name: string;
  need: RcdType;
  why: string;
}

export const rcdGame: RcdGameItem[] = [
  { id: 'heater', name: 'Electric panel heater', need: 'AC', why: 'A plain heating element. Type AC is enough (A or higher also works).' },
  { id: 'tungsten', name: 'Old tungsten filament lamps', need: 'AC', why: 'A filament is just a resistor, so type AC is enough.' },
  { id: 'led', name: 'LED lights with drivers', need: 'A', why: 'LED drivers can leak pulsating DC, so type A.' },
  { id: 'hob', name: 'Induction hob', need: 'A', why: 'Power electronics inside, so type A.' },
  { id: 'washer', name: 'Washing machine with an inverter motor', need: 'F', why: 'Variable-speed motors leak at a mix of frequencies. Type F is designed for exactly that.' },
  { id: 'dish', name: 'Dishwasher with an inverter pump', need: 'F', why: 'Another frequency-controlled motor, so type F.' },
  { id: 'evb', name: 'EV charger without DC detection', need: 'B', why: 'It could leak smooth DC, which only a type B can detect.' },
  { id: 'pv', name: 'Solar PV inverter whose maker asks for type B', need: 'B', why: 'Some inverters can leak smooth DC, so follow the maker and fit type B.' },
];

export const rcdTypeInfo: Record<RcdType, string> = {
  AC: 'Plain AC leakage only. For resistive loads such as heaters.',
  A: 'AC plus pulsating DC from electronics.',
  F: 'Everything A does, plus mixed frequencies from inverter motors.',
  B: 'Everything, including smooth DC.',
};

/* ------------------------------------------------------------------- quiz */

export const quiz: QuizQuestion[] = [
  {
    q: 'What is an MCB mainly there to protect?',
    options: ['The person, from electric shock', 'The circuit’s cable, from overload and short circuit', 'The appliance, from voltage spikes'],
    answer: 1,
    why: 'An MCB is sized to the cable. It trips before too much current can overheat it. Shock protection for people is the RCD’s job.',
  },
  {
    q: 'How does an RCD know there is a fault?',
    options: ['The current gets too high', 'The voltage drops', 'Current out on the line does not match current back on the neutral'],
    answer: 2,
    why: 'If some current is missing it must be leaking to earth, maybe through a person. The RCD trips on that difference.',
  },
  {
    q: 'A 30 mA RCD is tested at 5 × its rating (150 mA). What is the limit for its trip time?',
    options: ['40 ms', '300 ms', '1 second'],
    answer: 0,
    why: 'At 150 mA it must trip within 40 ms. At its rated 30 mA the limit is 300 ms.',
  },
  {
    q: 'Which RCD type suits a washing machine with an inverter motor?',
    options: ['Type AC', 'Type F', 'Type C'],
    answer: 1,
    why: 'Type F handles the mixed frequencies from inverter motors. "C" is an MCB curve, not an RCD type.',
  },
  {
    q: 'Why fit an RCBO on each circuit instead of one RCD for several?',
    options: ['A fault only switches off its own circuit', 'RCBOs trip at a lower current', 'You no longer need a main switch'],
    answer: 0,
    why: 'With one RCD shared by several circuits, one fault blacks them all out. An RCBO keeps the problem to one circuit.',
  },
];
