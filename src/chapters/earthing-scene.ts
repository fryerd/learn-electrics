import { bondSpots, type ArrangementId, type PipeId } from '../data/earthing-lesson';

// The supply-and-earthing picture: transformer, street cable, house, consumer unit, MET, pipes.
// Two layouts share one builder: a wide one for desktop stages and a tall one for phones.
// Everything here is pure (strings and numbers), so geometry can be checked without a DOM.

export type P = [number, number];

export interface Layout {
  id: 'wide' | 'tall';
  w: number;
  h: number;
  ground: number;
  house: { x: number; y: number; w: number; h: number; peak: number };
  tx: {
    x: number;
    y: number;
    w: number;
    h: number;
    coilX: number;
    y0: number;
    starY: number;
    nX: number;
    eX: number;
    primX: number;
    rodBottom: number;
  };
  /** Centre line of the supply cable, from the transformer's terminals to the cutout's underside. */
  cable: P[];
  /** The stack (cutout, meter, consumer unit) sits on the neutral line x = sx; sy is the cutout's underside. */
  sx: number;
  sy: number;
  met: { x: number; y: number; w: number };
  /** Protective conductor from the consumer unit's earth bar down to the MET. */
  cpc: P[];
  /** Centre line of the circuit cable from the consumer unit to the appliance. */
  circuit: P[];
  app: { x: number; y: number };
  gas: { x: number; bondX: number; branch: number };
  water: { x: number; bondX: number; branch: number };
  rod: { x: number; top: number; bottom: number };
  /** TT only: earthing conductor from the MET to the earth rod. */
  ttEarth: P[];
  soilY: number;
  labels: { t: string; x: number; y: number; a?: 'start' | 'middle' | 'end'; b?: boolean; only?: ArrangementId[] }[];
}

const D = 8; // spacing of the supply cable's cores
const DC = 5; // spacing of the circuit cable's cores
const AW = 38; // half the appliance's width

export const WIDE: Layout = {
  id: 'wide',
  w: 960,
  h: 540,
  ground: 400,
  house: { x: 470, y: 120, w: 460, h: 280, peak: 75 },
  tx: { x: 40, y: 250, w: 130, h: 150, coilX: 100, y0: 300, starY: 345, nX: 124, eX: 146, primX: 66, rodBottom: 500 },
  cable: [
    [170, 300],
    [210, 300],
    [210, 455],
    [520, 455],
    [520, 372],
  ],
  sx: 520,
  sy: 372,
  met: { x: 600, y: 383, w: 60 },
  cpc: [
    [615, 210],
    [615, 377],
  ],
  circuit: [
    [595, 146],
    [595, 132],
    [880, 132],
    [880, 315],
  ],
  app: { x: 880, y: 315 },
  gas: { x: 700, bondX: 668, branch: 40 },
  water: { x: 800, bondX: 786, branch: 40 },
  rod: { x: 445, top: 404, bottom: 500 },
  ttEarth: [
    [600, 383],
    [445, 383],
    [445, 404],
  ],
  soilY: 505,
  labels: [
    { t: 'Transformer', x: 105, y: 238, b: true },
    { t: 'star point', x: 100, y: 374 },
    { t: 'Supply cable', x: 365, y: 432, b: true },
    { t: 'L · N · E (earth via the sheath)', x: 365, y: 488, only: ['tns'] },
    { t: 'L · PEN (neutral and earth combined)', x: 365, y: 488, only: ['tncs'] },
    { t: 'L · N only: no earth supplied', x: 365, y: 488, only: ['tt'] },
    { t: 'through the ground', x: 262, y: 504, only: ['tt'] },
    { t: 'earth rod', x: 456, y: 496, a: 'start', only: ['tt'] },
    { t: 'MET', x: 630, y: 420, b: true },
    { t: 'stop tap', x: 786, y: 369, a: 'end' },
    { t: 'to hob', x: 700, y: 222 },
    { t: 'boiler', x: 745, y: 264, a: 'start' },
    { t: 'taps', x: 845, y: 254, a: 'start' },
  ],
};

export const TALL: Layout = {
  id: 'tall',
  w: 440,
  h: 640,
  ground: 470,
  house: { x: 140, y: 110, w: 292, h: 360, peak: 70 },
  tx: { x: 6, y: 330, w: 80, h: 140, coilX: 36, y0: 380, starY: 425, nX: 52, eX: 68, primX: 18, rodBottom: 565 },
  cable: [
    [86, 380],
    [104, 380],
    [104, 525],
    [185, 525],
    [185, 442],
  ],
  sx: 185,
  sy: 442,
  met: { x: 205, y: 453, w: 40 },
  cpc: [
    [220, 280],
    [220, 447],
  ],
  circuit: [
    [260, 216],
    [260, 128],
    [392, 128],
    [392, 385],
  ],
  app: { x: 392, y: 385 },
  gas: { x: 285, bondX: 255, branch: 30 },
  water: { x: 340, bondX: 328, branch: 30 },
  rod: { x: 128, top: 474, bottom: 560 },
  ttEarth: [
    [205, 453],
    [128, 453],
    [128, 474],
  ],
  soilY: 590,
  labels: [
    { t: 'Transformer', x: 46, y: 318, b: true },
    { t: 'star point', x: 46, y: 457 },
    { t: 'MET', x: 225, y: 492, b: true },
    { t: 'earth rod', x: 136, y: 580, a: 'start', only: ['tt'] },
    { t: 'through the ground', x: 120, y: 626, only: ['tt'] },
  ],
};

/* ------------------------------- geometry ------------------------------- */

/** Offset an orthogonal polyline sideways by d (positive is to the right of travel... in screen terms, see tests). */
export function offset(pts: P[], d: number): P[] {
  const nrm = (a: P, b: P): P => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  return pts.map((p, i) => {
    const n1 = i > 0 ? nrm(pts[i - 1], p) : null;
    const n2 = i < pts.length - 1 ? nrm(p, pts[i + 1]) : null;
    let o: P;
    if (n1 && n2) {
      const same = Math.abs(n1[0] - n2[0]) < 1e-6 && Math.abs(n1[1] - n2[1]) < 1e-6;
      o = same ? n1 : [n1[0] + n2[0], n1[1] + n2[1]];
    } else o = (n1 ?? n2)!;
    return [p[0] + d * o[0], p[1] + d * o[1]];
  });
}

const r1 = (n: number) => Math.round(n * 10) / 10;
export const pathD = (pts: P[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${r1(p[0])} ${r1(p[1])}`).join(' ');

/** Points along the soil between the TT earth rod and the transformer's electrode. */
function soilCurve(L: Layout): P[] {
  const a: P = [L.rod.x, L.rod.bottom];
  const b: P = [L.tx.coilX, L.tx.rodBottom];
  const c: P = [(a[0] + b[0]) / 2, L.soilY + 30];
  const out: P[] = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}

const cuTop = (L: Layout) => L.sy - 226;

/** Where a bonding spot sits on its pipe. */
export function spotPoint(L: Layout, pipe: PipeId, dy: number): P {
  return [pipe === 'gas' ? L.gas.x : L.water.x, L.ground + dy];
}

/** The bonding conductor from the MET to a clamp. */
export function bondRoute(L: Layout, pipe: PipeId, dy: number): P[] {
  const [x, y] = spotPoint(L, pipe, dy);
  const mx = L.met.x + L.met.w;
  const my = L.met.y + (pipe === 'gas' ? 0 : 6);
  const bx = pipe === 'gas' ? L.gas.bondX : L.water.bondX;
  return [
    [mx, my],
    [bx, my],
    [bx, y],
    [x - 6, y],
  ];
}

/**
 * The earth fault loop for an arrangement, split into the outward part (star point, line, to the
 * fault on the appliance's case) and the return part (case, CPC, MET, back to the star point).
 */
export function faultLoop(L: Layout, arr: ArrangementId): { out: P[]; back: P[] } {
  const { tx, sx, sy, app } = L;
  const top = cuTop(L);
  const out: P[] = [
    [tx.coilX, tx.starY],
    [tx.coilX, tx.y0 - D],
    ...offset(L.cable, -D),
    [sx - D, top + 24],
    [sx + 70, top + 24],
    ...offset(L.circuit, -DC),
    [app.x + DC, app.y + 14],
    [app.x + AW - 3, app.y + 14],
  ];
  const cpcX = L.cpc[0][0];
  const back: P[] = [
    [app.x + AW - 3, app.y + 14],
    [app.x + AW - 3, app.y + 3],
    [app.x - DC, app.y + 3],
    ...offset(L.circuit, DC).reverse(),
    [sx + 80, top + 46],
    [cpcX, top + 46],
    ...L.cpc,
    [cpcX, L.met.y],
  ];
  const ey = sy + 11;
  if (arr === 'tns') {
    const e = offset(L.cable, D).reverse();
    e[0] = [sx + D, ey];
    back.push([sx + 14, ey], ...e, [tx.eX, tx.y0 + D], [tx.eX, tx.starY], [tx.coilX, tx.starY]);
  } else if (arr === 'tncs') {
    const pen = [...L.cable].reverse();
    pen[0] = [sx, ey];
    back.push([sx + 14, ey], ...pen, [tx.nX, tx.y0], [tx.nX, tx.starY], [tx.coilX, tx.starY]);
  } else {
    back.push(...L.ttEarth, [L.rod.x, L.rod.bottom], ...soilCurve(L).slice(1), [tx.coilX, tx.starY]);
  }
  return { out, back };
}

/** Total length and a point-at-distance function for a polyline (used to move the fault dots). */
export function polyline(pts: P[]) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = cum[cum.length - 1];
  const at = (s: number): P => {
    s = ((s % total) + total) % total;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const seg = cum[i] - cum[i - 1] || 1;
    const t = (s - cum[i - 1]) / seg;
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
  };
  return { total, at };
}

/* -------------------------------- drawing -------------------------------- */

export type FaultState = 'none' | 'flowing' | 'cleared' | 'live';

export interface SceneState {
  arr: ArrangementId;
  mode: 'earth' | 'bond';
  bonds: Record<PipeId, string | null>;
  fault: FaultState;
  rcd: boolean;
  mcbTripped: boolean;
  rcdTripped: boolean;
  reduced: boolean;
}

type Kind = 'L' | 'N' | 'E' | 'PEN';
function wire(pts: P[], kind: Kind, extra = '') {
  const d = pathD(pts);
  if (kind === 'E') return `<path class="er-halo ${extra}" d="${d}"/><path class="er-e ${extra}" d="${d}"/><path class="er-e2 ${extra}" d="${d}"/>`;
  if (kind === 'PEN') return `<path class="er-n ${extra}" d="${d}"/><path class="er-pen2 ${extra}" d="${d}"/>`;
  return `<path class="${kind === 'L' ? 'er-l' : 'er-n'} ${extra}" d="${d}"/>`;
}

function coil(x: number, y1: number, y2: number, dir: 1 | -1) {
  const n = 4;
  const step = (y2 - y1) / n;
  let d = `M${x} ${y1}`;
  for (let i = 0; i < n; i++) d += ` a${step / 2} ${step / 2} 0 0 ${dir === 1 ? 1 : 0} 0 ${step}`;
  return `<path class="er-coil" d="${d}"/>`;
}

function transformer(L: Layout) {
  const t = L.tx;
  const right = t.x + t.w;
  const cTop = t.y0 - D;
  return `
    <g class="er-tx">
      <rect class="er-tx-box" x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="12"/>
      <path class="er-tx-core" d="M${(t.primX + t.coilX) / 2 - 3} ${cTop - 4}V${t.starY + 4}M${(t.primX + t.coilX) / 2 + 3} ${cTop - 4}V${t.starY + 4}"/>
      ${coil(t.primX, cTop, t.starY, 1)}
      <path class="er-thin" d="M${t.primX} ${cTop}V${t.y + 12}M${t.primX} ${t.starY}V${t.starY + 10}"/>
      ${coil(t.coilX, cTop, t.starY, -1)}
      ${wire([[t.coilX, cTop], [right, cTop]], 'L')}
      ${wire([[t.coilX, t.starY], [t.nX, t.starY], [t.nX, t.y0], [right, t.y0]], 'N')}
      <circle class="er-star" cx="${t.coilX}" cy="${t.starY}" r="5"/>
    </g>`;
}

function house(L: Layout) {
  const h = L.house;
  return `
    <path class="er-roof" d="M${h.x - 16} ${h.y + 2}L${h.x + h.w / 2} ${h.y - h.peak}L${h.x + h.w + 16} ${h.y + 2}Z"/>
    <rect class="er-wall" x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}"/>`;
}

function stack(L: Layout, s: SceneState) {
  const { sx, sy } = L;
  const top = cuTop(L);
  const tripped = (on: boolean) => (on ? 'er-lever is-off' : 'er-lever');
  return `
    ${wire([[sx - D, sy], [sx - D, sy - 162]], 'L')}
    ${wire([[sx, sy], [sx, sy - 162]], 'N')}
    <rect class="er-cutout" x="${sx - 25}" y="${sy - 57}" width="50" height="57" rx="6"/>
    <rect class="er-fuse" x="${sx - 13}" y="${sy - 50}" width="10" height="16" rx="2"/>
    <text class="er-lbl er-lbl-inv" x="${sx}" y="${sy - 10}" text-anchor="middle">Cutout</text>
    <rect class="er-meter" x="${sx - 25}" y="${sy - 132}" width="50" height="60" rx="6"/>
    <rect class="er-meter-lcd" x="${sx - 17}" y="${sy - 124}" width="34" height="14" rx="2"/>
    <text class="er-lbl" x="${sx}" y="${sy - 82}" text-anchor="middle">Meter</text>
    <rect class="er-cu" x="${sx - 30}" y="${top}" width="140" height="64" rx="8"/>
    <rect class="er-mod" x="${sx - 25}" y="${top + 7}" width="30" height="34" rx="3"/>
    <rect class="er-lever" x="${sx - 16}" y="${top + 12}" width="12" height="10" rx="2"/>
    ${
      s.rcd
        ? `<rect class="er-mod er-mod-rcd" x="${sx + 10}" y="${top + 7}" width="24" height="34" rx="3"/>
           <rect class="${tripped(s.rcdTripped)}" x="${sx + 16}" y="${s.rcdTripped ? top + 26 : top + 12}" width="12" height="10" rx="2"/>
           <text class="er-tiny" x="${sx + 22}" y="${top + 38}" text-anchor="middle">RCD</text>`
        : ''
    }
    <rect class="er-mod ${s.mcbTripped ? 'is-tripped' : ''}" x="${sx + 61}" y="${top + 7}" width="20" height="34" rx="3"/>
    <rect class="${tripped(s.mcbTripped)}" x="${sx + 65}" y="${s.mcbTripped ? top + 26 : top + 12}" width="12" height="10" rx="2"/>
    <text class="er-tiny" x="${sx + 71}" y="${top + 38}" text-anchor="middle">32B</text>
    <text class="er-lbl" x="${sx + 40}" y="${top + 58}" text-anchor="middle">Consumer unit</text>`;
}

function earthing(L: Layout, arr: ArrangementId) {
  const { sx, sy, tx, met } = L;
  const right = tx.x + tx.w;
  const ey = sy + 11;
  let out = '';
  // The supply cable: a grey sheath with its cores inside.
  out += `<path class="er-sheath" d="${pathD(L.cable)}"/>`;
  out += wire(offset(L.cable, -D), 'L');
  if (arr === 'tns') {
    out += wire(L.cable, 'N');
    const e = offset(L.cable, D);
    e[e.length - 1] = [sx + D, ey];
    out += wire([[tx.coilX, tx.starY], [tx.eX, tx.starY], [tx.eX, tx.y0 + D], [right, tx.y0 + D], ...e.slice(1)], 'E');
  } else if (arr === 'tncs') {
    const pen = [...L.cable];
    pen[pen.length - 1] = [sx, sy];
    out += wire(pen, 'PEN');
    out += wire([[sx, ey], [sx + D, ey]], 'E');
    out += `<circle class="er-joint" cx="${sx}" cy="${ey}" r="3.5"/>`;
  } else {
    out += wire(L.cable, 'N');
  }
  // Earthing conductor to the MET.
  if (arr === 'tt') {
    out += `<rect class="er-pit" x="${L.rod.x - 12}" y="${L.ground - 2}" width="24" height="10" rx="2"/>`;
    out += `<path class="er-rod" d="M${L.rod.x} ${L.rod.top}V${L.rod.bottom}"/>`;
    out += wire(L.ttEarth, 'E');
  } else {
    out += wire([[sx + 14, ey], [met.x, met.y]], 'E');
    out += `<rect class="er-clamp-term" x="${sx + 3}" y="${ey - 6}" width="13" height="12" rx="2"/>`;
  }
  return out;
}

function transformerElectrode(L: Layout) {
  const t = L.tx;
  return `${wire([[t.coilX, t.starY], [t.coilX, L.ground + 4]], 'E')}
    <path class="er-rod" d="M${t.coilX} ${L.ground + 4}V${t.rodBottom}"/>`;
}

function soil(L: Layout, arr: ArrangementId) {
  return arr === 'tt' ? `<path class="er-soilpath" d="${pathD(soilCurve(L))}"/>` : '';
}

function circuitAndAppliance(L: Layout, s: SceneState) {
  const { app } = L;
  const live = s.fault === 'flowing' || s.fault === 'live';
  const cpc = offset(L.circuit, DC);
  const top = cuTop(L);
  return `
    <path class="er-tande" d="${pathD(L.circuit)}"/>
    ${wire(offset(L.circuit, -DC), 'L')}
    ${wire(L.circuit, 'N')}
    ${wire(cpc, 'E')}
    ${wire([[L.sx + 80, top + 2], [L.sx + 80, top + 46], [L.cpc[0][0], top + 46], ...L.cpc], 'E', 'er-inner')}
    <g class="er-app ${live ? 'is-live' : ''}">
      <rect class="er-app-case" x="${app.x - AW}" y="${app.y}" width="${AW * 2}" height="85" rx="8"/>
      <circle class="er-app-door" cx="${app.x}" cy="${app.y + 46}" r="17"/>
      <circle class="er-app-glass" cx="${app.x}" cy="${app.y + 46}" r="11"/>
      ${wire([[app.x + DC, app.y], [app.x + DC, app.y + 14], [app.x + (s.fault === 'none' ? 18 : AW - 5), app.y + 14]], 'L')}
      ${wire([[app.x - DC, app.y], [app.x - DC, app.y + 3]], 'E')}
      <text class="er-lbl" x="${app.x}" y="${app.y + 80}" text-anchor="middle">Appliance</text>
      ${s.fault !== 'none' && s.fault !== 'cleared' ? `<path class="er-spark" d="M${app.x + AW - 8} ${app.y + 4}l6 7-5 2 7 9"/>` : ''}
    </g>`;
}

function met(L: Layout) {
  const m = L.met;
  let studs = '';
  for (let x = m.x + 8; x < m.x + m.w - 4; x += 10) studs += `<circle class="er-stud" cx="${x}" cy="${m.y}" r="2.2"/>`;
  return `<rect class="er-met" x="${m.x}" y="${m.y - 6}" width="${m.w}" height="12" rx="3"/>${studs}`;
}

function pipes(L: Layout) {
  const G = L.ground;
  const g = L.gas;
  const w = L.water;
  return `
    <path class="er-pipe er-pipe-pe" d="M${g.x} ${L.h}V${G - 30}"/>
    <path class="er-pipe er-pipe-cu" d="M${g.x} ${G - 75}V${G - 170}M${g.x} ${G - 140}H${g.x + g.branch}"/>
    <rect class="er-gasmeter" x="${g.x - 22}" y="${G - 75}" width="44" height="45" rx="6"/>
    <text class="er-lbl" x="${g.x}" y="${G - 47}" text-anchor="middle">Gas</text>
    <path class="er-pipe er-pipe-main" d="M${w.x} ${L.h}V${G}"/>
    <path class="er-pipe er-pipe-cu" d="M${w.x} ${G}V${G - 190}M${w.x} ${G - 150}H${w.x + w.branch}"/>
    <path class="er-valve" d="M${w.x - 9} ${G - 43}L${w.x + 9} ${G - 27}V${G - 43}L${w.x - 9} ${G - 27}Z"/>
    <path class="er-valve-stem" d="M${w.x} ${G - 35}V${G - 48}M${w.x - 7} ${G - 49}H${w.x + 7}"/>`;
}

function bonds(L: Layout, s: SceneState) {
  let out = '';
  (['gas', 'water'] as PipeId[]).forEach((pipe) => {
    const id = s.bonds[pipe];
    if (!id) return;
    const spot = bondSpots.find((b) => b.id === id)!;
    const [x, y] = spotPoint(L, pipe, spot.dy);
    out += wire(bondRoute(L, pipe, spot.dy), 'E', spot.ok ? 'er-bond' : 'er-bond is-bad');
    out += `<g class="er-clamp ${spot.ok ? 'is-ok' : 'is-bad'}" data-clamp="${pipe}" transform="translate(${x} ${y})">
        <rect x="-8" y="-5" width="16" height="10" rx="2"/>
        <rect class="er-tag" x="9" y="-8" width="20" height="13" rx="2"/>
        <path class="er-tag-mark" d="M17 -6l-3 5h3l-2 4"/>
        <circle class="er-hit" r="20"/>
      </g>`;
  });
  return out;
}

function spots(L: Layout, s: SceneState) {
  if (s.mode !== 'bond') return '';
  return bondSpots
    .map((b) => {
      const [x, y] = spotPoint(L, b.pipe, b.dy);
      const placed = s.bonds[b.pipe] === b.id;
      return `<g class="er-spot ${placed ? 'is-placed' : ''}" data-spot="${b.id}" tabindex="0" role="button" aria-label="Clamp here: ${b.name}" transform="translate(${x} ${y})">
          <circle class="er-hit" r="20"/>
          <circle class="er-ring" r="12"/>
        </g>`;
    })
    .join('');
}

function labels(L: Layout, arr: ArrangementId) {
  return L.labels
    .filter((l) => !l.only || l.only.includes(arr))
    .map((l) => `<text class="er-lbl${l.b ? ' er-lbl-b' : ''}" x="${l.x}" y="${l.y}" text-anchor="${l.a ?? 'middle'}">${l.t}</text>`)
    .join('');
}

/** The whole picture as SVG markup. */
export function buildScene(L: Layout, s: SceneState) {
  const loop = faultLoop(L, s.arr);
  const glow =
    s.fault === 'flowing' || s.fault === 'live'
      ? `<path class="er-glow er-glow-fault" d="${pathD([...loop.out, ...loop.back.slice(1)])}"/>`
      : s.mode === 'earth'
        ? `<path class="er-glow er-glow-return" d="${pathD(loop.back.slice(loop.back.findIndex((p) => p[1] === L.met.y && p[0] === L.cpc[0][0])))}"/>`
        : '';
  return `
  <svg viewBox="0 0 ${L.w} ${L.h}" preserveAspectRatio="xMidYMin meet" class="er-svg er-${L.id}" role="img" aria-label="A substation transformer with an earthed star point feeds a house through an underground cable. Inside are the cutout, meter, consumer unit, main earth terminal, gas and water pipes and an appliance.">
    <defs>
      <linearGradient id="er-soil-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2d4b8"/><stop offset="1" stop-color="#cdb791"/></linearGradient>
    </defs>
    <rect class="er-soil" x="0" y="${L.ground}" width="${L.w}" height="${L.h - L.ground}" fill="url(#er-soil-g)"/>
    <path class="er-grass" d="M0 ${L.ground}H${L.w}"/>
    ${house(L)}
    <g class="er-swap" data-arr="${s.arr}">${glow}${soil(L, s.arr)}</g>
    ${transformer(L)}
    ${transformerElectrode(L)}
    ${pipes(L)}
    <g class="er-swap" data-arr="${s.arr}">${earthing(L, s.arr)}</g>
    ${circuitAndAppliance(L, s)}
    ${stack(L, s)}
    ${met(L)}
    ${bonds(L, s)}
    ${labels(L, s.arr)}
    <g class="er-dots"></g>
    ${spots(L, s)}
  </svg>`;
}
