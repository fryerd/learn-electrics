// The course map: one chapter per stop on the journey from the street to the appliances.
// Matches docs/curriculum.md. `built: true` chapters have a real page; the rest show a "coming soon" page.

export interface Chapter {
  id: string;
  n: number;
  title: string;
  /** A short label for the pills along the top of the page. */
  short: string;
  act: string;
  blurb: string;
  /** The hands-on things you will do (shown on the "coming soon" page). */
  doing: string[];
  built: boolean;
  /** Inner SVG markup for the card icon (48x48 viewBox, drawn with currentColor strokes). */
  icon: string;
}

const S = 'fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';

export const chapters: Chapter[] = [
  {
    id: 'basics',
    n: 1,
    title: 'Electricity basics',
    short: 'Basics',
    act: 'The basics',
    blurb: 'Volts, amps, watts and ohms, and why the UK supply is 230 V.',
    doing: ['Ohm’s law and power sliders', 'A water-pipe animation that reacts live'],
    built: true,
    icon: `<g ${S}><path d="M24 6c8 10 13 16 13 23a13 13 0 0 1-26 0c0-7 5-13 13-23z"/><path d="M26 18l-7 11h7l-3 8 9-12h-7z" stroke="#6b3f1d"/></g>`,
  },
  {
    id: 'network',
    n: 2,
    title: 'The power network',
    short: 'Network',
    act: 'From the street to your house',
    blurb: 'From the local transformer to the cut-out fuse and meter.',
    doing: ['Follow the current along the street', 'A "will my supply cope?" calculator'],
    built: true,
    icon: `<g ${S}><path d="M24 6 14 42M24 6l10 36M17 30h14M20 19h8M9 13h30"/></g>`,
  },
  {
    id: 'earthing',
    n: 3,
    title: 'Supply and earthing',
    short: 'Earthing',
    act: 'From the street to your house',
    blurb: 'Why we earth, TN-S, TN-C-S and TT, and main bonding.',
    doing: ['Switch the earthing arrangement and watch the fault path', 'Place the bonding clamps'],
    built: true,
    icon: `<g ${S}><path d="M24 6v20M9 26h30M15 33h18M21 40h6"/></g>`,
  },
  {
    id: 'consumer-unit',
    n: 4,
    title: 'The consumer unit',
    short: 'Consumer unit',
    act: 'Inside the consumer unit',
    blurb: 'Main switch, MCBs and RCDs, and which device suits which load.',
    doing: ['Pick the right device for each appliance', 'An RCD ramp and trip-time tester'],
    built: true,
    icon: `<g ${S}><rect x="8" y="8" width="32" height="32" rx="4"/><path d="M16 15v11M24 15v11M32 15v11M15 33h18"/></g>`,
  },
  {
    id: 'cables',
    n: 5,
    title: 'Cables and circuit design',
    short: 'Cables',
    act: 'Inside the consumer unit',
    blurb: 'Cable size, breaker and load: Ib ≤ In ≤ Iz, and volt drop.',
    doing: ['Size a circuit for a shower', 'Stretch the cable run and watch the volt drop'],
    built: true,
    icon: `<g ${S}><path d="M5 31C15 11 27 41 43 17" stroke="#6b3f1d" stroke-width="4"/><path d="M5 38C15 18 27 48 43 24" stroke="#1f5fbf" stroke-width="4"/></g>`,
  },
  {
    id: 'fault-loop',
    n: 6,
    title: 'The earth fault loop',
    short: 'Fault loop',
    act: 'Inside the consumer unit',
    blurb: 'Zs = Ze + (R1 + R2) and why a breaker trips.',
    doing: ['Build the loop with sliders', 'A virtual earth-fault-loop meter'],
    built: true,
    icon: `<g ${S}><path d="M35 14a14 14 0 1 0 5 11"/><path d="M36 5v10h10"/></g>`,
  },
  {
    id: 'sockets',
    n: 7,
    title: 'Socket circuits',
    short: 'Sockets',
    act: 'Out to the appliances',
    blurb: 'Inside a 13 A socket, wiring it, and fitting the faceplate.',
    doing: ['Wire the socket yourself', 'Fit the faceplate'],
    built: true,
    icon: `<g ${S}><rect x="8" y="8" width="32" height="32" rx="6"/><path d="M24 15v6M16 29v5M32 29v5"/></g>`,
  },
  {
    id: 'lighting',
    n: 8,
    title: 'Lighting and switches',
    short: 'Lighting',
    act: 'Out to the appliances',
    blurb: 'Gangs, poles and ways, one-way, two-way and intermediate.',
    doing: ['Wire lamp circuits and flip the switches', 'A two-way and intermediate puzzle'],
    built: true,
    icon: `<g ${S}><path d="M16 29a11 11 0 1 1 16 0c-2 2-3 4-3 7H19c0-3-1-5-3-7z"/><path d="M19 41h10"/></g>`,
  },
  {
    id: 'special-locations',
    n: 9,
    title: 'Special locations and IP codes',
    short: 'Special locations',
    act: 'Out to the appliances',
    blurb: 'Bathroom zones, the extractor fan circuit and IP ratings.',
    doing: ['Drag fittings into the right bathroom zones', 'Match IP ratings to places'],
    built: true,
    icon: `<g ${S}><path d="M10 14h16a9 9 0 0 1 9 9"/><path d="M22 27l-2 6M28 27l-2 6M34 27l-2 6M16 27l-2 6"/></g>`,
  },
  {
    id: 'safety-law',
    n: 10,
    title: 'Safety and the law',
    short: 'Safety & law',
    act: 'Rules and proof',
    blurb: 'Part P, BS 7671 and safe isolation.',
    doing: ['Put the safe-isolation steps in order', 'Is this job notifiable?'],
    built: true,
    icon: `<g ${S}><path d="M24 6l15 6v12c0 9-6 15-15 18-9-3-15-9-15-18V12z"/><path d="M17 24l5 5 9-10"/></g>`,
  },
  {
    id: 'certification',
    n: 11,
    title: 'Certification and fault-finding',
    short: 'Certification',
    act: 'Rules and proof',
    blurb: 'The installation certificate, and a find-the-fault game.',
    doing: ['Fill in a certificate from test results', 'Find the planted faults'],
    built: true,
    icon: `<g ${S}><rect x="11" y="8" width="26" height="33" rx="3"/><path d="M18 8h12M17 20h14M17 27h14M17 34h8"/></g>`,
  },
];

export const DEFAULT_CHAPTER = 'sockets';

export function chapterById(id: string): Chapter | undefined {
  return chapters.find((c) => c.id === id);
}
