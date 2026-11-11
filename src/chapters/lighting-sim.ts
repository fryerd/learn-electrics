// Chapter 8 simulator: pure functions, no DOM and no imports, so it can be checked on its own.
//
// A circuit is a graph. Nodes are terminals; edges are the wires the learner draws plus the contacts
// inside each switch that are closed for the current throw. The lamp is the only load: it lights when
// one of its terminals is joined to the supply line and the other to the supply neutral.

/* ================================ switch models ================================ */

export type SwitchType = 'one-way' | 'two-way' | 'intermediate';

/** What a terminal is for. Used for wire colours and labels; the simulator itself only needs ids. */
export type TermKind = 'L' | 'N' | 'E' | 'SW' | 'LAMP_L' | 'LAMP_N' | 'COM' | 'L1' | 'L2';

export interface SwitchDef {
  id: string;
  type: SwitchType;
  /** Short name shown to the learner, e.g. "Switch 1". */
  label: string;
}

export interface TermInfo {
  id: string;
  /** Component id: 'sup', 'rose', 'lamp' or a switch id. */
  comp: string;
  label: string;
  kind: TermKind;
}

export interface Wire {
  a: string;
  b: string;
}

/** The names of a switch's two throw positions. */
export const POSITION_NAMES: Record<SwitchType, [string, string]> = {
  'one-way': ['off', 'on'],
  'two-way': ['L1', 'L2'],
  intermediate: ['straight', 'crossed'],
};

export function switchTerminals(sw: SwitchDef): TermInfo[] {
  const t = (suffix: string, label: string, kind: TermKind): TermInfo => ({ id: `${sw.id}.${suffix}`, comp: sw.id, label, kind });
  switch (sw.type) {
    case 'one-way':
      return [t('COM', 'COM', 'COM'), t('L1', 'L1', 'L1'), t('E', 'E', 'E')];
    case 'two-way':
      return [t('COM', 'COM', 'COM'), t('L1', 'L1', 'L1'), t('L2', 'L2', 'L2'), t('E', 'E', 'E')];
    case 'intermediate':
      return [t('L1a', 'L1', 'L1'), t('L2a', 'L2', 'L2'), t('L1b', 'L1', 'L1'), t('L2b', 'L2', 'L2'), t('E', 'E', 'E')];
  }
}

/** The pairs of terminals a switch joins internally at a given throw position (0 or 1). */
export function switchLinks(sw: SwitchDef, pos: number): [string, string][] {
  const id = (s: string) => `${sw.id}.${s}`;
  switch (sw.type) {
    case 'one-way':
      return pos === 1 ? [[id('COM'), id('L1')]] : [];
    case 'two-way':
      return pos === 0 ? [[id('COM'), id('L1')]] : [[id('COM'), id('L2')]];
    case 'intermediate':
      return pos === 0
        ? [
            [id('L1a'), id('L1b')],
            [id('L2a'), id('L2b')],
          ]
        : [
            [id('L1a'), id('L2b')],
            [id('L2a'), id('L1b')],
          ];
  }
}

/** The fixed parts every level has: the supply cable, the 3-plate ceiling rose and the lamp. */
export const FIXED_TERMINALS: TermInfo[] = [
  { id: 'sup.L', comp: 'sup', label: 'L', kind: 'L' },
  { id: 'sup.N', comp: 'sup', label: 'N', kind: 'N' },
  { id: 'sup.E', comp: 'sup', label: 'E', kind: 'E' },
  { id: 'rose.N', comp: 'rose', label: 'N', kind: 'N' },
  { id: 'rose.L', comp: 'rose', label: 'L', kind: 'L' },
  { id: 'rose.SW', comp: 'rose', label: 'SW', kind: 'SW' },
  { id: 'rose.E', comp: 'rose', label: 'E', kind: 'E' },
  { id: 'lamp.L', comp: 'lamp', label: 'L', kind: 'LAMP_L' },
  { id: 'lamp.N', comp: 'lamp', label: 'N', kind: 'LAMP_N' },
];

export function circuitTerminals(switches: SwitchDef[]): TermInfo[] {
  return [...FIXED_TERMINALS, ...switches.flatMap(switchTerminals)];
}

/** Every combination of switch positions, in binary order: [0,0], [0,1], [1,0], [1,1] ... */
export function allCombos(n: number): number[][] {
  const out: number[][] = [];
  for (let m = 0; m < 1 << n; m++) out.push(Array.from({ length: n }, (_, i) => (m >> (n - 1 - i)) & 1));
  return out;
}

/* ================================ wire colours ================================ */

/** brown, blue, green-and-yellow, the grey and black of 3-core cable, and blue sleeved brown. */
export type CoreColour = 'brown' | 'blue' | 'earth' | 'grey' | 'black' | 'blue-sleeved';

const isSwitchKind = (k: TermKind) => k === 'COM' || k === 'L1' || k === 'L2';

/**
 * The core an electrician would use for a connection, following UK practice for the cable on that route:
 * twin-and-earth (brown, blue, bare CPC sleeved green-and-yellow) for the supply, the switch drop and the
 * lamp flex, and 3-core-and-earth (brown, black, grey) between switches. A blue core that carries a
 * switched line back from a switch is sleeved brown at both ends.
 */
export function wireColour(a: TermInfo, b: TermInfo): CoreColour {
  const ks = [a.kind, b.kind];
  if (ks.includes('E')) return 'earth';
  if (ks.includes('N') || ks.includes('LAMP_N')) return 'blue';
  const swA = isSwitchKind(a.kind);
  const swB = isSwitchKind(b.kind);
  if (swA && swB) {
    if (ks.includes('COM')) return 'brown';
    return ks.includes('L1') ? 'grey' : 'black';
  }
  if ((swA || swB) && (ks.includes('SW') || ks.includes('LAMP_L'))) return 'blue-sleeved';
  return 'brown';
}

/* ================================ solving one position ================================ */

export type ShortKind = 'L-N' | 'L-E' | 'N-E';

export interface ComboState {
  positions: number[];
  /** The supply line and neutral (or earth) are joined: the breaker (or RCD) would trip. */
  short: ShortKind | null;
  /** Lamp has line on one side and neutral on the other (and there is no short). */
  lit: boolean;
  /** At least one lamp terminal is joined to the supply line. */
  lampLive: boolean;
  /** Lit, but the lamp's N terminal is the one on line. */
  reversed: boolean;
  /** Edges carrying current, with direction: +1 means a→b. Keys are `w<index>` or `s:<a>|<b>`. */
  flow: Record<string, 1 | -1>;
  /** Terminals joined to the supply line (they are "at line voltage"). */
  liveTerms: string[];
}

interface Edge {
  key: string;
  a: string;
  b: string;
}

export function switchLinkKey(a: string, b: string) {
  return `s:${a}|${b}`;
}

function edgesFor(switches: SwitchDef[], wires: Wire[], positions: number[]): Edge[] {
  const edges: Edge[] = wires.map((w, i) => ({ key: `w${i}`, a: w.a, b: w.b }));
  switches.forEach((sw, i) => {
    for (const [a, b] of switchLinks(sw, positions[i] ?? 0)) edges.push({ key: switchLinkKey(a, b), a, b });
  });
  return edges;
}

function reach(start: string, edges: Edge[]): Set<string> {
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const n = stack.pop()!;
    for (const e of edges) {
      const o = e.a === n ? e.b : e.b === n ? e.a : null;
      if (o !== null && !seen.has(o)) {
        seen.add(o);
        stack.push(o);
      }
    }
  }
  return seen;
}

/**
 * The edges that actually carry current between `from` and `to`: take the connected group, then keep
 * trimming dead ends (nodes with only one edge, other than the two ends) until none are left.
 */
function currentEdges(from: string, to: string, edges: Edge[]): { edges: Edge[]; dist: Map<string, number> } {
  const group = reach(from, edges);
  let live = edges.filter((e) => group.has(e.a) && e.a !== e.b);
  for (;;) {
    const deg = new Map<string, number>();
    for (const e of live) {
      deg.set(e.a, (deg.get(e.a) ?? 0) + 1);
      deg.set(e.b, (deg.get(e.b) ?? 0) + 1);
    }
    const dead = (n: string) => n !== from && n !== to && (deg.get(n) ?? 0) <= 1;
    const next = live.filter((e) => !dead(e.a) && !dead(e.b));
    if (next.length === live.length) break;
    live = next;
  }
  // distance from `from`, used to point the flow arrows
  const dist = new Map<string, number>([[from, 0]]);
  const queue = [from];
  while (queue.length) {
    const n = queue.shift()!;
    for (const e of live) {
      const o = e.a === n ? e.b : e.b === n ? e.a : null;
      if (o !== null && !dist.has(o)) {
        dist.set(o, dist.get(n)! + 1);
        queue.push(o);
      }
    }
  }
  return { edges: live, dist };
}

/** Solve the circuit for one set of switch positions. */
export function solveCombo(switches: SwitchDef[], wires: Wire[], positions: number[]): ComboState {
  const edges = edgesFor(switches, wires, positions);
  const lineSet = reach('sup.L', edges);
  const neutralSet = reach('sup.N', edges);
  let short: ShortKind | null = null;
  if (lineSet.has('sup.N')) short = 'L-N';
  else if (lineSet.has('sup.E')) short = 'L-E';
  else if (neutralSet.has('sup.E')) short = 'N-E';

  const lampLive = lineSet.has('lamp.L') || lineSet.has('lamp.N');
  const forward = lineSet.has('lamp.L') && neutralSet.has('lamp.N');
  const backward = lineSet.has('lamp.N') && neutralSet.has('lamp.L');
  const lit = short === null && (forward || backward);

  const flow: Record<string, 1 | -1> = {};
  if (lit) {
    const lampLine = forward ? 'lamp.L' : 'lamp.N';
    const lampNeutral = forward ? 'lamp.N' : 'lamp.L';
    // line side: current flows away from the supply towards the lamp
    const l = currentEdges('sup.L', lampLine, edges);
    for (const e of l.edges) flow[e.key] = (l.dist.get(e.a) ?? 0) <= (l.dist.get(e.b) ?? 0) ? 1 : -1;
    // neutral side: from the lamp back towards the supply
    const n = currentEdges('sup.N', lampNeutral, edges);
    for (const e of n.edges) flow[e.key] = (n.dist.get(e.a) ?? 0) >= (n.dist.get(e.b) ?? 0) ? 1 : -1;
  }

  return {
    positions: [...positions],
    short,
    lit,
    lampLive,
    reversed: lit && backward,
    flow,
    liveTerms: short ? [] : [...lineSet],
  };
}

/* ================================ judging a whole circuit ================================ */

export type CheckLevel = 'ok' | 'warn' | 'bad';

export interface Check {
  id: 'short' | 'lights' | 'follows' | 'polarity' | 'lampholder' | 'earth';
  level: CheckLevel;
  title: string;
  text: string;
}

export type Verdict = 'empty' | 'short' | 'never' | 'always' | 'not-following' | 'neutral-switched' | 'lamp-reversed' | 'no-earth' | 'ok';

export interface Analysis {
  verdict: Verdict;
  /** Every switch combination, in allCombos order. */
  combos: ComboState[];
  /** For each switch: does flipping it always flip the lamp ('all'), sometimes ('some') or never ('none')? */
  control: ('all' | 'some' | 'none')[];
  /** Components whose earth terminal is not yet joined to the supply's CPC. */
  missingEarth: string[];
  checks: Check[];
  /** All checks pass. */
  solved: boolean;
}

/** Describe a combination in words, e.g. "Switch 1 on L2 and Switch 2 on L1". */
export function describeCombo(switches: SwitchDef[], positions: number[]): string {
  return switches
    .map((sw, i) => {
      const name = POSITION_NAMES[sw.type][positions[i]];
      return sw.type === 'one-way' ? `${sw.label} ${name}` : `${sw.label} ${sw.type === 'two-way' ? 'on ' : ''}${name}`;
    })
    .join(' and ');
}

const SHORT_TEXT: Record<ShortKind, { title: string; text: string }> = {
  'L-N': {
    title: 'Short circuit: line joined to neutral',
    text: 'Line goes straight to neutral without passing through the lamp. A huge current would flow and the breaker would trip (or something would burn).',
  },
  'L-E': {
    title: 'Earth fault: line joined to the CPC',
    text: 'Line is connected to earth. The breaker or RCD would trip, and until it did, metal parts could become live.',
  },
  'N-E': {
    title: 'Neutral joined to earth',
    text: 'The neutral is connected to the CPC. Current would return through the earth wiring, and an RCD would trip as soon as the light was used.',
  },
};

const COMP_NAMES: Record<string, string> = { rose: 'the ceiling rose' };

/** Check a whole circuit: every combination of switch positions, plus the earth wiring. */
export function analyse(switches: SwitchDef[], wires: Wire[]): Analysis {
  const combos = allCombos(switches.length).map((p) => solveCombo(switches, wires, p));
  const idx = (p: number[]) => p.reduce((m, b) => m * 2 + b, 0);

  // earth: the CPC from the supply must reach the rose and every switch box
  const earthEdges = wires
    .filter((w) => w.a.endsWith('.E') && w.b.endsWith('.E'))
    .map((w, i) => ({ key: `e${i}`, a: w.a, b: w.b }));
  const earthed = reach('sup.E', earthEdges);
  const needEarth = ['rose', ...switches.map((s) => s.id)];
  const missingEarth = needEarth.filter((c) => !earthed.has(`${c}.E`));

  const control = switches.map((_, i) => {
    let flips = 0;
    for (const c of combos) {
      const other = [...c.positions];
      other[i] = 1 - other[i];
      if (combos[idx(other)].lit !== c.lit) flips++;
    }
    return flips === combos.length ? 'all' : flips === 0 ? 'none' : 'some';
  }) as Analysis['control'];

  const checks: Check[] = [];
  const shortCombo = combos.find((c) => c.short);
  const anyLit = combos.some((c) => c.lit);
  const allLit = combos.every((c) => c.lit);
  const follows = control.every((c) => c === 'all');
  const liveWhenOff = combos.find((c) => !c.lit && !c.short && c.lampLive);
  const reversed = combos.some((c) => c.reversed);
  const empty = wires.length === 0;

  if (shortCombo) {
    const s = SHORT_TEXT[shortCombo.short!];
    const when = switches.length ? ` It happens with ${describeCombo(switches, shortCombo.positions)}.` : '';
    checks.push({ id: 'short', level: 'bad', title: s.title, text: s.text + when });
  }

  if (!shortCombo) {
    if (!anyLit) {
      checks.push({
        id: 'lights',
        level: 'warn',
        title: 'The lamp never lights',
        text: empty
          ? 'Nothing is connected yet. The lamp needs a path from line, through a switch, through the lamp and back to neutral.'
          : 'There is no complete path yet from line, through the lamp, back to neutral, whichever way the switches are set.',
      });
    } else if (allLit) {
      checks.push({
        id: 'lights',
        level: 'bad',
        title: 'The lamp is always on',
        text: 'It lights whatever the switches do, so the switches are not in the path. Every bit of current to the lamp should pass through the switching.',
      });
    } else {
      checks.push({ id: 'lights', level: 'ok', title: 'The lamp lights', text: 'There is a complete path from line, through the lamp, back to neutral.' });
    }

    if (anyLit && !allLit) {
      if (follows) {
        checks.push({
          id: 'follows',
          level: 'ok',
          title: switches.length > 1 ? 'Every switch works from any position' : 'The switch turns it on and off',
          text:
            switches.length > 1
              ? 'Flip any one switch, whatever the others are doing, and the lamp changes. That is proper multi-way switching.'
              : 'Flip the switch and the lamp follows.',
        });
      } else {
        const dead = switches.filter((_, i) => control[i] === 'none').map((s) => s.label);
        const some = switches.filter((_, i) => control[i] === 'some').map((s) => s.label);
        const list = (xs: string[]) => xs.join(' and ');
        const parts: string[] = [];
        if (dead.length) parts.push(`${list(dead)} ${dead.length > 1 ? 'do' : 'does'} nothing at all.`);
        if (some.length) parts.push(`${list(some)} only ${some.length > 1 ? 'work' : 'works'} when the other switches are in certain positions.`);
        checks.push({
          id: 'follows',
          level: 'bad',
          title: 'The lamp does not follow every switch',
          text: `${parts.join(' ')} Each switch should change the lamp from any position. Check where the strappers go.`,
        });
      }
    }

    if (anyLit && liveWhenOff) {
      checks.push({
        id: 'polarity',
        level: 'bad',
        title: 'Polarity fault: the switch is in the neutral',
        text: 'The lamp goes off, but the lampholder is still connected to line. Someone changing the bulb with the switch off could get a shock. Switches must break the line conductor.',
      });
    } else if (anyLit && !allLit) {
      checks.push({ id: 'polarity', level: 'ok', title: 'Switching is in the line', text: 'With the lamp off, nothing at the lampholder is connected to line.' });
    }

    if (reversed) {
      checks.push({
        id: 'lampholder',
        level: 'warn',
        title: 'Lampholder connected the wrong way round',
        text: 'Line arrives at the lamp’s N terminal. A bayonet lamp would still work, but on a screw (ES) lampholder the outer screw thread would be live. Swap the two lamp cores.',
      });
    }
  }

  // the earth check joins in once the lamp has lit (or the learner has started on the CPCs)
  if (!empty && (anyLit || earthEdges.length > 0)) {
    if (missingEarth.length) {
      const names = missingEarth.map((c) => COMP_NAMES[c] ?? switches.find((s) => s.id === c)?.label ?? c);
      checks.push({
        id: 'earth',
        level: 'warn',
        title: 'The CPC does not reach everything',
        text: `Run the earth (CPC) on to ${names.join(', ')}. Every accessory and metal back box needs it, even a plastic switch.`,
      });
    } else {
      checks.push({ id: 'earth', level: 'ok', title: 'Earth reaches every box', text: 'The CPC runs from the supply to the rose and every switch.' });
    }
  }

  let verdict: Verdict;
  if (empty) verdict = 'empty';
  else if (shortCombo) verdict = 'short';
  else if (!anyLit) verdict = 'never';
  else if (allLit) verdict = 'always';
  else if (!follows) verdict = 'not-following';
  else if (liveWhenOff) verdict = 'neutral-switched';
  else if (reversed) verdict = 'lamp-reversed';
  else if (missingEarth.length) verdict = 'no-earth';
  else verdict = 'ok';

  return { verdict, combos, control, missingEarth, checks, solved: verdict === 'ok' };
}

/* ================================ levels ================================ */

export type LevelId = 'one-way' | 'two-way' | 'intermediate';

export interface LevelDef {
  id: LevelId;
  switches: SwitchDef[];
  /** Wires already in place when the level starts (the learner can still remove them). */
  prewired: Wire[];
  /** A correct circuit (including the prewired wires). */
  answer: Wire[];
}

const SUPPLY_AND_FLEX: Wire[] = [
  { a: 'sup.L', b: 'rose.L' },
  { a: 'sup.N', b: 'rose.N' },
  { a: 'sup.E', b: 'rose.E' },
  { a: 'rose.SW', b: 'lamp.L' },
  { a: 'rose.N', b: 'lamp.N' },
];

export const LEVELS: LevelDef[] = [
  {
    id: 'one-way',
    switches: [{ id: 's1', type: 'one-way', label: 'Switch 1' }],
    prewired: [],
    answer: [
      ...SUPPLY_AND_FLEX,
      { a: 'rose.L', b: 's1.COM' },
      { a: 's1.L1', b: 'rose.SW' },
      { a: 'rose.E', b: 's1.E' },
    ],
  },
  {
    id: 'two-way',
    switches: [
      { id: 's1', type: 'two-way', label: 'Switch 1' },
      { id: 's2', type: 'two-way', label: 'Switch 2' },
    ],
    prewired: SUPPLY_AND_FLEX,
    answer: [
      ...SUPPLY_AND_FLEX,
      { a: 'rose.L', b: 's1.COM' },
      { a: 's1.L1', b: 's2.L1' },
      { a: 's1.L2', b: 's2.L2' },
      { a: 's2.COM', b: 'rose.SW' },
      { a: 'rose.E', b: 's1.E' },
      { a: 's1.E', b: 's2.E' },
    ],
  },
  {
    id: 'intermediate',
    switches: [
      { id: 's1', type: 'two-way', label: 'Switch 1' },
      { id: 's2', type: 'intermediate', label: 'Switch 2' },
      { id: 's3', type: 'two-way', label: 'Switch 3' },
    ],
    prewired: SUPPLY_AND_FLEX,
    answer: [
      ...SUPPLY_AND_FLEX,
      { a: 'rose.L', b: 's1.COM' },
      { a: 's1.L1', b: 's2.L1a' },
      { a: 's1.L2', b: 's2.L2a' },
      { a: 's2.L1b', b: 's3.L1' },
      { a: 's2.L2b', b: 's3.L2' },
      { a: 's3.COM', b: 'rose.SW' },
      { a: 'rose.E', b: 's1.E' },
      { a: 's1.E', b: 's2.E' },
      { a: 's2.E', b: 's3.E' },
    ],
  },
];

/** True if the two wires join the same pair of terminals (either way round). */
export function sameWire(x: Wire, y: Wire) {
  return (x.a === y.a && x.b === y.b) || (x.a === y.b && x.b === y.a);
}

/** Add a wire unless it is a loop back to the same terminal or a duplicate. Returns a new list. */
export function addWire(wires: Wire[], w: Wire): Wire[] {
  if (w.a === w.b || wires.some((x) => sameWire(x, w))) return wires;
  return [...wires, w];
}

/* ================================ the "build a switch" explorer ================================ */

export type Ways = 1 | 2 | 'int';

export interface SwitchSpec {
  gangs: number;
  poles: number;
  ways: Ways;
}

/** Terminal ids for one pole of one gang: g1p1.COM, g1p1.L1, g1p1.L2 (intermediate: g1.L1a ...). */
export function specContacts(spec: SwitchSpec, gang: number, pole: number): string[] {
  if (spec.ways === 'int') return [`g${gang}.L1a`, `g${gang}.L2a`, `g${gang}.L1b`, `g${gang}.L2b`];
  const base = `g${gang}p${pole}`;
  return spec.ways === 1 ? [`${base}.COM`, `${base}.L1`] : [`${base}.COM`, `${base}.L1`, `${base}.L2`];
}

/** Which terminals are joined, given one throw position (0/1) per gang. All poles of a gang move together. */
export function specConnections(spec: SwitchSpec, positions: number[]): [string, string][] {
  const out: [string, string][] = [];
  for (let g = 1; g <= spec.gangs; g++) {
    const pos = positions[g - 1] ?? 0;
    if (spec.ways === 'int') {
      const sw: SwitchDef = { id: `g${g}`, type: 'intermediate', label: '' };
      out.push(...switchLinks(sw, pos));
      continue;
    }
    for (let p = 1; p <= spec.poles; p++) {
      const sw: SwitchDef = { id: `g${g}p${p}`, type: spec.ways === 1 ? 'one-way' : 'two-way', label: '' };
      out.push(...switchLinks(sw, pos));
    }
  }
  return out;
}

export interface SpecName {
  name: string;
  use: string;
  /** Something you would commonly meet in a UK house. */
  common: boolean;
}

/** Name the real-world switch a gangs / poles / ways choice makes. */
export function nameSpec(spec: SwitchSpec): SpecName {
  const { gangs, poles, ways } = spec;
  const g = gangs > 1 ? `${gangs}-gang ` : '';
  if (ways === 'int') {
    return gangs === 1
      ? {
          name: 'Intermediate switch',
          use: 'Fits between two two-way switches so a third (or fourth) switch can control the same light. Its two arms always move together: straight through, or crossed over.',
          common: true,
        }
      : { name: `${g}intermediate switch`, use: 'Made, but uncommon: several intermediates on one plate, each for a different light.', common: false };
  }
  if (poles === 1 && ways === 1) {
    return gangs === 1
      ? { name: 'One-way switch', use: 'A plain on/off switch: one light, switched from one place.', common: true }
      : { name: `${g}one-way switch`, use: `${gangs} separate on/off switches on one plate, each for its own light.`, common: true };
  }
  if (poles === 1 && ways === 2) {
    return gangs === 1
      ? {
          name: 'Two-way switch',
          use: 'Used in pairs so one light can be switched from two places, like the top and bottom of the stairs. Use only COM and L1 and it works as a one-way switch, which is why most plate switches are made two-way.',
          common: true,
        }
      : { name: `${g}two-way switch`, use: `${gangs} separate two-way switches on one plate, for example hall and landing lights by the front door.`, common: true };
  }
  if (poles === 2 && ways === 1 && gangs === 1) {
    return {
      name: 'Double-pole switch',
      use: 'Breaks line and neutral together, so the appliance is completely cut off. Cooker switches and immersion heater switches are double-pole.',
      common: true,
    };
  }
  if (poles === 3 && ways === 1 && gangs === 1) {
    return {
      name: 'Three-pole isolator',
      use: 'The usual extractor fan isolator. A fan with an overrun timer has a permanent line, a switched line and a neutral, and this breaks all three at once so the fan can be worked on safely.',
      common: true,
    };
  }
  if (poles === 2 && ways === 2 && gangs === 1) {
    return {
      name: 'Double-pole two-way switch',
      use: 'Two changeover arms moving together. Rare in houses, but cross two of its terminals and it behaves exactly like an intermediate switch.',
      common: false,
    };
  }
  return {
    name: `${g}${poles}-pole ${ways}-way switch`,
    use: 'You can buy odd combinations like this, but you would not expect to meet one in a house.',
    common: false,
  };
}
