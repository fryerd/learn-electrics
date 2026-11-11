// The stage picture for chapter 5: consumer unit → breaker → cable run → appliance.
// The cable warms (and eventually smokes) with current; a long run starves the appliance of voltage.
import { NOMINAL_V, type ApplianceKind, type MethodId } from '../data/cables-lesson';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface SceneView {
  kind: ApplianceKind;
  label: string;
  breaker: number;
  size: number;
  method: MethodId;
  methodName: string;
  group: 1 | 2 | 3;
  length: number;
  /** Amps actually flowing (0 when tripped). */
  current: number;
  temp: number;
  tripped: boolean;
  /** Volt drop at the design current (V) and its limit. */
  drop: number;
  limit: number;
  /** Volt drop with the current that is actually flowing. */
  dropNow: number;
}

type Pt = [number, number];
interface Layout {
  name: 'wide' | 'tall';
  w: number;
  h: number;
  cu: { x: number; y: number; w: number; h: number };
  app: { x: number; y: number; w: number; h: number };
  /** Cable route; the first point is at the breaker. */
  route: (bx: number) => Pt[];
  /** The horizontal stretch where the installation method is drawn. */
  seg: { x0: number; x1: number; y: number };
  /** Where the size / method caption goes. */
  method: { x: number; y: number };
  graph: { x0: number; x1: number; y0: number; y1: number };
  rulerY: number;
  thermo: { x0: number; x1: number; y: number };
}

const WIDE: Layout = {
  name: 'wide',
  w: 800,
  h: 452,
  cu: { x: 24, y: 108, w: 164, h: 214 },
  app: { x: 612, y: 108, w: 168, h: 214 },
  route: (bx) => [
    [bx, 210],
    [bx, 292],
    [612, 292],
  ],
  seg: { x0: 236, x1: 566, y: 292 },
  method: { x: 401, y: 258 },
  graph: { x0: 236, x1: 566, y0: 122, y1: 222 },
  rulerY: 346,
  thermo: { x0: 236, x1: 566, y: 400 },
};

const TALL: Layout = {
  name: 'tall',
  w: 420,
  h: 668,
  cu: { x: 14, y: 116, w: 164, h: 188 },
  app: { x: 240, y: 116, w: 166, h: 188 },
  route: (bx) => [
    [bx, 218],
    [bx, 372],
    [323, 372],
    [323, 304],
  ],
  seg: { x0: 178, x1: 298, y: 372 },
  method: { x: 210, y: 460 },
  graph: { x0: 30, x1: 390, y0: 502, y1: 568 },
  rulerY: 430,
  thermo: { x0: 30, x1: 390, y: 622 },
};

/* ------------------------------ small helpers ------------------------------ */

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a: number[], b: number[], t: number) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
const rgb = (c: number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;

const SHEATH = [232, 229, 222];
const AMBER = [240, 160, 48];
const RED = [216, 67, 47];
const DARK = [150, 34, 24];

/** Colour of the cable sheath at a temperature (°C). */
export function heatColour(t: number) {
  if (t <= 42) return rgb(SHEATH);
  if (t <= 70) return rgb(mix(SHEATH, AMBER, (t - 42) / 28));
  if (t <= 100) return rgb(mix(AMBER, RED, (t - 70) / 30));
  return rgb(mix(RED, DARK, clamp((t - 100) / 40)));
}

function roundedPath(pts: Pt[], r = 18) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    const l1 = Math.hypot(x - px, y - py);
    const l2 = Math.hypot(nx - x, ny - y);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const ax = x - ((x - px) / l1) * rr;
    const ay = y - ((y - py) / l1) * rr;
    const bx = x + ((nx - x) / l2) * rr;
    const by = y + ((ny - y) / l2) * rr;
    d += ` L${ax.toFixed(1)} ${ay.toFixed(1)} Q${x} ${y} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last[0]} ${last[1]}`;
}

const fmtV = (v: number) => `${v.toFixed(1)} V`;

/* ------------------------------ appliance icons ------------------------------ */
// Drawn around (0, 0), roughly 100 units across. Elements with ids are animated.

function icon(kind: ApplianceKind) {
  switch (kind) {
    case 'shower':
      return `
        <path class="cb-ink-line" d="M28 -54 V-44 H0 V-34"/>
        <path class="cb-part" d="M-30 -22 Q0 -40 30 -22 L26 -14 H-26 Z"/>
        <g id="cb-drops"></g>`;
    case 'immersion':
      return `
        <rect class="cb-copper" x="-30" y="-50" width="60" height="96" rx="24"/>
        <path class="cb-ink-line" d="M-8 -50 V-60 M8 -50 V-60"/>
        <path id="cb-element" class="cb-element" d="M0 -40 V-26 l-12 6 l24 8 l-24 8 l24 8 l-24 8 l12 6 V30"/>`;
    case 'ring':
      return `
        <rect class="cb-part" x="-48" y="-30" width="96" height="60" rx="10"/>
        ${[-22, 22]
          .map(
            (cx) => `
          <rect class="cb-slot" x="${cx - 3}" y="-18" width="6" height="12" rx="1.5"/>
          <rect class="cb-slot" x="${cx - 14}" y="2" width="11" height="6" rx="1.5"/>
          <rect class="cb-slot" x="${cx + 3}" y="2" width="11" height="6" rx="1.5"/>`,
          )
          .join('')}
        <circle id="cb-neon" class="cb-neon" cx="0" cy="-20" r="4"/>`;
    case 'lighting':
      return `
        <circle class="cb-bulb" cx="0" cy="-12" r="27"/>
        <path class="cb-fil" d="M-11 -8 l5 -10 l6 10 l6 -10 l5 10"/>
        <rect class="cb-part" x="-13" y="14" width="26" height="22" rx="4"/>
        <path class="cb-ink-line" d="M-13 22 H13 M-13 29 H13"/>`;
    case 'ev':
      return `
        <rect class="cb-part" x="-30" y="-52" width="60" height="84" rx="12"/>
        <rect class="cb-screen" x="-18" y="-40" width="36" height="24" rx="4"/>
        <path id="cb-bolt" class="cb-bolt" d="M3 -38 L-7 -26 H1 L-3 -18 L9 -30 H1 Z"/>
        <path class="cb-ink-line" d="M0 32 V40 Q0 52 14 52 H36"/>
        <rect class="cb-part" x="34" y="44" width="14" height="16" rx="3"/>`;
    case 'cooker':
      return `
        <rect class="cb-part" x="-42" y="-38" width="84" height="88" rx="8"/>
        <ellipse id="cb-hob1" class="cb-hob" cx="-18" cy="-26" rx="13" ry="5"/>
        <ellipse id="cb-hob2" class="cb-hob" cx="18" cy="-26" rx="13" ry="5"/>
        <rect class="cb-window" x="-30" y="-6" width="60" height="42" rx="6"/>
        <rect id="cb-oven" class="cb-oven" x="-24" y="0" width="48" height="30" rx="4"/>`;
  }
}

/* --------------------------------- the scene --------------------------------- */

export interface Scene {
  render(v: SceneView): void;
  /** Advance the animation (seconds). */
  frame(dt: number, v: SceneView): void;
  destroy(): void;
}

export function createScene(host: HTMLElement, reduced: boolean): Scene {
  let layout: Layout | null = null;
  let svg: SVGSVGElement;
  let last: SceneView | null = null;
  let kind: ApplianceKind | null = null;
  let offset = 0;
  let phase = 0;
  let pathLen = 1;
  let cablePath: SVGPathElement;
  const dots: SVGCircleElement[] = [];
  const smoke: SVGCircleElement[] = [];
  const drops: SVGLineElement[] = [];

  const $ = <T extends Element = SVGElement>(id: string) => svg.querySelector<T>(`#${id}`)!;

  const build = (L: Layout) => {
    layout = L;
    kind = null;
    const { cu, app, seg, graph, thermo } = L;
    // breaker modules: main switch then three MCBs; the last one is ours.
    const mods = [0, 1, 2].map((i) => cu.x + 54 + i * 35);
    const bx = mods[2] + 14;
    const route = L.route(bx);
    const d = roundedPath(route);
    const segMid = (seg.x0 + seg.x1) / 2;
    const ax = app.x + app.w / 2;
    const ay = app.y + app.h / 2 + (L.name === 'wide' ? -4 : 8);

    host.innerHTML = `
      <svg viewBox="0 0 ${L.w} ${L.h}" class="cb-svg cb-${L.name}" role="img" aria-labelledby="cb-svg-title">
        <title id="cb-svg-title">A consumer unit feeds a cable run to an appliance. The cable changes colour as it warms up, and a graph shows the voltage falling along the run.</title>
        <defs>
          <filter id="cb-blur" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="7"/></filter>
          <filter id="cb-shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#1d232b" flood-opacity="0.13"/></filter>
          <pattern id="cb-wool" width="22" height="14" patternUnits="userSpaceOnUse">
            <path d="M0 7 Q5.5 0 11 7 T22 7" fill="none" stroke="#d9b464" stroke-width="1.6"/>
          </pattern>
          <radialGradient id="cb-halo-grad"><stop offset="0" stop-color="#ffd24a" stop-opacity="0.95"/><stop offset="1" stop-color="#ffd24a" stop-opacity="0"/></radialGradient>
        </defs>

        <!-- consumer unit -->
        ${L.name === 'wide' ? `<text class="cb-cap" x="${cu.x + 4}" y="${cu.y - 12}">CONSUMER UNIT</text>` : ''}
        <rect class="cb-card" x="${cu.x}" y="${cu.y}" width="${cu.w}" height="${cu.h}" rx="14" filter="url(#cb-shadow)"/>
        <rect class="cb-rail" x="${cu.x + 10}" y="${cu.y + 26}" width="${cu.w - 20}" height="76" rx="6"/>
        <rect class="cb-module cb-main" x="${cu.x + 14}" y="${cu.y + 30}" width="34" height="68" rx="4"/>
        <rect class="cb-toggle-main" x="${cu.x + 24}" y="${cu.y + 44}" width="14" height="20" rx="3"/>
        ${mods
          .map(
            (x, i) => `
          <rect class="cb-module${i === 2 ? ' cb-ours' : ''}" x="${x}" y="${cu.y + 30}" width="28" height="68" rx="4"/>
          ${i === 2 ? `<text class="cb-mcb-txt" id="cb-mcb-txt" x="${x + 14}" y="${cu.y + 46}" text-anchor="middle">B32</text>` : ''}
          <rect class="cb-slot-bg" x="${x + 8}" y="${cu.y + 54}" width="12" height="34" rx="3"/>
          <rect class="cb-toggle"${i === 2 ? ' id="cb-toggle"' : ''} x="${x + 9}" y="${cu.y + 56}" width="10" height="15" rx="2.5"/>`,
          )
          .join('')}
        <text class="cb-small" x="${cu.x + 14}" y="${cu.y + 128}">BREAKER</text>
        <text class="cb-big" id="cb-in" x="${cu.x + 14}" y="${cu.y + 156}">32 A</text>
        <text class="cb-small cb-tripped-txt" id="cb-trip-txt" x="${cu.x + 14}" y="${cu.y + 178}">TRIPPED</text>

        <!-- voltage graph -->
        <text class="cb-cap" x="${graph.x0}" y="${graph.y0 - 12}">VOLTAGE ALONG THE CABLE</text>
        <rect class="cb-graph-bg" x="${graph.x0}" y="${graph.y0}" width="${graph.x1 - graph.x0}" height="${graph.y1 - graph.y0}" rx="8"/>
        <line class="cb-limit" id="cb-limit" x1="${graph.x0}" x2="${graph.x1}"/>
        <text class="cb-small cb-limit-txt" id="cb-limit-txt" x="${graph.x0 + 8}" text-anchor="start">LIMIT</text>
        <path class="cb-vfill" id="cb-vfill"/>
        <path class="cb-vline" id="cb-vline"/>
        <circle class="cb-vdot" id="cb-vdot" r="5" cx="${graph.x1}" cy="${graph.y0 + 26}"/>
        <text class="cb-small cb-strong" x="${graph.x0 + 8}" y="${graph.y0 + 18}">${NOMINAL_V} V</text>
        <text class="cb-small cb-strong" id="cb-vend" x="${graph.x1 - 16}" text-anchor="end"></text>

        <!-- installation method (behind the cable) -->
        <g id="cb-env-back"></g>
        <g id="cb-others"></g>

        <!-- the cable -->
        <path id="cb-glow" class="cb-glow" d="${d}" filter="url(#cb-blur)"/>
        <path class="cb-outline" id="cb-outline" d="${d}"/>
        <path class="cb-sheath" id="cb-sheath" d="${d}"/>
        <path class="cb-shine" id="cb-shine" d="${d}"/>
        <g id="cb-dots"></g>
        <g id="cb-env-front"></g>
        <g id="cb-smoke"></g>
        <text class="cb-small cb-strong" id="cb-method" x="${L.method.x}" y="${L.method.y}" text-anchor="middle"></text>

        <!-- ruler -->
        <path class="cb-ruler" d="M${seg.x0} ${L.rulerY - 6} v12 M${seg.x0} ${L.rulerY} H${seg.x1} M${seg.x1} ${L.rulerY - 6} v12"/>
        <rect class="cb-ruler-bg" id="cb-ruler-bg" x="${segMid - 44}" y="${L.rulerY - 12}" width="88" height="24" rx="12"/>
        <text class="cb-small cb-strong" id="cb-runlen" x="${segMid}" y="${L.rulerY + 5}" text-anchor="middle">20 m</text>

        <!-- thermometer -->
        <text class="cb-cap" x="${thermo.x0}" y="${thermo.y - 14}">CABLE TEMPERATURE</text>
        <text class="cb-small cb-strong" id="cb-temp" x="${thermo.x1}" y="${thermo.y - 14}" text-anchor="end">30 °C</text>
        <rect class="cb-thermo-bg" x="${thermo.x0}" y="${thermo.y - 6}" width="${thermo.x1 - thermo.x0}" height="16" rx="8"/>
        <rect class="cb-thermo" id="cb-thermo" x="${thermo.x0}" y="${thermo.y - 6}" width="20" height="16" rx="8"/>
        <line class="cb-thermo-max" x1="${thermo.x0 + (thermo.x1 - thermo.x0) * 0.5}" x2="${thermo.x0 + (thermo.x1 - thermo.x0) * 0.5}" y1="${thermo.y - 12}" y2="${thermo.y + 16}"/>
        <text class="cb-small" x="${thermo.x0 + (thermo.x1 - thermo.x0) * 0.5}" y="${thermo.y + 30}" text-anchor="middle">70 °C max for PVC</text>

        <!-- appliance -->
        <rect class="cb-card" id="cb-app-card" x="${app.x}" y="${app.y}" width="${app.w}" height="${app.h}" rx="14" filter="url(#cb-shadow)"/>
        <text class="cb-cap" id="cb-app-cap" x="${ax}" y="${L.name === 'wide' ? app.y - 12 : app.y + 26}" text-anchor="middle"></text>
        <circle id="cb-halo" cx="${ax}" cy="${ay - 6}" r="70" fill="url(#cb-halo-grad)" opacity="0"/>
        <g id="cb-icon" transform="translate(${ax} ${ay - 8})${L.name === 'tall' ? ' scale(0.82)' : ''}"></g>
        <text class="cb-small" x="${ax}" y="${app.y + app.h - 34}" text-anchor="middle">VOLTAGE HERE</text>
        <text class="cb-mid" id="cb-vapp" x="${ax}" y="${app.y + app.h - 12}" text-anchor="middle">230 V</text>
      </svg>`;
    svg = host.querySelector('svg')!;
    cablePath = $<SVGPathElement>('cb-sheath');
    pathLen = cablePath.getTotalLength();

    dots.length = 0;
    const dl = $('cb-dots');
    for (let i = 0; i < 20; i++) {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('class', 'cb-dot');
      c.setAttribute('r', '3');
      dl.append(c);
      dots.push(c);
    }
    smoke.length = 0;
    const sl = $('cb-smoke');
    for (let i = 0; i < 9; i++) {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('class', 'cb-puff');
      sl.append(c);
      smoke.push(c);
    }
  };

  const setIcon = (k: ApplianceKind) => {
    if (!layout || kind === k) return;
    kind = k;
    $('cb-icon').innerHTML = icon(k);
    drops.length = 0;
    if (k === 'shower') {
      const g = $('cb-drops');
      for (let i = 0; i < 9; i++) {
        const l = document.createElementNS(SVG_NS, 'line');
        l.setAttribute('class', 'cb-drop');
        g.append(l);
        drops.push(l);
      }
    }
  };

  const drawEnv = (v: SceneView, w: number) => {
    const L = layout!;
    const { x0, x1, y } = L.seg;
    const back = $('cb-env-back');
    const front = $('cb-env-front');
    const others = $('cb-others');
    const extra = v.group - 1;
    const pitch = w + 6;
    // the other circuits in the bunch sit either side of ours
    const offs = extra === 0 ? [] : extra === 1 ? [-pitch] : [-pitch, pitch];
    const span = offs.length ? Math.max(...offs.map(Math.abs)) : 0;
    const half = w / 2 + span + 12;
    others.innerHTML = offs
      .map(
        (o) => `<line class="cb-other-o" x1="${x0 - 14}" x2="${x1 + 14}" y1="${y + o}" y2="${y + o}" stroke-width="${w + 3}"/>
                <line class="cb-other" x1="${x0 - 14}" x2="${x1 + 14}" y1="${y + o}" y2="${y + o}" stroke-width="${w}"/>`,
      )
      .join('');

    if (v.method === 'A') {
      back.innerHTML = `
        <rect class="cb-wool" x="${x0}" y="${y - half - 12}" width="${x1 - x0}" height="${2 * half + 24}" rx="10"/>
        <rect x="${x0}" y="${y - half - 12}" width="${x1 - x0}" height="${2 * half + 24}" rx="10" fill="url(#cb-wool)"/>`;
      front.innerHTML = `
        <rect class="cb-wool-front" x="${x0 + 4}" y="${y - half - 8}" width="${x1 - x0 - 8}" height="${2 * half + 16}" rx="8"/>
        <rect x="${x0 + 4}" y="${y - half - 8}" width="${x1 - x0 - 8}" height="${2 * half + 16}" rx="8" fill="url(#cb-wool)" opacity="0.55"/>`;
    } else if (v.method === 'B') {
      back.innerHTML = `<rect class="cb-conduit" x="${x0}" y="${y - half}" width="${x1 - x0}" height="${2 * half}" rx="${Math.min(half, 14)}"/>`;
      front.innerHTML = `
        <rect class="cb-conduit-front" x="${x0}" y="${y - half}" width="${x1 - x0}" height="${2 * half}" rx="${Math.min(half, 14)}"/>
        <line class="cb-conduit-shine" x1="${x0 + 10}" x2="${x1 - 10}" y1="${y - half + 4}" y2="${y - half + 4}"/>`;
    } else {
      back.innerHTML = `<rect class="cb-wall" x="${x0 - 6}" y="${y - half - 4}" width="${x1 - x0 + 12}" height="${2 * half + 8}" rx="6"/>`;
      const n = Math.max(2, Math.floor((x1 - x0) / 46));
      const clips: string[] = [];
      for (let i = 0; i < n; i++) {
        const cx = x0 + ((i + 0.5) * (x1 - x0)) / n;
        clips.push(
          `<rect class="cb-clip" x="${cx - 5}" y="${y - half + 4}" width="10" height="${2 * half - 8}" rx="3"/><circle class="cb-pin" cx="${cx}" cy="${y - half + 9}" r="1.8"/>`,
        );
      }
      front.innerHTML = clips.join('');
    }
  };

  const render = (v: SceneView) => {
    const L = layout!;
    last = v;
    setIcon(v.kind);
    const w = 8 + 3.2 * Math.sqrt(v.size);
    for (const id of ['cb-sheath', 'cb-shine', 'cb-outline', 'cb-glow']) {
      const el = $(id);
      el.style.strokeWidth = String(id === 'cb-outline' ? w + 3.5 : id === 'cb-shine' ? Math.max(1.5, w * 0.18) : id === 'cb-glow' ? w + 16 : w);
    }
    dots.forEach((d) => d.setAttribute('r', String(Math.max(2.2, w * 0.22))));
    drawEnv(v, w);

    $('cb-mcb-txt').textContent = `B${v.breaker}`;
    $('cb-in').textContent = `${v.breaker} A`;
    svg.classList.toggle('cb-is-tripped', v.tripped);
    $('cb-toggle').setAttribute('transform', v.tripped ? 'translate(0 15)' : '');
    $('cb-method').textContent = `${v.size} mm² · ${v.method} · ${v.methodName}${v.group > 1 ? ` · ×${v.group === 2 ? '0.8' : '0.7'}` : ''}`;
    $('cb-runlen').textContent = `${v.length} m`;
    $('cb-app-cap').textContent = v.label.toUpperCase();

    // voltage graph (fixed scale: 0 at the top, twice the limit at the bottom)
    const { x0, x1, y0, y1 } = L.graph;
    const yOf = (drop: number) => y0 + 26 + clamp(drop / (2 * v.limit)) * (y1 - y0 - 34);
    const ly = yOf(v.limit);
    const lim = $('cb-limit');
    lim.setAttribute('y1', String(ly));
    lim.setAttribute('y2', String(ly));
    $('cb-limit-txt').setAttribute('y', String(ly + 17));
    $('cb-limit-txt').textContent = `LIMIT ${fmtV(NOMINAL_V - v.limit)}`;
    const dropShown = v.tripped ? 0 : v.dropNow;
    const ey = yOf(dropShown);
    const sy = yOf(0);
    const bad = dropShown > v.limit + 1e-9;
    $('cb-vline').setAttribute('d', `M${x0} ${sy} L${x1} ${ey}`);
    $('cb-vfill').setAttribute('d', `M${x0} ${sy} L${x1} ${ey} L${x1} ${y1} L${x0} ${y1} Z`);
    $('cb-vdot').setAttribute('cx', String(x1));
    $('cb-vdot').setAttribute('cy', String(ey));
    svg.classList.toggle('cb-drop-bad', bad);
    const vEnd = v.tripped ? 0 : NOMINAL_V - dropShown;
    const vend = $('cb-vend');
    vend.textContent = v.tripped ? 'OFF' : fmtV(vEnd);
    vend.setAttribute('y', String(ey > y1 - 22 ? ey - 10 : ey + 20));
    $('cb-vapp').textContent = v.tripped ? '0 V' : fmtV(vEnd);
    paint(v);
  };

  /** Things that change every frame: heat, glow, appliance liveliness. */
  const paint = (v: SceneView) => {
    const L = layout!;
    const col = heatColour(v.temp);
    $('cb-sheath').style.stroke = col;
    $('cb-glow').style.opacity = String(clamp((v.temp - 58) / 45) * 0.9);
    $('cb-temp').textContent = `${Math.round(v.temp)} °C`;
    const { x0, x1 } = L.thermo;
    const t = clamp((v.temp - 10) / 120);
    const th = $('cb-thermo');
    th.setAttribute('width', String(Math.max(16, t * (x1 - x0))));
    th.style.fill = v.temp <= 42 ? '#9aa4ae' : col;
    svg.classList.toggle('cb-hot', v.temp > 70);

    // appliance liveliness falls with volt drop (exaggerated so it is visible)
    const live = v.tripped || v.current <= 0 ? 0 : clamp(1 - 0.45 * (v.dropNow / v.limit), 0.12, 1);
    svg.style.setProperty('--cb-live', String(live));
    const halo = $('cb-halo');
    halo.setAttribute('opacity', String(v.kind === 'lighting' ? live : live * 0.45));
    if (v.kind === 'immersion') $('cb-element').style.opacity = String(0.25 + live * 0.75);
    if (v.kind === 'cooker') {
      for (const id of ['cb-hob1', 'cb-hob2', 'cb-oven']) $(id).style.opacity = String(0.15 + live * 0.85);
    }
    if (v.kind === 'ring') $('cb-neon').style.opacity = String(live);
    if (v.kind === 'ev') $('cb-bolt').style.opacity = String(0.2 + live * 0.8);
  };

  const frame = (dt: number, v: SceneView) => {
    if (!layout) return;
    last = v;
    const flowing = v.tripped ? 0 : v.current;
    const speed = flowing <= 0 ? 0 : 18 + 110 * clamp(flowing / 60);
    offset = (offset + (reduced ? 0 : speed * dt)) % pathLen;
    phase += reduced ? 0 : dt;
    const n = dots.length;
    for (let i = 0; i < n; i++) {
      const p = cablePath.getPointAtLength((offset + (i * pathLen) / n) % pathLen);
      dots[i].setAttribute('cx', p.x.toFixed(1));
      dots[i].setAttribute('cy', p.y.toFixed(1));
      dots[i].style.opacity = flowing > 0 ? '1' : '0';
    }

    // smoke above the hottest stretch
    const smokeLevel = clamp((v.temp - 80) / 30);
    const { x0, x1, y } = layout.seg;
    smoke.forEach((c, i) => {
      const f = reduced ? (i / smoke.length) : (phase * 0.45 + i / smoke.length) % 1;
      const cx = x0 + 30 + ((i * 37) % Math.max(1, x1 - x0 - 60)) + Math.sin(f * 6 + i) * 8;
      c.setAttribute('cx', cx.toFixed(1));
      c.setAttribute('cy', (y - 8 - f * (layout!.name === 'wide' ? 80 : 50)).toFixed(1));
      c.setAttribute('r', (6 + f * 16).toFixed(1));
      c.style.opacity = String(smokeLevel * (1 - f) * 0.55);
    });

    // shower spray: shorter and sparser as voltage falls
    const live = v.tripped || v.current <= 0 ? 0 : clamp(1 - 0.45 * (v.dropNow / v.limit), 0.12, 1);
    drops.forEach((l, i) => {
      const x = -22 + i * 5.5;
      const f = reduced ? 0.5 : (phase * (0.9 + live) + i * 0.37) % 1;
      const yy = -10 + f * 52 * (0.4 + live * 0.6);
      l.setAttribute('x1', String(x * (1 + f * 0.4)));
      l.setAttribute('x2', String(x * (1 + f * 0.4)));
      l.setAttribute('y1', yy.toFixed(1));
      l.setAttribute('y2', (yy + 7).toFixed(1));
      l.style.opacity = String(live * (1 - f * 0.6));
    });
    paint(v);
  };

  const pick = () => {
    const r = host.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    return r.width / r.height < 1.05 ? TALL : WIDE;
  };

  const relayout = () => {
    const L = pick();
    if (!L || L === layout) return;
    build(L);
    if (last) {
      render(last);
      frame(0, last);
    }
  };
  build(pick() ?? WIDE);
  const ro = new ResizeObserver(relayout);
  ro.observe(host);

  return {
    render: (v) => {
      render(v);
      frame(0, v);
    },
    frame,
    destroy: () => ro.disconnect(),
  };
}
