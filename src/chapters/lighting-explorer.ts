import { specConnections, specContacts, type SwitchSpec } from './lighting-sim';

// "Build a switch" on the stage: one block per gang, each with a rocker and its poles' contacts drawn
// inside. Click a rocker (or use the panel buttons) to throw that gang: all its poles move together.

const NS = 'http://www.w3.org/2000/svg';
const UNIT_W = 210;
const POLE_H = 100;
const INT_H = 130;
const BLOCK_PAD = 18;
const ROCKER_W = 64;

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

export interface ExplorerView {
  render(spec: SwitchSpec, positions: number[]): void;
}

export function createExplorer(host: HTMLElement, onFlip: (gang: number) => void): ExplorerView {
  const svg = el('svg', {}, 'lt-svg lt-explorer');
  svg.setAttribute('role', 'img');
  host.append(svg);
  let tall = false;
  const prevAng = new Map<string, number>();
  let last: { spec: SwitchSpec; positions: number[] } | null = null;

  const render = (spec: SwitchSpec, positions: number[]) => {
    last = { spec, positions };
    svg.replaceChildren();
    const int = spec.ways === 'int';
    const rows = int ? 1 : spec.poles;
    const innerH = int ? INT_H : rows * POLE_H;
    const blockW = BLOCK_PAD * 3 + ROCKER_W + UNIT_W;
    const blockH = innerH + BLOCK_PAD * 2 + 34;
    const gap = 22;
    const W = tall ? blockW + 40 : spec.gangs * blockW + (spec.gangs - 1) * gap + 40;
    const H = tall ? spec.gangs * blockH + (spec.gangs - 1) * gap + 40 : blockH + 40;
    // keep a sensible minimum so a single small switch is not blown up to fill the stage
    const VW = Math.max(W, tall ? 380 : 620);
    const VH = Math.max(H, tall ? 520 : 400);
    svg.setAttribute('viewBox', `${(W - VW) / 2} ${(H - VH) / 2} ${VW} ${VH}`);

    const joined = specConnections(spec, positions);
    const on = new Set(joined.flat());
    const linked = (a: string, b: string) => joined.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

    svg.setAttribute(
      'aria-label',
      `A ${spec.gangs}-gang switch. ${joined.length ? `Joined now: ${joined.map(([a, b]) => `${a} to ${b}`).join(', ')}.` : 'Nothing is joined: every contact is open.'}`,
    );

    for (let g = 1; g <= spec.gangs; g++) {
      const bx = tall ? 20 : 20 + (g - 1) * (blockW + gap);
      const by = tall ? 20 + (g - 1) * (blockH + gap) : 20;
      const pos = positions[g - 1] ?? 0;
      svg.append(el('rect', { x: bx, y: by, width: blockW, height: blockH, rx: 18 }, 'lt-box'));
      svg.append(txt(bx + BLOCK_PAD, by + 28, `GANG ${g}`, 'lt-title', 'start'));

      // rocker
      const rx = bx + BLOCK_PAD;
      const ry = by + 34 + BLOCK_PAD + innerH / 2 - 50;
      const rocker = el('g', { tabindex: 0, role: 'button' }, `lt-rocker${pos ? ' down' : ''}`);
      rocker.setAttribute('aria-label', `Throw gang ${g}`);
      rocker.append(el('rect', { x: rx, y: ry, width: ROCKER_W, height: 100, rx: 12 }, 'lt-rocker-body'), el('rect', { x: rx + 8, y: ry + 8, width: ROCKER_W - 16, height: 40, rx: 8 }, 'lt-rocker-pad'));
      const flip = () => onFlip(g - 1);
      rocker.addEventListener('click', flip);
      rocker.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          flip();
        }
      });
      svg.append(rocker);

      const ux = bx + BLOCK_PAD * 2 + ROCKER_W;
      const uy0 = by + 34 + BLOCK_PAD;
      svg.append(el('rect', { x: ux, y: uy0, width: UNIT_W, height: innerH, rx: 12 }, 'lt-inner'));

      if (int) {
        const [a1, a2, b1, b2] = specContacts(spec, g, 1);
        const P = { [a1]: [ux + 34, uy0 + 34], [a2]: [ux + 34, uy0 + innerH - 34], [b1]: [ux + UNIT_W - 34, uy0 + 34], [b2]: [ux + UNIT_W - 34, uy0 + innerH - 34] };
        const arm = (a: string, b: string) => {
          const live = linked(a, b);
          svg.append(el('line', { x1: P[a][0], y1: P[a][1], x2: P[b][0], y2: P[b][1] }, `lt-arm-line${live ? ' on' : ''}`));
        };
        arm(a1, b1);
        arm(a2, b2);
        arm(a1, b2);
        arm(a2, b1);
        for (const [id, label] of [
          [a1, 'L1'],
          [a2, 'L2'],
          [b1, 'L1'],
          [b2, 'L2'],
        ]) {
          const [x, y] = P[id];
          svg.append(el('circle', { cx: x, cy: y, r: 10 }, `lt-contact-dot${on.has(id) ? ' on' : ''}`));
          svg.append(txt(x, y + (y < uy0 + innerH / 2 ? -16 : 28), label, 'lt-term-label'));
        }
        svg.append(txt(ux + UNIT_W / 2, uy0 + innerH / 2 + 5, pos ? 'crossed' : 'straight', 'lt-sub'));
        continue;
      }

      for (let p = 1; p <= spec.poles; p++) {
        const uy = uy0 + (p - 1) * POLE_H;
        const ids = specContacts(spec, g, p);
        const com = [ux + 34, uy + POLE_H / 2];
        const way1 = spec.ways === 1 ? [ux + UNIT_W - 34, uy + 34] : [ux + UNIT_W - 34, uy + 26];
        const way2 = [ux + UNIT_W - 34, uy + POLE_H - 26];
        const target = spec.ways === 1 ? (pos ? way1 : null) : pos ? way2 : way1;
        // the arm: points at the contact it is touching, or hangs open
        const end = target ?? [ux + UNIT_W - 50, uy + POLE_H - 18];
        const ang = (Math.atan2(end[1] - com[1], end[0] - com[0]) * 180) / Math.PI;
        const len = Math.hypot(end[0] - com[0], end[1] - com[1]) - (target ? 10 : 0);
        const arm = el('line', { x1: com[0], y1: com[1], x2: com[0] + len, y2: com[1] }, `lt-arm${target ? ' on' : ''}`);
        arm.style.transformOrigin = `${com[0]}px ${com[1]}px`;
        // start from where the arm was, then swing to the new angle (CSS transition)
        const key = `${g}-${p}-${spec.ways}`;
        const from = prevAng.get(key) ?? ang;
        arm.style.transform = `rotate(${from}deg)`;
        prevAng.set(key, ang);
        if (from !== ang) requestAnimationFrame(() => requestAnimationFrame(() => (arm.style.transform = `rotate(${ang}deg)`)));
        if (p > 1) svg.append(el('line', { x1: ux + 104, y1: uy - POLE_H / 2 + 12, x2: ux + 104, y2: uy + POLE_H / 2 - 12 }, 'lt-gang-link'));
        svg.append(arm);
        const dots: [string, number[], string][] = [
          [ids[0], com, 'COM'],
          [ids[1], way1, 'L1'],
        ];
        if (spec.ways === 2) dots.push([ids[2], way2, 'L2']);
        for (const [id, [x, y], label] of dots) {
          svg.append(el('circle', { cx: x, cy: y, r: 10 }, `lt-contact-dot${on.has(id) ? ' on' : ''}`));
          svg.append(txt(label === 'COM' ? x : x + 18, label === 'COM' ? y + 30 : y + 5, label, 'lt-term-label', label === 'COM' ? 'middle' : 'start'));
        }
        if (spec.poles > 1) svg.append(txt(ux + 10, uy + 18, `pole ${p}`, 'lt-tiny', 'start'));
      }
    }
  };

  new ResizeObserver(() => {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const next = r.width / r.height < 0.95;
    if (next !== tall) {
      tall = next;
      if (last) render(last.spec, last.positions);
    }
  }).observe(host);

  return { render };
}
