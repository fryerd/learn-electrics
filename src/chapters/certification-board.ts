// Chapter 11: the workshop board picture (SVG). Draws the consumer unit, the circuit ends, the ring of six
// sockets, four lights and the tester with its leads, and reflects the rig state. No test logic in here.

import { CONDS, LIGHTS, SOCKETS, type Cond, type Link, type Mode, type Place, type Term } from './certification-model';

interface Pt {
  x: number;
  y: number;
}
interface Layout {
  w: number;
  h: number;
  cu: Pt; // top-left of the consumer unit (300 x 200)
  ends: Pt; // top-left of the circuit-ends block (300 x 150)
  tester: Pt; // top-left of the tester drawing (240 x 150)
  jackY: number; // where the lead sockets sit on the tester (top edge or bottom edge)
  sockets: Pt[];
  lights: Pt[];
  ringPath: string;
  lightPath: string;
}

const WIDE: Layout = {
  w: 1000,
  h: 610,
  cu: { x: 24, y: 24 },
  ends: { x: 24, y: 246 },
  tester: { x: 54, y: 428 },
  jackY: 2,
  sockets: [
    { x: 470, y: 312 },
    { x: 640, y: 312 },
    { x: 810, y: 312 },
    { x: 810, y: 512 },
    { x: 640, y: 512 },
    { x: 470, y: 512 },
  ],
  lights: [
    { x: 480, y: 92 },
    { x: 620, y: 92 },
    { x: 760, y: 92 },
    { x: 900, y: 92 },
  ],
  ringPath: 'M324 326 H388 Q402 326 402 312 H930 Q946 312 946 328 V496 Q946 512 930 512 H418 Q402 512 402 496 V384 Q402 368 388 368 H324',
  lightPath: 'M324 92 H900',
};

const TALL: Layout = {
  w: 600,
  h: 900,
  cu: { x: 20, y: 20 },
  ends: { x: 20, y: 236 },
  tester: { x: 340, y: 28 },
  jackY: 148,
  sockets: [
    { x: 165, y: 590 },
    { x: 165, y: 715 },
    { x: 165, y: 840 },
    { x: 435, y: 840 },
    { x: 435, y: 715 },
    { x: 435, y: 590 },
  ],
  lights: [
    { x: 90, y: 450 },
    { x: 230, y: 450 },
    { x: 370, y: 450 },
    { x: 510, y: 450 },
  ],
  ringPath: 'M44 386 V574 Q44 590 60 590 H165 V840 H435 V590 H556 Q572 590 572 574 V368 Q572 352 556 352 H320',
  lightPath: 'M90 450 H510 M300 386 V450',
};

/** Terminal offsets inside a socket faceplate / ceiling rose. */
const SOCKET_T: Record<Cond, number> = { L: -36, N: 0, E: 36 };
const LIGHT_T: Record<Cond, number> = { L: -22, N: 0, E: 22 };
/** Circuit-end terminals, relative to the ends block. */
const END_T: Record<'RA' | 'RB' | 'LB', Record<Cond, Pt>> = {
  RA: { L: { x: 70, y: 80 }, N: { x: 115, y: 80 }, E: { x: 160, y: 80 } },
  RB: { L: { x: 70, y: 122 }, N: { x: 115, y: 122 }, E: { x: 160, y: 122 } },
  LB: { L: { x: 222, y: 100 }, N: { x: 254, y: 100 }, E: { x: 286, y: 100 } },
};

const condName = { L: 'line', N: 'neutral', E: 'CPC (earth)' };

export interface BoardView {
  supplyOn: boolean;
  rcdTripped: boolean;
  mode: Mode;
  link: Link;
  red: Term | null;
  black: Term | null;
  point: string | null;
  lcd: { main: string; unit: string; sub: string; error: string; mode: string };
  /** After the reveal: where the faults were, numbered. */
  marks: { place: Place; n: number; found: boolean }[];
  /** Briefly pulse the RCD (it just tripped). */
}

export interface BoardHandlers {
  onTerm(t: Term): void;
  onPoint(p: string): void;
  onMain(): void;
  onRcd(): void;
  onRcdTest(): void;
}

export function termPos(L: Layout, t: Term): Pt {
  const [head, c] = t.split('.') as [string, Cond];
  if (head === 'RA' || head === 'RB' || head === 'LB') {
    const p = END_T[head][c];
    return { x: L.ends.x + p.x, y: L.ends.y + p.y };
  }
  const i = Number(head.slice(1));
  if (head[0] === 'S') return { x: L.sockets[i].x + SOCKET_T[c], y: L.sockets[i].y + 12 };
  return { x: L.lights[i].x + LIGHT_T[c], y: L.lights[i].y };
}

const termSvg = (t: Term, p: Pt, c: Cond, label: string) => `
  <g class="ct-term ct-${c}" data-term="${t}" tabindex="0" role="button" aria-label="${label}" transform="translate(${p.x} ${p.y})">
    <circle class="ct-hit" r="20"/>
    <circle class="ct-ring-sel" r="18"/>
    <circle class="ct-dot" r="12"/>
    <text y="4.5" text-anchor="middle">${c}</text>
  </g>`;

export function createBoard(stage: HTMLElement, h: BoardHandlers) {
  const host = document.createElement('div');
  host.className = 'ct-stage';
  stage.append(host);
  let layout: Layout = WIDE;
  let last: BoardView | null = null;

  const render = () => {
    const L = layout;
    const cu = L.cu;
    const en = L.ends;
    const te = L.tester;
    const sockets = L.sockets
      .map((s, i) => {
        const terms = CONDS.map((c) => termSvg(`S${i}.${c}`, termPos(L, `S${i}.${c}`), c, `Socket ${i + 1} ${condName[c]} terminal`)).join('');
        return `
        <g class="ct-socket" data-place="S${i}">
          <g class="ct-point" data-point="S${i}" tabindex="-1" aria-label="Socket ${i + 1}">
            <rect class="ct-plate" x="${s.x - 66}" y="${s.y - 48}" width="132" height="96" rx="14"/>
            <rect class="ct-backbox" x="${s.x - 56}" y="${s.y - 38}" width="112" height="76" rx="8"/>
            <text class="ct-plabel" x="${s.x - 54}" y="${s.y - 20}">S${i + 1}</text>
          </g>
          ${terms}
          <rect class="ct-mark" x="${s.x - 74}" y="${s.y - 56}" width="148" height="112" rx="18"/>
        </g>`;
      })
      .join('');
    const lights = L.lights
      .map((l, i) => {
        const terms = CONDS.map((c) => termSvg(`P${i}.${c}`, termPos(L, `P${i}.${c}`), c, `Light ${i + 1} ${condName[c]} terminal`)).join('');
        return `
        <g class="ct-light" data-place="P${i}">
          <g class="ct-point" data-point="P${i}" aria-label="Light ${i + 1}">
            <line class="ct-flex" x1="${l.x}" y1="${l.y + 38}" x2="${l.x}" y2="${l.y + 62}"/>
            <circle class="ct-glow" cx="${l.x}" cy="${l.y + 80}" r="30"/>
            <path class="ct-bulb" d="M${l.x - 11} ${l.y + 64} h22 v6 a16 16 0 1 1 -22 0 z"/>
            <circle class="ct-rose" cx="${l.x}" cy="${l.y}" r="40"/>
            <text class="ct-plabel" x="${l.x}" y="${l.y - 21}" text-anchor="middle">LIGHT ${i + 1}</text>
          </g>
          ${terms}
          <circle class="ct-mark" cx="${l.x}" cy="${l.y + 20}" r="66"/>
        </g>`;
      })
      .join('');
    const ends = (['RA', 'RB', 'LB'] as const)
      .map((g) =>
        CONDS.map((c) => {
          const label = g === 'LB' ? `Lighting circuit ${condName[c]} at the board` : `Ring leg ${g === 'RA' ? 'A' : 'B'} ${condName[c]} at the board`;
          return termSvg(`${g}.${c}`, termPos(L, `${g}.${c}`), c, label);
        }).join(''),
      )
      .join('');

    host.innerHTML = `
    <svg viewBox="0 0 ${L.w} ${L.h}" class="ct-svg" role="group" aria-label="Workshop test board: a consumer unit, the circuit ends, a ring of six sockets, four lights and a multifunction tester">
      <defs>
        <pattern id="ct-gy" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="#2f9e4f"/><rect width="4" height="8" fill="#f2c40f"/>
        </pattern>
        <filter id="ct-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#1d232b" flood-opacity="0.16"/>
        </filter>
        <radialGradient id="ct-glow-g"><stop offset="0" stop-color="#ffd24a" stop-opacity="0.9"/><stop offset="1" stop-color="#ffd24a" stop-opacity="0"/></radialGradient>
      </defs>

      <path class="ct-cable" d="${L.lightPath}"/>
      <path class="ct-cable" d="${L.ringPath}"/>
      <path class="ct-cable-core" d="${L.ringPath}"/>

      <!-- consumer unit -->
      <g class="ct-cu" data-place="CU">
        <rect class="ct-cu-box" x="${cu.x}" y="${cu.y}" width="300" height="200" rx="16" filter="url(#ct-shadow)"/>
        <text class="ct-title" x="${cu.x + 18}" y="${cu.y + 28}">CONSUMER UNIT</text>
        <rect class="ct-din" x="${cu.x + 14}" y="${cu.y + 44}" width="272" height="108" rx="6"/>
        <g class="ct-dev ct-main" tabindex="0" role="button" aria-label="Main switch" data-act="main">
          <rect class="ct-dev-body" x="${cu.x + 26}" y="${cu.y + 50}" width="70" height="96" rx="6"/>
          <rect class="ct-slot" x="${cu.x + 50}" y="${cu.y + 66}" width="22" height="50" rx="5"/>
          <rect class="ct-lever" x="${cu.x + 47}" y="${cu.y + 64}" width="28" height="22" rx="5"/>
          <text class="ct-dev-t" x="${cu.x + 61}" y="${cu.y + 136}" text-anchor="middle">MAIN</text>
        </g>
        <g class="ct-dev ct-rcd" data-place="RCD">
          <g tabindex="0" role="button" aria-label="RCD toggle (reset)" data-act="rcd">
            <rect class="ct-dev-body" x="${cu.x + 102}" y="${cu.y + 50}" width="70" height="96" rx="6"/>
            <rect class="ct-slot" x="${cu.x + 112}" y="${cu.y + 66}" width="22" height="50" rx="5"/>
            <rect class="ct-lever" x="${cu.x + 109}" y="${cu.y + 64}" width="28" height="22" rx="5"/>
            <text class="ct-dev-t" x="${cu.x + 137}" y="${cu.y + 136}" text-anchor="middle">RCD 30 mA</text>
          </g>
          <g tabindex="0" role="button" aria-label="RCD test button" data-act="rcdtest">
            <circle class="ct-tbtn" cx="${cu.x + 154}" cy="${cu.y + 80}" r="11"/>
            <text class="ct-tbtn-t" x="${cu.x + 154}" y="${cu.y + 84.5}" text-anchor="middle">T</text>
          </g>
          <rect class="ct-mark" x="${cu.x + 96}" y="${cu.y + 44}" width="82" height="108" rx="10"/>
        </g>
        <g class="ct-dev ct-mcb">
          <rect class="ct-dev-body" x="${cu.x + 178}" y="${cu.y + 50}" width="48" height="96" rx="6"/>
          <rect class="ct-slot" x="${cu.x + 191}" y="${cu.y + 66}" width="22" height="50" rx="5"/>
          <rect class="ct-lever on" x="${cu.x + 188}" y="${cu.y + 64}" width="28" height="22" rx="5"/>
          <text class="ct-dev-t" x="${cu.x + 202}" y="${cu.y + 136}" text-anchor="middle">B32</text>
        </g>
        <g class="ct-dev ct-mcb">
          <rect class="ct-dev-body" x="${cu.x + 232}" y="${cu.y + 50}" width="48" height="96" rx="6"/>
          <rect class="ct-slot" x="${cu.x + 245}" y="${cu.y + 66}" width="22" height="50" rx="5"/>
          <rect class="ct-lever on" x="${cu.x + 242}" y="${cu.y + 64}" width="28" height="22" rx="5"/>
          <text class="ct-dev-t" x="${cu.x + 256}" y="${cu.y + 136}" text-anchor="middle">B6</text>
        </g>
        <text class="ct-small" x="${cu.x + 202}" y="${cu.y + 172}" text-anchor="middle">RING</text>
        <text class="ct-small" x="${cu.x + 256}" y="${cu.y + 172}" text-anchor="middle">LIGHTS</text>
        <rect class="ct-bar ct-nbar" x="${cu.x + 26}" y="${cu.y + 166}" width="70" height="10" rx="3"/>
        <rect class="ct-bar ct-ebar" x="${cu.x + 104}" y="${cu.y + 166}" width="70" height="10" rx="3"/>
        <text class="ct-small" x="${cu.x + 61}" y="${cu.y + 192}" text-anchor="middle">N BAR</text>
        <text class="ct-small" x="${cu.x + 139}" y="${cu.y + 192}" text-anchor="middle">EARTH BAR</text>
        <text class="ct-supply" x="${cu.x + 286}" y="${cu.y + 28}" text-anchor="end">OFF</text>
      </g>

      <!-- circuit ends -->
      <g class="ct-ends">
        <rect class="ct-ends-box" x="${en.x}" y="${en.y}" width="300" height="150" rx="16" filter="url(#ct-shadow)"/>
        <text class="ct-title" x="${en.x + 18}" y="${en.y + 28}">CIRCUIT ENDS</text>
        <text class="ct-ends-state" x="${en.x + 282}" y="${en.y + 28}" text-anchor="end">disconnected</text>
        <text class="ct-small" x="${en.x + 18}" y="${en.y + 84}">LEG A</text>
        <text class="ct-small" x="${en.x + 18}" y="${en.y + 126}">LEG B</text>
        <text class="ct-small" x="${en.x + 115}" y="${en.y + 52}" text-anchor="middle">RING</text>
        <text class="ct-small" x="${en.x + 254}" y="${en.y + 66}" text-anchor="middle">LIGHTS</text>
        <line class="ct-sep" x1="${en.x + 196}" y1="${en.y + 44}" x2="${en.x + 196}" y2="${en.y + 138}"/>
        <g class="ct-links"></g>
        ${ends}
        <rect class="ct-mark ct-mark-ring" x="${en.x + 40}" y="${en.y + 54}" width="146" height="90" rx="12"/>
        <rect class="ct-mark ct-mark-lighting" x="${en.x + 200}" y="${en.y + 74}" width="96" height="52" rx="12"/>
      </g>

      ${lights}
      ${sockets}

      <!-- the multifunction tester -->
      <g class="ct-tester" transform="translate(${te.x} ${te.y})">
        <rect class="ct-t-body" width="240" height="150" rx="20" filter="url(#ct-shadow)"/>
        <rect class="ct-t-lcd" x="16" y="16" width="208" height="86" rx="8"/>
        <text class="ct-t-mode" x="26" y="36"></text>
        <text class="ct-t-err" x="214" y="36" text-anchor="end"></text>
        <text class="ct-t-main" x="168" y="78" text-anchor="end"></text>
        <text class="ct-t-unit" x="174" y="78"></text>
        <text class="ct-t-sub" x="26" y="94"></text>
        <circle class="ct-t-jack ct-t-red" cx="70" cy="${L.jackY}" r="9"/>
        <circle class="ct-t-jack ct-t-black" cx="170" cy="${L.jackY}" r="9"/>
        <text class="ct-t-name" x="120" y="130" text-anchor="middle">MULTIFUNCTION TESTER</text>
      </g>
      <g class="ct-leads">
        <path class="ct-lead ct-lead-red"/><path class="ct-lead ct-lead-black"/>
        <circle class="ct-tip ct-tip-red" r="7"/><circle class="ct-tip ct-tip-black" r="7"/>
      </g>
      <g class="ct-mark-tags"></g>
    </svg>`;

    host.querySelectorAll<SVGGElement>('[data-term]').forEach((g) => {
      const fire = () => h.onTerm(g.dataset.term!);
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        fire();
      });
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fire();
        }
      });
    });
    host.querySelectorAll<SVGGElement>('[data-point]').forEach((g) => g.addEventListener('click', () => h.onPoint(g.dataset.point!)));
    const act: Record<string, () => void> = { main: h.onMain, rcd: h.onRcd, rcdtest: h.onRcdTest };
    host.querySelectorAll<SVGGElement>('[data-act]').forEach((g) => {
      g.addEventListener('click', () => act[g.dataset.act!]());
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          act[g.dataset.act!]();
        }
      });
    });
    if (last) update(last);
  };

  const q = <T extends Element>(sel: string) => host.querySelector<T>(sel)!;

  const leadPath = (from: Pt, to: Pt) => {
    const dir = layout.jackY < 75 ? -1 : 1;
    const c1 = from.y + dir * 70;
    const c2 = Math.min(to.y + 70, layout.h - 4);
    return `M${from.x} ${from.y} C${from.x} ${c1} ${to.x} ${c2} ${to.x} ${to.y}`;
  };

  function update(v: BoardView) {
    last = v;
    const L = layout;
    const svg = q<SVGSVGElement>('svg');
    const powered = v.supplyOn && !v.rcdTripped;
    svg.classList.toggle('ct-on', v.supplyOn);
    svg.classList.toggle('ct-powered', powered);
    svg.classList.toggle('ct-tripped', v.rcdTripped);
    svg.classList.toggle('ct-zsmode', v.mode === 'zs');
    q('.ct-supply').textContent = v.supplyOn ? (v.rcdTripped ? 'RCD TRIPPED' : 'POWER ON') : 'OFF · ISOLATED';
    q('.ct-ends-state').textContent = v.supplyOn ? 'connected' : 'disconnected';

    // test links at the circuit ends
    const linkPairs: Record<Link, [Term, Term][]> = {
      none: [],
      'ring-LN': [
        ['RA.L', 'RB.N'],
        ['RA.N', 'RB.L'],
      ],
      'ring-LE': [
        ['RA.L', 'RB.E'],
        ['RA.E', 'RB.L'],
      ],
      'light-LE': [['LB.L', 'LB.E']],
    };
    const showLinks = !v.supplyOn && v.mode === 'cont';
    q('.ct-links').innerHTML = showLinks
      ? linkPairs[v.link]
          .map(([a, b]) => {
            const p = termPos(L, a);
            const r = termPos(L, b);
            const bend = a === 'LB.L' ? `Q${(p.x + r.x) / 2} ${p.y - 34} ${r.x} ${r.y}` : `L${r.x} ${r.y}`;
            return `<path class="ct-link" d="M${p.x} ${p.y} ${bend}"/>`;
          })
          .join('')
      : '';

    const probing = v.mode === 'cont' || v.mode === 'ir';
    host.querySelectorAll<SVGGElement>('[data-term]').forEach((g) => {
      g.classList.toggle('ct-red', probing && g.dataset.term === v.red);
      g.classList.toggle('ct-black', probing && g.dataset.term === v.black);
    });
    host.querySelectorAll<SVGGElement>('.ct-point').forEach((g) => g.classList.toggle('ct-plugged', g.dataset.point === v.point && v.mode === 'zs'));

    // leads
    const jackR = { x: L.tester.x + 70, y: L.tester.y + L.jackY };
    const jackB = { x: L.tester.x + 170, y: L.tester.y + L.jackY };
    let redTo: Pt | null = null;
    let blackTo: Pt | null = null;
    if (v.mode === 'cont' || v.mode === 'ir') {
      if (v.red) redTo = termPos(L, v.red);
      if (v.black) blackTo = termPos(L, v.black);
    } else if (v.mode === 'zs' && v.point) {
      redTo = termPos(L, `${v.point}.L`);
      blackTo = termPos(L, `${v.point}.E`);
    }
    const setLead = (cls: string, from: Pt, to: Pt | null) => {
      const path = q<SVGPathElement>(`.ct-lead-${cls}`);
      const tip = q<SVGCircleElement>(`.ct-tip-${cls}`);
      path.style.display = tip.style.display = to ? '' : 'none';
      if (!to) return;
      path.setAttribute('d', leadPath(from, to));
      tip.setAttribute('cx', String(to.x));
      tip.setAttribute('cy', String(to.y));
    };
    setLead('red', jackR, redTo);
    setLead('black', jackB, blackTo);

    // tester display
    q('.ct-t-mode').textContent = v.lcd.mode;
    q('.ct-t-main').textContent = v.lcd.main;
    q('.ct-t-unit').textContent = v.lcd.unit;
    q('.ct-t-sub').textContent = v.lcd.sub;
    q('.ct-t-err').textContent = v.lcd.error;

    // reveal markers
    host.querySelectorAll('.ct-mark').forEach((m) => m.classList.remove('show', 'found'));
    const tags: string[] = [];
    for (const m of v.marks) {
      let el: Element | null = null;
      let at: Pt = { x: 0, y: 0 };
      if (m.place.type === 'socket') {
        el = host.querySelector(`[data-place="S${m.place.i}"] .ct-mark`);
        at = { x: L.sockets[m.place.i].x + 66, y: L.sockets[m.place.i].y - 50 };
      } else if (m.place.type === 'light') {
        el = host.querySelector(`[data-place="P${m.place.i}"] .ct-mark`);
        at = { x: L.lights[m.place.i].x + 46, y: L.lights[m.place.i].y - 40 };
      } else if (m.place.type === 'ring') {
        el = host.querySelector('.ct-mark-ring');
        at = { x: L.ends.x + 186, y: L.ends.y + 56 };
      } else if (m.place.type === 'lighting') {
        el = host.querySelector('.ct-mark-lighting');
        at = { x: L.ends.x + 292, y: L.ends.y + 76 };
      } else if (m.place.type === 'rcd') {
        el = host.querySelector('[data-place="RCD"] .ct-mark');
        at = { x: L.cu.x + 176, y: L.cu.y + 46 };
      }
      el?.classList.add('show');
      if (m.found) el?.classList.add('found');
      tags.push(`<g class="ct-tag${m.found ? ' found' : ''}" transform="translate(${at.x} ${at.y})"><circle r="14"/><text y="5" text-anchor="middle">${m.n}</text></g>`);
    }
    q('.ct-mark-tags').innerHTML = tags.join('');
  }

  const ro = new ResizeObserver(() => {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const next = r.width / r.height < 0.95 ? TALL : WIDE;
    if (next !== layout) {
      layout = next;
      render();
    }
  });
  render();
  ro.observe(stage);

  return {
    update,
    /** Flash the RCD when it trips. */
    pulseRcd() {
      const g = host.querySelector('.ct-rcd');
      g?.classList.remove('ct-pulse');
      void (g as SVGGElement | null)?.getBoundingClientRect();
      g?.classList.add('ct-pulse');
    },
  };
}

export const allTerms = (): { term: Term; label: string; group: string }[] => {
  const out: { term: Term; label: string; group: string }[] = [];
  const cn = { L: 'L', N: 'N', E: 'CPC' };
  for (const g of ['RA', 'RB'] as const) for (const c of CONDS) out.push({ term: `${g}.${c}`, label: `Ring leg ${g === 'RA' ? 'A' : 'B'} ${cn[c]}`, group: 'Ring ends at the board' });
  for (let i = 0; i < SOCKETS; i++) for (const c of CONDS) out.push({ term: `S${i}.${c}`, label: `Socket ${i + 1} ${cn[c]}`, group: 'Ring sockets' });
  for (const c of CONDS) out.push({ term: `LB.${c}`, label: `Lights at the board ${cn[c]}`, group: 'Lighting at the board' });
  for (let i = 0; i < LIGHTS; i++) for (const c of CONDS) out.push({ term: `P${i}.${c}`, label: `Light ${i + 1} ${cn[c]}`, group: 'Light points' });
  return out;
};
