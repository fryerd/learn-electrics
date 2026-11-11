// Chapter 6: the earth fault loop. Pure calculations (no DOM), so they can be checked on their own.

export type BreakerType = 'B' | 'C';

export const NOMINAL_V = 230;

/** Breaker ratings offered in the sandbox (amps). */
export const RATINGS = [6, 10, 16, 20, 25, 32, 40, 50] as const;

/**
 * Maximum earth fault loop impedance (ohms) for 0.4 s disconnection at 230 V,
 * for type B and type C circuit breakers.
 */
export const MAX_ZS: Record<BreakerType, Record<number, number>> = {
  B: { 6: 7.28, 10: 4.37, 16: 2.73, 20: 2.19, 25: 1.75, 32: 1.37, 40: 1.09, 50: 0.87 },
  C: { 6: 3.64, 10: 2.19, 16: 1.37, 20: 1.09, 25: 0.87, 32: 0.68, 40: 0.55, 50: 0.44 },
};

/** Roughly how many times its rating a breaker needs to trip "instantly" (magnetic trip). */
export const INSTANT_MULTIPLE: Record<BreakerType, number> = { B: 5, C: 10 };

/** Resistance of one copper conductor at 20 °C, milliohms per metre, by cross-sectional area (mm²). */
export const COPPER_MOHM_PER_M: Record<string, number> = {
  '1.0': 18.1,
  '1.5': 12.1,
  '2.5': 7.41,
  '4': 4.61,
  '6': 3.08,
};

export interface Cable {
  id: string;
  /** Line conductor size, mm². */
  line: string;
  /** Circuit protective conductor (CPC) size, mm². */
  cpc: string;
}

/** Twin and earth sizes (line / CPC). R1 + R2 per metre is the sum of the two copper figures. */
export const CABLES: Cable[] = [
  { id: '1.0/1.0', line: '1.0', cpc: '1.0' },
  { id: '1.5/1.0', line: '1.5', cpc: '1.0' },
  { id: '1.5/1.5', line: '1.5', cpc: '1.5' },
  { id: '2.5/1.5', line: '2.5', cpc: '1.5' },
  { id: '2.5/2.5', line: '2.5', cpc: '2.5' },
  { id: '4/1.5', line: '4', cpc: '1.5' },
  { id: '4/2.5', line: '4', cpc: '2.5' },
  { id: '6/2.5', line: '6', cpc: '2.5' },
];

export const cableById = (id: string) => CABLES.find((c) => c.id === id) ?? CABLES[3];

/** R1 + R2 per metre for a cable, milliohms. */
export const r1r2PerMetre = (c: Cable) => COPPER_MOHM_PER_M[c.line] + COPPER_MOHM_PER_M[c.cpc];

export interface Setup {
  /** External earth fault loop impedance, ohms. */
  ze: number;
  cable: string;
  /** Radial: length of the run to the furthest point. Ring: total end-to-end length of the ring. Metres. */
  length: number;
  ring: boolean;
  type: BreakerType;
  rating: number;
}

export type Status = 'pass' | 'warn' | 'fail';

export interface Result {
  r1: number;
  r2: number;
  r1r2: number;
  zs: number;
  /** Prospective earth fault current, amps. */
  fault: number;
  /** Fault current as a multiple of the breaker rating. */
  multiple: number;
  maxZs: number;
  /** 80% of the maximum: what a measured (cool) reading is compared with. */
  limit80: number;
  status: Status;
  /** True if the breaker would disconnect within 0.4 s with the cable at its tested temperature. */
  fastEnough: boolean;
  /** Below the current a breaker is guaranteed to trip at all (1.45 × In). */
  mayNeverTrip: boolean;
}

/**
 * The resistances seen at the furthest point of the circuit. On a radial that is the end of the run.
 * On a ring it is the middle: two equal halves in parallel, so a quarter of the end-to-end value.
 */
export function cableResistance(s: Pick<Setup, 'cable' | 'length' | 'ring'>) {
  const c = cableById(s.cable);
  const f = s.ring ? 0.25 : 1;
  const r1 = (COPPER_MOHM_PER_M[c.line] * s.length * f) / 1000;
  const r2 = (COPPER_MOHM_PER_M[c.cpc] * s.length * f) / 1000;
  return { r1, r2, r1r2: r1 + r2 };
}

export function analyse(s: Setup): Result {
  const { r1, r2, r1r2 } = cableResistance(s);
  const zs = s.ze + r1r2;
  const fault = NOMINAL_V / zs;
  const multiple = fault / s.rating;
  const maxZs = MAX_ZS[s.type][s.rating];
  const limit80 = maxZs * 0.8;
  const fastEnough = zs <= maxZs + 1e-9;
  const status: Status = zs <= limit80 + 1e-9 ? 'pass' : fastEnough ? 'warn' : 'fail';
  return { r1, r2, r1r2, zs, fault, multiple, maxZs, limit80, status, fastEnough, mayNeverTrip: multiple < 1.45 };
}

/** The longest length (m) that still meets the 80% check, or 0 if even a zero-length cable fails. */
export function maxLength(s: Omit<Setup, 'length'>): number {
  const spare = MAX_ZS[s.type][s.rating] * 0.8 - s.ze;
  if (spare <= 0) return 0;
  const perM = r1r2PerMetre(cableById(s.cable)) / 1000;
  return (spare / perM) * (s.ring ? 4 : 1);
}

/** A believable meter reading: a little scatter around the true value, rounded like a real display. */
export function meterReading(zs: number, rand: () => number = Math.random): number {
  // two uniform samples give a soft bell-shaped spread of about ±2%
  const spread = (rand() + rand() - 1) * 0.02;
  const raw = zs * (1 + spread) + (rand() - 0.5) * 0.02;
  const v = Math.max(0.01, raw);
  return v >= 20 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100;
}
