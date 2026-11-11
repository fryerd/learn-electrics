import {
  POSITION_NAMES,
  circuitTerminals,
  switchLinkKey,
  switchLinks,
  switchTerminals,
  wireColour,
  type ComboState,
  type LevelDef,
  type SwitchDef,
  type TermInfo,
  type Wire,
} from './lighting-sim';

// The circuit sandbox on the stage: a schematic with a supply, a 3-plate ceiling rose, a lamp and the
// level's switches. The learner joins terminals (click one then another, or drag), clicks a wire to
// remove it, and clicks a switch rocker to flip it. The controller owns the state; this only draws it.

const NS = 'http://www.w3.org/2000/svg';

type Orient = 'wide' | 'tall';
interface P {
  x: number;
  y: number;
}
interface Layout {
  w: number;
  h: number;
  sup: P;
  rose: P;
  lamp: P;
  sw: P[];
}

const ROSE_R = 86;
const SUP_W = 130;
const SUP_H = 170;
const SW_H = 150;
const switchWidth = (sw: SwitchDef) => 40 + 40 * switchTerminals(sw).length;

function layoutFor(level: LevelDef, o: Orient): Layout {
  const n = level.switches.length;
  if (o === 'wide') {
    const base = { w: 820, h: 560, sup: { x: 24, y: 40 }, rose: { x: 400, y: 128 }, lamp: { x: 650, y: 230 } };
    const sw = n === 1 ? [{ x: 330, y: 385 }] : n === 2 ? [{ x: 80, y: 385 }, { x: 540, y: 385 }] : [{ x: 20, y: 385 }, { x: 290, y: 385 }, { x: 600, y: 385 }];
    return { ...base, sw };
  }
  const base = { w: 440, h: 740, sup: { x: 14, y: 30 }, rose: { x: 300, y: 124 }, lamp: { x: 300, y: 242 } };
  const sw =
    n === 1 ? [{ x: 140, y: 420 }] : n === 2 ? [{ x: 14, y: 410 }, { x: 226, y: 410 }] : [{ x: 14, y: 384 }, { x: 100, y: 584 }, { x: 226, y: 384 }];
  return { ...base, h: n === 3 ? 762 : 620, sw };
}

interface TermPos extends P {
  /** Direction a wire leaves the terminal. */
  nx: number;
  ny: number;
}

function terminalPositions(level: LevelDef, L: Layout): Record<string, TermPos> {
  const out: Record<string, TermPos> = {};
  const { sup, rose, lamp } = L;
  (['L', 'N', 'E'] as const).forEach((k, i) => (out[`sup.${k}`] = { x: sup.x + SUP_W - 22, y: sup.y + 72 + i * 34, nx: 1, ny: 0 }));
  (['N', 'L', 'SW', 'E'] as const).forEach((k, i) => (out[`rose.${k}`] = { x: rose.x - 54 + i * 36, y: rose.y + 8, nx: 0, ny: 1 }));
  out['lamp.L'] = { x: lamp.x - 18, y: lamp.y, nx: 0, ny: -1 };
  out['lamp.N'] = { x: lamp.x + 18, y: lamp.y, nx: 0, ny: -1 };
  level.switches.forEach((sw, i) => {
    const p = L.sw[i];
    switchTerminals(sw).forEach((t, j) => (out[t.id] = { x: p.x + 40 + j * 40, y: p.y + 40, nx: 0, ny: -1 }));
  });
  return out;
}

const COMP_NAME: Record<string, string> = { sup: 'Supply', rose: 'Ceiling rose', lamp: 'Lamp' };

export interface CircuitModel {
  level: LevelDef;
  wires: Wire[];
  positions: number[];
  state: ComboState;
  /** Terminals to pulse (a hint). */
  hint: string[];
}

export interface CircuitHandlers {
  addWire(a: string, b: string): void;
  removeWire(index: number): void;
  flip(switchIndex: number): void;
}

export interface CircuitView {
  render(m: CircuitModel): void;
  activate(): void;
  deactivate(): void;
}

const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, cls?: string) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (cls) e.setAttribute('class', cls);
  return e;
};
const txt = (x: number, y: number, s: string, cls: string, anchor = 'middle') => {
  const t = el('text', { x, y, 'text-anchor': anchor }, cls);
  t.textContent = s;
  return t;
};

export function createCircuitView(host: HTMLElement, h: CircuitHandlers): CircuitView {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svg = el('svg', {}, 'lt-svg lt-circuit');
  svg.setAttribute('role', 'group');
  host.append(svg);

  const gComps = el('g');
  const gWires = el('g');
  const gTerms = el('g');
  const gOver = el('g', { 'pointer-events': 'none' });
  svg.append(gComps, gWires, gTerms, gOver);
  const band = el('path', {}, 'lt-band');
  band.style.display = 'none';
  gOver.append(band);

  let model: CircuitModel | null = null;
  let orient: Orient = 'wide';
  let builtFor = '';
  let layout: Layout;
  let tpos: Record<string, TermPos> = {};
  let tinfo: Record<string, TermInfo> = {};
  let pending: string | null = null;
  let flows: { path: SVGPathElement; dir: number }[] = [];

  // per-switch elements updated on every render
  let swEls: { rocker: SVGGElement; pos: SVGTextElement; links: SVGGElement }[] = [];
  let lampGlow: SVGCircleElement;
  let lampBulb: SVGCircleElement;
  let liveBadge: SVGGElement;
  let tripBadge: SVGGElement;
  let mcbToggle: SVGRectElement;

  /* ---------------------------- static parts ---------------------------- */
  const build = () => {
    const m = model!;
    layout = layoutFor(m.level, orient);
    svg.setAttribute('viewBox', `0 0 ${layout.w} ${layout.h}`);
    svg.setAttribute('aria-label', `Circuit with a supply, a ceiling rose, a lamp and ${m.level.switches.length} switch${m.level.switches.length > 1 ? 'es' : ''}.`);
    tpos = terminalPositions(m.level, layout);
    tinfo = Object.fromEntries(circuitTerminals(m.level.switches).map((t) => [t.id, t]));
    gComps.replaceChildren();
    gTerms.replaceChildren();
    swEls = [];

    // supply
    const { sup, rose, lamp } = layout;
    gComps.append(el('rect', { x: sup.x, y: sup.y, width: SUP_W, height: SUP_H, rx: 14 }, 'lt-box'));
    gComps.append(txt(sup.x + 16, sup.y + 26, 'SUPPLY', 'lt-title', 'start'));
    gComps.append(txt(sup.x + 16, sup.y + 44, 'from the CU', 'lt-sub', 'start'));
    mcbToggle = el('rect', { x: sup.x + 22, y: sup.y + 64, width: 22, height: 40, rx: 5 }, 'lt-mcb');
    gComps.append(el('rect', { x: sup.x + 16, y: sup.y + 58, width: 34, height: 92, rx: 6 }, 'lt-mcb-body'), mcbToggle);
    gComps.append(txt(sup.x + 33, sup.y + 140, '6 A', 'lt-sub'));
    tripBadge = el('g', {}, 'lt-trip');
    tripBadge.append(el('rect', { x: sup.x + 4, y: sup.y + SUP_H + 8, width: SUP_W - 8, height: 26, rx: 13 }), txt(sup.x + SUP_W / 2, sup.y + SUP_H + 26, 'BREAKER TRIPS', 'lt-badge-text'));
    gComps.append(tripBadge);

    // ceiling rose
    gComps.append(el('circle', { cx: rose.x, cy: rose.y, r: ROSE_R + 6 }, 'lt-rose-rim'));
    gComps.append(el('circle', { cx: rose.x, cy: rose.y, r: ROSE_R - 6 }, 'lt-rose'));
    gComps.append(txt(rose.x, rose.y - ROSE_R - 12, 'CEILING ROSE · 3-PLATE', 'lt-title'));
    // the three banks plus earth, as little brass plates
    (['N', 'L', 'SW'] as const).forEach((k) => {
      const t = tpos[`rose.${k}`];
      gComps.append(el('rect', { x: t.x - 15, y: t.y - 40, width: 30, height: 56, rx: 7 }, 'lt-bank'));
    });

    // lamp
    gComps.append(el('rect', { x: lamp.x - 36, y: lamp.y - 14, width: 72, height: 40, rx: 10 }, 'lt-holder'));
    lampGlow = el('circle', { cx: lamp.x, cy: lamp.y + 70, r: 52 }, 'lt-glow');
    lampBulb = el('circle', { cx: lamp.x, cy: lamp.y + 70, r: 30 }, 'lt-bulb');
    gComps.append(lampGlow, el('rect', { x: lamp.x - 12, y: lamp.y + 26, width: 24, height: 16, rx: 3 }, 'lt-cap'), lampBulb);
    gComps.append(el('path', { d: `M${lamp.x - 11} ${lamp.y + 76} l5 -11 l6 11 l6 -11 l5 11` }, 'lt-fil'));
    gComps.append(txt(lamp.x + 48, lamp.y + 74, 'LAMP', 'lt-title', 'start'));
    liveBadge = el('g', {}, 'lt-live');
    liveBadge.append(el('rect', { x: lamp.x - 104, y: lamp.y + 58, width: 64, height: 24, rx: 12 }), txt(lamp.x - 72, lamp.y + 75, 'LIVE!', 'lt-badge-text'));
    gComps.append(liveBadge);

    // switches
    m.level.switches.forEach((sw, i) => {
      const p = layout.sw[i];
      const w = switchWidth(sw);
      gComps.append(el('rect', { x: p.x, y: p.y, width: w, height: SW_H, rx: 16 }, 'lt-box lt-switch'));
      const links = el('g');
      gComps.append(links);
      const rocker = el('g', { tabindex: 0, role: 'button' }, 'lt-rocker');
      rocker.setAttribute('aria-label', `Flip ${sw.label}`);
      const rx = p.x + w / 2 - 26;
      rocker.append(el('rect', { x: rx, y: p.y + 76, width: 52, height: 62, rx: 10 }, 'lt-rocker-body'), el('rect', { x: rx + 6, y: p.y + 82, width: 40, height: 24, rx: 6 }, 'lt-rocker-pad'));
      const pos = txt(p.x + w / 2, p.y + SW_H + 22, '', 'lt-sub');
      gComps.append(rocker, pos);
      if (sw.type === 'intermediate') {
        gComps.append(txt(p.x + 60, p.y + 108, 'in', 'lt-tiny'), txt(p.x + 180, p.y + 108, 'out', 'lt-tiny'));
      }
      gComps.append(txt(p.x + w / 2, p.y - 10, `${sw.label} · ${sw.type}`.toUpperCase(), 'lt-tiny'));
      const flip = () => h.flip(i);
      rocker.addEventListener('click', flip);
      rocker.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          flip();
        }
      });
      swEls.push({ rocker, pos, links });
    });

    // terminals (on top so they are always clickable)
    for (const [id, t] of Object.entries(tpos)) {
      const info = tinfo[id];
      const g = el('g', { tabindex: 0, role: 'button', 'data-term': id }, `lt-term lt-k-${info.kind}`);
      g.setAttribute('aria-label', `${COMP_NAME[info.comp] ?? switchName(info.comp)} terminal ${info.label}`);
      g.append(el('circle', { cx: t.x, cy: t.y, r: 20 }, 'lt-term-hit'), el('circle', { cx: t.x, cy: t.y, r: 9 }, 'lt-term-dot'));
      const lx = info.comp === 'sup' ? t.x - 22 : t.x;
      const ly = info.comp === 'sup' ? t.y + 5 : info.comp === 'lamp' ? t.y + 22 : t.y - 18;
      g.append(txt(lx, ly, info.label, 'lt-term-label', info.comp === 'sup' ? 'end' : 'middle'));
      gTerms.append(g);
    }
    builtFor = `${m.level.id}:${orient}`;
  };
  const switchName = (comp: string) => model!.level.switches.find((s) => s.id === comp)?.label ?? comp;

  /* ---------------------------- dynamic parts ---------------------------- */
  const wirePath = (a: TermPos, b: TermPos, spreadA: number, spreadB: number) => {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const k = Math.max(36, Math.min(150, d * 0.42));
    const c1 = { x: a.x + a.nx * k + a.ny * spreadA, y: a.y + a.ny * k + a.nx * spreadA };
    const c2 = { x: b.x + b.nx * k + b.ny * spreadB, y: b.y + b.ny * k + b.nx * spreadB };
    return `M${a.x} ${a.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`;
  };

  const draw = () => {
    const m = model!;
    const { state } = m;
    gWires.replaceChildren();
    flows = [];
    const count: Record<string, number> = {};
    const seen: Record<string, number> = {};
    m.wires.forEach((w) => {
      count[w.a] = (count[w.a] ?? 0) + 1;
      count[w.b] = (count[w.b] ?? 0) + 1;
    });
    const spread = (t: string) => {
      const i = (seen[t] = (seen[t] ?? -1) + 1);
      return (i - ((count[t] ?? 1) - 1) / 2) * 16;
    };
    m.wires.forEach((w, i) => {
      const a = tpos[w.a];
      const b = tpos[w.b];
      if (!a || !b) return;
      const colour = wireColour(tinfo[w.a], tinfo[w.b]);
      const d = wirePath(a, b, spread(w.a), spread(w.b));
      const g = el('g', { 'data-wire': i }, `lt-wire lt-c-${colour}`);
      g.append(el('path', { d }, 'lt-wire-shadow'), el('path', { d }, 'lt-wire-core'));
      const core = g.lastChild as SVGPathElement;
      if (colour === 'earth') g.append(el('path', { d }, 'lt-wire-stripe'));
      if (colour === 'blue-sleeved') {
        const sleeve = el('path', { d }, 'lt-wire-sleeve');
        g.append(sleeve);
        requestAnimationFrame(() => {
          const len = core.getTotalLength?.() ?? 200;
          const s = Math.min(36, len / 3);
          sleeve.setAttribute('stroke-dasharray', `${s} ${Math.max(0, len - 2 * s)} ${s}`);
        });
      }
      const dir = state.flow[`w${i}`];
      if (dir) {
        const f = el('path', { d }, 'lt-flow');
        g.append(f);
        flows.push({ path: f, dir });
      }
      g.append(el('path', { d }, 'lt-wire-hit'));
      g.setAttribute('aria-label', `Wire from ${w.a} to ${w.b}`);
      gWires.append(g);
    });

    // switches: rocker position and internal contacts
    m.level.switches.forEach((sw, i) => {
      const se = swEls[i];
      const pos = m.positions[i];
      se.rocker.classList.toggle('down', pos === 1);
      se.pos.textContent = sw.type === 'one-way' ? (pos ? 'ON' : 'OFF') : POSITION_NAMES[sw.type][pos].toUpperCase();
      se.links.replaceChildren();
      for (const [a, b] of switchLinks(sw, pos)) {
        const pa = tpos[a];
        const pb = tpos[b];
        const crossing = Math.abs(pb.x - pa.x) > 60;
        const depth = crossing ? 30 : 22;
        const d = `M${pa.x} ${pa.y + 10} C${pa.x} ${pa.y + depth} ${pb.x} ${pb.y + depth} ${pb.x} ${pb.y + 10}`;
        const key = switchLinkKey(a, b);
        const live = state.liveTerms.includes(a);
        const p = el('path', { d }, `lt-contact${live ? ' live' : ''}${state.flow[key] ? ' flowing' : ''}`);
        se.links.append(p);
        const dir = state.flow[key];
        if (dir) {
          const f = el('path', { d }, 'lt-flow');
          se.links.append(f);
          flows.push({ path: f, dir });
        }
      }
    });

    // lamp, breaker, warnings
    lampGlow.classList.toggle('on', state.lit);
    lampBulb.classList.toggle('on', state.lit);
    liveBadge.classList.toggle('show', !state.lit && !state.short && state.lampLive);
    tripBadge.classList.toggle('show', !!state.short);
    mcbToggle.classList.toggle('tripped', !!state.short);
    svg.classList.toggle('lt-shorted', !!state.short);

    // terminals: pending pick, hint pulse, line voltage
    gTerms.querySelectorAll<SVGGElement>('[data-term]').forEach((g) => {
      const id = g.dataset.term!;
      g.classList.toggle('picked', id === pending);
      g.classList.toggle('hint', m.hint.includes(id));
      g.classList.toggle('live', state.liveTerms.includes(id));
      g.setAttribute('aria-pressed', String(id === pending));
    });
    svg.classList.toggle('lt-picking', pending !== null);
    if (!pending) band.style.display = 'none';
  };

  const render = (m: CircuitModel) => {
    model = m;
    if (builtFor !== `${m.level.id}:${orient}`) {
      pending = null;
      build();
    }
    draw();
  };

  /* ---------------------------- interaction ---------------------------- */
  const toSvg = (e: PointerEvent): P => {
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };
  const termAt = (e: PointerEvent) => (document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-term]') as SVGGElement | null)?.dataset.term ?? null;
  const showBand = (from: string, to: P) => {
    const a = tpos[from];
    band.setAttribute('d', `M${a.x} ${a.y} L${to.x} ${to.y}`);
    band.style.display = '';
  };

  const clickTerm = (id: string) => {
    if (pending === null) pending = id;
    else if (pending === id) pending = null;
    else {
      const a = pending;
      pending = null;
      h.addWire(a, id);
      return;
    }
    draw();
  };

  let swallowClick = false;
  let down: { id: string; x: number; y: number; dragging: boolean; pointer: number } | null = null;
  svg.addEventListener('pointerdown', (e) => {
    swallowClick = false;
    const id = (e.target as Element).closest<SVGGElement>('[data-term]')?.dataset.term;
    if (!id) return;
    e.preventDefault();
    down = { id, x: e.clientX, y: e.clientY, dragging: false, pointer: e.pointerId };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', (e) => {
    if (down && down.pointer === e.pointerId) {
      if (!down.dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) down.dragging = true;
      if (down.dragging) showBand(down.id, toSvg(e));
    } else if (pending) showBand(pending, toSvg(e));
  });
  svg.addEventListener('pointerup', (e) => {
    if (!down || down.pointer !== e.pointerId) return;
    const d = down;
    down = null;
    swallowClick = true; // the click that follows (re-targeted to the svg by capture) is already handled
    if (svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
    if (d.dragging) {
      const target = termAt(e);
      pending = null;
      band.style.display = 'none';
      if (target && target !== d.id) h.addWire(d.id, target);
      else draw();
    } else clickTerm(d.id);
  });
  svg.addEventListener('pointercancel', () => {
    down = null;
    band.style.display = 'none';
  });
  svg.addEventListener('click', (e) => {
    if (swallowClick) {
      swallowClick = false;
      return;
    }
    const target = e.target as Element;
    if (target.closest('[data-term]') || target.closest('.lt-rocker')) return;
    const wire = target.closest<SVGGElement>('[data-wire]');
    if (wire && pending === null) {
      h.removeWire(Number(wire.dataset.wire));
      return;
    }
    if (pending !== null) {
      pending = null;
      draw();
    }
  });
  svg.addEventListener('keydown', (e) => {
    const id = (e.target as Element).closest<SVGGElement>('[data-term]')?.dataset.term;
    if (id && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      clickTerm(id);
      if (pending) {
        const a = tpos[pending];
        band.setAttribute('d', `M${a.x} ${a.y} L${a.x} ${a.y}`);
      }
    } else if (e.key === 'Escape' && pending) {
      pending = null;
      draw();
    }
  });

  // pick a layout that suits the stage shape
  const ro = new ResizeObserver(() => {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const next: Orient = r.width / r.height < 0.95 ? 'tall' : 'wide';
    if (next !== orient) {
      orient = next;
      if (model) render(model);
    }
  });
  ro.observe(host);

  /* ---------------------------- animation ---------------------------- */
  let raf = 0;
  let last = 0;
  let offset = 0;
  const frame = (t: number) => {
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;
    offset += dt * 46;
    for (const f of flows) f.path.style.strokeDashoffset = String(-offset * f.dir);
    raf = requestAnimationFrame(frame);
  };

  return {
    render,
    activate() {
      cancelAnimationFrame(raf);
      last = 0;
      if (!reduced) raf = requestAnimationFrame(frame);
    },
    deactivate() {
      cancelAnimationFrame(raf);
    },
  };
}
