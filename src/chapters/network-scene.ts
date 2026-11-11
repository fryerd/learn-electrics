// The landscape for chapter 2: power station on the left, a cutaway house on the right.
// Everything here is plain geometry (SVG strings and numbers); network.ts brings it to life.
// World units: 2000 wide; the ground is at y = 440. Strokes are non-scaling, labels are sized in
// screen pixels via the --nw-u custom property (world units per screen pixel).

export const GROUND = 440;

export type Box = [x0: number, y0: number, x1: number, y1: number];

export const OVERVIEW: Box = [0, 140, 2000, 540];

/** One entry per stage (same order as `stages` in the lesson data). */
export const routes: { d: string; switchX?: number; cam: Box; hit: Box[] }[] = [
  // 0 power station
  { d: 'M 200 418 L 296 418', cam: [10, 250, 380, 462], hit: [[10, 250, 282, 446]] },
  // 1 transmission (step-up at x 317)
  {
    d: '', // built below from the pylon spans
    switchX: 317,
    cam: [270, 205, 860, 462],
    hit: [[282, 215, 815, 446]],
  },
  // 2 grid supply point
  { d: 'M 835 336 L 835 418 L 920 418 L 925 362', switchX: 878, cam: [790, 300, 960, 462], hit: [[815, 300, 945, 446]] },
  // 3 132 kV line + 33 kV substation
  { d: '', switchX: 1092, cam: [920, 285, 1150, 462], hit: [[945, 285, 1140, 446]] },
  // 4 33 kV poles + primary substation
  { d: '', switchX: 1322, cam: [1110, 315, 1372, 462], hit: [[1140, 315, 1362, 446]] },
  // 5 11 kV cable + local transformer
  {
    d: 'M 1347 418 L 1372 418 L 1372 478 L 1440 478 L 1440 426 L 1478 426 L 1478 496',
    switchX: 1458,
    cam: [1330, 370, 1505, 525],
    hit: [[1362, 370, 1492, 530]],
  },
  // 6 street cable
  { d: 'M 1478 496 L 1816 496', cam: [1450, 320, 1845, 528], hit: [[1492, 320, 1760, 530], [1760, 470, 1800, 530]] },
  // 7 service cable
  { d: 'M 1816 496 L 1816 424', cam: [1765, 380, 1870, 528], hit: [[1800, 424, 1834, 530]] },
  // 8 cut-out
  { d: 'M 1816 424 L 1816 362 L 1840 362', cam: [1772, 340, 1888, 452], hit: [[1798, 376, 1834, 424]] },
  // 9 meter
  { d: 'M 1840 362 L 1857 362 L 1857 426 L 1882 426', cam: [1806, 340, 1922, 452], hit: [[1836, 352, 1880, 432]] },
  // 10 consumer unit
  { d: 'M 1882 426 L 1926 426 L 1926 250 L 1905 250 L 1905 266', cam: [1858, 232, 1992, 446], hit: [[1882, 236, 1990, 440]] },
];

/* --------------------------------- pylons --------------------------------- */

interface Tower {
  x: number;
  top: number;
  /** Arm heights and half-widths. Conductors hang `drop` below each tip. */
  arms: [y: number, half: number][];
  base: number;
  drop: number;
}

const big = (x: number): Tower => ({
  x,
  top: 232,
  base: 22,
  drop: 14,
  arms: [
    [262, 26],
    [290, 32],
    [318, 26],
  ],
});
const pylons = [big(440), big(590), big(740)];
const t132: Tower = {
  x: 990,
  top: 298,
  base: 15,
  drop: 10,
  arms: [
    [318, 18],
    [340, 22],
  ],
};

const tips = (t: Tower, side: 1 | -1) => t.arms.map(([y, h]) => [t.x + side * h, y + t.drop] as const);

const span = (a: readonly [number, number], b: readonly [number, number], sag: number) =>
  `Q ${((a[0] + b[0]) / 2).toFixed(1)} ${(Math.max(a[1], b[1]) + sag).toFixed(1)} ${b[0]} ${b[1]}`;

function towerSVG(t: Tower) {
  const { x, top, base } = t;
  const waist = top + (GROUND - top) * 0.18;
  const legs = `M ${x - base} ${GROUND} L ${x - 6} ${waist} L ${x} ${top} L ${x + 6} ${waist} L ${x + base} ${GROUND}`;
  // lattice: zigzag between the legs
  const n = 7;
  let zig = '';
  for (let i = 0; i <= n; i++) {
    const y = GROUND - ((GROUND - waist) * i) / n;
    const half = 6 + (base - 6) * (1 - i / n);
    zig += `${i === 0 ? 'M' : 'L'} ${x + (i % 2 ? half : -half)} ${y.toFixed(1)} `;
  }
  const arms = t.arms
    .map(([y, h]) => `M ${x - h} ${y} L ${x + h} ${y} M ${x - h} ${y} L ${x - 5} ${y - 7} M ${x + h} ${y} L ${x + 5} ${y - 7}`)
    .join(' ');
  const ins = t.arms.map(([y, h]) => `M ${x - h} ${y} v ${t.drop} M ${x + h} ${y} v ${t.drop}`).join(' ');
  return `<g class="nw-tower">
    <path class="nw-steel" d="${legs}"/>
    <path class="nw-steel nw-thin" d="${zig}"/>
    <path class="nw-steel" d="${arms}"/>
    <path class="nw-ins" d="${ins}"/>
  </g>`;
}

function poleSVG(x: number) {
  return `<g class="nw-pole">
    <path class="nw-wood" d="M ${x} ${GROUND} L ${x} 330"/>
    <path class="nw-steel" d="M ${x - 18} 340 L ${x + 18} 340"/>
    <path class="nw-ins" d="M ${x - 14} 340 v -5 M ${x} 340 v -8 M ${x + 14} 340 v -5"/>
  </g>`;
}

/** Fenced substation compound with a transformer. `big` makes it chunkier. */
function compoundSVG(x0: number, x1: number, tx: number, size = 1) {
  const w = 34 * size;
  const h = 30 * size;
  const y = GROUND - 8 - h;
  let fins = '';
  for (let i = 1; i < 6; i++) fins += `M ${tx - w / 2 + (w * i) / 6} ${y + 6} v ${h - 12} `;
  const bush = [-0.3, 0, 0.3].map((f) => `M ${tx + f * w} ${y} v ${-9 * size}`).join(' ');
  return `<g class="nw-compound">
    <rect class="nw-yard" x="${x0}" y="${GROUND - 46}" width="${x1 - x0}" height="46" rx="3"/>
    <path class="nw-fence" d="M ${x0} ${GROUND - 46} H ${x1}"/>
    <rect class="nw-tx" x="${tx - w / 2}" y="${y}" width="${w}" height="${h}" rx="4"/>
    <path class="nw-fin" d="${fins}"/>
    <path class="nw-ins" d="${bush}"/>
  </g>`;
}

function gantrySVG(x: number, top: number) {
  return `<path class="nw-steel" d="M ${x - 8} ${GROUND - 46} L ${x - 8} ${top} M ${x + 8} ${GROUND - 46} L ${x + 8} ${top} M ${x - 12} ${top + 2} H ${x + 12}"/>`;
}

function houseSVG(x: number, phase: 1 | 2 | 3, tint: string) {
  const w = 70;
  const sx = x + 35;
  const coreY = 486 + phase * 4;
  return `<g class="nw-house">
    <path class="nw-svc nw-ph${phase}" d="M ${sx} ${coreY} V ${GROUND - 2}"/>
    <circle class="nw-joint" cx="${sx}" cy="${coreY}" r="3.2"/>
    <rect class="nw-wall" x="${x}" y="${GROUND - 70}" width="${w}" height="70" style="fill:${tint}"/>
    <path class="nw-roof" d="M ${x - 5} ${GROUND - 70} L ${x + w / 2} ${GROUND - 108} L ${x + w + 5} ${GROUND - 70} Z"/>
    <rect class="nw-win" x="${x + 10}" y="${GROUND - 58}" width="18" height="16" rx="2"/>
    <rect class="nw-win" x="${x + 42}" y="${GROUND - 58}" width="18" height="16" rx="2"/>
    <rect class="nw-door" x="${x + 28}" y="${GROUND - 30}" width="14" height="30" rx="2"/>
  </g>`;
}

function treeSVG(x: number, s = 1) {
  return `<g class="nw-tree"><path class="nw-trunk" d="M ${x} ${GROUND} v ${-18 * s}"/><circle class="nw-leaf" cx="${x}" cy="${GROUND - 30 * s}" r="${15 * s}"/><circle class="nw-leaf" cx="${x - 9 * s}" cy="${GROUND - 22 * s}" r="${10 * s}"/></g>`;
}

/* ------------------------------- route paths ------------------------------- */

const gantryA = [350, 336] as const;
const gspIn = [835, 336] as const;
{
  const p = pylons.map((t) => tips(t, 1)[1]);
  routes[1].d =
    `M 296 418 L 352 418 L ${gantryA[0]} ${gantryA[1]} ${span(gantryA, p[0], 26)} ${span(p[0], p[1], 26)} ${span(p[1], p[2], 26)} ${span(p[2], gspIn, 20)}`;
  const a = [925, 362] as const;
  const t = tips(t132, 1)[1];
  const b = [1060, 372] as const;
  routes[3].d = `M ${a[0]} ${a[1]} ${span(a, t, 16)} ${span(t, b, 14)} L 1060 418 L 1120 418`;
  const c = [1138, 372] as const;
  const p1 = [1185 + 14, 335] as const;
  const p2 = [1240 + 14, 335] as const;
  const d = [1290, 372] as const;
  routes[4].d = `M 1120 418 L ${c[0]} ${c[1]} ${span(c, p1, 10)} ${span(p1, p2, 10)} ${span(p2, d, 10)} L 1290 418 L 1347 418`;
}

/** Decorative overhead conductors (the route conductor is drawn separately, on top). */
function wiresSVG() {
  let d = '';
  for (let i = 0; i < pylons.length - 1; i++) {
    for (const side of [1, -1] as const) {
      const a = tips(pylons[i], side);
      const b = tips(pylons[i + 1], side);
      a.forEach((p, k) => (d += `M ${p[0]} ${p[1]} ${span(p, b[k], 26)} `));
    }
  }
  tips(pylons[0], -1).forEach((p, k) => (d += `M ${gantryA[0] - 6 + k * 6} ${gantryA[1]} ${span([gantryA[0] - 6 + k * 6, gantryA[1]], p, 26)} `));
  tips(pylons[2], 1).forEach((p, k) => (d += `M ${p[0]} ${p[1]} ${span(p, [gspIn[0] - 6 + k * 6, gspIn[1]], 20)} `));
  // 132 kV
  tips(t132, -1).forEach((p, k) => (d += `M ${925 - 4 + k * 8} 362 ${span([925 - 4 + k * 8, 362], p, 16)} `));
  tips(t132, 1).forEach((p, k) => (d += `M ${p[0]} ${p[1]} ${span(p, [1060 - 4 + k * 8, 372], 14)} `));
  // 33 kV poles
  for (const off of [-14, 0]) {
    const a = [1138 + off / 2, 372] as const;
    const p1 = [1185 + off, off ? 335 : 332] as const;
    const p2 = [1240 + off, off ? 335 : 332] as const;
    const b = [1290 + off / 2, 372] as const;
    d += `M ${a[0]} ${a[1]} ${span(a, p1, 10)} ${span(p1, p2, 10)} ${span(p2, b, 10)} `;
  }
  return `<path class="nw-wire" d="${d}"/>`;
}

/* ------------------------------- the picture ------------------------------- */

/** Scene labels: [stage, x, y, text]. Shown for the focused stage, in screen-sized type. */
const tags: [number, number, number, string][] = [
  [0, 110, 318, 'Cooling towers'],
  [0, 222, 362, 'Generator hall'],
  [1, 317, 386, 'Step-up transformer'],
  [1, 590, 222, 'Pylons · 400 kV'],
  [2, 878, 384, 'Transformer 400 → 132 kV'],
  [3, 990, 288, '132 kV tower'],
  [3, 1090, 384, '132 → 33 kV'],
  [4, 1212, 322, '33 kV poles'],
  [4, 1320, 384, '33 → 11 kV'],
  [5, 1405, 468, '11 kV cable'],
  [5, 1458, 392, '11 kV → 400 V'],
  [6, 1524, 476, 'L1'],
  [6, 1604, 476, 'L2'],
  [6, 1684, 476, 'L3'],
  [6, 1760, 514, 'N'],
  [6, 1620, 528, 'Low-voltage main'],
  [7, 1816, 520, 'Service cable'],
  [8, 1816, 382, 'Cut-out'],
  [9, 1857, 368, 'Meter'],
  [10, 1926, 362, 'Consumer unit'],
  [10, 1905, 290, 'Your circuits'],
];

const steam = (cx: number) =>
  [0, 1, 2]
    .map((i) => `<circle class="nw-steam" cx="${cx + (i - 1) * 7}" cy="318" r="${12 + i * 3}" style="animation-delay:${-i * 1.6}s"/>`)
    .join('');

export function sceneSVG() {
  const cooling = (cx: number) =>
    `<path class="nw-cool" d="M ${cx - 32} ${GROUND} Q ${cx - 16} 388 ${cx - 22} 330 L ${cx + 22} 330 Q ${cx + 16} 388 ${cx + 32} ${GROUND} Z"/>`;

  const routePaths = routes.map((r, i) => `<path class="nw-route" data-stage="${i}" d="${r.d}"/>`).join('');
  const hits = routes
    .map((r, i) =>
      r.hit.map(([x0, y0, x1, y1]) => `<rect class="nw-hit" data-stage="${i}" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="6"/>`).join(''),
    )
    .join('');
  const tagEls = tags
    .map(([s, x, y, t]) => `<text class="nw-tag" data-stage="${s}" x="${x}" y="${y}" text-anchor="middle">${t}</text>`)
    .join('');

  return `
  <defs>
    <linearGradient id="nw-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d4e3f1"/><stop offset="1" stop-color="#f5f2ea"/>
    </linearGradient>
    <linearGradient id="nw-soil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ddcfb2"/><stop offset="1" stop-color="#cdbb97"/>
    </linearGradient>
    <radialGradient id="nw-halo">
      <stop offset="0" stop-color="#fff6c8" stop-opacity="1"/>
      <stop offset="0.35" stop-color="#ffd24a" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#ffb21f" stop-opacity="0"/>
    </radialGradient>
    <pattern id="nw-grit" width="14" height="14" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="4" r="1" fill="#b9a57f"/><circle cx="10" cy="10" r="0.8" fill="#b9a57f"/>
    </pattern>
  </defs>

  <rect x="-4000" y="-3000" width="10000" height="${3000 + GROUND}" fill="url(#nw-sky)"/>
  <g class="nw-clouds">
    <g class="nw-cloud" style="animation-duration:90s"><ellipse cx="300" cy="170" rx="70" ry="16"/><ellipse cx="335" cy="158" rx="38" ry="16"/></g>
    <g class="nw-cloud" style="animation-duration:120s;animation-delay:-40s"><ellipse cx="1000" cy="190" rx="90" ry="15"/><ellipse cx="960" cy="178" rx="40" ry="14"/></g>
    <g class="nw-cloud" style="animation-duration:100s;animation-delay:-70s"><ellipse cx="1600" cy="160" rx="60" ry="13"/><ellipse cx="1630" cy="150" rx="30" ry="12"/></g>
  </g>
  <path class="nw-hill2" d="M -4000 ${GROUND} L -4000 380 L 0 380 C 180 330 360 350 540 372 S 900 330 1120 360 S 1500 340 1700 364 S 1950 350 2000 360 L 6000 360 L 6000 ${GROUND} Z"/>
  <path class="nw-hill" d="M -4000 ${GROUND} L -4000 410 L 0 410 C 220 380 420 400 640 410 S 1000 388 1250 404 S 1600 396 2000 404 L 6000 404 L 6000 ${GROUND} Z"/>

  <rect class="nw-ground" x="-4000" y="${GROUND}" width="10000" height="3000"/>
  <rect x="1362" y="${GROUND}" width="5000" height="3000" fill="url(#nw-soil)"/>
  <rect x="1362" y="${GROUND}" width="5000" height="3000" fill="url(#nw-grit)"/>
  <path class="nw-cut" d="M 1362 ${GROUND} V 3000"/>
  <rect class="nw-pave" x="1362" y="${GROUND - 1}" width="5000" height="7"/>
  <path class="nw-grass" d="M -4000 ${GROUND} H 1362"/>

  ${[395, 530, 670, 960, 1170].map((x, i) => treeSVG(x, i % 2 ? 0.8 : 1)).join('')}

  <!-- 0 power station -->
  <g class="nw-station">
    ${cooling(70)}${cooling(140)}
    <g class="nw-steams">${steam(70)}${steam(140)}</g>
    <rect class="nw-chimney" x="252" y="268" width="12" height="104" rx="2"/>
    <rect class="nw-hall" x="172" y="368" width="102" height="72" rx="4"/>
    <path class="nw-roofline" d="M 172 380 H 274"/>
    ${[0, 1, 2, 3].map((i) => `<rect class="nw-win" x="${182 + i * 22}" y="388" width="12" height="14" rx="2"/>`).join('')}
    <circle class="nw-gen" cx="200" cy="418" r="11"/>
    <path class="nw-genmark" d="M 194 418 q 3 -6 6 0 t 6 0"/>
  </g>

  <!-- 1 step-up + pylons -->
  ${compoundSVG(284, 368, 317)}
  ${gantrySVG(350, 336)}
  ${pylons.map(towerSVG).join('')}

  <!-- 2 grid supply point -->
  ${compoundSVG(816, 942, 878, 1.25)}
  ${gantrySVG(835, 336)}
  ${gantrySVG(925, 362)}

  <!-- 3 132 kV tower + bulk supply point -->
  ${towerSVG(t132)}
  ${compoundSVG(1045, 1136, 1092)}
  ${gantrySVG(1060, 372)}

  <!-- 4 33 kV poles + primary -->
  ${gantrySVG(1138, 372)}
  ${poleSVG(1185)}${poleSVG(1240)}
  ${compoundSVG(1276, 1362, 1322, 0.9)}
  ${gantrySVG(1290, 372)}

  ${wiresSVG()}

  <!-- 5 underground 11 kV + local substation -->
  <path class="nw-hvcable" d="M 1347 418 L 1372 418 L 1372 478 L 1440 478 L 1440 430"/>
  <g class="nw-kiosk">
    <rect class="nw-kbase" x="1424" y="${GROUND - 4}" width="70" height="6" rx="2"/>
    <rect class="nw-kbox" x="1430" y="396" width="58" height="42" rx="4"/>
    <path class="nw-klouvre" d="M 1438 404 h 20 M 1438 410 h 20 M 1438 416 h 20 M 1438 422 h 20"/>
    <path class="nw-warn" d="M 1474 404 l 7 12 h -14 z"/>
    <path class="nw-warnbolt" d="M 1474.5 407 l -2 4.5 h 3 l -2 3.5"/>
  </g>

  <!-- 6 street: the LV main with three phases and a neutral -->
  <rect class="nw-main" x="1470" y="484" width="560" height="22" rx="11"/>
  <path class="nw-core nw-ph1" d="M 1476 490 H 2020"/>
  <path class="nw-core nw-ph2" d="M 1476 494 H 2020"/>
  <path class="nw-core nw-ph3" d="M 1476 498 H 2020"/>
  <path class="nw-core nw-n" d="M 1476 502 H 2020"/>
  <path class="nw-svc nw-hv" d="M 1478 430 V 486"/>
  ${houseSVG(1500, 1, '#f3e7d7')}${houseSVG(1580, 2, '#e8eef3')}${houseSVG(1660, 3, '#f1ece0')}

  <!-- 7-10 your house (cutaway) -->
  <g class="nw-home">
    <path class="nw-roof" d="M 1756 246 L 1877 188 L 1998 246 Z"/>
    <rect class="nw-inside" x="1768" y="246" width="218" height="194"/>
    <path class="nw-floor" d="M 1768 340 H 1986"/>
    <rect class="nw-win nw-winlit" x="1950" y="270" width="24" height="40" rx="2"/>
    <rect class="nw-win" x="1780" y="270" width="24" height="40" rx="2"/>
    <rect class="nw-shell" x="1768" y="246" width="218" height="194"/>
    <path class="nw-svc nw-ph1" d="M 1816 490 V 424"/>
    <circle class="nw-joint" cx="1816" cy="490" r="3.2"/>
    <path class="nw-tails" d="M 1816 386 V 362 H 1857 V 372 M 1857 412 V 426 H 1926 V 414"/>
    <path class="nw-circuit" d="M 1926 366 V 250 H 1905 V 262"/>

    <g class="nw-part" data-part="8">
      <rect class="nw-cutout" x="1805" y="386" width="22" height="38" rx="3"/>
      <rect class="nw-cutcap" x="1807" y="388" width="18" height="5" rx="1"/>
      <rect class="nw-carrier" x="1809" y="396" width="14" height="18" rx="2"/>
      <path class="nw-grip" d="M 1812 400 H 1820 M 1812 404 H 1820"/>
      <circle class="nw-seal" cx="1823" cy="418" r="1.6"/>
      <path class="nw-wire" d="M 1823 416.5 Q 1817 412 1815 415"/>
      <circle class="nw-term" cx="1810" cy="420" r="1.2"/><circle class="nw-term" cx="1818" cy="420" r="1.2"/>
    </g>
    <g class="nw-part" data-part="9">
      <rect class="nw-meter" x="1842" y="372" width="30" height="40" rx="3"/>
      <circle class="nw-seal" cx="1857" cy="375.5" r="1.3"/>
      <rect class="nw-lcd" x="1846.5" y="378" width="21" height="9" rx="1.5"/>
      <text class="nw-digits" x="1857" y="384.6" text-anchor="middle">00482</text>
      <text class="nw-unit" x="1866.5" y="390" text-anchor="end">kWh</text>
      <circle class="nw-led" cx="1851" cy="395" r="1.6"/>
      <circle class="nw-port" cx="1864" cy="394" r="2.6"/>
      <rect class="nw-btn" x="1853" y="393" width="6" height="4" rx="1"/>
      <path class="nw-grip" d="M 1846 400 H 1868 M 1846 402.5 H 1860"/>
      <rect class="nw-tcover" x="1845" y="404.5" width="24" height="6" rx="1"/>
      ${[0, 1, 2, 3].map((i) => `<circle class="nw-term" cx="${1848 + i * 6}" cy="407.5" r="1.1"/>`).join('')}
    </g>
    <g class="nw-part" data-part="10">
      <rect class="nw-cu" x="1893" y="366" width="66" height="48" rx="4"/>
      <rect class="nw-cu-hd" x="1895" y="368" width="62" height="6" rx="2"/>
      <rect class="nw-main-sw" x="1898" y="378" width="9" height="22" rx="1.5"/>
      <rect class="nw-tog" x="1900.5" y="380" width="4" height="8" rx="1"/>
      <rect class="nw-rcd" x="1909" y="378" width="13" height="22" rx="1.5"/>
      <rect class="nw-test" x="1912" y="381" width="7" height="4" rx="1"/>
      <rect class="nw-tog" x="1914" y="388" width="3" height="8" rx="1"/>
      ${[0, 1, 2, 3]
        .map(
          (i) =>
            `<g><rect class="nw-mcb" x="${1925 + i * 8}" y="378" width="7" height="22" rx="1"/><rect class="nw-tog" x="${1926.5 + i * 8}" y="381" width="4" height="8" rx="1"/><rect class="nw-band" x="${1925 + i * 8}" y="394" width="7" height="3" fill="${['#e8e8e8', '#2f7fd0', '#e8e8e8', '#f2c40f'][i]}"/></g>`,
        )
        .join('')}
      <rect class="nw-label" x="1897" y="403" width="58" height="8" rx="1.5"/>
      <path class="nw-grip" d="M 1900 405.5 H 1913 M 1916 405.5 H 1930 M 1933 405.5 H 1948 M 1900 408.5 H 1920 M 1923 408.5 H 1940"/>
    </g>
    <circle class="nw-lampglow" cx="1905" cy="270" r="22"/>
    <path class="nw-shade" d="M 1897 268 L 1913 268 L 1909 260 L 1901 260 Z"/>
    <circle class="nw-bulb" cx="1905" cy="271" r="3.2"/>
  </g>

  <!-- ownership overlay -->
  <g class="nw-own-layer" aria-hidden="true">
    <rect class="nw-own" data-owner="gen" x="10" y="${GROUND + 4}" width="272" height="10" rx="5"/>
    <rect class="nw-own" data-owner="tx" x="284" y="${GROUND + 4}" width="656" height="10" rx="5"/>
    <rect class="nw-own" data-owner="dno" x="942" y="${GROUND + 4}" width="420" height="10" rx="5"/>
    <rect class="nw-own" data-owner="dno" x="1362" y="470" width="472" height="52" rx="8"/>
    <rect class="nw-own nw-ownbox" data-owner="dno" x="1800" y="380" width="32" height="48" rx="5"/>
    <rect class="nw-own nw-ownbox" data-owner="supplier" x="1837" y="366" width="40" height="52" rx="5"/>
    <rect class="nw-own nw-ownbox" data-owner="you" x="1884" y="248" width="100" height="190" rx="6"/>
  </g>

  <g class="nw-routes">${routePaths}</g>
  <g class="nw-tags">${tagEls}</g>
  <g class="nw-pulse" id="nw-pulse">
    <circle class="nw-trail" r="0"/><circle class="nw-trail" r="0"/><circle class="nw-trail" r="0"/>
    <g id="nw-pulse-head"><circle r="18" fill="url(#nw-halo)"/><circle class="nw-core-dot" r="4.5"/></g>
  </g>
  <g class="nw-hits">${hits}</g>`;
}
