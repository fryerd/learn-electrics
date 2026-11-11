// Pure maths for chapter 5 (no DOM). Simplified for learning.
import {
  BREAKERS,
  CAPACITY,
  GROUPING,
  MV_PER_A_M,
  NOMINAL_V,
  SIZES,
  appliance,
  type Appliance,
  type MethodId,
  type Size,
} from '../data/cables-lesson';

const EPS = 1e-9;

export interface Design {
  applianceId: string;
  breaker: number;
  size: Size;
  method: MethodId;
  group: 1 | 2 | 3;
  length: number;
}

/** Ib = P ÷ U. */
export const designCurrent = (watts: number, volts = NOMINAL_V) => watts / volts;

export const groupFactor = (n: 1 | 2 | 3) => GROUPING.find((g) => g.n === n)?.factor ?? 1;

/** Iz = It × correction factor. */
export const capacity = (size: Size, method: MethodId, factor = 1) => CAPACITY[size][method] * factor;

/** Volt drop (V) = mV/A/m × Ib × L ÷ 1000. A ring shares the current two ways, roughly a quarter of the radial figure. */
export const voltDrop = (mvam: number, ib: number, length: number, ring = false) =>
  (mvam * ib * length) / 1000 / (ring ? 4 : 1);

/** The volt drop limit: 3% of 230 V for lighting, 5% for everything else. */
export const dropLimit = (lighting: boolean) => (lighting ? 0.03 : 0.05) * NOMINAL_V;

/** The longest run that keeps the volt drop within the limit. */
export const maxLength = (limit: number, mvam: number, ib: number, ring = false) =>
  ib <= 0 ? Infinity : (limit * (ring ? 4 : 1)) / ((mvam * ib) / 1000);

export interface Check {
  id: 'load' | 'cable' | 'drop';
  ok: boolean;
  title: string;
  reason: string;
}

export interface Evaluation {
  app: Appliance;
  ib: number;
  it: number;
  factor: number;
  iz: number;
  /** The capacity the cable needs, given the breaker (In, or 0.67 × In for a ring). */
  izNeeded: number;
  drop: number;
  limit: number;
  dropPct: number;
  maxLen: number;
  checks: Check[];
  allOk: boolean;
}

const a1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
const nice = (n: number) => (Number.isInteger(n) ? String(n) : a1(n));

export function evaluate(d: Design): Evaluation {
  const app = appliance(d.applianceId);
  const ring = !!app.ring;
  const ib = designCurrent(app.watts);
  const it = CAPACITY[d.size][d.method];
  const factor = groupFactor(d.group);
  const iz = it * factor;
  const mv = MV_PER_A_M[d.size];
  const drop = voltDrop(mv, ib, d.length, ring);
  const limit = dropLimit(!!app.lighting);
  const maxLen = maxLength(limit, mv, ib, ring);
  const izNeeded = ring ? 0.67 * d.breaker : d.breaker;
  const who = app.short.toLowerCase();

  const loadOk = ib <= d.breaker + EPS;
  const load: Check = {
    id: 'load',
    ok: loadOk,
    title: `Ib ≤ In · ${a1(ib)} A ${loadOk ? '≤' : '>'} ${d.breaker} A`,
    reason: loadOk
      ? `The ${d.breaker} A breaker is at least the ${a1(ib)} A the ${who} needs, so it will not trip in normal use.`
      : `The ${who} draws ${a1(ib)} A but the breaker is only ${d.breaker} A. It would trip every time. Choose a bigger breaker.`,
  };

  let cable: Check;
  if (ring) {
    const ringOk = d.breaker <= 32 + EPS && iz + EPS >= izNeeded;
    cable = {
      id: 'cable',
      ok: ringOk,
      title: `Ring rule · ${nice(iz)} A ${iz + EPS >= izNeeded ? '≥' : '<'} 0.67 × ${d.breaker} A`,
      reason:
        d.breaker > 32
          ? `A ring of 13 A sockets is protected at 32 A at most. Choose 32 A.`
          : ringOk
            ? `On a ring the current splits two ways, so the cable needs at least 0.67 × ${d.breaker} = ${a1(izNeeded)} A. This one carries ${nice(iz)} A here.`
            : `On a ring the cable needs at least 0.67 × ${d.breaker} = ${a1(izNeeded)} A, but here it only carries ${nice(iz)} A. Use a thicker cable or a cooler route.`,
    };
  } else {
    const cableOk = d.breaker <= iz + EPS;
    cable = {
      id: 'cable',
      ok: cableOk,
      title: `In ≤ Iz · ${d.breaker} A ${cableOk ? '≤' : '>'} ${nice(iz)} A`,
      reason: cableOk
        ? `The cable can carry ${nice(iz)} A here, at least the ${d.breaker} A the breaker lets through. The breaker trips before the cable gets too hot.`
        : `The breaker lets up to ${d.breaker} A through, but this cable only carries ${nice(iz)} A here. It could overheat with the breaker still on. Use a thicker cable, a cooler route or a smaller breaker.`,
    };
  }

  const dropOk = drop <= limit + EPS;
  const pct = (drop / NOMINAL_V) * 100;
  const maxTxt = Number.isFinite(maxLen) ? `${Math.floor(maxLen)} m` : 'any length';
  const dropCheck: Check = {
    id: 'drop',
    ok: dropOk,
    title: `Volt drop · ${a1(drop)} V ${dropOk ? '≤' : '>'} ${a1(limit)} V`,
    reason: dropOk
      ? `${a1(drop)} V (${a1(pct)}%) is inside the ${app.lighting ? '3%' : '5%'} limit. This cable could run up to ${maxTxt}.`
      : `${a1(drop)} V (${a1(pct)}%) is over the ${app.lighting ? '3%' : '5%'} limit, so the ${who} would be short of voltage. Use a thicker cable or keep the run under ${maxTxt}.`,
  };

  const checks = [load, cable, dropCheck];
  return {
    app,
    ib,
    it,
    factor,
    iz,
    izNeeded,
    drop,
    limit,
    dropPct: pct,
    maxLen,
    checks,
    allOk: checks.every((c) => c.ok),
  };
}

/** The smallest breaker and cable that pass every check, for this appliance, route, grouping and length. */
export function suggest(d: Design): { breaker: number; size: Size } | null {
  const app = appliance(d.applianceId);
  const ib = designCurrent(app.watts);
  const breaker = BREAKERS.find((b) => b + EPS >= ib && (!app.ring || b <= 32));
  if (breaker === undefined) return null;
  for (const size of SIZES) {
    if (evaluate({ ...d, breaker, size }).allOk) return { breaker, size };
  }
  return null;
}

/* ------------------------------ the simulation ------------------------------ */

export const AMBIENT = 30;
export const MAX_TEMP = 70;

/** Steady cable temperature: the rise above ambient grows with current squared, reaching 70 °C at I = Iz. */
export const steadyTemp = (i: number, iz: number) => AMBIENT + (MAX_TEMP - AMBIENT) * (i / iz) ** 2;

/** How fast an overloaded breaker heads towards tripping (fraction per second). Bigger overloads trip faster. */
export const tripRate = (i: number, inA: number) => {
  const r = i / inA - 1;
  return r <= 0 ? 0 : 1.5 * r + 3 * r * r;
};

export interface SimState {
  temp: number;
  trip: number;
  tripped: boolean;
}

export const TAU = 2.2; // seconds for the cable to get most of the way to its new temperature

/** Advance the simulation by dt seconds with current i flowing (unless tripped). */
export function step(s: SimState, dt: number, i: number, inA: number, iz: number): SimState {
  const flowing = s.tripped ? 0 : i;
  const target = steadyTemp(flowing, iz);
  const temp = target + (s.temp - target) * Math.exp(-dt / TAU);
  if (s.tripped) return { temp, trip: 0, tripped: true };
  const rate = tripRate(i, inA);
  const trip = rate > 0 ? s.trip + rate * dt : Math.max(0, s.trip - dt);
  return { temp, trip: Math.min(trip, 1), tripped: trip >= 1 };
}

/** Where things end up if left alone (used for reduced motion). */
export function settle(i: number, inA: number, iz: number): SimState {
  if (tripRate(i, inA) > 0) return { temp: AMBIENT, trip: 0, tripped: true };
  return { temp: steadyTemp(i, iz), trip: 0, tripped: false };
}
