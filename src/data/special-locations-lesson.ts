import type { QuizQuestion } from './socket-lesson';

// Chapter 9: special locations and IP codes. Original wording. Bathroom rules follow BS 7671 section 701
// in simplified form; where a rule has conditions the text says "check" rather than giving a hard answer.

export const lesson = {
  title: 'Fit out the bathroom',
  intro:
    'Water and electricity are a dangerous mix: wet skin lets far more current through you. So a room with a bath or shower is split into zones, and each zone has rules about what may go there. Drag each item onto the wall (or tap it, then tap the wall) and see if it is allowed.',
};

/* ------------------------------------------------------------------ geometry (metres) */

export const ROOM_W = 5.4; // the back wall, left to right
export const ROOM_D = 2.8; // plan depth, back wall to front wall
export const CEIL = 2.4;
export const BATH_L = 1.7;
export const BATH_H = 0.55;
export const BATH_D = 0.75;
export const ZONE_TOP = 2.25;
export const ZONE2_W = 0.6;
export const SOCKET_GAP = 3;
export const WINDOW = { x0: 0.45, x1: 1.25, y0: 1.35, y1: 2.0 };
export const DOOR = { x0: 3.5, x1: 4.3, h: 2.0 };
export const BASIN = { x0: 2.6, x1: 3.15 };

export type Zone = 'z0' | 'z1' | 'z2' | 'out';
export type Status = 'ok' | 'check' | 'bad';

export const zoneName: Record<Zone, string> = {
  z0: 'Zone 0',
  z1: 'Zone 1',
  z2: 'Zone 2',
  out: 'Outside the zones',
};

export const zoneWhere: Record<Zone, string> = {
  z0: 'Inside the bath or shower tray itself.',
  z1: 'Directly above the bath or tray, up to 2.25 m from the floor.',
  z2: 'A 0.6 m band beyond zone 1, also up to 2.25 m.',
  out: 'Everything else, including above 2.25 m. There is no zone 3.',
};

/** The minimum water protection for equipment fixed in each zone. */
export const minIp: Record<Zone, string> = {
  z0: 'IPX7, and only 12 V SELV',
  z1: 'IPX4 (IPX5 where jets are used to clean)',
  z2: 'IPX4 (IPX5 where jets are used to clean)',
  out: 'No special rating: the general rules apply',
};

/** Which zone a point on the back wall falls in. x from the bath end, y up from the floor. */
export function classify(x: number, y: number): Zone {
  if (x <= BATH_L && y <= BATH_H) return 'z0';
  if (y > ZONE_TOP) return 'out';
  if (x <= BATH_L) return 'z1';
  if (x <= BATH_L + ZONE2_W) return 'z2';
  return 'out';
}

/** Horizontal distance from the edge of zone 1 (the end of the bath) to a point on the back wall. */
export const distanceFromZone1 = (x: number) => Math.max(0, x - BATH_L);

/* ------------------------------------------------------------------ the items */

export type ItemId =
  | 'shaver'
  | 'socket'
  | 'switch'
  | 'pullcord'
  | 'light'
  | 'shower'
  | 'fan'
  | 'towel'
  | 'mat'
  | 'selv';

interface Rule {
  status: Status;
  reason: string;
}

export interface Item {
  id: ItemId;
  name: string;
  sub: string;
  /** Natural mounting height (m) used when placed with a button. */
  h: number;
  /** Small sideways nudge (m) so button-placed items do not sit on top of each other. */
  dx: number;
  rules: Record<Zone, Rule>;
}

const NO_Z0 = 'Nothing mains-powered goes inside the bath or tray. Zone 0 takes only 12 V SELV equipment made to be under water (IPX7).';

export const items: Item[] = [
  {
    id: 'shaver',
    name: 'Shaver supply unit',
    sub: 'BS EN 61558-2-5',
    h: 1.45,
    dx: -0.55,
    rules: {
      z0: { status: 'bad', reason: NO_Z0 },
      z1: { status: 'bad', reason: 'Too close to the water. Zone 2 is as near as a shaver unit may go, and only out of the shower’s direct spray.' },
      z2: { status: 'ok', reason: 'Allowed. A shaver unit to BS EN 61558-2-5 has an isolating transformer inside, which is why it is the one outlet allowed this close. Keep it out of direct spray.' },
      out: { status: 'ok', reason: 'Allowed. Its usual home: beside the mirror, well away from the bath.' },
    },
  },
  {
    id: 'socket',
    name: '13 A socket',
    sub: 'BS 1363',
    h: 0.45,
    dx: 0,
    rules: {
      z0: { status: 'bad', reason: 'A mains socket in the bath: never.' },
      z1: { status: 'bad', reason: 'Ordinary sockets are not allowed in any zone. They must be at least 3 m horizontally from the edge of zone 1.' },
      z2: { status: 'bad', reason: 'Ordinary sockets are not allowed in any zone. They must be at least 3 m horizontally from the edge of zone 1.' },
      out: { status: 'ok', reason: '' }, // decided by the 3 m rule in judge()
    },
  },
  {
    id: 'switch',
    name: 'Wall light switch',
    sub: 'ordinary plate switch',
    h: 1.2,
    dx: 0.35,
    rules: {
      z0: { status: 'bad', reason: NO_Z0 },
      z1: { status: 'bad', reason: 'Wall switches are not allowed in the zones: a wet hand on a mains switch is a shock risk. Use a pull-cord, or put the switch outside the zones.' },
      z2: { status: 'bad', reason: 'Wall switches are not allowed in the zones: a wet hand on a mains switch is a shock risk. Use a pull-cord, or put the switch outside the zones.' },
      out: { status: 'ok', reason: 'Allowed. Outside the zones an ordinary switch is fine. Many people still put it just outside the door.' },
    },
  },
  {
    id: 'pullcord',
    name: 'Pull-cord switch',
    sub: 'insulating cord',
    h: 2.05,
    dx: -0.3,
    rules: {
      z0: { status: 'bad', reason: NO_Z0 },
      z1: { status: 'check', reason: 'Check before fitting it this close. The insulating cord may hang into the zones, but the switch itself belongs on the ceiling, in zone 2 or outside the zones.' },
      z2: { status: 'ok', reason: 'Allowed. The cord is insulating, so a wet hand never touches anything at mains voltage. The switch body sits up on the ceiling with only the cord hanging down.' },
      out: { status: 'ok', reason: 'Allowed, and the usual place: on the ceiling with the cord hanging within reach.' },
    },
  },
  {
    id: 'light',
    name: 'Ceiling light',
    sub: 'rated IP65',
    h: 2.12,
    dx: -0.3,
    rules: {
      z0: { status: 'bad', reason: 'Only 12 V SELV fittings rated IPX7 may go inside the bath or tray.' },
      z1: { status: 'ok', reason: 'Allowed. Zone 1 needs at least IPX4. This light is IP65, so it copes with jets too.' },
      z2: { status: 'ok', reason: 'Allowed. Zone 2 needs at least IPX4, and IP65 is better than that.' },
      out: { status: 'ok', reason: 'Allowed. No special rating is needed outside the zones, though IP-rated lights are common in bathrooms anyway.' },
    },
  },
  {
    id: 'shower',
    name: 'Electric shower',
    sub: 'fixed, at least IPX4',
    h: 1.65,
    dx: -0.05,
    rules: {
      z0: { status: 'bad', reason: 'The shower unit runs at mains voltage, so it cannot go inside the bath or tray itself.' },
      z1: { status: 'ok', reason: 'Allowed. An electric shower is fixed equipment made for zone 1. It needs its own circuit, 30 mA RCD protection and an isolating switch outside the zones (often a ceiling pull-cord).' },
      z2: { status: 'ok', reason: 'Allowed (at least IPX4), as long as the hose reaches over the bath.' },
      out: { status: 'check', reason: 'The rules would allow it, but a shower here would spray onto the floor. Put it over the bath.' },
    },
  },
  {
    id: 'fan',
    name: 'Extractor fan',
    sub: 'with run-on timer',
    h: 1.95,
    dx: 0.2,
    rules: {
      z0: { status: 'bad', reason: NO_Z0 },
      z1: { status: 'ok', reason: 'Allowed if the fan is made for zone 1 (at least IPX4; some zone 1 fans run on SELV). Its isolator must be outside the zones.' },
      z2: { status: 'ok', reason: 'Allowed. It needs at least IPX4 here, and its isolator goes outside the zones.' },
      out: { status: 'ok', reason: 'Allowed. High on the wall or ceiling, often near the window, to pull steam out.' },
    },
  },
  {
    id: 'towel',
    name: 'Heated towel rail',
    sub: 'electric',
    h: 0.95,
    dx: 0.1,
    rules: {
      z0: { status: 'bad', reason: NO_Z0 },
      z1: { status: 'check', reason: 'Only if the maker says it suits zone 1. Most are fitted in zone 2 or outside the zones.' },
      z2: { status: 'ok', reason: 'Allowed (at least IPX4). Its switched fused connection unit must be outside the zones.' },
      out: { status: 'ok', reason: 'Allowed. Its switched fused connection unit can sit beside it here.' },
    },
  },
  {
    id: 'mat',
    name: 'Underfloor heating mat',
    sub: 'under the tiles',
    h: 0.04,
    dx: 0.25,
    rules: {
      z0: { status: 'bad', reason: 'Heating mats go under the floor, not in the bath.' },
      z1: { status: 'ok', reason: 'Allowed under the floor, as long as it has an earthed metal grid or sheath and 30 mA RCD protection.' },
      z2: { status: 'ok', reason: 'Allowed under the floor in the zones, as long as it has an earthed metal grid or sheath and 30 mA RCD protection.' },
      out: { status: 'ok', reason: 'Allowed. It needs an earthed metal grid or sheath and 30 mA RCD protection, like every bathroom circuit.' },
    },
  },
  {
    id: 'selv',
    name: '12 V SELV light',
    sub: 'rated IPX7',
    h: 2.1,
    dx: 0.25,
    rules: {
      z0: { status: 'ok', reason: 'Allowed. Zone 0 takes only SELV at up to 12 V AC (or 30 V ripple-free DC) rated IPX7, with its transformer (the safety source) outside the zones.' },
      z1: { status: 'ok', reason: 'Allowed. IPX7 beats the IPX4 zone 1 needs. Keep its transformer outside the zones.' },
      z2: { status: 'ok', reason: 'Allowed. IPX7 beats the IPX4 zone 2 needs. Keep its transformer outside the zones.' },
      out: { status: 'ok', reason: 'Allowed. Low voltage and well sealed: it is fine anywhere.' },
    },
  },
];

export const itemById = (id: string) => items.find((i) => i.id === id);

export interface Judgement {
  zone: Zone;
  status: Status;
  reason: string;
  minIp: string;
  /** For a socket outside the zones: horizontal distance from zone 1, in metres. */
  distance?: number;
}

const fmtM = (m: number) => `${m.toFixed(1)} m`;

/** The verdict for an item placed at (x, y) on the back wall. Pure, no DOM. */
export function judge(id: ItemId, x: number, y: number): Judgement {
  const item = itemById(id)!;
  const zone = classify(x, y);
  const base = { zone, minIp: minIp[zone] };
  if (id === 'socket' && zone === 'out') {
    const d = distanceFromZone1(x);
    // Compare at the 0.1 m shown on screen, so "3.0 m" never reads as a fail.
    const ok = Math.round(d * 10) >= SOCKET_GAP * 10;
    return {
      ...base,
      distance: d,
      status: ok ? 'ok' : 'bad',
      reason: ok
        ? `Allowed. It is ${fmtM(d)} from the edge of zone 1, so it clears the 3 m rule. Like every bathroom circuit it needs 30 mA RCD protection.`
        : d < 0.05
          ? 'Above 2.25 m, so outside the zones, but directly over zone 1: 0 m away horizontally. An ordinary socket must be at least 3 m from zone 1.'
          : `Outside the zones, but only ${fmtM(d)} from the edge of zone 1. An ordinary socket must be at least 3 m away horizontally. That is why UK bathrooms almost never have one.`,
    };
  }
  return { ...base, ...item.rules[zone] };
}

/** Where an item ends up when dropped at (x, y): the heating mat always lies in the floor. */
export function settle(id: ItemId, x: number, y: number): { x: number; y: number } {
  const cx = Math.min(ROOM_W - 0.12, Math.max(0.12, x));
  const cy = Math.min(CEIL - 0.08, Math.max(0.04, y));
  if (id === 'mat' && classify(cx, cy) !== 'z0') return { x: Math.max(cx, BATH_L + 0.2), y: 0.04 };
  return { x: cx, y: cy };
}

/** Spots for the keyboard / button way of placing an item. */
export const spots: { id: string; label: string; x: number; zone: Zone }[] = [
  { id: 'z0', label: 'Zone 0', x: 0.85, zone: 'z0' },
  { id: 'z1', label: 'Zone 1', x: 1.3, zone: 'z1' },
  { id: 'z2', label: 'Zone 2', x: 2.0, zone: 'z2' },
  { id: 'mid', label: 'Outside, mid-wall', x: 3.0, zone: 'out' },
  { id: 'far', label: 'Outside, far corner', x: 5.0, zone: 'out' },
];

/** Where a button-placed item goes: the spot's x, the item's natural height, nudged to stay in its zone. */
export function spotPosition(id: ItemId, spotId: string): { x: number; y: number } {
  const item = itemById(id)!;
  const spot = spots.find((s) => s.id === spotId)!;
  if (spot.zone === 'z0') return { x: spot.x + item.dx, y: 0.3 };
  let x = spot.x + item.dx;
  let y = item.h;
  if (spot.zone === 'z1') {
    x = Math.min(BATH_L - 0.12, Math.max(0.15, x));
    // The mat lies in the floor, which beside the bath is zone 2 (settle() moves it there).
    if (y <= BATH_H + 0.1) y = id === 'mat' ? 1 : 0.85;
  } else if (spot.zone === 'z2') {
    x = Math.min(BATH_L + ZONE2_W - 0.1, Math.max(BATH_L + 0.1, spot.x + item.dx));
  }
  return settle(id, x, y);
}

/* ------------------------------------------------------------------ IP codes */

export type IpFirst = 'X' | '0' | '1' | '2' | '3' | '4' | '5' | '6';
export type IpSecond = 'X' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
export type IpLetter = '' | 'A' | 'B' | 'C' | 'D';

export const ipFirst: Record<IpFirst, { short: string; long: string }> = {
  X: { short: 'Not rated', long: 'Not tested against solid objects (the maker gives no figure).' },
  '0': { short: 'No protection', long: 'No protection against solid objects.' },
  '1': { short: 'Hand', long: 'Keeps out objects over 50 mm, like the back of a hand.' },
  '2': { short: 'Finger', long: 'Keeps out fingers and objects over 12.5 mm.' },
  '3': { short: 'Tool', long: 'Keeps out tools and thick wires over 2.5 mm.' },
  '4': { short: 'Wire', long: 'Keeps out wires and small screws over 1 mm.' },
  '5': { short: 'Dust-protected', long: 'Dust-protected: a little dust may get in, but not enough to stop it working safely.' },
  '6': { short: 'Dust-tight', long: 'Dust-tight: no dust gets in at all.' },
};

export const ipSecond: Record<IpSecond, { short: string; long: string }> = {
  X: { short: 'Not rated', long: 'Not tested against water (the maker gives no figure).' },
  '0': { short: 'No protection', long: 'No protection against water.' },
  '1': { short: 'Drips', long: 'Copes with water dripping straight down.' },
  '2': { short: 'Drips, tilted', long: 'Copes with dripping water when tilted up to 15°.' },
  '3': { short: 'Spray', long: 'Copes with spraying water up to 60° from vertical.' },
  '4': { short: 'Splashes', long: 'Copes with water splashing from any direction.' },
  '5': { short: 'Jets', long: 'Copes with water jets from any direction.' },
  '6': { short: 'Powerful jets', long: 'Copes with powerful water jets.' },
  '7': { short: 'Dunked', long: 'Survives being put under water for a short time (up to 1 m deep, for 30 minutes).' },
  '8': { short: 'Submerged', long: 'Survives staying under water, deeper than 1 m, as the maker states.' },
};

export const ipLetter: Record<Exclude<IpLetter, ''>, { short: string; long: string }> = {
  A: { short: 'Back of hand', long: 'Extra letter A: dangerous parts cannot be touched with the back of a hand.' },
  B: { short: 'Finger', long: 'Extra letter B: dangerous parts cannot be touched with a finger.' },
  C: { short: 'Tool', long: 'Extra letter C: dangerous parts cannot be touched with a tool (2.5 mm).' },
  D: { short: 'Wire', long: 'Extra letter D: dangerous parts cannot be touched with a wire (1 mm).' },
};

export interface IpCode {
  first: IpFirst;
  second: IpSecond;
  letter: IpLetter;
}

export const ipText = (c: IpCode) => `IP${c.first}${c.second}${c.letter}`;

/** Read "IP65", "IPX4", "IP2XB" into its parts. */
export function parseIp(s: string): IpCode | null {
  const m = /^IP([0-6X])([0-8X])([A-D]?)$/.exec(s.toUpperCase());
  return m ? { first: m[1] as IpFirst, second: m[2] as IpSecond, letter: m[3] as IpLetter } : null;
}

/** One plain-English sentence for a whole code. */
export function ipSentence(c: IpCode): string {
  const solid: Record<IpFirst, string> = {
    X: 'not rated for solids',
    '0': 'no protection from solids',
    '1': 'keeps out a hand',
    '2': 'finger-safe',
    '3': 'keeps out tools',
    '4': 'keeps out wires',
    '5': 'dust-protected',
    '6': 'dust-tight',
  };
  const water: Record<IpSecond, string> = {
    X: 'not rated for water',
    '0': 'no protection from water',
    '1': 'copes with vertical drips',
    '2': 'copes with drips when tilted',
    '3': 'copes with spray',
    '4': 'copes with splashes from any direction',
    '5': 'copes with water jets',
    '6': 'copes with powerful jets',
    '7': 'survives a short dunking',
    '8': 'can stay under water',
  };
  const s = `${solid[c.first]}, and ${water[c.second]}`;
  const l = c.letter ? `; no touching live parts with a ${ipLetter[c.letter].short.toLowerCase()}` : '';
  return `${ipText(c)}: ${s.charAt(0).toUpperCase()}${s.slice(1)}${l}.`;
}

export const ipCommon = ['IP20', 'IPX4', 'IP44', 'IP65', 'IP67', 'IPX8'];

export interface IpTask {
  place: string;
  options: string[];
  answer: number;
  why: string;
}

export const ipGame: IpTask[] = [
  {
    place: 'A light directly above the bath, in zone 1',
    options: ['IP20', 'IPX4', 'IPX8'],
    answer: 1,
    why: 'Zone 1 needs at least IPX4: safe against splashes from any direction. Go to IPX5 if the room is cleaned with water jets.',
  },
  {
    place: 'A light set into the floor of a walk-in shower tray (zone 0)',
    options: ['IPX4', 'IPX5', 'IPX7'],
    answer: 2,
    why: 'Zone 0 can be under water, so it needs IPX7, and it must be 12 V SELV with the transformer outside the zones.',
  },
  {
    place: 'An extractor fan in zone 2',
    options: ['IP20', 'IPX4', 'IP68'],
    answer: 1,
    why: 'Zone 2 needs at least IPX4. IP68 would also be fine, but it is far more than needed and is rare on a fan.',
  },
  {
    place: 'A socket on the patio wall, where you use a pressure washer',
    options: ['IP20', 'IP44', 'IP66'],
    answer: 2,
    why: 'IP44 handles rain and splashes, but a pressure-washer jet needs a second digit of 5 or 6. IP66 also keeps dust out completely.',
  },
  {
    place: 'A light on the landing, outside the bathroom',
    options: ['IP2X', 'IPX4', 'IPX7'],
    answer: 0,
    why: 'No water here, so the general rule is enough: IP2X (or IPXXB) keeps fingers away from live parts.',
  },
  {
    place: 'A pond pump light that stays under water',
    options: ['IP44', 'IPX7', 'IPX8'],
    answer: 2,
    why: 'IPX7 is only for a short dunking. Something that lives under water needs IPX8.',
  },
];

/* ------------------------------------------------------------------ the extractor fan circuit */

export type FanPart = 'supply' | 'pull' | 'lamp' | 'sl' | 'fcu' | 'line' | 'neutral' | 'earth' | 'isolator' | 'fan';

export const fanParts: { id: FanPart; name: string; text: string }[] = [
  {
    id: 'supply',
    name: 'Lighting circuit',
    text: 'The fan is usually fed from the bathroom lighting circuit. Like every circuit serving the bathroom, it has 30 mA RCD protection.',
  },
  {
    id: 'pull',
    name: 'Pull-cord switch',
    text: 'Switches the bathroom light. Because the switched line also runs to the fan, pulling the cord starts the fan at the same time.',
  },
  { id: 'lamp', name: 'Bathroom light', text: 'The light shares the switched line with the fan, so light on means fan on.' },
  {
    id: 'sl',
    name: 'Switched line',
    text: 'Live only while the light is on. At the fan it is the “start” signal. Brown, like any line conductor (a black or grey core is sleeved brown).',
  },
  {
    id: 'fcu',
    name: 'Fused connection',
    text: 'Gives the fan its own small fuse, typically 3 A (follow the fan maker’s instructions). It feeds the permanent line.',
  },
  {
    id: 'line',
    name: 'Permanent line',
    text: 'Always live (while the isolator is on). It powers the timer, so the fan can keep running after the light goes off.',
  },
  { id: 'neutral', name: 'Neutral', text: 'Blue. Carries the current back. It is a live conductor too, which is why the isolator breaks it as well.' },
  {
    id: 'earth',
    name: 'Earth (cpc)',
    text: 'Green-and-yellow. Many fans are double-insulated with no earth terminal, but the earth still runs to the isolator and is terminated there.',
  },
  {
    id: 'isolator',
    name: 'Fan isolator',
    text: 'A switch that breaks all the poles: permanent line, switched line and neutral. Off means the fan is completely dead for cleaning or repair, even if someone pulls the light cord. It goes outside the zones, often just outside the door.',
  },
  {
    id: 'fan',
    name: 'Fan with run-on timer',
    text: 'Runs when the switched line goes live. When the light goes off, the timer keeps it running from the permanent line for a set time to clear the steam.',
  },
];

/* ------------------------------------------------------------------ quiz */

export const quiz: QuizQuestion[] = [
  {
    q: 'Which part of a bathroom is zone 0?',
    options: ['Inside the bath or shower tray itself', 'The space above the bath, up to 2.25 m', 'The 0.6 m band beside the bath'],
    answer: 0,
    why: 'Zone 0 is the inside of the bath or tray, where equipment can end up under water. Only 12 V SELV kit rated IPX7 may go there.',
  },
  {
    q: 'How far horizontally must an ordinary 13 A socket be from the edge of zone 1?',
    options: ['0.6 m', '2.25 m', '3 m'],
    answer: 2,
    why: 'At least 3 m. Most bathrooms are too small for that, which is why a shaver supply unit is the usual outlet.',
  },
  {
    q: 'A light is rated IP44. What does the second 4 tell you?',
    options: ['It keeps out wires over 1 mm', 'It copes with splashing water from any direction', 'It can be put under water'],
    answer: 1,
    why: 'The second digit is water. 4 means splashes from any direction. The first 4 is the one about 1 mm wires.',
  },
  {
    q: 'What is the usual way to switch a bathroom light?',
    options: ['A wall switch beside the bath', 'A ceiling pull-cord with an insulating cord', 'A switch inside the light fitting'],
    answer: 1,
    why: 'The cord is insulating, so a wet hand never touches anything at mains voltage. Wall switches are not allowed in the zones.',
  },
  {
    q: 'Why does a fan isolator break the switched line as well as the permanent line and neutral?',
    options: [
      'So the fan is fully dead even if someone switches the light on',
      'To make the run-on timer last longer',
      'It does not need to: one pole is enough',
    ],
    answer: 0,
    why: 'The switched line comes from the light switch, so it can be live when the permanent line is off. Breaking every pole makes the fan safe to work on.',
  },
];
