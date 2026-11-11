// Chapter 11: the workshop board as a pure model. No DOM in here.
//
// The board has a 32 A ring final circuit (six sockets) and a 6 A lighting radial (four light points),
// both behind one 30 mA RCD. Each circuit is a small resistor network; every reading the virtual tester
// gives is worked out from that network, so a planted fault changes the readings the same way it would
// on a real installation.

export type Cond = 'L' | 'N' | 'E';
export const CONDS: Cond[] = ['L', 'N', 'E'];
export const SOCKETS = 6;
export const LIGHTS = 4;

/** A terminal the probes can touch: `S0.L` (socket 1, line), `P2.E` (light 3, earth), `RA.N` (ring leg A at the board), `RB.E`, `LB.L` (lighting at the board). */
export type Term = string;
export type Group = 'S' | 'P' | 'RA' | 'RB' | 'LB';

export function parseTerm(t: Term): { group: Group; i: number; c: Cond } {
  const [head, c] = t.split('.') as [string, Cond];
  if (head === 'RA' || head === 'RB' || head === 'LB') return { group: head, i: 0, c };
  return { group: head[0] as Group, i: Number(head.slice(1)), c };
}

/* --------------------------------------------------------------------------------------------- */
/* Faults                                                                                        */
/* --------------------------------------------------------------------------------------------- */

export type Verdict = 'ok' | 'polarity' | 'no-cpc' | 'dud-socket' | 'broken-ring' | 'low-ir' | 'high-zs' | 'slow-rcd';

export type Fault =
  | { kind: 'polarity'; at: 'socket' | 'light'; i: number }
  | { kind: 'no-cpc'; i: number }
  | { kind: 'dud-socket'; i: number; ohms: number }
  | { kind: 'broken-ring'; cond: Cond; seg: number }
  | { kind: 'low-ir'; pair: 'LE' | 'NE'; megohms: number }
  | { kind: 'high-zs'; ohms: number }
  | { kind: 'slow-rcd'; t1: number; t5: number };

export interface Board {
  seed: number;
  /** External earth fault loop impedance, ohms. */
  ze: number;
  ring: { r1: number; rn: number; r2: number; pos: number[] };
  light: { r1: number; r2: number; pos: number[] };
  /** Small contact resistance for every terminal (sockets then lights), ohms. */
  contact: number[];
  rcd: { t1: number; t5: number; ramp: number };
  faults: Fault[];
}

/** Maximum Zs for type B MCBs at 0.4 s (BS 7671 Table 41.3), ohms. */
export const TYPE_B_MAX_ZS: Record<number, number> = { 6: 7.28, 10: 4.37, 16: 2.73, 20: 2.19, 25: 1.75, 32: 1.37 };
export const RING_RATING = 32;
export const LIGHT_RATING = 6;
/** Measured Zs is compared with 80% of the tabulated figure (the cable is cold when tested). */
export const zsLimit = (rating: number) => Math.round(TYPE_B_MAX_ZS[rating] * 0.8 * 100) / 100;
export const IR_MIN = 1.0; // MΩ, circuits up to 500 V, tested at 500 V DC
export const RCD_RATING = 30; // mA
export const UO = 230;

/** Copper conductor resistance at 20 °C, ohms per metre. */
const R_2_5 = 0.00741;
const R_1_5 = 0.0121;
const R_1_0 = 0.0181;
/** Resistance of un-nulled test leads, ohms. */
export const LEAD_OHMS = 0.16;
const LINK = 1e-4;

/** A small, fast, seedable random number generator (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (x: number, dp = 2) => Math.round(x * 10 ** dp) / 10 ** dp;

/** A healthy board (no faults) from a seed. */
export function healthyBoard(seed: number): Board {
  const r = rng(seed);
  const between = (lo: number, hi: number) => lo + (hi - lo) * r();
  const ringLen = between(36, 54);
  const lightLen = between(18, 32);
  const r1 = round(R_2_5 * ringLen, 3);
  const pos = Array.from({ length: SOCKETS }, (_, k) => (k + 1) / (SOCKETS + 1) + between(-0.04, 0.04));
  const lpos = [0.25, 0.48, 0.72, 1].map((p, k) => (k === 3 ? 1 : p + between(-0.05, 0.05)));
  return {
    seed,
    ze: round(between(0.18, 0.34)),
    ring: { r1, rn: round(r1 + between(-0.008, 0.008), 3), r2: round(R_1_5 * ringLen, 3), pos },
    light: { r1: round(R_1_5 * lightLen, 3), r2: round(R_1_0 * lightLen, 3), pos: lpos },
    contact: Array.from({ length: (SOCKETS + LIGHTS) * 3 }, () => round(between(0.001, 0.008), 4)),
    rcd: { t1: Math.round(between(17, 34)), t5: Math.round(between(9, 17)), ramp: Math.round(between(20, 27)) },
    faults: [],
  };
}

const FAULT_KINDS: Fault['kind'][] = ['polarity', 'no-cpc', 'dud-socket', 'broken-ring', 'low-ir', 'high-zs', 'slow-rcd'];

/** A board with three or four planted faults, all decided by the seed. */
export function generateBoard(seed: number): Board {
  const b = healthyBoard(seed);
  const r = rng(seed * 7919 + 17);
  const between = (lo: number, hi: number) => lo + (hi - lo) * r();
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];

  const kinds = [...FAULT_KINDS];
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  const count = r() < 0.5 ? 3 : 4;
  const chosen = kinds.slice(0, count);
  const freeSockets = Array.from({ length: SOCKETS }, (_, k) => k);
  const takeSocket = () => freeSockets.splice(Math.floor(r() * freeSockets.length), 1)[0];

  const faults: Fault[] = [];
  for (const kind of chosen) {
    switch (kind) {
      case 'polarity':
        faults.push(r() < 0.65 ? { kind, at: 'socket', i: takeSocket() } : { kind, at: 'light', i: Math.floor(r() * LIGHTS) });
        break;
      case 'no-cpc':
        faults.push({ kind, i: takeSocket() });
        break;
      case 'dud-socket':
        faults.push({ kind, i: takeSocket(), ohms: round(between(0.28, 0.42)) });
        break;
      case 'broken-ring':
        faults.push({ kind, cond: pick(CONDS), seg: 1 + Math.floor(r() * (SOCKETS - 1)) });
        break;
      case 'low-ir':
        faults.push({ kind, pair: r() < 0.5 ? 'LE' : 'NE', megohms: round(between(0.18, 0.75)) });
        break;
      case 'high-zs':
        faults.push({ kind, ohms: 0 }); // sized below, once the rest of the board is known
        break;
      case 'slow-rcd':
        faults.push({ kind, t1: Math.round(between(330, 460)), t5: Math.round(between(46, 72)) });
        break;
    }
  }
  b.faults = faults;

  // Size the loose earth-bar joint so every socket's Zs sits clearly over the 80% figure.
  const hz = faults.find((f) => f.kind === 'high-zs');
  if (hz && hz.kind === 'high-zs') {
    hz.ohms = 0;
    const zs = socketZs(b);
    hz.ohms = round(Math.max(0.3, zsLimit(RING_RATING) + between(0.08, 0.3) - Math.min(...zs)));
  } else {
    // Without that fault, keep other faults from pushing a socket's Zs over the limit on their own.
    const dud = faults.find((f) => f.kind === 'dud-socket');
    for (let guard = 0; guard < 20 && Math.max(...socketZs(b)) > zsLimit(RING_RATING) - 0.03; guard++) {
      if (dud && dud.kind === 'dud-socket' && dud.ohms > 0.15) dud.ohms = round(dud.ohms - 0.04);
      else b.ze = round(b.ze - 0.02);
    }
  }
  return b;
}

const socketZs = (b: Board) =>
  Array.from({ length: SOCKETS }, (_, k) => {
    const v = zsAt(b, `S${k}`);
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
  });

/* --------------------------------------------------------------------------------------------- */
/* Wiring and the resistor network                                                               */
/* --------------------------------------------------------------------------------------------- */

export type Circuit = 'ring' | 'light';

/** Which conductor of which circuit a terminal is really connected to (null: nothing). */
export function wiredTo(b: Board, t: Term): { circuit: Circuit; cond: Cond } | null {
  const { group, i, c } = parseTerm(t);
  if (group === 'RA' || group === 'RB') return { circuit: 'ring', cond: c };
  if (group === 'LB') return { circuit: 'light', cond: c };
  const swap = (x: Cond): Cond => (x === 'L' ? 'N' : x === 'N' ? 'L' : x);
  if (group === 'S') {
    if (c === 'E' && b.faults.some((f) => f.kind === 'no-cpc' && f.i === i)) return null;
    const rev = b.faults.some((f) => f.kind === 'polarity' && f.at === 'socket' && f.i === i);
    return { circuit: 'ring', cond: rev ? swap(c) : c };
  }
  const rev = b.faults.some((f) => f.kind === 'polarity' && f.at === 'light' && f.i === i);
  return { circuit: 'light', cond: rev ? swap(c) : c };
}

export type Link = 'none' | 'ring-LN' | 'ring-LE' | 'light-LE';
export type Res = [string, string, number];

/** The dead (isolated) installation as resistors, with the circuit ends disconnected at the board and an optional test link fitted. */
export function deadNetwork(b: Board, link: Link = 'none'): Res[] {
  const out: Res[] = [];
  const ringR = { L: b.ring.r1, N: b.ring.rn, E: b.ring.r2 };
  for (const c of CONDS) {
    const node = (j: number) => (j === 0 ? `RA.${c}` : j === SOCKETS + 1 ? `RB.${c}` : `r.${c}.${j - 1}`);
    const p = [0, ...b.ring.pos, 1];
    for (let j = 0; j <= SOCKETS; j++) {
      if (b.faults.some((f) => f.kind === 'broken-ring' && f.cond === c && f.seg === j)) continue;
      out.push([node(j), node(j + 1), ringR[c] * (p[j + 1] - p[j])]);
    }
  }
  for (let k = 0; k < SOCKETS; k++) {
    const dud = b.faults.find((f) => f.kind === 'dud-socket' && f.i === k);
    CONDS.forEach((c, ci) => {
      const t = `S${k}.${c}`;
      const w = wiredTo(b, t);
      if (!w) return;
      const extra = dud && dud.kind === 'dud-socket' && c === 'L' ? dud.ohms : 0;
      out.push([`r.${w.cond}.${k}`, t, b.contact[k * 3 + ci] + extra]);
    });
  }
  const lightR = { L: b.light.r1, N: b.light.r1, E: b.light.r2 };
  for (const c of CONDS) {
    let prev = `LB.${c}`;
    let prevPos = 0;
    b.light.pos.forEach((p, k) => {
      out.push([prev, `l.${c}.${k}`, lightR[c] * (p - prevPos)]);
      prev = `l.${c}.${k}`;
      prevPos = p;
    });
  }
  for (let k = 0; k < LIGHTS; k++) {
    CONDS.forEach((c, ci) => {
      const t = `P${k}.${c}`;
      const w = wiredTo(b, t)!;
      out.push([`l.${w.cond}.${k}`, t, b.contact[(SOCKETS + k) * 3 + ci]]);
    });
  }
  if (link === 'ring-LN') out.push(['RA.L', 'RB.N', LINK], ['RA.N', 'RB.L', LINK]);
  if (link === 'ring-LE') out.push(['RA.L', 'RB.E', LINK], ['RA.E', 'RB.L', LINK]);
  if (link === 'light-LE') out.push(['LB.L', 'LB.E', LINK]);
  return out;
}

/** The installation switched on: circuits connected back at the board, line bus and earth bar joined through Ze. */
export function liveNetwork(b: Board): Res[] {
  const hz = b.faults.find((f) => f.kind === 'high-zs');
  const joint = hz && hz.kind === 'high-zs' ? hz.ohms : 0;
  return [
    ...deadNetwork(b),
    ['RA.L', 'BUS', LINK],
    ['RB.L', 'BUS', LINK],
    ['LB.L', 'BUS', LINK],
    ['RA.E', 'RJ', LINK],
    ['RB.E', 'RJ', LINK],
    ['RJ', 'EBAR', LINK + joint],
    ['LB.E', 'EBAR', LINK],
    ['BUS', 'EBAR', b.ze],
  ];
}

/** Resistance between two nodes of a resistor network (Infinity if they are not connected). */
export function resistanceBetween(net: Res[], a: string, z: string): number {
  if (a === z) return 0;
  const adj = new Map<string, Res[]>();
  for (const r of net) {
    for (const n of [r[0], r[1]]) {
      if (!adj.has(n)) adj.set(n, []);
      adj.get(n)!.push(r);
    }
  }
  if (!adj.has(a) || !adj.has(z)) return Infinity;
  // Find a's connected component.
  const seen = new Set([a]);
  const stack = [a];
  while (stack.length) {
    const n = stack.pop()!;
    for (const [u, v] of adj.get(n)!) {
      for (const m of [u, v]) if (!seen.has(m)) (seen.add(m), stack.push(m));
    }
  }
  if (!seen.has(z)) return Infinity;
  // Nodal analysis: ground z, inject 1 A at a, solve G·V = I; then R = V(a).
  const nodes = [...seen].filter((n) => n !== z);
  const idx = new Map(nodes.map((n, i) => [n, i]));
  const n = nodes.length;
  const G = Array.from({ length: n }, () => new Float64Array(n + 1));
  for (const [u, v, R] of net) {
    if (!seen.has(u)) continue;
    const g = 1 / Math.max(R, 1e-9);
    const iu = idx.get(u);
    const iv = idx.get(v);
    if (iu !== undefined) G[iu][iu] += g;
    if (iv !== undefined) G[iv][iv] += g;
    if (iu !== undefined && iv !== undefined) {
      G[iu][iv] -= g;
      G[iv][iu] -= g;
    }
  }
  G[idx.get(a)!][n] = 1;
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(G[row][col]) > Math.abs(G[piv][col])) piv = row;
    [G[col], G[piv]] = [G[piv], G[col]];
    const d = G[col][col];
    if (Math.abs(d) < 1e-15) continue;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = G[row][col] / d;
      if (f === 0) continue;
      for (let k = col; k <= n; k++) G[row][k] -= f * G[col][k];
    }
  }
  const ia = idx.get(a)!;
  return G[ia][n] / G[ia][ia];
}

/** Zs at a socket (`S3`) or light point (`P1`): a number, or why there is no reading. */
export function zsAt(b: Board, point: string): number | 'polarity' | 'no-earth' {
  const wl = wiredTo(b, `${point}.L`);
  const we = wiredTo(b, `${point}.E`);
  if (!wl || wl.cond !== 'L') return 'polarity';
  if (!we) return 'no-earth';
  return resistanceBetween(liveNetwork(b), `${point}.L`, `${point}.E`);
}

/* --------------------------------------------------------------------------------------------- */
/* The tester                                                                                    */
/* --------------------------------------------------------------------------------------------- */

export type Mode = 'off' | 'cont' | 'ir' | 'zs' | 'rcd';
export type RcdTest = 'half' | 'x1' | 'x5' | 'ramp' | 'button';

export interface RigState {
  supplyOn: boolean;
  rcdTripped: boolean;
  nulled: boolean;
  /** Lamps taken out and equipment disconnected, ready for insulation testing. */
  lampsOut: boolean;
  mode: Mode;
  link: Link;
  red: Term | null;
  black: Term | null;
  /** Where the plug-in lead is, for Zs: `S2`, `P0`. */
  point: string | null;
  rcdTest: RcdTest | null;
}

export interface Reading {
  /** Main display text, such as `0.24`, `OL`, `>999`, `No trip`. */
  text: string;
  unit: string;
  /** Numeric value (Infinity for open circuit / over range / no trip), or null when there is no reading. */
  value: number | null;
  /** A refusal or warning instead of a reading (voltage present, no supply, no earth...). */
  error?: string;
  /** Second line on the display (PFC, test voltage...). */
  sub?: string;
  /** The RCD tripped during this test. */
  tripped?: boolean;
}

const fmtOhms = (r: number) => (r > 1999 ? 'OL' : r >= 100 ? r.toFixed(0) : r.toFixed(2));
export const fmtMegohms = (m: number) => (m > 999 ? '>999' : m >= 100 ? m.toFixed(0) : m >= 10 ? m.toFixed(1) : m.toFixed(2));

/** Insulation resistance between two terminals, MΩ (the circuit's equipment state matters for lighting L–N). */
export function insulationBetween(b: Board, x: Term, y: Term, lampsOut: boolean): number {
  const wx = wiredTo(b, x);
  const wy = wiredTo(b, y);
  if (!wx || !wy || wx.circuit !== wy.circuit) return Infinity;
  if (wx.cond === wy.cond) return 0;
  const pair = [wx.cond, wy.cond].sort().join('') as 'EL' | 'EN' | 'LN';
  if (wx.circuit === 'light') {
    if (pair === 'LN' && !lampsOut) return 0.0001; // the lamps join line and neutral
    const low = b.faults.find((f) => f.kind === 'low-ir');
    if (low && low.kind === 'low-ir' && ((low.pair === 'LE' && pair === 'EL') || (low.pair === 'NE' && pair === 'EN'))) return low.megohms;
  }
  return Infinity;
}

/** What the tester shows for the current rig state. Pure: the same board and state always give the same reading. */
export function measure(b: Board, s: RigState): Reading {
  const none: Reading = { text: '- - -', unit: '', value: null };
  switch (s.mode) {
    case 'off':
      return { text: '', unit: '', value: null };
    case 'cont': {
      if (s.supplyOn) return { ...none, unit: 'Ω', error: 'Voltage! Isolate first' };
      if (!s.red || !s.black) return { ...none, unit: 'Ω', sub: s.nulled ? 'Leads nulled' : 'Leads not nulled' };
      const r = resistanceBetween(deadNetwork(b, s.link), s.red, s.black) + (s.nulled ? 0 : LEAD_OHMS);
      return { text: fmtOhms(r), unit: 'Ω', value: r > 1999 ? Infinity : round(r), sub: s.nulled ? 'Leads nulled' : 'Leads not nulled' };
    }
    case 'ir': {
      if (s.supplyOn) return { ...none, unit: 'MΩ', error: 'Voltage! Isolate first' };
      if (!s.red || !s.black) return { ...none, unit: 'MΩ', sub: '500 V DC' };
      const m = insulationBetween(b, s.red, s.black, s.lampsOut);
      return { text: fmtMegohms(m), unit: 'MΩ', value: m > 999 ? Infinity : round(m), sub: '500 V DC' };
    }
    case 'zs': {
      if (!s.supplyOn) return { ...none, unit: 'Ω', error: 'No supply: switch on' };
      if (s.rcdTripped) return { ...none, unit: 'Ω', error: 'No supply: RCD tripped' };
      if (!s.point) return { ...none, unit: 'Ω', sub: 'Plug in at a point' };
      const z = zsAt(b, s.point);
      if (z === 'polarity') return { text: 'L⇄N', unit: '', value: null, error: 'Polarity reversed' };
      if (z === 'no-earth') return { text: 'OL', unit: 'Ω', value: Infinity, error: 'No earth' };
      return { text: z.toFixed(2), unit: 'Ω', value: round(z), sub: `PFC ${Math.round(UO / z)} A` };
    }
    case 'rcd': {
      if (!s.supplyOn) return { ...none, unit: 'ms', error: 'No supply: switch on' };
      if (s.rcdTripped) return { ...none, unit: 'ms', error: 'RCD tripped: reset it' };
      if (!s.rcdTest) return { ...none, unit: 'ms', sub: '30 mA · choose a test' };
      const slow = b.faults.find((f) => f.kind === 'slow-rcd');
      const t1 = slow && slow.kind === 'slow-rcd' ? slow.t1 : b.rcd.t1;
      const t5 = slow && slow.kind === 'slow-rcd' ? slow.t5 : b.rcd.t5;
      switch (s.rcdTest) {
        case 'half':
          return { text: 'No trip', unit: '', value: Infinity, sub: '×½ · 15 mA' };
        case 'x1':
          return { text: String(t1), unit: 'ms', value: t1, sub: '×1 · 30 mA', tripped: true };
        case 'x5':
          return { text: String(t5), unit: 'ms', value: t5, sub: '×5 · 150 mA', tripped: true };
        case 'ramp':
          return { text: String(b.rcd.ramp), unit: 'mA', value: b.rcd.ramp, sub: 'Ramp test', tripped: true };
        case 'button':
          return { text: 'Tripped', unit: '', value: 0, sub: 'Test button', tripped: true };
      }
    }
  }
}

/* --------------------------------------------------------------------------------------------- */
/* Judging a reading                                                                             */
/* --------------------------------------------------------------------------------------------- */

export type Place =
  | { type: 'socket'; i: number }
  | { type: 'light'; i: number }
  | { type: 'ring' }
  | { type: 'lighting' }
  | { type: 'rcd' }
  | { type: 'other' };

/** Where a reading was taken, for matching findings to faults. */
export function placeOf(s: RigState): Place {
  if (s.mode === 'rcd') return { type: 'rcd' };
  if (s.mode === 'zs') {
    if (!s.point) return { type: 'other' };
    return s.point[0] === 'S' ? { type: 'socket', i: Number(s.point.slice(1)) } : { type: 'light', i: Number(s.point.slice(1)) };
  }
  if (!s.red || !s.black) return { type: 'other' };
  const a = parseTerm(s.red);
  const z = parseTerm(s.black);
  const circuitOf = (g: Group) => (g === 'S' || g === 'RA' || g === 'RB' ? 'ring' : 'light');
  if (circuitOf(a.group) !== circuitOf(z.group)) return { type: 'other' };
  const pts = [a, z].filter((p) => p.group === 'S' || p.group === 'P');
  if (pts.length === 2 && (pts[0].group !== pts[1].group || pts[0].i !== pts[1].i)) return { type: 'other' };
  if (pts.length) return pts[0].group === 'S' ? { type: 'socket', i: pts[0].i } : { type: 'light', i: pts[0].i };
  return circuitOf(a.group) === 'ring' ? { type: 'ring' } : { type: 'lighting' };
}

export const placeLabel = (p: Place) =>
  p.type === 'socket'
    ? `Socket ${p.i + 1}`
    : p.type === 'light'
      ? `Light ${p.i + 1}`
      : p.type === 'ring'
        ? 'Ring, at the board'
        : p.type === 'lighting'
          ? 'Lighting, at the board'
          : p.type === 'rcd'
            ? 'RCD'
            : 'Between circuits';

export type Flag = 'ok' | 'bad' | 'info';
export interface Assessment {
  flag: Flag;
  hint: string;
}

const termLabel = (t: Term) => {
  const { group, i, c } = parseTerm(t);
  const where = group === 'S' ? `S${i + 1}` : group === 'P' ? `Light ${i + 1}` : group === 'RA' ? 'Ring A' : group === 'RB' ? 'Ring B' : 'Lights';
  return `${where} ${c === 'E' ? 'CPC' : c}`;
};

/** A short description of the test just done, for the schedule. */
export function describeTest(s: RigState): string {
  const linkText: Record<Link, string> = {
    none: '',
    'ring-LN': ' · L–N crossed',
    'ring-LE': ' · L–CPC crossed',
    'light-LE': ' · L–CPC linked',
  };
  switch (s.mode) {
    case 'cont':
      return `Continuity${linkText[s.link]} · ${s.red ? termLabel(s.red) : '?'} to ${s.black ? termLabel(s.black) : '?'}`;
    case 'ir':
      return `Insulation 500 V · ${s.red ? termLabel(s.red) : '?'} to ${s.black ? termLabel(s.black) : '?'}`;
    case 'zs':
      return `Zs at ${s.point ? placeLabel(placeOf(s)) : '?'}`;
    case 'rcd':
      return { half: 'RCD ×½', x1: 'RCD ×1', x5: 'RCD ×5', ramp: 'RCD ramp', button: 'RCD test button' }[s.rcdTest ?? 'button'];
    default:
      return '';
  }
}

/** Compare a reading with what a healthy board would show, and with the limits. Gives a gentle hint, never the answer. */
export function assess(b: Board, s: RigState): Assessment {
  const r = measure(b, s);
  const healthy = measure({ ...b, faults: [] }, s);
  if (r.value === null && !r.error) return { flag: 'info', hint: '' };

  if (s.mode === 'cont') {
    if (r.error) return { flag: 'info', hint: 'Continuity is a dead test. Switch off at the main switch first.' };
    const nullNote = s.nulled ? '' : ' (Your leads are not nulled, so about 0.16 Ω of lead is in this reading. Null them first.)';
    const a = parseTerm(s.red!);
    const z = parseTerm(s.black!);
    const bad =
      Number.isFinite(r.value!) !== Number.isFinite(healthy.value!) ||
      (Number.isFinite(r.value!) && Math.abs(r.value! - healthy.value!) > 0.05);
    const pair = [a.c, z.c].sort().join('');
    const atEnds = (a.group === 'RA' && z.group === 'RB') || (a.group === 'RB' && z.group === 'RA');
    const sameSocket = a.group === 'S' && z.group === 'S' && a.i === z.i;
    const sameLight = a.group === 'P' && z.group === 'P' && a.i === z.i;
    let hint: string;
    if (s.link === 'none' && atEnds && a.c === z.c) {
      hint = bad
        ? r.value === Infinity
          ? 'No continuity from one end of this ring conductor to the other. What could cause that?'
          : 'This end-to-end reading does not fit a healthy ring. Line and neutral should match closely. What could cause it?'
        : `An end-to-end reading (${a.c === 'L' ? 'r1' : a.c === 'N' ? 'rn' : 'r2'}). Line and neutral should match within about 0.05 Ω; the 1.5 mm² CPC reads about 1.67 times as much.`;
    } else if (s.link === 'ring-LN' && sameSocket && pair === 'LN') {
      hint = bad
        ? r.value === Infinity
          ? 'No reading at all here. What could stop the loop reaching this socket?'
          : 'That reading does not fit a healthy ring: in this step every socket should read about the same. What could cause it?'
        : 'About a quarter of (r1 + rn). On a healthy ring every socket reads about the same in this step.';
    } else if (s.link === 'ring-LE' && sameSocket) {
      hint = bad
        ? r.value === Infinity
          ? 'No reading here. Is the CPC reaching this socket, and is it really line in the L terminal? Try the N terminal against the CPC too.'
          : pair === 'EN'
            ? 'A reading between neutral and CPC, with line crossed to CPC at the board? Something is in the wrong terminal.'
            : 'That reading does not fit a healthy ring: the readings should be close to each other. What could cause it?'
        : pair === 'EL'
          ? 'About a quarter of (r1 + r2). The highest of these readings is R1 + R2 for the circuit, and getting one at each socket proves polarity.'
          : 'No reading between these with line crossed to the CPC: as expected.';
    } else if (s.link === 'light-LE' && sameLight) {
      hint = bad
        ? r.value === Infinity
          ? 'No line-to-CPC reading at this light. What is really in the L terminal? Try N against the CPC.'
          : 'That does not fit a healthy circuit. What could cause it?'
        : pair === 'EL'
          ? 'That is R1 + R2 to this light, and it proves line reaches the L terminal (polarity).'
          : 'No reading here with line linked to CPC: as expected.';
    } else {
      hint = bad ? 'That is not what a healthy installation reads here. What could cause it?' : 'That fits a healthy installation for this set-up.';
    }
    return { flag: bad ? 'bad' : s.nulled ? 'ok' : 'info', hint: hint + nullNote };
  }

  if (s.mode === 'ir') {
    if (r.error) return { flag: 'info', hint: 'Insulation testing is a dead test, at 500 V: switch off and isolate first.' };
    const wx = wiredTo(b, s.red!);
    const wy = wiredTo(b, s.black!);
    const hx = wiredTo({ ...b, faults: [] }, s.red!);
    const hy = wiredTo({ ...b, faults: [] }, s.black!);
    if (healthy.value === 0 && r.value === 0 && hx && hy && hx.cond === hy.cond)
      return { flag: 'info', hint: 'Both probes are on the same conductor, so there is no insulation between them to test.' };
    if (!s.lampsOut && wx?.circuit === 'light' && wy?.circuit === 'light' && healthy.value !== null && healthy.value < IR_MIN && hx?.cond !== hy?.cond)
      return { flag: 'info', hint: 'Did you take the lamps out and disconnect equipment? A lamp joins line and neutral, so the tester sees a near short. Tick “lamps out” and test again.' };
    if (r.value! < IR_MIN)
      return { flag: 'bad', hint: 'Below the 1.0 MΩ minimum. Something is letting current leak (or short) between these two conductors. What could cause that?' };
    return { flag: 'ok', hint: 'Well above the 1.0 MΩ minimum. An over-range reading like this is normal for a healthy circuit.' };
  }

  if (s.mode === 'zs') {
    if (r.error === 'Polarity reversed') return { flag: 'bad', hint: 'The tester shows line and neutral the wrong way round at this point. What has happened here?' };
    if (r.error === 'No earth') return { flag: 'bad', hint: 'No earth loop at this point at all. What could cause that?' };
    if (r.error) return { flag: 'info', hint: 'Zs is a live test. Do the dead tests first, then switch on (and reset the RCD if it tripped).' };
    const ring = s.point![0] === 'S';
    const rating = ring ? RING_RATING : LIGHT_RATING;
    const lim = zsLimit(rating);
    return r.value! > lim
      ? { flag: 'bad', hint: `Over the limit: 80% of the tabulated ${TYPE_B_MAX_ZS[rating]} Ω for a ${rating} A type B is ${lim.toFixed(2)} Ω. What could add resistance to the earth fault path?` }
      : { flag: 'ok', hint: `Within 80% of the tabulated maximum (${lim.toFixed(2)} Ω for a ${rating} A type B). The fault current would trip the breaker in time.` };
  }

  if (s.mode === 'rcd') {
    if (r.error) return { flag: 'info', hint: 'RCD tests are live tests. Switch on, and reset the RCD if it has tripped.' };
    switch (s.rcdTest) {
      case 'half':
        return { flag: 'ok', hint: 'No trip at half its rating: good, it should not trip on small everyday leakage.' };
      case 'x1':
        return r.value! > 300
          ? { flag: 'bad', hint: 'Slower than 300 ms at its rated 30 mA. Is this RCD doing its job?' }
          : { flag: 'ok', hint: 'Within 300 ms at its rated 30 mA.' };
      case 'x5':
        return r.value! > 40
          ? { flag: 'bad', hint: 'Slower than 40 ms at five times its rating. That is too slow for extra protection.' }
          : { flag: 'ok', hint: 'Within 40 ms at five times its rating: fast enough for extra protection.' };
      case 'ramp':
        return r.value! < 15 || r.value! > 30
          ? { flag: 'bad', hint: 'A 30 mA RCD should trip somewhere between 15 and 30 mA on the ramp test.' }
          : { flag: 'ok', hint: 'Tripped between 15 and 30 mA (50% to 100% of its rating), as it should.' };
      default:
        return { flag: 'ok', hint: 'The test button trips it, so the mechanism works. (This does not test the trip time.)' };
    }
  }
  return { flag: 'info', hint: '' };
}

/* --------------------------------------------------------------------------------------------- */
/* Findings and the final reveal                                                                 */
/* --------------------------------------------------------------------------------------------- */

export interface LoggedRow {
  id: number;
  test: string;
  place: Place;
  text: string;
  unit: string;
  value: number | null;
  error?: string;
  flag: Flag;
  hint: string;
  verdict: Verdict;
  /** What the reading was, for filling in the certificate. */
  state: RigState;
}

const ringPlace = (p: Place) => p.type === 'ring' || p.type === 'socket';
const lightPlace = (p: Place) => p.type === 'lighting' || p.type === 'light';

/** Does a finding (verdict at a place) match this planted fault? */
export function matchesFault(f: Fault, verdict: Verdict, p: Place): boolean {
  if (verdict !== f.kind) return false;
  return faultCovers(f, p);
}

/** Is this place one where the fault shows up? */
export function faultCovers(f: Fault, p: Place): boolean {
  switch (f.kind) {
    case 'polarity':
      return p.type === f.at && p.i === f.i;
    case 'no-cpc':
    case 'dud-socket':
      return p.type === 'socket' && p.i === f.i;
    case 'broken-ring':
    case 'high-zs':
      return ringPlace(p);
    case 'low-ir':
      return lightPlace(p);
    case 'slow-rcd':
      return p.type === 'rcd';
  }
}

export function describeFault(f: Fault): string {
  const cond = (c: Cond) => (c === 'L' ? 'line' : c === 'N' ? 'neutral' : 'CPC');
  switch (f.kind) {
    case 'polarity':
      return `${f.at === 'socket' ? 'Socket' : 'Light'} ${f.i + 1}: line and neutral swapped (reversed polarity).`;
    case 'no-cpc':
      return `Socket ${f.i + 1}: the CPC is not connected to the earth terminal.`;
    case 'dud-socket':
      return `Socket ${f.i + 1}: a loose, high-resistance connection inside the socket (+${f.ohms.toFixed(2)} Ω).`;
    case 'broken-ring':
      return `Ring: the ${cond(f.cond)} is broken between ${f.seg === 0 ? 'the board' : `socket ${f.seg}`} and socket ${f.seg + 1}.`;
    case 'low-ir':
      return `Lighting: insulation breaking down between ${f.pair === 'LE' ? 'line and CPC' : 'neutral and CPC'} (${f.megohms.toFixed(2)} MΩ).`;
    case 'high-zs':
      return `Ring: a loose CPC connection at the earth bar adds ${f.ohms.toFixed(2)} Ω, so Zs is too high at every socket.`;
    case 'slow-rcd':
      return `RCD: too slow (${f.t1} ms at ×1, ${f.t5} ms at ×5).`;
  }
}

export interface Score {
  results: { fault: Fault; state: 'found' | 'misnamed' | 'missed' }[];
  falseAlarms: LoggedRow[];
  found: number;
  total: number;
  /** Every planted fault found. */
  complete: boolean;
}

export function scoreFindings(b: Board, rows: LoggedRow[]): Score {
  const results = b.faults.map((fault) => {
    if (rows.some((r) => matchesFault(fault, r.verdict, r.place))) return { fault, state: 'found' as const };
    if (rows.some((r) => r.verdict !== 'ok' && r.flag === 'bad' && faultCovers(fault, r.place))) return { fault, state: 'misnamed' as const };
    return { fault, state: 'missed' as const };
  });
  // A false alarm is a fault marked on a reading that a healthy installation would also give.
  const falseAlarms = rows.filter((r) => r.verdict !== 'ok' && r.flag !== 'bad' && !b.faults.some((f) => matchesFault(f, r.verdict, r.place)));
  const found = results.filter((r) => r.state === 'found').length;
  return { results, falseAlarms, found, total: b.faults.length, complete: found === b.faults.length };
}

/* --------------------------------------------------------------------------------------------- */
/* From the log to the certificate                                                               */
/* --------------------------------------------------------------------------------------------- */

export type CertField = 'r1' | 'rn' | 'r2' | 'r1r2' | 'irLN' | 'irLE' | 'irNE' | 'polarity' | 'zs';
export type CircuitValues = Partial<Record<CertField, string>>;
export interface CertValues {
  ring: CircuitValues;
  light: CircuitValues;
  rcd1: string;
  rcd5: string;
  rcdButton: string;
}

const show = (v: number) => (v === Infinity ? 'OL' : v.toFixed(2));

/** Fill the schedule of test results from the logged readings (the worst reading of each kind wins). */
export function summariseLog(b: Board, rows: LoggedRow[]): CertValues {
  const out: CertValues = { ring: {}, light: {}, rcd1: '', rcd5: '', rcdButton: '' };
  const worst = (cur: string | undefined, v: number, higherIsWorse: boolean) => {
    const parse = (t: string) => (t === 'OL' ? Infinity : t === '>999' ? Infinity : Number(t));
    if (cur === undefined || cur === '') return v;
    const c = parse(cur);
    return higherIsWorse ? Math.max(c, v) : Math.min(c, v);
  };
  for (const row of rows) {
    const s = row.state;
    if (row.error && s.mode !== 'zs') continue;
    if (s.mode === 'cont' && s.red && s.black && row.value !== null) {
      const v = s.nulled ? row.value : Math.max(0, row.value - LEAD_OHMS);
      const a = parseTerm(s.red);
      const z = parseTerm(s.black);
      const atEnds = (a.group === 'RA' && z.group === 'RB') || (a.group === 'RB' && z.group === 'RA');
      if (s.link === 'none' && atEnds && a.c === z.c) {
        const key = a.c === 'L' ? 'r1' : a.c === 'N' ? 'rn' : 'r2';
        out.ring[key] = show(v);
      }
      const pair = [a.c, z.c].sort().join('');
      if (s.link === 'ring-LE' && a.group === 'S' && z.group === 'S' && a.i === z.i && pair === 'EL')
        out.ring.r1r2 = show(worst(out.ring.r1r2, v, true));
      if (s.link === 'light-LE' && a.group === 'P' && z.group === 'P' && a.i === z.i && pair === 'EL')
        out.light.r1r2 = show(worst(out.light.r1r2, v, true));
    }
    if (s.mode === 'ir' && s.red && s.black && row.value !== null) {
      const wx = wiredTo({ ...b, faults: [] }, s.red);
      const wy = wiredTo({ ...b, faults: [] }, s.black);
      if (wx && wy && wx.circuit === wy.circuit && wx.cond !== wy.cond && row.flag !== 'info') {
        const pair = [wx.cond, wy.cond].sort().join('');
        const key = pair === 'LN' ? 'irLN' : pair === 'EL' ? 'irLE' : 'irNE';
        const m = worst(out[wx.circuit][key], row.value, false);
        out[wx.circuit][key] = m === Infinity ? '>999' : m.toFixed(2);
      }
    }
    if (s.mode === 'zs' && s.point) {
      const c: Circuit = s.point[0] === 'S' ? 'ring' : 'light';
      if (row.error === 'Polarity reversed') out[c].polarity = '✗';
      else if (row.value !== null) {
        out[c].zs = show(worst(out[c].zs, row.value, true));
        if (!out[c].polarity) out[c].polarity = '✓';
      }
    }
    if (s.mode === 'rcd' && row.value !== null) {
      if (s.rcdTest === 'x1') out.rcd1 = String(Math.max(Number(out.rcd1 || 0), row.value));
      if (s.rcdTest === 'x5') out.rcd5 = String(Math.max(Number(out.rcd5 || 0), row.value));
      if (s.rcdTest === 'button') out.rcdButton = '✓';
    }
  }
  return out;
}

export type Check = 'ok' | 'bad' | 'empty';
const parseNum = (t: string | undefined) => {
  const v = (t ?? '').trim().toUpperCase();
  if (!v) return null;
  if (v === 'OL' || v.startsWith('>')) return Infinity;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

/** Is one value on the schedule within limits? */
export function checkField(circuit: Circuit, field: CertField, text: string | undefined, all?: CircuitValues): Check {
  if (field === 'polarity') {
    const v = (text ?? '').trim();
    return !v ? 'empty' : v === '✓' ? 'ok' : 'bad';
  }
  const n = parseNum(text);
  if (n === null) return 'empty';
  if (Number.isNaN(n)) return 'bad';
  switch (field) {
    case 'r1':
    case 'rn':
    case 'r2': {
      if (n === Infinity) return 'bad';
      if (field !== 'r2' && all) {
        const other = parseNum(field === 'r1' ? all.rn : all.r1);
        if (other !== null && Number.isFinite(other) && Math.abs(other - n) > 0.05) return 'bad';
      }
      return 'ok';
    }
    case 'r1r2':
      return n === Infinity ? 'bad' : 'ok';
    case 'irLN':
    case 'irLE':
    case 'irNE':
      return n >= IR_MIN ? 'ok' : 'bad';
    case 'zs':
      return n <= zsLimit(circuit === 'ring' ? RING_RATING : LIGHT_RATING) ? 'ok' : 'bad';
  }
}

export function checkRcd(field: 'rcd1' | 'rcd5' | 'rcdButton', text: string): Check {
  if (field === 'rcdButton') return !text ? 'empty' : text === '✓' ? 'ok' : 'bad';
  const n = parseNum(text);
  if (n === null) return 'empty';
  if (Number.isNaN(n)) return 'bad';
  return n <= (field === 'rcd1' ? 300 : 40) ? 'ok' : 'bad';
}

/** Overall outcome: any result outside limits, or any inspection item marked ✗, makes it unsatisfactory. */
export function certOutcome(v: CertValues, inspections: string[]): { outcome: 'satisfactory' | 'unsatisfactory' | 'incomplete'; problems: number; missing: number } {
  let problems = 0;
  let missing = 0;
  const tally = (c: Check) => (c === 'bad' ? problems++ : c === 'empty' ? missing++ : 0);
  const fields: [Circuit, CertField[]][] = [
    ['ring', ['r1', 'rn', 'r2', 'r1r2', 'irLN', 'irLE', 'irNE', 'polarity', 'zs']],
    ['light', ['r1r2', 'irLN', 'irLE', 'irNE', 'polarity', 'zs']],
  ];
  for (const [c, fs] of fields) for (const f of fs) tally(checkField(c, f, v[c][f], v[c]));
  tally(checkRcd('rcd1', v.rcd1));
  tally(checkRcd('rcd5', v.rcd5));
  tally(checkRcd('rcdButton', v.rcdButton));
  for (const i of inspections) if (i === '✗') problems++;
  if (problems) return { outcome: 'unsatisfactory', problems, missing };
  return { outcome: missing ? 'incomplete' : 'satisfactory', problems, missing };
}
