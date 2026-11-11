// Chapter 4: pure calculations (no DOM). Simplified, but honest about the limits in the standards.
import { RCD_ORDER, type CircuitSpec, type Protection, type RcdType } from '../data/consumer-unit-lesson';

/* ------------------------------------------------------------- MCB curves */

export type Curve = 'B' | 'C';
/** The instantaneous (magnetic) trip window as multiples of In (BS EN 60898). */
export const MAGNETIC: Record<Curve, [number, number]> = { B: [3, 5], C: [5, 10] };
/** Must not trip within an hour at 1.13 In; must trip within an hour at 1.45 In. */
export const M_NO_TRIP = 1.13;
export const M_TRIP = 1.45;
export const T_MAX = 10000; // chart ceiling, seconds
export const INSTANT_MIN = 0.005;
export const INSTANT_MAX = 0.1;

// Log-log interpolation through anchor points, then an I²t-style slope of -2 beyond the last one.
function loglog(points: [number, number][], m: number): number {
  if (m < points[0][0]) return T_MAX;
  for (let i = 1; i < points.length; i++) {
    const [m0, t0] = points[i - 1];
    const [m1, t1] = points[i];
    if (m <= m1) {
      const f = Math.log(m / m0) / Math.log(m1 / m0);
      return Math.exp(Math.log(t0) + f * Math.log(t1 / t0));
    }
  }
  const [mL, tL] = points[points.length - 1];
  return tL * (m / mL) ** -2;
}

/** The fastest a typical breaker's thermal part could trip at m × In (seconds). */
export const thermalFast = (m: number) => Math.min(T_MAX, loglog([[1.16, T_MAX], [M_TRIP, 60], [2.55, 1]], m));
/** The slowest it is allowed to be (1 h at 1.45 In, 60 s at 2.55 In); no limit below 1.45 In. */
export const thermalSlow = (m: number) => (m < M_TRIP ? T_MAX : Math.min(T_MAX, loglog([[M_TRIP, 3600], [2.55, 60]], m)));

export type TripZone = 'none' | 'maybe' | 'thermal' | 'either' | 'instant';
export interface TripResult {
  zone: TripZone;
  /** Seconds. Infinity when it will not trip. */
  tMin: number;
  tMax: number;
}

export function tripAt(curve: Curve, m: number): TripResult {
  const [lo, hi] = MAGNETIC[curve];
  if (m < M_NO_TRIP) return { zone: 'none', tMin: Infinity, tMax: Infinity };
  if (m < M_TRIP) return { zone: 'maybe', tMin: thermalFast(m), tMax: Infinity };
  if (m < lo) return { zone: 'thermal', tMin: thermalFast(m), tMax: thermalSlow(m) };
  if (m < hi) return { zone: 'either', tMin: INSTANT_MIN, tMax: thermalSlow(m) };
  return { zone: 'instant', tMin: INSTANT_MIN, tMax: INSTANT_MAX };
}

export function fmtTime(s: number): string {
  if (!isFinite(s)) return 'never';
  if (s < 1) return `${Math.max(1, Math.round(s * 1000))} ms`;
  if (s < 60) return `${s < 10 ? s.toFixed(1) : Math.round(s)} s`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  return `${(s / 3600).toFixed(1)} h`;
}

/** Slider position (0..1000) to multiple of In, log scale from 0.5 to 40. */
export const M_MIN = 0.5;
export const M_MAX = 40;
export const sliderToM = (v: number) => M_MIN * (M_MAX / M_MIN) ** (v / 1000);
export const mToSlider = (m: number) => Math.round((1000 * Math.log(m / M_MIN)) / Math.log(M_MAX / M_MIN));

/* --------------------------------------------------------------- RCD tests */

export type RcdHealth = 'healthy' | 'sluggish' | 'sensitive';
export type RcdTest = 'ramp' | 'half' | 'x1' | 'x5';
export const RATED_MA = 30;

export interface RcdReading {
  test: RcdTest;
  /** mA for the ramp test, ms for the timed tests. null = did not trip. */
  value: number | null;
  pass: boolean;
}

const between = (rnd: () => number, a: number, b: number) => a + (b - a) * rnd();

export const TEST_INFO: Record<RcdTest, { label: string; current: string; limit: string }> = {
  ramp: { label: 'Ramp', current: '0 → 30 mA', limit: 'trips between 15 and 30 mA' },
  half: { label: '½ ×', current: '15 mA', limit: 'must not trip' },
  x1: { label: '1 ×', current: '30 mA', limit: 'within 300 ms' },
  x5: { label: '5 ×', current: '150 mA', limit: 'within 40 ms' },
};

/** A generated reading for a 30 mA RCD in the given condition. `rnd` returns 0..1. */
export function runRcdTest(test: RcdTest, health: RcdHealth, rnd: () => number = Math.random): RcdReading {
  let value: number | null;
  switch (test) {
    case 'ramp':
      // A sluggish RCD can still trip inside the current window: it is the timing that gives it away.
      value = Math.round(health === 'healthy' ? between(rnd, 18, 27) : health === 'sluggish' ? between(rnd, 27, 30) : between(rnd, 9, 14));
      return { test, value, pass: value !== null && value > 15 && value <= 30 };
    case 'half':
      value = health === 'sensitive' ? Math.round(between(rnd, 22, 45)) : null;
      return { test, value, pass: value === null };
    case 'x1':
      value = Math.round(health === 'sluggish' ? between(rnd, 330, 460) : between(rnd, 16, 38));
      return { test, value, pass: value <= 300 };
    case 'x5':
      value = Math.round(health === 'sluggish' ? between(rnd, 45, 75) : between(rnd, 8, 20));
      return { test, value, pass: value <= 40 };
  }
}

/* ------------------------------------------------------------ build check */

export type Verdict = 'pending' | 'ok' | 'warn' | 'bad';
export interface WayCheck {
  state: Verdict;
  rating: { state: Verdict; msg: string };
  rcd: { state: Verdict; msg: string };
}

const rank = (t: RcdType) => RCD_ORDER.indexOf(t);
const worst = (a: Verdict, b: Verdict): Verdict => {
  const order: Verdict[] = ['ok', 'warn', 'pending', 'bad'];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
};

export function checkWay(spec: CircuitSpec, rating: number | null, prot: Protection | null): WayCheck {
  let r: WayCheck['rating'];
  if (rating === null) r = { state: 'pending', msg: 'Pick a breaker size.' };
  else if (rating === spec.rating) r = { state: 'ok', msg: `${rating} A is right. ${spec.ratingWhy}` };
  else if (spec.okRatings?.includes(rating)) r = { state: 'warn', msg: `${rating} A can work, but ${spec.rating} A is the usual choice. ${spec.ratingWhy}` };
  else if (rating < spec.rating) r = { state: 'bad', msg: `${rating} A is too small. ${spec.tooSmall || spec.ratingWhy}` };
  else r = { state: 'bad', msg: `${rating} A is too big. The breaker protects the cable, and this circuit’s cable could overheat before ${rating} A trips it. ${spec.ratingWhy}` };

  let c: WayCheck['rcd'];
  if (prot === null) c = { state: 'pending', msg: 'Pick the RCD protection.' };
  else if (prot === 'none') c = { state: 'bad', msg: 'This needs 30 mA RCD protection. Modern rules give almost every circuit in a home an RCD.' };
  else if (rank(prot) < rank(spec.rcd)) c = { state: 'bad', msg: `Type ${prot} is not enough. ${spec.rcdWhy}` };
  else if (prot === spec.rcd) c = { state: 'ok', msg: `Type ${prot} is right. ${spec.rcdWhy}` };
  else c = { state: 'ok', msg: `Type ${prot} works (it covers everything type ${spec.rcd} does), though type ${spec.rcd} would do. ${spec.rcdWhy}` };

  return { state: worst(r.state, c.state), rating: r, rcd: c };
}

/** For the appliance game: is this RCD type good enough? */
export const rcdSuits = (need: RcdType, pick: RcdType) => rank(pick) >= rank(need);
