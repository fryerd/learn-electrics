// Chapter 4: markup for the trip-curve chart, the RCD tester scene and the selectivity diagram.
import { INSTANT_MAX, INSTANT_MIN, MAGNETIC, M_MAX, M_MIN, M_NO_TRIP, T_MAX, thermalFast, thermalSlow, type Curve } from './consumer-unit-sim';

/* ----------------------------------------------------------------- chart */

const PX0 = 92;
const PX1 = 624;
const PY0 = 40;
const PY1 = 404;
const T_MIN = 0.005;

export const chartX = (m: number) => PX0 + ((PX1 - PX0) * Math.log(m / M_MIN)) / Math.log(M_MAX / M_MIN);
export const chartY = (t: number) => PY1 - ((PY1 - PY0) * Math.log(Math.min(T_MAX, Math.max(T_MIN, t)) / T_MIN)) / Math.log(T_MAX / T_MIN);

function bandPath(curve: Curve): string {
  const [lo, hi] = MAGNETIC[curve];
  const ms: number[] = [];
  const N = 140;
  for (let i = 0; i <= N; i++) ms.push(M_NO_TRIP * (M_MAX / M_NO_TRIP) ** (i / N));
  const upper: string[] = [];
  for (const m of ms.filter((m) => m < hi)) upper.push(`${chartX(m).toFixed(1)} ${chartY(thermalSlow(m)).toFixed(1)}`);
  upper.push(`${chartX(hi).toFixed(1)} ${chartY(thermalSlow(hi)).toFixed(1)}`, `${chartX(hi).toFixed(1)} ${chartY(INSTANT_MAX).toFixed(1)}`, `${chartX(M_MAX).toFixed(1)} ${chartY(INSTANT_MAX).toFixed(1)}`);
  const lower: string[] = [`${chartX(M_MAX).toFixed(1)} ${chartY(INSTANT_MIN).toFixed(1)}`, `${chartX(lo).toFixed(1)} ${chartY(INSTANT_MIN).toFixed(1)}`];
  const left = ms.filter((m) => m <= lo).reverse();
  lower.push(`${chartX(lo).toFixed(1)} ${chartY(thermalFast(lo)).toFixed(1)}`);
  for (const m of left) lower.push(`${chartX(m).toFixed(1)} ${chartY(thermalFast(m)).toFixed(1)}`);
  return `M${upper.join(' L')} L${lower.join(' L')} Z`;
}

export function chartMarkup(curve: Curve, rating: number): string {
  const other: Curve = curve === 'B' ? 'C' : 'B';
  const [lo, hi] = MAGNETIC[curve];
  const xt = [0.5, 1, 2, 3, 5, 10, 20, 40];
  const yt: [number, string][] = [
    [0.01, '10 ms'],
    [0.1, '0.1 s'],
    [1, '1 s'],
    [10, '10 s'],
    [60, '1 min'],
    [600, '10 min'],
    [3600, '1 hour'],
  ];
  const fmtA = (a: number) => (a >= 1000 ? `${(a / 1000).toFixed(1)} kA` : `${Math.round(a)} A`);
  return `
    <rect class="cu-plot" x="${PX0}" y="${PY0}" width="${PX1 - PX0}" height="${PY1 - PY0}" rx="6"/>
    <rect class="cu-safe" x="${PX0}" y="${PY0}" width="${chartX(M_NO_TRIP) - PX0}" height="${PY1 - PY0}"/>
    <text class="cu-safe-t" transform="translate(${(PX0 + chartX(M_NO_TRIP)) / 2 + 5} ${(PY0 + PY1) / 2}) rotate(-90)" text-anchor="middle">NORMAL LOAD · NO TRIP</text>
    ${xt.map((m) => `<line class="cu-grid" x1="${chartX(m)}" y1="${PY0}" x2="${chartX(m)}" y2="${PY1}"/>`).join('')}
    ${yt.map(([t]) => `<line class="cu-grid" x1="${PX0}" y1="${chartY(t)}" x2="${PX1}" y2="${chartY(t)}"/>`).join('')}
    <line class="cu-grid cu-grid-1" x1="${chartX(1)}" y1="${PY0}" x2="${chartX(1)}" y2="${PY1}"/>
    <path class="cu-band-other" d="${bandPath(other)}"/>
    <path class="cu-band" d="${bandPath(curve)}"/>
    <rect class="cu-mag" x="${chartX(lo)}" y="${PY0}" width="${chartX(hi) - chartX(lo)}" height="${PY1 - PY0}"/>
    <text class="cu-anno" x="${chartX(1.9)}" y="${chartY(1500)}">Overload</text>
    <text class="cu-anno-s" x="${chartX(1.9)}" y="${chartY(1500) + 16}">bimetal strip heats up</text>
    <text class="cu-anno" x="${PX1 - 8}" y="${chartY(0.03) - 22}" text-anchor="end">Short circuit</text>
    <text class="cu-anno-s" x="${PX1 - 8}" y="${chartY(0.03) - 6}" text-anchor="end">magnetic coil, instant</text>
    <text class="cu-mag-t" x="${(chartX(lo) + chartX(hi)) / 2}" y="${PY0 + 18}" text-anchor="middle">${lo}–${hi} × In</text>
    <text class="cu-other-t" x="${chartX(other === 'C' ? 12 : 2.2)}" y="${chartY(other === 'C' ? 0.4 : 0.03)}" text-anchor="middle">type ${other}</text>
    ${xt.map((m) => `<text class="cu-ax" x="${chartX(m)}" y="${PY1 + 20}" text-anchor="middle">${m}×</text><text class="cu-ax-a" x="${chartX(m)}" y="${PY1 + 36}" text-anchor="middle">${fmtA(m * rating)}</text>`).join('')}
    ${yt.map(([t, l]) => `<text class="cu-ax" x="${PX0 - 8}" y="${chartY(t) + 5}" text-anchor="end">${l}</text>`).join('')}
    <text class="cu-ax-title" x="${(PX0 + PX1) / 2}" y="${PY1 + 60}" text-anchor="middle">Current, as a multiple of the rating (In = ${rating} A)</text>
    <text class="cu-ax-title" transform="translate(22 ${(PY0 + PY1) / 2}) rotate(-90)" text-anchor="middle">Time to trip</text>
    <text class="cu-chart-name" x="${PX1 - 10}" y="${PY0 + 24}" text-anchor="end">Type ${curve}${rating}</text>
    <g id="cu-marker">
      <line class="cu-mk-line" id="cu-mk-line" x1="0" y1="${PY0}" x2="0" y2="${PY1}"/>
      <line class="cu-mk-range" id="cu-mk-range" x1="0" y1="0" x2="0" y2="0"/>
      <circle class="cu-mk-dot" id="cu-mk-a" r="6"/>
      <circle class="cu-mk-dot" id="cu-mk-b" r="6"/>
      <g id="cu-mk-tag"><rect class="cu-mk-tag" id="cu-mk-tagbg" x="0" y="${PY0 + 30}" width="10" height="28" rx="6"/><text class="cu-mk-tag-t" id="cu-mk-tagt" x="0" y="${PY0 + 49}" text-anchor="middle"></text></g>
    </g>`;
}

export const CHART_BOUNDS = { PX0, PX1, PY0, PY1 };

/* ---------------------------------------------------------------- tester */

export const DIAL_ANGLE: Record<string, number> = { half: -60, x1: -20, x5: 20, ramp: 60 };

export function testerMarkup(): string {
  const dx = 112;
  const dy = 300;
  const marks = Object.entries({ half: '½×', x1: '1×', x5: '5×', ramp: 'RAMP' })
    .map(([k, l]) => {
      const a = ((DIAL_ANGLE[k] - 90) * Math.PI) / 180;
      return `<text class="cu-dial-t" data-mode="${k}" x="${dx + Math.cos(a) * 58}" y="${dy + Math.sin(a) * 58 + 5}" text-anchor="middle">${l}</text>`;
    })
    .join('');
  return `
    <defs><filter id="cu-tshadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#1d232b" flood-opacity="0.2"/></filter></defs>
    <!-- circuit from the RCD to the socket -->
    <path class="cu-tr-circ" id="cu-tr-circ" d="M540 300 V360 H470"/>
    <path class="cu-tr-leak" id="cu-tr-leak" d="M420 440 V470 H610 V300"/>
    <g class="cu-tr-earth"><path d="M598 300h24M602 293h16M606 286h8" transform="translate(0 0)"/></g>
    <!-- leads from the tester to the plug -->
    <path class="cu-lead cu-lead-l" d="M268 352 C320 352 330 390 382 392"/>
    <path class="cu-lead cu-lead-n" d="M268 366 C318 366 326 400 382 404"/>
    <path class="cu-lead cu-lead-e" d="M268 380 C316 380 324 412 382 416"/>
    <path class="cu-lead cu-lead-ey" d="M268 380 C316 380 324 412 382 416"/>
    <!-- socket and plug -->
    <rect class="cu-sock" x="372" y="352" width="96" height="96" rx="12" filter="url(#cu-tshadow)"/>
    <rect class="cu-plug" x="382" y="368" width="76" height="64" rx="8"/>
    <text class="cu-plug-t" x="420" y="406" text-anchor="middle">13 A</text>
    <!-- the tester -->
    <g filter="url(#cu-tshadow)">
      <rect class="cu-tester" x="40" y="70" width="234" height="340" rx="26"/>
    </g>
    <rect class="cu-tester-in" x="52" y="82" width="210" height="316" rx="18"/>
    <rect class="cu-lcd" x="66" y="98" width="182" height="116" rx="8"/>
    <text class="cu-lcd-s" id="cu-lcd-top" x="78" y="120">RCD 30 mA · RAMP</text>
    <text class="cu-lcd-v" id="cu-lcd-v" x="206" y="180" text-anchor="end">– –</text>
    <text class="cu-lcd-u" id="cu-lcd-u" x="212" y="180">mA</text>
    <text class="cu-lcd-s" id="cu-lcd-s" x="78" y="204">READY</text>
    <circle class="cu-dial-ring" cx="${dx}" cy="${dy}" r="40"/>
    <g id="cu-dial" class="cu-dial" style="transform-origin:${dx}px ${dy}px"><circle class="cu-dial-knob" cx="${dx}" cy="${dy}" r="28"/><rect class="cu-dial-ptr" x="${dx - 3}" y="${dy - 26}" width="6" height="18" rx="3"/></g>
    ${marks}
    <circle class="cu-test-btn" id="cu-test-btn" cx="214" cy="300" r="26"/>
    <text class="cu-test-t" x="214" y="305" text-anchor="middle">TEST</text>
    <text class="cu-tester-name" x="157" y="388" text-anchor="middle">RCD TESTER</text>
    <!-- the RCD under test -->
    <rect class="cu-body" x="478" y="70" width="124" height="230" rx="10" filter="url(#cu-tshadow)"/>
    <circle class="cu-screw" cx="510" cy="88" r="5"/><circle class="cu-screw" cx="570" cy="88" r="5"/>
    <circle class="cu-screw" cx="510" cy="282" r="5"/><circle class="cu-screw" cx="570" cy="282" r="5"/>
    <rect class="cu-front" x="486" y="106" width="108" height="160" rx="6"/>
    <rect class="cu-flag is-on" id="cu-tr-flag" x="525" y="114" width="30" height="7" rx="2"/>
    <rect class="cu-slot" x="514" y="128" width="52" height="66" rx="5"/>
    <g class="cu-knob-g cu-knob-g-big" id="cu-tr-knob"><rect class="cu-knob cu-knob-rcd" x="510" y="130" width="60" height="30" rx="5"/><rect class="cu-knob-shine" x="515" y="134" width="50" height="4" rx="2"/></g>
    <text class="cu-tr-label" x="540" y="224" text-anchor="middle">30 mA</text>
    <rect class="cu-type" x="496" y="234" width="22" height="22" rx="4"/><text class="cu-type-t" x="507" y="250" text-anchor="middle">A</text>
    <text class="cu-dev-sub" x="548" y="250" text-anchor="middle">RCD 63 A</text>
    <circle class="cu-t" cx="578" cy="245" r="9"/><text class="cu-t-t" x="578" y="250" text-anchor="middle">T</text>
    <text class="cu-tr-state" id="cu-tr-state" x="540" y="58" text-anchor="middle">ON</text>
    <!-- the scale -->
    <g id="cu-scale" transform="translate(300 40)"></g>`;
}

/** The little bar scale above the RCD: either mA (ramp) or ms against a limit. */
export function scaleMarkup(mode: 'ma' | 'ms', limit: number, value: number | null, pass: boolean | null): string {
  const W = 160;
  const max = mode === 'ma' ? 35 : limit * 1.6;
  const x = (v: number) => (W * Math.min(v, max)) / max;
  const ticks = mode === 'ma' ? [0, 15, 30] : [0, limit];
  const window =
    mode === 'ma'
      ? `<rect class="cu-sc-win" x="${x(15)}" y="0" width="${x(30) - x(15)}" height="14" rx="2"/>`
      : `<rect class="cu-sc-win" x="0" y="0" width="${x(limit)}" height="14" rx="2"/>`;
  const v = value === null ? null : x(value);
  return `<text class="cu-sc-t" x="0" y="-8">${mode === 'ma' ? 'Trip current' : `Trip time (limit ${limit} ms)`}</text>
    <rect class="cu-sc-bg" x="0" y="0" width="${W}" height="14" rx="3"/>${window}
    ${ticks.map((t) => `<line class="cu-sc-tick" x1="${x(t)}" y1="-2" x2="${x(t)}" y2="18"/><text class="cu-sc-n" x="${x(t)}" y="32" text-anchor="middle">${t}</text>`).join('')}
    ${v === null ? '' : `<path class="cu-sc-ptr ${pass === null ? '' : pass ? 'is-pass' : 'is-fail'}" d="M${v} 16 l-7 12 h14 z"/>`}`;
}

/* ------------------------------------------------------------ selectivity */

export function selectivityMarkup(): string {
  return `<svg viewBox="0 0 340 170" class="cu-selsvg" role="img" aria-label="A 100 mA RCD at the origin feeds the rest of the house and, through a 30 mA RCD, a circuit with an earth fault.">
    <path class="cu-sel-wire" d="M8 86 H52 M102 86 H124 V40 H226 M124 86 V132 H164 M210 132 H262"/>
    <text x="8" y="76" class="cu-sel-cap">supply</text>
    <g id="cu-sel-up" class="cu-sel-dev"><rect x="52" y="56" width="50" height="62" rx="7"/><rect class="cu-sel-knob" x="66" y="63" width="22" height="16" rx="3"/><text x="77" y="106" text-anchor="middle">100</text></g>
    <text x="77" y="136" class="cu-sel-cap" text-anchor="middle" id="cu-sel-upt">general</text>
    <g id="cu-sel-down" class="cu-sel-dev"><rect x="164" y="104" width="46" height="56" rx="7"/><rect class="cu-sel-knob" x="176" y="110" width="22" height="15" rx="3"/><text x="187" y="149" text-anchor="middle">30</text></g>
    <g class="cu-sel-house"><path d="M226 30 L256 8 L286 30 V64 H226 Z"/><circle id="cu-sel-lampa" class="cu-sel-lamp" cx="256" cy="44" r="8"/></g>
    <text x="256" y="80" class="cu-sel-cap" text-anchor="middle">rest of house</text>
    <circle id="cu-sel-lampb" class="cu-sel-lamp" cx="270" cy="132" r="8"/>
    <g id="cu-sel-fault" class="cu-sel-fault"><path d="M286 124 l10 9 l-8 2 l10 12"/></g>
    <text x="300" y="164" class="cu-sel-cap" text-anchor="middle">faulty circuit</text>
  </svg>`;
}
