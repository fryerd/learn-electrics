// Chapter 4: the consumer unit drawn as SVG markup. Structure is rendered as a string; switch states are
// applied afterwards by toggling classes, so levers and glowing copper animate with CSS transitions.

export type DevKind = 'main' | 'rcd' | 'mcb' | 'rcbo' | 'slot';
export type SlotState = 'empty' | 'pending' | 'ok' | 'warn' | 'bad';

export interface BoardDev {
  id: string;
  kind: DevKind;
  modules: 1 | 2;
  /** e.g. "B32", "100 A", "30 mA" */
  label?: string;
  /** e.g. "30mA A" */
  sub?: string;
  /** For an MCB: the RCD that feeds it. */
  feed?: string;
  /** Two short lines under the board. */
  circuit?: [string, string];
  gapBefore?: boolean;
  /** Build mode only. */
  way?: number;
  slotState?: SlotState;
  /** Build mode: what is fitted in a filled way. */
  fitted?: 'rcbo' | 'mcb';
}

export const VIEW_W = 660;
export const VIEW_H = 500;
const MW = 44;
const TOP = 176;
const H = 150;
const BOT = TOP + H;
const EX0 = 60;
const EX1 = 600;
const EY0 = 64;
const EY1 = 400;
const N_RUN_Y = 108;
const MAIN_BAR_Y = 126;
const RCD_BAR_Y = 146;
const BAR_H = 9;
const N_BAR_Y = 342;
const E_BAR_Y = 364;
const OUT_Y = 404;

interface Placed extends BoardDev {
  x: number;
  w: number;
  cx: number;
}

export function layout(devs: BoardDev[]): Placed[] {
  const total = devs.reduce((s, d) => s + d.modules * MW + (d.gapBefore ? 8 : 0), 0);
  let x = VIEW_W / 2 - total / 2;
  return devs.map((d) => {
    if (d.gapBefore) x += 8;
    const w = d.modules * MW;
    const p = { ...d, x, w, cx: x + w / 2 };
    x += w;
    return p;
  });
}

const isOut = (d: BoardDev) => d.kind === 'mcb' || d.kind === 'rcbo' || (d.kind === 'slot' && !!d.fitted);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** A green-and-yellow earth conductor. */
const earthPath = (d: string, cls = '') =>
  `<path class="cu-e ${cls}" d="${d}"/><path class="cu-e-y ${cls}" d="${d}"/>`;

function deviceMarkup(d: Placed): string {
  const X = d.x + 2;
  const W = d.w - 4;
  const cx = d.cx;
  if (d.kind === 'slot' && !d.fitted) {
    return `<g class="cu-way cu-way-empty ${d.slotState ? `is-${d.slotState}` : ''}" data-way="${d.way}" role="button" tabindex="0" aria-label="Way ${(d.way ?? 0) + 1}: empty">
      <rect class="cu-way-box" x="${X}" y="${TOP}" width="${W}" height="${H}" rx="6"/>
      <path class="cu-way-plus" d="M${cx - 8} ${TOP + 64}h16M${cx} ${TOP + 56}v16"/>
      <text class="cu-way-n" x="${cx}" y="${TOP + 100}" text-anchor="middle">${(d.way ?? 0) + 1}</text>
    </g>`;
  }
  const kind = d.kind === 'slot' ? d.fitted! : d.kind;
  const wide = d.modules === 2;
  const leverW = wide ? 34 : 18;
  const knobCls = kind === 'main' ? 'cu-knob cu-knob-main' : kind === 'rcd' ? 'cu-knob cu-knob-rcd' : 'cu-knob';
  const hasT = kind === 'rcd' || kind === 'rcbo';
  const tX = kind === 'rcd' ? X + W - 13 : cx + 12;
  const tY = kind === 'rcd' ? TOP + 112 : TOP + 31;
  const tR = kind === 'rcd' ? 8 : 5.5;
  const terminals = (y: number) =>
    wide
      ? `<circle class="cu-screw" cx="${cx - 14}" cy="${y}" r="4"/><circle class="cu-screw" cx="${cx + 14}" cy="${y}" r="4"/>`
      : `<circle class="cu-screw" cx="${cx - 8}" cy="${y}" r="3.5"/>${kind === 'rcbo' ? `<circle class="cu-screw" cx="${cx + 4}" cy="${y}" r="3.5"/>` : ''}`;
  const name = kind === 'main' ? 'Main switch' : kind === 'rcd' ? 'RCD' : kind === 'rcbo' ? 'RCBO' : 'MCB';
  const circuitName = d.circuit ? ` for ${d.circuit.join(' ').trim()}` : '';
  const wayAttrs = d.kind === 'slot' ? ` data-way="${d.way}"` : '';
  const stateCls = d.slotState ? ` is-${d.slotState}` : '';
  const typeBadge =
    kind === 'rcd'
      ? `<rect class="cu-type" x="${X + 6}" y="${TOP + 103}" width="18" height="18" rx="3"/><text class="cu-type-t" x="${X + 15}" y="${TOP + 116}" text-anchor="middle">${esc(d.sub ?? 'A')}</text>`
      : '';
  return `<g class="cu-dev cu-dev-${kind}${d.kind === 'slot' ? ' cu-way' : ''}${stateCls}" data-part="${kind}" data-dev="${d.id}"${wayAttrs}>
    <rect class="cu-body" x="${X}" y="${TOP}" width="${W}" height="${H}" rx="6"/>
    ${terminals(TOP + 11)}${terminals(BOT - 11)}
    <rect class="cu-front" x="${X + 3}" y="${TOP + 24}" width="${W - 6}" height="104" rx="4"/>
    <rect class="cu-flag" data-flag="${d.id}" x="${cx - (wide ? 10 : 7)}" y="${TOP + 29}" width="${wide ? 20 : 14}" height="5" rx="1.5"/>
    <g class="cu-lever" data-lever="${d.id}" role="button" tabindex="0" aria-label="${name}${circuitName}: switch">
      <rect class="cu-hit" x="${cx - leverW / 2 - 4}" y="${TOP + 38}" width="${leverW + 8}" height="54"/>
      <rect class="cu-slot" x="${cx - leverW / 2 + 2}" y="${TOP + 40}" width="${leverW - 4}" height="48" rx="3"/>
      <g class="cu-knob-g" data-knob="${d.id}"><rect class="${knobCls}" x="${cx - leverW / 2}" y="${TOP + 42}" width="${leverW}" height="21" rx="3.5"/><rect class="cu-knob-shine" x="${cx - leverW / 2 + 3}" y="${TOP + 45}" width="${leverW - 6}" height="3" rx="1.5"/></g>
    </g>
    <text class="cu-dev-label" x="${kind === 'rcd' ? cx + 2 : cx}" y="${TOP + 106}" text-anchor="middle">${esc(d.label ?? '')}</text>
    ${kind === 'rcd' ? `<text class="cu-dev-sub" x="${cx - 4}" y="${TOP + 121}" text-anchor="middle">63 A</text>` : d.sub && kind !== 'main' ? `<text class="cu-dev-sub" x="${cx}" y="${TOP + 120}" text-anchor="middle">${esc(d.sub)}</text>` : ''}
    ${kind === 'main' ? `<text class="cu-dev-sub" x="${cx}" y="${TOP + 121}" text-anchor="middle">MAIN SWITCH</text>` : ''}
    ${typeBadge}
    ${hasT ? `<g class="cu-tbtn" data-test="${d.id}" role="button" tabindex="0" aria-label="Press the test button on the ${name}${circuitName}"><circle cx="${tX}" cy="${tY}" r="${tR + 5}" class="cu-hit"/><circle class="cu-t" cx="${tX}" cy="${tY}" r="${tR}"/><text class="cu-t-t" x="${tX}" y="${tY + (kind === 'rcd' ? 4.5 : 3.5)}" text-anchor="middle">T</text></g>` : ''}
  </g>`;
}

export function boardMarkup(devs: BoardDev[], opts: { coverLabel: string; build?: boolean }): string {
  const P = layout(devs);
  const main = P.find((d) => d.kind === 'main')!;
  const rcds = P.filter((d) => d.kind === 'rcd');
  const outs = P.filter(isOut);
  const mainFed = P.filter((d) => d.kind === 'rcbo' || d.kind === 'slot' || d.kind === 'rcd');
  const right = P[P.length - 1].x + P[P.length - 1].w;
  const left = P[0].x;

  // copper: main busbar from the main switch to the last device fed by it
  const lastMainFed = mainFed[mainFed.length - 1] ?? main;
  const mainBarX0 = main.cx - 20;
  const mainBarX1 = lastMainFed.cx + 12;
  let copper = `<g class="cu-part cu-bar" data-part="busbar" data-live="main">
      <rect class="cu-copper" x="${mainBarX0}" y="${MAIN_BAR_Y}" width="${mainBarX1 - mainBarX0}" height="${BAR_H}" rx="3"/>
      <rect class="cu-pin" x="${main.cx - 17}" y="${MAIN_BAR_Y + BAR_H}" width="6" height="${TOP + 8 - MAIN_BAR_Y - BAR_H}"/>`;
  for (const d of mainFed) {
    if (d.kind === 'slot' && !d.fitted) continue;
    const px = d.kind === 'rcd' ? d.cx - 17 : d.cx - 11;
    copper += `<rect class="cu-pin" x="${px}" y="${MAIN_BAR_Y + BAR_H}" width="6" height="${TOP + 8 - MAIN_BAR_Y - BAR_H}"/>`;
  }
  copper += `<rect class="cu-hit" x="${mainBarX0}" y="${MAIN_BAR_Y - 6}" width="${mainBarX1 - mainBarX0}" height="${BAR_H + 12}"/></g>`;

  // RCD busbars and RCD neutral bars
  let rcdCopper = '';
  let neutralBars = '';
  let blue = '';
  for (const r of rcds) {
    const fed = P.filter((d) => d.feed === r.id);
    if (!fed.length) continue;
    const x0 = r.cx + 8;
    const x1 = fed[fed.length - 1].cx + 4;
    rcdCopper += `<g class="cu-part cu-bar" data-part="rcdbus" data-live="${r.id}">
      <rect class="cu-copper" x="${x0}" y="${RCD_BAR_Y}" width="${x1 - x0}" height="${BAR_H}" rx="3"/>
      <rect class="cu-pin" x="${r.cx + 11}" y="${RCD_BAR_Y + BAR_H}" width="6" height="${TOP + 8 - RCD_BAR_Y - BAR_H}"/>
      ${fed.map((d) => `<rect class="cu-pin" x="${d.cx - 11}" y="${RCD_BAR_Y + BAR_H}" width="6" height="${TOP + 8 - RCD_BAR_Y - BAR_H}"/>`).join('')}
      <rect class="cu-hit" x="${x0}" y="${RCD_BAR_Y - 4}" width="${x1 - x0}" height="${BAR_H + 8}"/></g>`;
    const nx0 = r.cx + 8;
    const nx1 = fed[fed.length - 1].cx + 12;
    neutralBars += `<g class="cu-part" data-part="neutral"><rect class="cu-nbar" x="${nx0}" y="${N_BAR_Y}" width="${nx1 - nx0}" height="${BAR_H}" rx="2"/>
      ${fed.map((d) => `<circle class="cu-screw" cx="${d.cx}" cy="${N_BAR_Y + 4.5}" r="3"/>`).join('')}
      <rect class="cu-hit" x="${nx0}" y="${N_BAR_Y - 4}" width="${nx1 - nx0}" height="${BAR_H + 8}"/></g>`;
    // neutral in (from the run along the top) and out (down to its own neutral bar)
    blue += `<path class="cu-n" d="M${r.cx} ${N_RUN_Y} V${TOP + 11}"/><path class="cu-n" d="M${r.cx + 14} ${BOT - 11} V${N_BAR_Y + 3}"/>`;
  }

  // main neutral bar for RCBOs / build ways
  const mainNOuts = P.filter((d) => d.kind === 'rcbo' || d.kind === 'slot');
  if (mainNOuts.length) {
    const nx0 = mainNOuts[0].x + 6;
    const nx1 = EX1 - 14;
    neutralBars += `<g class="cu-part" data-part="neutral"><rect class="cu-nbar" x="${nx0}" y="${N_BAR_Y}" width="${nx1 - nx0}" height="${BAR_H}" rx="2"/>
      ${mainNOuts.map((d) => `<circle class="cu-screw" cx="${d.cx + 15}" cy="${N_BAR_Y + 4.5}" r="3"/>`).join('')}
      <rect class="cu-hit" x="${nx0}" y="${N_BAR_Y - 4}" width="${nx1 - nx0}" height="${BAR_H + 8}"/></g>`;
  }
  // neutral run from the main switch, along the top, down the right side
  blue = `<path class="cu-n cu-n-run" d="M${main.cx + 14} ${TOP + 11} V${N_RUN_Y} H${EX1 - 18} V${N_BAR_Y + 4.5} H${EX1 - 14}"/>` + blue;

  // earth bar
  const ex0 = main.cx + 24;
  const ex1 = EX1 - 14;
  const earthBar = `<g class="cu-part" data-part="earth"><rect class="cu-ebar" x="${ex0}" y="${E_BAR_Y}" width="${ex1 - ex0}" height="${BAR_H}" rx="2"/>
    ${outs.map((d) => `<circle class="cu-screw" cx="${d.cx + 8}" cy="${E_BAR_Y + 4.5}" r="3"/>`).join('')}
    <rect class="cu-hit" x="${ex0}" y="${E_BAR_Y - 4}" width="${ex1 - ex0}" height="${BAR_H + 8}"/></g>`;

  // meter tails and main earth, entering at the bottom
  const tails = `<g class="cu-part" data-part="tails">
    <path class="cu-tail-l" d="M${main.cx - 14} ${EY1 + 28} V${BOT - 11}"/>
    <path class="cu-tail-n" d="M${main.cx + 14} ${EY1 + 28} V${BOT - 11}"/>
    ${earthPath(`M${main.cx + 30} ${EY1 + 28} V${E_BAR_Y + 4.5}`, 'cu-e-main')}
    <rect class="cu-hit" x="${main.cx - 24}" y="${BOT}" width="60" height="${EY1 + 28 - BOT}"/>
  </g>`;

  // outgoing circuits
  let cables = '';
  for (const d of outs) {
    const rcbo = d.kind === 'rcbo' || d.fitted === 'rcbo';
    const blueFrom = rcbo ? BOT - 11 : N_BAR_Y + 4.5;
    const blueX = rcbo ? d.cx + 4 : d.cx;
    cables += `<g class="cu-part cu-circuit" data-part="cables" data-live="${d.id}">
      ${rcbo ? `<path class="cu-flying" d="M${d.cx + 4} ${BOT - 2} C${d.cx + 22} ${BOT + 6} ${d.cx + 4} ${N_BAR_Y - 8} ${d.cx + 15} ${N_BAR_Y + 3}"/>` : ''}
      <path class="cu-n" d="M${blueX} ${blueFrom} V${OUT_Y}"/>
      ${earthPath(`M${d.cx + 8} ${E_BAR_Y + 4.5} V${OUT_Y}`)}
      <path class="cu-l" d="M${d.cx - 8} ${BOT - 11} V${OUT_Y}"/>
      <path class="cu-flow" d="M${d.cx - 8} ${BOT - 11} V${OUT_Y}"/>
      <rect class="cu-sheath" x="${d.cx - 13}" y="${EY1 - 4}" width="26" height="22" rx="6"/>
      <circle class="cu-glow" cx="${d.cx}" cy="${EY1 + 32}" r="11"/>
      <circle class="cu-lamp" cx="${d.cx}" cy="${EY1 + 32}" r="5.5"/>
      <rect class="cu-hit" x="${d.cx - 16}" y="${BOT}" width="32" height="${EY1 + 40 - BOT}"/>
    </g>`;
  }
  // labels under every outgoing way (and empty build ways)
  const labels = P.filter((d) => d.circuit || d.kind === 'slot')
    .map((d) => {
      const [a, b] = d.circuit ?? ['', ''];
      return `<text class="cu-cl" x="${d.cx}" y="${EY1 + 58}" text-anchor="middle">${esc(a)}</text><text class="cu-cl" x="${d.cx}" y="${EY1 + 73}" text-anchor="middle">${esc(b)}</text>`;
    })
    .join('');

  const covLabels = outs
    .map((d) => `<text class="cu-cov-l" x="${d.cx}" y="${TOP + 14}" text-anchor="middle">${esc((d.circuit ?? [''])[0])}</text>`)
    .join('');
  const apX0 = left - 4;
  const apX1 = right + 4;
  const apY0 = TOP + 22;
  const apY1 = TOP + 130;

  return `
    <defs>
      <linearGradient id="cu-copper-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3a46a"/><stop offset="1" stop-color="#a8622c"/></linearGradient>
      <linearGradient id="cu-copper-live" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffcf8a"/><stop offset="1" stop-color="#c8742e"/></linearGradient>
      <linearGradient id="cu-cover-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eeebe4"/></linearGradient>
      <filter id="cu-shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#1d232b" flood-opacity="0.18"/></filter>
    </defs>
    <rect class="cu-encl" x="${EX0}" y="${EY0}" width="${EX1 - EX0}" height="${EY1 - EY0}" rx="16" filter="url(#cu-shadow)"/>
    <rect class="cu-encl-in" x="${EX0 + 8}" y="${EY0 + 8}" width="${EX1 - EX0 - 16}" height="${EY1 - EY0 - 16}" rx="10"/>
    <rect class="cu-din" x="${EX0 + 16}" y="${TOP + 62}" width="${EX1 - EX0 - 32}" height="18" rx="2"/>
    ${tails}
    <g class="cu-blue">${blue}</g>
    ${copper}${rcdCopper}
    ${neutralBars}${earthBar}
    ${cables}
    <g class="cu-devs">${P.map(deviceMarkup).join('')}</g>
    ${labels}
    <text class="cu-tl" x="${main.cx}" y="${EY1 + 58}" text-anchor="middle">Meter</text>
    <text class="cu-tl" x="${main.cx}" y="${EY1 + 73}" text-anchor="middle">tails</text>
    <g class="cu-cover" data-part="cover">
      <path class="cu-cover-plate" fill-rule="evenodd" d="M${EX0 + 2} ${EY0 + 12} a10 10 0 0 1 10 -10 H${EX1 - 12} a10 10 0 0 1 10 10 V${EY1 - 12} a10 10 0 0 1 -10 10 H${EX0 + 12} a10 10 0 0 1 -10 -10 Z M${apX0} ${apY0} V${apY1} H${apX1} V${apY0} Z"/>
      <rect class="cu-cov-strip" x="${apX0}" y="${TOP}" width="${apX1 - apX0}" height="20" rx="3"/>
      ${covLabels}
      <text class="cu-cov-t" x="${VIEW_W / 2}" y="${EY0 + 50}" text-anchor="middle">${esc(opts.coverLabel)}</text>
      <text class="cu-cov-s" x="${VIEW_W / 2}" y="${BOT + 34}" text-anchor="middle">Press T every six months · 30 mA RCD protection</text>
      ${[
        [EX0 + 18, EY0 + 18],
        [EX1 - 18, EY0 + 18],
        [EX0 + 18, EY1 - 18],
        [EX1 - 18, EY1 - 18],
      ]
        .map(([x, y]) => `<circle class="cu-cov-screw" cx="${x}" cy="${y}" r="5"/><path class="cu-cov-slot" d="M${x - 3} ${y + 3}l6 -6"/>`)
        .join('')}
    </g>`;
}

/** Device ids in power order: which outputs are live for a set of switch states. */
export function liveMap(devs: BoardDev[], on: Record<string, boolean>, supply = true): Record<string, boolean> {
  const live: Record<string, boolean> = { supply };
  const main = devs.find((d) => d.kind === 'main');
  live.main = supply && !!(main && on[main.id]);
  if (main) live[main.id] = live.main;
  for (const d of devs) {
    if (d.kind === 'rcd' || d.kind === 'rcbo' || d.kind === 'slot') live[d.id] = live.main && !!on[d.id] && (d.kind !== 'slot' || !!d.fitted);
  }
  for (const d of devs) {
    if (d.kind === 'mcb') live[d.id] = !!(d.feed ? live[d.feed] : live.main) && !!on[d.id];
  }
  return live;
}

/** Apply switch positions and live/dead copper to a rendered board. */
export function applyState(root: Element, devs: BoardDev[], on: Record<string, boolean>) {
  const live = liveMap(devs, on);
  root.querySelectorAll<SVGElement>('[data-knob]').forEach((k) => {
    const id = k.dataset.knob!;
    k.classList.toggle('is-off', !on[id]);
  });
  root.querySelectorAll<SVGElement>('[data-flag]').forEach((f) => f.classList.toggle('is-on', !!on[f.dataset.flag!]));
  root.querySelectorAll<SVGElement>('[data-lever]').forEach((l) => l.setAttribute('aria-pressed', String(!!on[l.dataset.lever!])));
  root.querySelectorAll<SVGElement>('[data-live]').forEach((el) => el.classList.toggle('is-live', !!live[el.dataset.live!]));
  return live;
}
