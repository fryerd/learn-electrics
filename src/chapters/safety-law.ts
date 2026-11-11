import './safety-law.css';
import {
  CIRCUITS,
  STEP_IDS,
  TARGET,
  isolationAct,
  proverReading,
  socketReading,
  startState,
  targetOn,
  type Action,
  type FreeState,
  type IsoState,
  type Outcome,
} from '../data/safety-law-isolation';
import {
  goldenRules,
  infos,
  intro,
  jobs,
  layers,
  quiz,
  slips,
  sortItems,
  steps,
  type Job,
  type JobIcon,
  type LayerId,
} from '../data/safety-law-lesson';
import { mountQuiz } from '../ui/quiz';
import type { ChapterMount } from './types';

type Tab = 'isolate' | 'notify' | 'rules' | 'quiz';
type Scene = 'isolate' | 'notify' | 'layers' | 'golden';
type Pt = [number, number];

const CHART = ['Lights up', 'Lights down', 'Cooker', 'Sockets down', 'Shower', 'Immersion'];

/* ------------------------------ two layouts for the workbench ------------------------------ */
interface Layout {
  vb: [number, number];
  cu: Pt;
  chart: Pt;
  kit: Pt;
  socket: Pt;
  prover: Pt;
  tester: Pt;
  testerCap: Pt;
  tools: Pt;
  colleague: Pt;
  benchY: number;
  cable: string;
}
const WIDE: Layout = {
  vb: [880, 520],
  cu: [40, 30],
  chart: [330, 40],
  kit: [490, 50],
  socket: [680, 90],
  prover: [20, 400],
  tester: [300, 352],
  testerCap: [262, 470],
  tools: [640, 395],
  colleague: [318, 150],
  benchY: 365,
  cable: 'M260 30 V22 Q260 14 268 14 H742 Q750 14 750 22 V90',
};
const NARROW: Layout = {
  vb: [440, 600],
  cu: [12, 12],
  chart: [12, 334],
  kit: [156, 340],
  socket: [290, 70],
  prover: [20, 512],
  tester: [300, 300],
  testerCap: [355, 470],
  tools: [270, 505],
  colleague: [150, 90],
  benchY: 500,
  cable: 'M274 50 H350 Q360 50 360 60 V70',
};
// Where the tester's two tips (local 28,150 and 90,150) land.
const PROVER_PAD: Pt = [34, 18];
const SOCKET_SLOT: Pt = [39, 100];

const tr = (p: Pt) => `translate(${p[0]} ${p[1]})`;

/* ------------------------------------- job icons ------------------------------------- */
const ICONS: Record<JobIcon, string> = {
  faceplate: `<rect x="14" y="14" width="68" height="68" rx="10"/><rect x="44" y="26" width="8" height="16" rx="2"/><rect x="28" y="52" width="14" height="7" rx="2"/><rect x="54" y="52" width="14" height="7" rx="2"/><path d="M60 16 l-10 18 8 4 -10 18" class="ic-acc"/>`,
  shower: `<path d="M24 82 V22 q0-8 8-8 h22"/><path d="M54 14 v8"/><path d="M40 22 h28 l-4 10 h-20z"/><path d="M46 40 v8 M54 40 v12 M62 40 v8 M50 56 v6 M58 56 v6" class="ic-acc"/>`,
  cu: `<rect x="10" y="22" width="76" height="52" rx="8"/><rect x="18" y="32" width="12" height="32" rx="2"/><rect x="36" y="32" width="8" height="32" rx="2"/><rect x="48" y="32" width="8" height="32" rx="2"/><rect x="60" y="32" width="8" height="32" rx="2"/><rect x="72" y="32" width="8" height="32" rx="2"/>`,
  light: `<path d="M48 8 v18"/><path d="M26 54 q22-34 44 0z"/><path d="M38 64 q10 10 20 0" class="ic-acc"/>`,
  shed: `<path d="M14 46 L48 18 L82 46"/><rect x="22" y="44" width="52" height="38"/><rect x="40" y="58" width="16" height="24"/><path d="M4 86 h88" class="ic-acc"/>`,
  switch: `<rect x="16" y="16" width="64" height="64" rx="10"/><rect x="36" y="30" width="24" height="36" rx="4"/><path d="M36 48 h24"/><path d="M70 22 l-8 14 6 2 -8 14" class="ic-acc"/>`,
  spur: `<rect x="10" y="22" width="52" height="52" rx="8"/><rect x="32" y="30" width="7" height="12" rx="2"/><rect x="20" y="52" width="11" height="6" rx="2"/><rect x="41" y="52" width="11" height="6" rx="2"/><path d="M76 34 v24 M64 46 h24" class="ic-acc"/>`,
  bathroom: `<path d="M8 50 h80 v8 q0 18 -18 18 h-44 q-18 0 -18 -18z"/><path d="M18 50 V24 q0-8 8-8 q8 0 8 8"/><path d="M62 8 v8 M54 24 q8-12 16 0" class="ic-acc"/>`,
};

export const mount: ChapterMount = ({ stage, panel, complete }) => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, reduced ? Math.min(ms, 150) : ms));

  /* ======================================= STAGE ======================================= */
  const mcbs = CHART.map((_, i) => {
    const x = 70 + 30 * i;
    const n = i + 1;
    return `<g class="sf-hit sf-mcb-g" data-act="breaker" data-n="${n}" role="button" tabindex="0" aria-label="Breaker ${n}">
      <rect class="sf-mcb" x="${x}" y="54" width="26" height="100" rx="4"/>
      <rect class="sf-win" x="${x + 7}" y="60" width="12" height="8" rx="2"/>
      <rect class="sf-tog" x="${x + 5}" y="76" width="16" height="26" rx="3"/>
      <text class="sf-num" x="${x + 13}" y="186" text-anchor="middle">${n}</text>
    </g>`;
  }).join('');

  stage.innerHTML = `
  <div class="sf-root" data-scene="isolate">
    <!-- ---------------------------- safe isolation workbench ---------------------------- -->
    <div class="sf-scene sf-iso" data-s="isolate">
      <svg class="sf-svg" id="sf-svg" role="group" aria-label="Workbench: consumer unit, circuit chart, lock-off kit, socket, proving unit, voltage indicator and tools">
        <rect class="sf-bench" id="sf-bench" x="0" width="2000" height="400"/>
        <rect class="sf-bench-edge" id="sf-bench-edge" x="0" width="2000" height="6"/>
        <path class="sf-cable" id="sf-cable"/>
        <path class="sf-flow" id="sf-flow"/>

        <g id="sf-cu">
          <rect class="sf-cu-body" x="0" y="0" width="262" height="230" rx="16"/>
          <text class="sf-cap" x="131" y="28" text-anchor="middle">CONSUMER UNIT</text>
          <rect class="sf-cu-rail" x="12" y="42" width="238" height="124" rx="8"/>
          <rect class="sf-mcb sf-main" x="20" y="54" width="40" height="100" rx="5"/>
          <rect class="sf-tog sf-tog-main" x="30" y="66" width="20" height="30" rx="4"/>
          <text class="sf-num" x="40" y="186" text-anchor="middle">MAIN</text>
          ${mcbs}
          <text class="sf-small" x="131" y="214" text-anchor="middle">6 circuits · 1 main switch</text>
          <g class="sf-lockon" id="sf-lockon">
            <rect class="sf-clip" x="157" y="98" width="32" height="18" rx="4"/>
            <path class="sf-shackle" d="M166 120 v-6 a7 7 0 0 1 14 0 v6"/>
            <rect class="sf-padlock" x="161" y="119" width="24" height="20" rx="4"/>
            <path class="sf-string" d="M173 139 V240"/>
            <g transform="translate(108 240)">
              <rect class="sf-tag" width="130" height="58" rx="7"/>
              <circle class="sf-tag-hole" cx="65" cy="9" r="4"/>
              <text class="sf-tag-t" x="65" y="31" text-anchor="middle">DANGER</text>
              <text class="sf-tag-s" x="65" y="49" text-anchor="middle">DO NOT SWITCH ON</text>
            </g>
          </g>
        </g>

        <g id="sf-chart" class="sf-hit" data-act="chart" role="button" tabindex="0" aria-label="Circuit chart">
          <rect class="sf-board" x="0" y="6" width="130" height="154" rx="10"/>
          <rect class="sf-paper" x="10" y="22" width="110" height="130" rx="3"/>
          <rect class="sf-hl" id="sf-hl" x="13" y="${46 + 3 * 17}" width="104" height="17" rx="3"/>
          <rect class="sf-clipboard-clip" x="43" y="0" width="44" height="18" rx="5"/>
          <text class="sf-chart-h" x="65" y="40" text-anchor="middle">CIRCUIT CHART</text>
          ${CHART.map((c, i) => `<text class="sf-chart-t" x="18" y="${59 + i * 17}">${i + 1}  ${c}</text>`).join('')}
        </g>

        <g id="sf-kit" class="sf-hit" data-act="lock" role="button" tabindex="0" aria-label="Lock-off kit: padlock and danger tag">
          <rect class="sf-peg" x="0" y="0" width="120" height="118" rx="12"/>
          <circle class="sf-peg-hook" cx="40" cy="22" r="4"/><circle class="sf-peg-hook" cx="84" cy="22" r="4"/>
          <g class="sf-kit-items">
            <path class="sf-shackle" d="M30 50 v-12 a10 10 0 0 1 20 0 v12"/>
            <rect class="sf-padlock" x="24" y="48" width="32" height="28" rx="5"/>
            <circle class="sf-keyhole" cx="40" cy="60" r="3"/>
            <path class="sf-string" d="M84 22 V36"/>
            <rect class="sf-tag" x="64" y="36" width="40" height="52" rx="5"/>
            <text class="sf-tag-t" x="84" y="68" text-anchor="middle">!</text>
            <rect class="sf-clip" x="22" y="86" width="36" height="14" rx="3"/>
          </g>
          <text class="sf-cap" x="60" y="138" text-anchor="middle">LOCK-OFF KIT</text>
        </g>

        <g id="sf-socket" class="sf-hit" data-act="socket" role="button" tabindex="0" aria-label="Socket on circuit 4">
          <rect class="sf-socket-glow" x="-8" y="-8" width="156" height="156" rx="20"/>
          <rect class="sf-plate" x="0" y="0" width="140" height="140" rx="14"/>
          <rect class="sf-slot" x="64" y="32" width="12" height="26" rx="2"/>
          <rect class="sf-slot" x="27" y="95" width="24" height="10" rx="2"/>
          <rect class="sf-slot" x="89" y="95" width="24" height="10" rx="2"/>
          <text class="sf-pin" x="70" y="76" text-anchor="middle">E</text>
          <text class="sf-pin" x="39" y="126" text-anchor="middle">N</text>
          <text class="sf-pin" x="101" y="126" text-anchor="middle">L</text>
          <rect class="sf-rocker" x="104" y="16" width="20" height="30" rx="4"/>
          <text class="sf-cap" x="70" y="162" text-anchor="middle">SOCKET · CIRCUIT 4</text>
        </g>

        <g id="sf-prover" class="sf-hit" data-act="prover" role="button" tabindex="0" aria-label="Proving unit, a known voltage source">
          <rect class="sf-prover-glow" x="-6" y="-6" width="142" height="92" rx="16"/>
          <rect class="sf-prover" x="0" y="0" width="130" height="80" rx="12"/>
          <circle class="sf-pad" cx="34" cy="18" r="8"/><circle class="sf-pad" cx="96" cy="18" r="8"/>
          <text class="sf-prover-t" x="65" y="56" text-anchor="middle">PROVING UNIT</text>
          <circle class="sf-prover-led" cx="114" cy="66" r="4"/>
        </g>

        <g id="sf-tools" class="sf-hit" data-act="work" role="button" tabindex="0" aria-label="Tools: start work">
          <path class="sf-driver" d="M112 4 l-26 34"/>
          <rect class="sf-driver-h" x="106" y="-8" width="14" height="30" rx="5" transform="rotate(38 113 7)"/>
          <path class="sf-bag-handle" d="M44 34 q31 -30 62 0"/>
          <rect class="sf-bag" x="0" y="30" width="150" height="60" rx="12"/>
          <text class="sf-bag-t" x="75" y="68" text-anchor="middle">START WORK</text>
        </g>

        <text class="sf-cap" id="sf-tester-cap" text-anchor="middle">TESTER</text>
        <g id="sf-tester-pos" class="sf-tester-pos">
          <g id="sf-tester" class="sf-hit" data-act="tester" role="button" tabindex="0" aria-label="Two-pole voltage indicator">
            <path class="sf-lead" d="M28 16 C 28 -16, 90 -16, 90 40"/>
            <rect class="sf-tester-body" x="2" y="12" width="52" height="106" rx="13"/>
            <rect class="sf-lcd" x="8" y="24" width="40" height="30" rx="4"/>
            <text class="sf-lcd-t" id="sf-lcd" x="28" y="45" text-anchor="middle">- - -</text>
            <circle class="sf-led" id="sf-led" cx="28" cy="72" r="7"/>
            <path class="sf-grip" d="M14 90 h28 M14 98 h28 M14 106 h28"/>
            <rect class="sf-guard" x="16" y="118" width="24" height="6" rx="2"/>
            <rect class="sf-shaft" x="24" y="124" width="8" height="14" rx="2"/>
            <rect class="sf-tip" x="26.5" y="138" width="3" height="12" rx="1"/>
            <rect class="sf-probe2" x="80" y="40" width="20" height="76" rx="8"/>
            <rect class="sf-guard" x="78" y="116" width="24" height="6" rx="2"/>
            <rect class="sf-shaft" x="86" y="122" width="8" height="16" rx="2"/>
            <rect class="sf-tip" x="88.5" y="138" width="3" height="12" rx="1"/>
          </g>
        </g>

        <g id="sf-colleague" class="sf-colleague" aria-hidden="true">
          <g class="sf-col-body">
            <circle class="sf-skin" cx="50" cy="40" r="20"/>
            <path class="sf-hair" d="M30 36 q4 -20 22 -18 q16 2 18 18 q-10 -8 -40 0z"/>
            <path class="sf-vest" d="M14 140 q0 -70 36 -76 q36 6 36 76z"/>
            <path class="sf-vest-band" d="M22 112 h56 M20 124 h60"/>
            <path class="sf-arm" d="M24 84 q-20 -8 -34 -30"/>
          </g>
          <g class="sf-bubble">
            <rect x="56" y="-44" width="180" height="46" rx="14"/>
            <path d="M80 2 l-8 14 20 -14z"/>
            <text x="146" y="-15" text-anchor="middle">Why is this off? On it goes.</text>
          </g>
        </g>
      </svg>
      <div class="sf-chip-status" id="sf-status" aria-live="polite"></div>
      <div class="sf-toast" id="sf-toast" role="status" aria-live="polite"></div>
      <div class="sf-flash" id="sf-flash"></div>
      <div class="sf-modal" id="sf-modal" hidden>
        <div class="sf-modal-card" role="alertdialog" aria-modal="true" aria-labelledby="sf-modal-title" aria-describedby="sf-modal-text">
          <div class="sf-modal-icon" id="sf-modal-icon"></div>
          <h3 id="sf-modal-title"></h3>
          <p id="sf-modal-text"></p>
          <div class="sf-modal-btns" id="sf-modal-btns"></div>
        </div>
      </div>
    </div>

    <!-- -------------------------------- is it notifiable? -------------------------------- -->
    <div class="sf-scene sf-notify" data-s="notify">
      <div class="sf-nt-wrap">
        <div class="sf-nt-dots" id="sf-nt-dots" aria-hidden="true"></div>
        <article class="sf-card" id="sf-card" aria-live="polite"></article>
      </div>
    </div>

    <!-- ------------------------------ law, standard, guidance ------------------------------ -->
    <div class="sf-scene sf-layers" data-s="layers">
      <div class="sf-ly-wrap">
        <div class="sf-pyr" role="group" aria-label="Layers of the rules">
          ${(['law', 'standard', 'guidance'] as LayerId[])
            .map(
              (id) => `<button type="button" class="sf-slab sf-slab-${id}" data-layer="${id}" aria-pressed="false">
                <b>${layers[id].name}</b><small>${layers[id].tag}</small></button>`,
            )
            .join('')}
          <p class="sf-pyr-note">Click a layer</p>
        </div>
        <div class="sf-docs" id="sf-docs" aria-live="polite"></div>
      </div>
    </div>

    <!-- ----------------------------------- golden rules ----------------------------------- -->
    <div class="sf-scene sf-golden" data-s="golden">
      <div class="sf-gr-card">
        <div class="sf-gr-head"><span class="sf-gr-shield" aria-hidden="true">
          <svg viewBox="0 0 48 48"><path d="M24 6l15 6v12c0 9-6 15-15 18-9-3-15-9-15-18V12z"/><path d="M17 24l5 5 9-10"/></svg></span>
          <div><h3>Golden rules</h3><p>Keep this card in your head every time.</p></div></div>
        <ol class="sf-gr-list">${goldenRules.map((r) => `<li><b>${r.head}</b><span>${r.text}</span></li>`).join('')}</ol>
      </div>
    </div>
  </div>`;

  const root = stage.querySelector<HTMLElement>('.sf-root')!;
  const $ = <T extends Element = HTMLElement>(sel: string, el: ParentNode = stage) => el.querySelector<T>(sel)!;
  const svg = $<SVGSVGElement>('#sf-svg');

  const setScene = (s: Scene) => {
    root.dataset.scene = s;
    stage.querySelectorAll<HTMLElement>('.sf-scene').forEach((el) => {
      const on = el.dataset.s === s;
      el.toggleAttribute('inert', !on);
      el.setAttribute('aria-hidden', String(!on));
    });
  };

  /* ---------------------------------- layout ---------------------------------- */
  let L = WIDE;
  let testerAt: 'home' | 'prover' | 'socket' = 'home';
  const testerPos = (): Pt => {
    if (testerAt === 'prover') return [L.prover[0] + PROVER_PAD[0] - 28, L.prover[1] + PROVER_PAD[1] - 150];
    if (testerAt === 'socket') return [L.socket[0] + SOCKET_SLOT[0] - 28, L.socket[1] + SOCKET_SLOT[1] - 150];
    return L.tester;
  };
  const placeTester = () => {
    const [x, y] = testerPos();
    $<SVGGElement>('#sf-tester-pos').style.transform = `translate(${x}px, ${y}px)`;
    $('#sf-tester-cap').classList.toggle('sf-off', testerAt !== 'home');
  };
  const applyLayout = () => {
    const narrow = stage.clientWidth > 0 && stage.clientWidth / Math.max(1, stage.clientHeight) < 1.05;
    L = narrow ? NARROW : WIDE;
    svg.setAttribute('viewBox', `0 0 ${L.vb[0]} ${L.vb[1]}`);
    svg.classList.toggle('sf-narrow', narrow);
    $('#sf-cu').setAttribute('transform', tr(L.cu));
    $('#sf-chart').setAttribute('transform', tr(L.chart));
    $('#sf-kit').setAttribute('transform', tr(L.kit));
    $('#sf-socket').setAttribute('transform', tr(L.socket));
    $('#sf-prover').setAttribute('transform', tr(L.prover));
    $('#sf-tools').setAttribute('transform', tr(L.tools));
    $('#sf-colleague').setAttribute('transform', tr(L.colleague));
    $('#sf-cable').setAttribute('d', L.cable);
    $('#sf-flow').setAttribute('d', L.cable);
    $('#sf-bench').setAttribute('y', String(L.benchY));
    $('#sf-bench-edge').setAttribute('y', String(L.benchY));
    const cap = $('#sf-tester-cap');
    cap.setAttribute('x', String(L.testerCap[0]));
    cap.setAttribute('y', String(L.testerCap[1]));
    const pos = $<SVGGElement>('#sf-tester-pos');
    pos.classList.add('sf-snap');
    placeTester();
    void pos.getBoundingClientRect();
    pos.classList.remove('sf-snap');
  };
  const ro = new ResizeObserver(applyLayout);
  ro.observe(stage);

  /* ======================================= PANEL ======================================= */
  panel.innerHTML = `
    <div class="tabs sf-tabs" role="tablist" aria-label="Chapter 10 sections">
      <button type="button" role="tab" id="sf-tab-isolate" aria-controls="sf-view-isolate" aria-selected="true">Isolate</button>
      <button type="button" role="tab" id="sf-tab-notify" aria-controls="sf-view-notify" aria-selected="false">Notify?</button>
      <button type="button" role="tab" id="sf-tab-rules" aria-controls="sf-view-rules" aria-selected="false">Rules</button>
      <button type="button" role="tab" id="sf-tab-quiz" aria-controls="sf-view-quiz" aria-selected="false">Quiz</button>
    </div>

    <section role="tabpanel" id="sf-view-isolate" aria-labelledby="sf-tab-isolate">
      <div class="detail"><h2>${intro.title}</h2><p>${intro.text}</p></div>
      <div class="challenge" id="sf-ch"></div>
      <div class="wire-label">The steps you have found</div>
      <ol class="sf-steps" id="sf-steps"></ol>

      <div class="sf-free" id="sf-free" hidden>
        <div class="wire-label">Tool: free play with the tester</div>
        <p class="wire-hint">Take the lock off, switch breaker 4 back on, break the tester, and see what each reading would tell you.</p>
        <div class="sf-seg" role="group" aria-label="Tester condition">
          <button type="button" class="ghost" data-tester="ok" aria-pressed="true">Tester working</button>
          <button type="button" class="ghost" data-tester="bad" aria-pressed="false">Tester faulty</button>
        </div>
      </div>

      <details class="sf-list">
        <summary>Use a list instead of the picture</summary>
        <div class="sf-list-body">
          <button type="button" class="ghost" data-act="socket">${steps.test.action}</button>
          <button type="button" class="ghost" data-act="chart">${steps.plan.action}</button>
          <button type="button" class="ghost" data-act="work">${steps.work.action}</button>
          <button type="button" class="ghost" data-act="prover">${steps.prove1.action}</button>
          <button type="button" class="ghost" data-act="lock">${steps.lock.action}</button>
          <div class="sf-brk" role="group" aria-label="Switch a breaker">
            <span>Breaker</span>${CHART.map((_, i) => `<button type="button" class="ghost" data-act="breaker" data-n="${i + 1}" aria-label="Breaker ${i + 1}">${i + 1}</button>`).join('')}
          </div>
        </div>
      </details>

      <div class="wire-actions"><button type="button" class="primary" id="sf-replay">Replay</button></div>
      <div class="uk"><b>The right kit</b>Use a two-pole voltage indicator with GS38-style probes and a proving unit (or a known live source). A neon screwdriver or a non-contact pen is not proof that a circuit is dead.</div>
    </section>

    <section role="tabpanel" id="sf-view-notify" aria-labelledby="sf-tab-notify" hidden>
      <div class="detail">
        <h2>Is this job notifiable?</h2>
        <p>In England, some electrical jobs in a home must be notified to building control. Usually a registered electrician self-certifies the job through a competent person scheme; otherwise it goes through building control directly.</p>
        <p>Decide for each job on the card.</p>
      </div>
      <div class="readouts">
        <div class="readout"><small>Score</small><b id="sf-nt-score">0 / 0</b></div>
        <div class="readout"><small>Jobs left</small><b id="sf-nt-left">${jobs.length}</b></div>
      </div>
      <ul class="wire-results" id="sf-nt-log"></ul>
      <div class="detail"><p>Anyone may legally do electrical work in their own home. But it must meet the standards, be notified where required, and be inspected and tested. In practice that takes real skill and proper test equipment.</p></div>
      <div class="uk"><b>Check before you start</b>These answers follow Approved Document P for England. Wales has its own version, and Scotland and Northern Ireland have their own rules. For anything unusual, check Approved Document P or ask building control.</div>
    </section>

    <section role="tabpanel" id="sf-view-rules" aria-labelledby="sf-tab-rules" hidden>
      <div class="detail">
        <h2>Where the rules come from</h2>
        <p><b>Law</b> says what you must achieve. <b>The standard</b>, BS 7671, says how an installation should be built so that it meets the law. <b>Guidance</b> shows how to do that in practice.</p>
      </div>
      <div class="sf-seg" role="group" aria-label="Choose a layer">
        <button type="button" class="ghost" data-layer="law" aria-pressed="false">Law</button>
        <button type="button" class="ghost" data-layer="standard" aria-pressed="false">Standard</button>
        <button type="button" class="ghost" data-layer="guidance" aria-pressed="false">Guidance</button>
      </div>
      <div class="sf-more" id="sf-more" aria-live="polite"></div>

      <div class="wire-label">Sort it: law, standard or guidance?</div>
      <ul class="sf-sort" id="sf-sort"></ul>

      <div class="wire-actions"><button type="button" class="ghost" id="sf-golden-btn" aria-pressed="false">Show the golden rules card</button></div>
    </section>

    <section role="tabpanel" id="sf-view-quiz" aria-labelledby="sf-tab-quiz" hidden>
      <div class="sf-goal" id="sf-goal"></div>
      <div id="sf-quiz"></div>
    </section>`;

  const p$ = <T extends Element = HTMLElement>(sel: string) => panel.querySelector<T>(sel)!;

  /* ---------------------------------- tabs ---------------------------------- */
  let tab: Tab = 'isolate';
  let rulesScene: Scene = 'layers';
  const sceneFor = (t: Tab): Scene => (t === 'isolate' ? 'isolate' : t === 'notify' ? 'notify' : t === 'rules' ? rulesScene : 'golden');
  const tabIds: Tab[] = ['isolate', 'notify', 'rules', 'quiz'];
  const showTab = (t: Tab) => {
    tab = t;
    for (const k of tabIds) {
      p$(`#sf-tab-${k}`).setAttribute('aria-selected', String(k === t));
      p$(`#sf-tab-${k}`).tabIndex = k === t ? 0 : -1;
      p$<HTMLElement>(`#sf-view-${k}`).hidden = k !== t;
    }
    setScene(sceneFor(t));
  };
  tabIds.forEach((k, i) => {
    const b = p$(`#sf-tab-${k}`);
    b.addEventListener('click', () => showTab(k));
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabIds[(i + (e.key === 'ArrowRight' ? 1 : tabIds.length - 1)) % tabIds.length];
      showTab(next);
      p$(`#sf-tab-${next}`).focus();
    });
  });

  /* ======================================= COMPLETION ======================================= */
  let isoDone = false;
  let quizPassed = false;
  const renderGoal = () => {
    p$('#sf-goal').innerHTML = `
      <div class="wire-label">To finish this chapter</div>
      <ul class="wire-results">
        <li class="${isoDone ? 'ok' : 'warn'}">${isoDone ? 'Done:' : 'To do:'} the safe-isolation challenge</li>
        <li class="${quizPassed ? 'ok' : 'warn'}">${quizPassed ? 'Done:' : 'To do:'} this quiz, 75% or better</li>
      </ul>`;
    if (isoDone && quizPassed) complete();
  };
  mountQuiz(p$('#sf-quiz'), quiz, {
    retryHint: 'Have another go at the workbench and the job cards, then try again.',
    onFinish: (score, total) => {
      if (score / total >= 0.75) quizPassed = true;
      renderGoal();
    },
  });

  /* ======================================= THE CHALLENGE ======================================= */
  let iso: IsoState = startState();
  let mode: 'challenge' | 'free' = 'challenge';
  let free: FreeState = { breakerOn: false, locked: true, testerOk: true };
  let busy = false;
  let lastFocus: HTMLElement | null = null;

  const breakerOn = new Map<number, boolean>(CHART.map((_, i) => [i + 1, true]));
  const drawBreakers = () => {
    stage.querySelectorAll<SVGGElement>('.sf-mcb-g').forEach((g) => {
      const n = Number(g.dataset.n);
      g.classList.toggle('sf-on', breakerOn.get(n)!);
    });
    const live = breakerOn.get(TARGET)!;
    svg.classList.toggle('sf-live', live);
  };
  const showLock = (on: boolean) => {
    $('#sf-lockon').classList.toggle('sf-show', on);
    $('#sf-kit').classList.toggle('sf-used', on);
  };
  const setLcd = (v: number | null | 'idle') => {
    const lcd = $('#sf-lcd');
    const led = $('#sf-led');
    lcd.textContent = v === 'idle' || v === null ? '- - -' : `${v}V`;
    led.classList.toggle('sf-led-live', typeof v === 'number' && v > 0);
    led.classList.toggle('sf-led-dead', v === 0);
  };
  const glow = (id: string) => {
    const el = $(id);
    el.classList.remove('sf-pulse');
    void el.getBoundingClientRect();
    el.classList.add('sf-pulse');
  };

  let toastTimer = 0;
  const toast = (html: string, kind: 'ok' | 'info' | 'bad' = 'info', ms = 3200) => {
    const t = $('#sf-toast');
    t.className = `sf-toast sf-${kind} sf-show`;
    t.innerHTML = html;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => t.classList.remove('sf-show'), ms);
  };
  const flash = () => {
    const f = $('#sf-flash');
    f.classList.remove('sf-go');
    void f.getBoundingClientRect();
    f.classList.add('sf-go');
  };

  const moveTester = async (to: typeof testerAt) => {
    if (testerAt === to) return;
    testerAt = to;
    placeTester();
    await wait(650);
  };

  const ICON_SLIP = `<svg viewBox="0 0 48 48"><path d="M24 6 L44 40 H4 Z"/><path d="M24 19 v10"/><circle cx="24" cy="34" r="1.6"/></svg>`;
  const ICON_DONE = `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18"/><path d="M15 24l6 6 12-13"/></svg>`;
  const STARS = `<div class="sf-stars" aria-hidden="true">${[0, 1, 2].map((i) => `<svg viewBox="0 0 24 24" style="--i:${i}"><path d="M12 2l3 6.6 7 .8-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.8z"/></svg>`).join('')}</div>`;

  const openModal = (kind: 'slip' | 'done', title: string, text: string, buttons: { label: string; primary?: boolean; run: () => void }[], extra = '') => {
    const m = $('#sf-modal');
    lastFocus = document.activeElement as HTMLElement | null;
    m.className = `sf-modal sf-${kind}`;
    $('#sf-modal-icon').innerHTML = (kind === 'slip' ? ICON_SLIP : ICON_DONE) + extra;
    $('#sf-modal-title').textContent = title;
    $('#sf-modal-text').textContent = text;
    const box = $('#sf-modal-btns');
    box.innerHTML = '';
    buttons.forEach((b) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = b.primary ? 'primary' : 'ghost';
      el.textContent = b.label;
      el.addEventListener('click', () => {
        closeModal();
        b.run();
      });
      box.append(el);
    });
    m.hidden = false;
    (box.querySelector('button') as HTMLButtonElement).focus();
  };
  const closeModal = () => {
    $('#sf-modal').hidden = true;
    if (lastFocus && stage.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    else if (lastFocus && panel.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  };
  $('#sf-modal').addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const first = $('#sf-modal-btns').querySelector('button') as HTMLButtonElement | null;
      first?.click();
    }
  });

  const fill = (s: string, n?: number) => (n ? s.replace('{n}', String(n)).replace('{name}', CIRCUITS[n - 1].toLowerCase()) : s);

  const renderPanel = () => {
    const ch = p$('#sf-ch');
    const done = iso.done >= 7;
    ch.classList.toggle('ok', done);
    if (mode === 'free') {
      ch.innerHTML = `<b>${iso.slips === 0 ? 'Clean run.' : 'Safe to work.'}</b> ${iso.slips === 0 ? 'Seven steps, no slips.' : `You got there with ${iso.slips} slip${iso.slips === 1 ? '' : 's'}. Replay for a clean run.`} Now try free play below.`;
    } else {
      ch.innerHTML = `<b>Challenge:</b> make the socket safe to work on. <span class="sf-ch-meta">Step ${Math.min(iso.done + 1, 7)} of 7 · ${iso.slips} slip${iso.slips === 1 ? '' : 's'}</span>`;
    }
    p$('#sf-steps').innerHTML = STEP_IDS.map((id, i) => {
      const s = steps[id];
      return i < iso.done
        ? `<li class="sf-done"><span class="sf-n">${i + 1}</span><div><b>${s.name}</b><small>${s.why}</small></div></li>`
        : `<li class="${i === iso.done && mode === 'challenge' ? 'sf-next' : ''}"><span class="sf-n">${i + 1}</span><div><b>?</b><small>${i === iso.done ? 'What comes next?' : ''}</small></div></li>`;
    }).join('');
    p$<HTMLElement>('#sf-free').hidden = mode !== 'free';
    $('#sf-status').textContent = mode === 'free' ? 'Free play' : `Step ${Math.min(iso.done + 1, 7)} / 7 · ${iso.slips} slip${iso.slips === 1 ? '' : 's'}`;
  };

  const resetScene = () => {
    CHART.forEach((_, i) => breakerOn.set(i + 1, true));
    showLock(false);
    $('#sf-hl').classList.remove('sf-show');
    $('#sf-colleague').classList.remove('sf-show');
    testerAt = 'home';
    placeTester();
    setLcd('idle');
    drawBreakers();
  };

  const replay = () => {
    iso = startState();
    mode = 'challenge';
    free = { breakerOn: false, locked: true, testerOk: true };
    syncTesterBtns();
    resetScene();
    closeModal();
    $('#sf-toast').classList.remove('sf-show');
    renderPanel();
  };

  /** Animate the result of a challenge click. */
  const play = async (out: Outcome) => {
    if (out.type === 'step') {
      const n = STEP_IDS.indexOf(out.step) + 1;
      switch (out.step) {
        case 'plan':
          $('#sf-hl').classList.add('sf-show');
          break;
        case 'isolate':
          breakerOn.set(TARGET, false);
          drawBreakers();
          break;
        case 'lock':
          showLock(true);
          break;
        case 'prove1':
        case 'prove2':
          await moveTester('prover');
          glow('#sf-prover');
          setLcd(230);
          await wait(700);
          break;
        case 'test': {
          await moveTester('socket');
          const pairs = ['L–N', 'L–E', 'N–E'];
          for (let i = 0; i < 3; i++) {
            setLcd(0);
            toast(`<b>Testing</b> ${pairs.slice(0, i + 1).map((p) => `<span class="sf-read">${p} 0 V</span>`).join('')}`, 'info');
            await wait(650);
          }
          break;
        }
        case 'work':
          await moveTester('home');
          setLcd('idle');
          break;
      }
      if (out.step !== 'prove1' && out.step !== 'prove2' && out.step !== 'test' && out.step !== 'work' && testerAt !== 'home') {
        await moveTester('home');
        setLcd('idle');
      }
      toast(`<b>Step ${n} of 7</b> ${steps[out.step].name}`, 'ok');
      if (out.step === 'work') finish();
      return;
    }

    if (out.type === 'info') {
      toast(infos[out.info], 'info');
      return;
    }

    // slips: show what could happen, then explain
    const sl = slips[out.slip];
    switch (out.slip) {
      case 'guess':
      case 'wrongBreaker': {
        const n = out.breaker!;
        breakerOn.set(n, false);
        drawBreakers();
        await wait(500);
        if (out.slip === 'guess' || n !== TARGET) {
          // the socket is still live (or, after a lucky guess, we put it back to make the point)
          await moveTester('socket');
          setLcd(230);
          glow('#sf-socket');
          await wait(800);
        }
        breakerOn.set(n, true);
        drawBreakers();
        break;
      }
      case 'lockOn':
        glow('#sf-cu');
        break;
      case 'proveEarly':
        await moveTester('prover');
        setLcd(230);
        await wait(500);
        break;
      case 'live':
        await moveTester('socket');
        setLcd(230);
        glow('#sf-socket');
        await wait(600);
        break;
      case 'colleague': {
        const c = $('#sf-colleague');
        c.classList.add('sf-show');
        await wait(1300);
        breakerOn.set(TARGET, true);
        drawBreakers();
        glow('#sf-socket');
        await wait(900);
        c.classList.remove('sf-show');
        break;
      }
      case 'falseDead':
        await moveTester('socket');
        setLcd(null);
        $('#sf-lcd').textContent = '? ? ?';
        await wait(900);
        break;
      case 'liveWork':
        glow('#sf-socket');
        break;
      case 'assume':
      case 'noProve2':
        glow('#sf-tester');
        break;
    }
    flash();
    await new Promise<void>((resolve) =>
      openModal('slip', sl.title, fill(sl.text, out.breaker), [
        {
          label: 'Got it',
          primary: true,
          run: () => resolve(),
        },
      ]),
    );
    if (testerAt !== 'home') await moveTester('home');
    setLcd('idle');
  };

  const finish = () => {
    isoDone = true;
    mode = 'free';
    free = { breakerOn: false, locked: true, testerOk: true };
    syncTesterBtns();
    renderPanel();
    renderGoal();
    const clean = iso.slips === 0;
    openModal(
      'done',
      clean ? 'Clean run!' : 'Safe to work',
      clean
        ? 'Seven steps in the right order with no slips. That is safe isolation: identify, isolate, lock, prove, test, prove, work.'
        : `You got there with ${iso.slips} slip${iso.slips === 1 ? '' : 's'}. Each one could have hurt someone. Replay for a clean run.`,
      [
        { label: 'Free play', primary: true, run: () => {} },
        { label: 'Replay', run: replay },
      ],
      clean ? STARS : '',
    );
  };

  /** Free play: the tester and breaker do what they really would. */
  const playFree = async (a: Action | { kind: 'tester' }) => {
    switch (a.kind) {
      case 'breaker':
        if (a.n !== TARGET) return toast(`Breaker ${a.n}: ${CIRCUITS[a.n - 1]}. Not part of this job.`);
        if (free.locked) return toast('It is locked off. Take the lock off first (click the lock-off kit).', 'info');
        free.breakerOn = !free.breakerOn;
        breakerOn.set(TARGET, free.breakerOn);
        drawBreakers();
        return toast(free.breakerOn ? 'Breaker 4 is ON: the socket is live.' : 'Breaker 4 is off.', free.breakerOn ? 'bad' : 'info');
      case 'lock':
        if (free.locked) {
          free.locked = false;
          showLock(false);
          return toast('Lock removed. Now anyone could switch it back on.', 'bad');
        }
        if (free.breakerOn) return toast('Switch breaker 4 off before you lock it.', 'info');
        free.locked = true;
        showLock(true);
        return toast('Locked off and labelled.', 'ok');
      case 'prover': {
        await moveTester('prover');
        const r = proverReading(free);
        setLcd(r);
        if (r) glow('#sf-prover');
        return toast(r ? 'Proving unit: 230 V. The tester works.' : 'Nothing on the proving unit. This tester is faulty: do not trust it.', r ? 'ok' : 'bad', 4200);
      }
      case 'socket': {
        await moveTester('socket');
        const r = socketReading(free);
        setLcd(r);
        if (r === null) {
          return toast(
            free.breakerOn ? '<b>False dead!</b> The tester shows nothing, but the socket is LIVE. This is why you prove the tester.' : 'Nothing on the display. Dead, or a dud tester? Prove it to find out.',
            'bad',
            5000,
          );
        }
        return toast(r > 0 ? `<b>Live: ${r} V.</b> Do not touch.` : 'All three pairs read 0 V.', r > 0 ? 'bad' : 'ok', 4200);
      }
      case 'work':
        await moveTester('home');
        setLcd('idle');
        return toast(free.breakerOn ? '<b>Stop:</b> the circuit is live. Electric shock can kill.' : free.locked ? 'Locked off, proved and tested: safe to work.' : 'It is off, but not locked. Lock it off before you work.', free.breakerOn ? 'bad' : free.locked ? 'ok' : 'info', 4200);
      case 'chart':
        return toast('Circuit 4: sockets downstairs.');
      case 'tester':
        return toast('Click the proving unit or the socket to use the tester.');
    }
  };

  const handle = async (a: Action | { kind: 'tester' }) => {
    if (busy || !$('#sf-modal').hidden) return;
    busy = true;
    try {
      if (mode === 'free') {
        await playFree(a);
      } else if (a.kind === 'tester') {
        toast('Click the proving unit or the socket to use the tester.');
      } else {
        const r = isolationAct(iso, a);
        iso = r.state;
        renderPanel();
        await play(r.outcome);
        // make the picture match the state (after a colleague put it back on, for example)
        if (mode === 'challenge') {
          breakerOn.set(TARGET, targetOn(iso));
          drawBreakers();
          showLock(iso.done >= 3);
          $('#sf-hl').classList.toggle('sf-show', iso.done >= 1);
        }
        renderPanel();
      }
    } finally {
      busy = false;
    }
  };

  const actionFrom = (el: HTMLElement): Action | { kind: 'tester' } | null => {
    const k = el.dataset.act;
    if (!k) return null;
    if (k === 'breaker') return { kind: 'breaker', n: Number(el.dataset.n) };
    return { kind: k } as Action | { kind: 'tester' };
  };
  const bindHits = (scope: ParentNode, sel: string) =>
    scope.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      el.addEventListener('click', () => {
        const a = actionFrom(el);
        if (a) void handle(a);
      });
      if (el.getAttribute('role') === 'button')
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            el.click();
          }
        });
    });
  bindHits(stage, '.sf-hit');
  bindHits(panel, '.sf-list [data-act]');
  p$('#sf-replay').addEventListener('click', replay);

  const syncTesterBtns = () =>
    panel.querySelectorAll<HTMLElement>('[data-tester]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.tester === 'ok') === free.testerOk)));
  panel.querySelectorAll<HTMLElement>('[data-tester]').forEach((b) =>
    b.addEventListener('click', () => {
      free.testerOk = b.dataset.tester === 'ok';
      syncTesterBtns();
      setLcd('idle');
      toast(free.testerOk ? 'Tester working.' : 'Tester faulty: its lead is broken. Try it on the socket and the proving unit.', free.testerOk ? 'ok' : 'bad');
    }),
  );

  /* ======================================= NOTIFIABLE? ======================================= */
  let order: Job[] = [...jobs];
  let ji = 0;
  let right = 0;
  let answered: { job: Job; ok: boolean }[] = [];
  let picked: boolean | null = null;

  const shuffle = <T,>(arr: T[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const card = $('#sf-card');
  const renderNotify = (animate = false) => {
    $('#sf-nt-dots').innerHTML = order
      .map((_, i) => `<i class="${i < answered.length ? (answered[i].ok ? 'ok' : 'bad') : i === ji ? 'now' : ''}"></i>`)
      .join('');
    p$('#sf-nt-score').textContent = `${right} / ${answered.length}`;
    p$('#sf-nt-left').textContent = String(order.length - answered.length);
    p$('#sf-nt-log').innerHTML = answered
      .map((a) => `<li class="${a.ok ? 'ok' : ''}"><b>${a.job.title}:</b> ${a.job.notifiable ? 'notifiable' : 'not notifiable'}. ${a.job.why}${a.job.check ? ' <i>Edge case: check Approved Document P or ask building control.</i>' : ''}</li>`)
      .join('');

    if (ji >= order.length) {
      card.className = 'sf-card sf-summary';
      card.innerHTML = `
        <div class="sf-card-where">All ${order.length} jobs done</div>
        <h3 class="sf-big-score">${right} / ${order.length}</h3>
        <p class="sf-card-why">${right === order.length ? 'Perfect. You know what needs telling building control about.' : 'The rule of thumb: new circuits, consumer units and work in special locations are notifiable. Like-for-like swaps and repairs are not.'}</p>
        <div class="sf-card-btns"><button type="button" class="primary" id="sf-nt-again">Shuffle and play again</button></div>`;
      $('#sf-nt-again').addEventListener('click', () => {
        order = shuffle(jobs);
        ji = 0;
        right = 0;
        answered = [];
        picked = null;
        renderNotify(true);
      });
      return;
    }

    const j = order[ji];
    const done = picked !== null;
    const ok = picked === j.notifiable;
    card.className = `sf-card${animate ? ' sf-enter' : ''}${done ? (ok ? ' sf-right' : ' sf-wrong') : ''}`;
    card.innerHTML = `
      <div class="sf-card-top">
        <svg class="sf-card-icon" viewBox="0 0 96 96" aria-hidden="true">${ICONS[j.icon]}</svg>
        <div><div class="sf-card-where">Job ${ji + 1} of ${order.length} · ${j.where}</div><h3>${j.title}</h3></div>
      </div>
      <div class="sf-card-btns" role="group" aria-label="Is this job notifiable?">
        <button type="button" class="sf-ans sf-ans-yes${done && picked ? ' sf-picked' : ''}" data-ans="1" ${done ? 'disabled' : ''}>Notifiable</button>
        <button type="button" class="sf-ans sf-ans-no${done && !picked ? ' sf-picked' : ''}" data-ans="0" ${done ? 'disabled' : ''}>Not notifiable</button>
      </div>
      ${
        done
          ? `<div class="sf-stamp ${j.notifiable ? 'sf-stamp-yes' : 'sf-stamp-no'}" aria-hidden="true">${j.notifiable ? 'Notifiable' : 'Not notifiable'}</div>
             <p class="sf-card-why"><b>${ok ? 'Right.' : 'Not quite.'}</b> ${j.why}</p>
             ${j.check ? '<p class="sf-card-check">Edge case: check Approved Document P or ask building control.</p>' : ''}
             <div class="sf-card-btns"><button type="button" class="primary" id="sf-nt-next">${ji + 1 < order.length ? 'Next job' : 'See your score'}</button></div>`
          : ''
      }`;
    card.querySelectorAll<HTMLButtonElement>('[data-ans]').forEach((b) =>
      b.addEventListener('click', () => {
        picked = b.dataset.ans === '1';
        const good = picked === j.notifiable;
        if (good) right++;
        answered.push({ job: j, ok: good });
        renderNotify();
        card.querySelector<HTMLButtonElement>('#sf-nt-next')?.focus({ preventScroll: true });
      }),
    );
    card.querySelector('#sf-nt-next')?.addEventListener('click', () => {
      ji++;
      picked = null;
      renderNotify(true);
      card.querySelector<HTMLButtonElement>('[data-ans]')?.focus({ preventScroll: true });
    });
  };

  /* ======================================= RULES ======================================= */
  let layer: LayerId | null = null;
  const renderLayer = () => {
    stage.querySelectorAll<HTMLElement>('.sf-slab').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layer === layer)));
    panel.querySelectorAll<HTMLElement>('.sf-seg [data-layer]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layer === layer)));
    root.querySelector('.sf-pyr')!.classList.toggle('sf-has', !!layer);
    const docs = $('#sf-docs');
    if (!layer) {
      docs.innerHTML = `<div class="sf-docs-empty"><b>Three layers</b><p>The law sits on top. The standard shows how to meet it. Guidance shows how to do the work. Click a layer to open it.</p></div>`;
      p$('#sf-more').innerHTML = '<p class="wire-hint">Click a layer on the picture, or a button above.</p>';
      return;
    }
    const L2 = layers[layer];
    docs.innerHTML = `
      <div class="sf-docs-head sf-c-${layer}"><b>${L2.name}</b><span>${L2.tag}</span></div>
      <p class="sf-docs-sum">${L2.summary}</p>
      <div class="sf-books">${L2.docs.map((d, i) => `<div class="sf-book sf-c-${layer}" style="--i:${i}"><b>${d.title}</b><span>${d.note}</span></div>`).join('')}</div>`;
    p$('#sf-more').innerHTML = `<div class="sf-more-card sf-c-${layer}"><b>${L2.name}: ${L2.tag.toLowerCase()}</b><p>${L2.more}</p></div>`;
  };
  const pickLayer = (id: LayerId) => {
    layer = id;
    if (rulesScene !== 'layers') toggleGolden(false);
    renderLayer();
  };
  root.querySelectorAll<HTMLElement>('.sf-slab').forEach((b) => b.addEventListener('click', () => pickLayer(b.dataset.layer as LayerId)));
  panel.querySelectorAll<HTMLElement>('.sf-seg [data-layer]').forEach((b) => b.addEventListener('click', () => pickLayer(b.dataset.layer as LayerId)));

  const toggleGolden = (on: boolean) => {
    rulesScene = on ? 'golden' : 'layers';
    const b = p$('#sf-golden-btn');
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? 'Back to the layers' : 'Show the golden rules card';
    if (tab === 'rules') setScene(rulesScene);
  };
  p$('#sf-golden-btn').addEventListener('click', () => toggleGolden(rulesScene !== 'golden'));

  // sorter
  const sortAns: (LayerId | null)[] = sortItems.map(() => null);
  const renderSort = () => {
    p$('#sf-sort').innerHTML = sortItems
      .map((it, i) => {
        const a = sortAns[i];
        const st = a === null ? '' : a === it.layer ? 'ok' : 'bad';
        return `<li class="${st}">
          <div class="sf-sort-name">${it.name}</div>
          <div class="sf-sort-btns" role="group" aria-label="${it.name}">
            ${(['law', 'standard', 'guidance'] as LayerId[])
              .map((l) => `<button type="button" class="sf-c-${l}${a === l ? ' sf-picked' : ''}" data-i="${i}" data-l="${l}" aria-pressed="${a === l}">${layers[l].name}</button>`)
              .join('')}
          </div>
          ${a === null ? '' : `<small>${a === it.layer ? 'Right.' : `It is ${layers[it.layer].name.toLowerCase()}.`} ${it.why}</small>`}
        </li>`;
      })
      .join('');
  };
  p$('#sf-sort').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
    if (!b) return;
    const i = Number(b.dataset.i);
    sortAns[i] = b.dataset.l as LayerId;
    renderSort();
    p$<HTMLElement>(`#sf-sort [data-i="${i}"][data-l="${b.dataset.l}"]`).focus();
  });

  /* ======================================= START ======================================= */
  resetScene();
  renderPanel();
  renderGoal();
  renderNotify();
  renderLayer();
  renderSort();
  showTab('isolate');

  return {
    activate() {
      root.classList.add('sf-active');
      applyLayout();
    },
    deactivate() {
      root.classList.remove('sf-active');
      clearTimeout(toastTimer);
    },
  };
};
