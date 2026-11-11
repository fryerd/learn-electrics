import './consumer-unit.css';
import {
  BUILD_RATINGS,
  buildIntro,
  circuits,
  curveIntro,
  curvePresets,
  exploreGoals,
  intro,
  partOrder,
  parts,
  quiz,
  rcdGame,
  rcdIntro,
  rcdTypeInfo,
  RCD_ORDER,
  type GoalId,
  type PartId,
  type Protection,
  type RcdType,
} from '../data/consumer-unit-lesson';
import { mountGuide, pulse } from '../ui/guide';
import { mountQuiz } from '../ui/quiz';
import { applyState, boardMarkup, liveMap, type BoardDev } from './consumer-unit-board';
import {
  checkWay,
  fmtTime,
  mToSlider,
  rcdSuits,
  runRcdTest,
  sliderToM,
  TEST_INFO,
  tripAt,
  type Curve,
  type RcdHealth,
  type RcdReading,
  type RcdTest,
  type Verdict,
} from './consumer-unit-sim';
import { chartMarkup, chartX, chartY, CHART_BOUNDS, DIAL_ANGLE, scaleMarkup, selectivityMarkup, testerMarkup } from './consumer-unit-tools';
import type { ChapterMount } from './types';

type Tab = 'explore' | 'build' | 'curves' | 'rcds' | 'quiz';
const TABS: { id: Tab; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'build', label: 'Build' },
  { id: 'curves', label: 'Curves' },
  { id: 'rcds', label: 'RCDs' },
  { id: 'quiz', label: 'Quiz' },
];

/** The board on the Explore tab: a main switch, one RCD sharing three MCBs, and three RCBOs. */
const EXPLORE: BoardDev[] = [
  { id: 'main', kind: 'main', modules: 2, label: '100 A' },
  { id: 'rcd1', kind: 'rcd', modules: 2, label: '30 mA', sub: 'A', gapBefore: true },
  { id: 'm1', kind: 'mcb', modules: 1, label: 'B32', feed: 'rcd1', circuit: ['Ring', 'down'] },
  { id: 'm2', kind: 'mcb', modules: 1, label: 'B32', feed: 'rcd1', circuit: ['Ring', 'up'] },
  { id: 'm3', kind: 'mcb', modules: 1, label: 'B6', feed: 'rcd1', circuit: ['Lights', ''] },
  { id: 'r1', kind: 'rcbo', modules: 1, label: 'B32', sub: '30mA A', circuit: ['Kitchen', ''], gapBefore: true },
  { id: 'r2', kind: 'rcbo', modules: 1, label: 'B45', sub: '30mA A', circuit: ['Shower', ''] },
  { id: 'r3', kind: 'rcbo', modules: 1, label: 'B32', sub: '30mA A', circuit: ['Cooker', ''] },
];
const allOn = (devs: BoardDev[]) => Object.fromEntries(devs.map((d) => [d.id, true]));
const circuitName = (d: BoardDev) => (d.circuit ?? []).join(' ').trim().toLowerCase();
const WAYS = 8;

const icon: Record<Verdict | 'empty', string> = { ok: '✓', warn: '!', bad: '✕', pending: '…', empty: '' };

/** Chapter 4: the consumer unit. */
export const mount: ChapterMount = ({ stage, panel, complete }) => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let tab: Tab = 'explore';
  const timers = new Set<number>();
  const later = (fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      timers.delete(t);
      fn();
    }, reduced ? 0 : ms);
    timers.add(t);
    return t;
  };
  const clearTimers = () => {
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
  };

  /* ------------------------------------------------------------- the stage */
  stage.innerHTML = `
    <div class="cu-stage">
      <div class="cu-scene" id="cu-scene-board">
        <svg class="cu-svg" id="cu-board" viewBox="0 0 660 500" role="group" aria-label="A consumer unit. Switches and parts can be pressed."></svg>
        <div class="cu-toolbar" id="cu-tb-explore">
          <button type="button" id="cu-cover-btn" aria-pressed="false">Take cover off</button>
          <button type="button" id="cu-reset-btn">All on</button>
        </div>
        <div class="cu-toolbar" id="cu-tb-build" hidden>
          <button type="button" class="cu-tb-primary" id="cu-power-btn" disabled>Power up</button>
          <button type="button" id="cu-clear-btn">Clear</button>
        </div>
        <div class="cu-toast" id="cu-toast" aria-live="polite"></div>
        <div class="cu-pop" id="cu-pop" role="dialog" aria-label="About this part" hidden></div>
        <div class="cu-editor" id="cu-editor" hidden></div>
        <div class="cu-buildui" id="cu-buildui" hidden>
          <div class="cu-tray">
            <div class="challenge cu-bstatus" id="cu-build-status" aria-live="polite"></div>
            <div class="cu-cards" id="cu-cards">${circuits
              .map(
                (c) => `<button type="button" class="cu-card" data-card="${c.id}" aria-pressed="false" title="${c.detail}"><b>${c.name}</b><i class="cu-card-way" aria-hidden="true"></i></button>`,
              )
              .join('')}</div>
            <div class="cu-quick" id="cu-quick" hidden></div>
          </div>
        </div>
      </div>
      <div class="cu-scene" id="cu-scene-curve" hidden>
        <svg class="cu-svg" id="cu-chart" viewBox="0 0 660 500" role="img" aria-label="Time-current chart for the chosen breaker."></svg>
      </div>
      <div class="cu-scene" id="cu-scene-tester" hidden>
        <svg class="cu-svg" id="cu-tester" viewBox="0 0 660 500" role="img" aria-label="An RCD tester plugged into a socket on a circuit protected by a 30 mA RCD.">${testerMarkup()}</svg>
      </div>
    </div>`;
  const $s = <T extends Element>(sel: string) => stage.querySelector<T>(sel)!;
  const board = $s<SVGSVGElement>('#cu-board');
  const toast = $s<HTMLElement>('#cu-toast');

  /* ------------------------------------------------------------- the panel */
  panel.innerHTML = `
    <div class="tabs cu-tabs" role="tablist" aria-label="Consumer unit activities">
      ${TABS.map((t, i) => `<button type="button" role="tab" id="cu-tab-${t.id}" aria-controls="cu-view-${t.id}" aria-selected="${i === 0}">${t.label}</button>`).join('')}
    </div>

    <section role="tabpanel" id="cu-view-explore" aria-labelledby="cu-tab-explore">
      <div class="detail"><h2>${intro.title}</h2><p>${intro.text}</p></div>
      <div class="wire-label">Try this</div>
      <ul class="cu-goals" id="cu-goals">${exploreGoals.map((g) => `<li data-goal="${g.id}"><span class="cu-tick" aria-hidden="true"></span>${g.text}</li>`).join('')}</ul>
      <div class="cu-say" id="cu-say" aria-live="polite"></div>
      <div class="cu-info detail" id="cu-info"></div>
      <div class="wire-label">Parts</div>
      <div class="parts-list cu-parts">${partOrder.map((id) => `<button type="button" data-partbtn="${id}">${parts[id].title.replace(/ \(.*\)/, '')}</button>`).join('')}</div>
    </section>

    <section role="tabpanel" id="cu-view-build" aria-labelledby="cu-tab-build" hidden>
      <div class="detail"><h2>${buildIntro.title}</h2><p>You build the board right on the picture: drag circuits onto the ways, choose each breaker, then power it up. The guide on the board takes you through it.</p></div>
      <div class="wire-actions"><button type="button" class="primary" id="cu-go-build">Back to the build steps</button></div>
      <div class="uk"><b>UK standards</b>A breaker is chosen to protect the circuit’s cable: at least the load current, and no more than the cable can safely carry. You will size cables properly in the next chapter.</div>
    </section>

    <section role="tabpanel" id="cu-view-curves" aria-labelledby="cu-tab-curves" hidden>
      <div class="detail"><h2>${curveIntro.title}</h2><p>${curveIntro.text}</p></div>
      <div class="wire-label">Breaker</div>
      <div class="cu-seg" role="group" aria-label="Curve type">
        <button type="button" class="ghost" data-curve="B" aria-pressed="true">Type B</button>
        <button type="button" class="ghost" data-curve="C" aria-pressed="false">Type C</button>
      </div>
      <div class="cu-rates" role="group" aria-label="Rating">${BUILD_RATINGS.map((r) => `<button type="button" class="ghost" data-rate="${r}" aria-pressed="${r === 32}">${r} A</button>`).join('')}</div>
      <div class="slider-card">
        <label for="cu-m">Current <b id="cu-m-out"></b></label>
        <input type="range" id="cu-m" min="0" max="1000" step="1" />
      </div>
      <div class="presets">${curvePresets.map((p) => `<button type="button" class="ghost" data-mpreset="${p.id}">${p.label}</button>`).join('')}</div>
      <div class="readouts">
        <div class="readout"><small>Current</small><b id="cu-amps"></b></div>
        <div class="readout"><small>Trips in</small><b id="cu-ttrip"></b></div>
      </div>
      <p class="cu-verdict" id="cu-verdict" aria-live="polite"></p>
      <div class="challenge" id="cu-curve-ch"></div>
      <div class="uk"><b>UK standards</b>Breakers to BS EN 60898 trip instantly at 3–5 × In (type B), 5–10 × In (type C) or 10–20 × In (type D). Homes nearly always use type B. Do not mix these letters up with RCD types AC, A, F and B. The chart is simplified: a real breaker’s maker publishes its exact curve.</div>
    </section>

    <section role="tabpanel" id="cu-view-rcds" aria-labelledby="cu-tab-rcds" hidden>
      <div class="detail"><h2>${rcdIntro.title}</h2><p>${rcdIntro.text}</p></div>
      <div class="wire-label">RCD under test</div>
      <div class="cu-seg" role="group" aria-label="RCD condition">
        <button type="button" class="ghost" data-health="healthy" aria-pressed="true">Healthy</button>
        <button type="button" class="ghost" data-health="sluggish" aria-pressed="false">Sluggish</button>
        <button type="button" class="ghost" data-health="sensitive" aria-pressed="false">Touchy</button>
      </div>
      <div class="wire-label cu-mt">Run a test</div>
      <div class="cu-tests" role="group" aria-label="Tests">
        ${(['ramp', 'half', 'x1', 'x5'] as RcdTest[]).map((t) => `<button type="button" class="ghost" data-test-run="${t}"><b>${TEST_INFO[t].label}</b><small>${TEST_INFO[t].current}</small></button>`).join('')}
      </div>
      <table class="cu-results"><thead><tr><th>Test</th><th>Limit</th><th>Reading</th><th></th></tr></thead><tbody id="cu-results"></tbody></table>
      <p class="cu-verdict" id="cu-rcd-say" aria-live="polite">Choose a test. Each one leaks a set current to earth through the RCD.</p>
      <div class="challenge" id="cu-rcd-ch"></div>

      <div class="wire-label cu-mt">Match the appliance to the RCD type</div>
      <ul class="cu-types">${RCD_ORDER.map((t) => `<li><b>${t}</b> ${rcdTypeInfo[t]}</li>`).join('')}</ul>
      <div class="cu-game" id="cu-game">${rcdGame
        .map(
          (g) => `<div class="cu-game-row" data-game="${g.id}"><div class="cu-game-name">${g.name}</div><div class="cu-game-opts" role="group" aria-label="RCD type for ${g.name}">${RCD_ORDER.map((t) => `<button type="button" data-pick="${t}">${t}</button>`).join('')}</div><p class="cu-game-fb" aria-live="polite"></p></div>`,
        )
        .join('')}</div>
      <p class="cu-score" id="cu-game-score"></p>

      <div class="wire-label cu-mt">Selectivity: why S-type?</div>
      <p class="cu-p">Some installations have an RCD at the origin as well as 30 mA RCDs on the circuits. When a circuit leaks, you want only its own RCD to trip. Choose the upstream RCD, then make an earth fault.</p>
      <div class="cu-seg" role="group" aria-label="Upstream RCD">
        <button type="button" class="ghost" data-up="general" aria-pressed="true">100 mA general</button>
        <button type="button" class="ghost" data-up="s" aria-pressed="false">100 mA S-type</button>
      </div>
      <div class="cu-sel">${selectivityMarkup()}</div>
      <div class="wire-actions"><button type="button" class="primary" id="cu-sel-go">Make an earth fault</button><button type="button" class="ghost" id="cu-sel-reset">Reset</button></div>
      <p class="cu-verdict" id="cu-sel-say" aria-live="polite"></p>
      <div class="uk"><b>UK standards</b>At 30 mA, an RCD must trip within 300 ms. The 5 × (40 ms) and ½ × (no trip) checks come from the RCD product standards, and many electricians still record them.</div>
    </section>

    <section role="tabpanel" id="cu-view-quiz" aria-labelledby="cu-tab-quiz" hidden></section>`;
  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!;

  /* ------------------------------------------------------------ the board */
  let cover = true;
  let exOn = allOn(EXPLORE);
  let selPart: PartId | null = null;
  const goals = new Set<GoalId>();

  // build state
  const ways: (string | null)[] = Array(WAYS).fill(null);
  const settings: Record<string, { rating: number | null; prot: Protection | null }> = Object.fromEntries(circuits.map((c) => [c.id, { rating: null, prot: null }]));
  let selCard: string | null = null;
  let selWay: number | null = null;
  let powered = false;
  let buildOn: Record<string, boolean> = {};

  const spec = (id: string) => circuits.find((c) => c.id === id)!;
  const wayCheck = (i: number) => {
    const c = ways[i];
    return c ? checkWay(spec(c), settings[c].rating, settings[c].prot) : null;
  };

  const buildDevs = (): BoardDev[] => [
    { id: 'main', kind: 'main', modules: 2, label: '100 A' },
    ...ways.map((c, i): BoardDev => {
      if (!c) return { id: `w${i}`, kind: 'slot', modules: 1, way: i, slotState: 'empty', gapBefore: i === 0, circuit: ['', ''] };
      const s = settings[c];
      const ch = wayCheck(i)!;
      return {
        id: `w${i}`,
        kind: 'slot',
        modules: 1,
        way: i,
        gapBefore: i === 0,
        fitted: s.prot === 'none' ? 'mcb' : 'rcbo',
        label: s.rating ? `B${s.rating}` : '?',
        sub: s.prot === null ? '' : s.prot === 'none' ? 'no RCD' : `30mA ${s.prot}`,
        circuit: spec(c).label,
        slotState: ch.state,
      };
    }),
  ];

  const devsNow = () => (tab === 'build' ? buildDevs() : EXPLORE);
  const onNow = () => (tab === 'build' ? buildOn : exOn);

  const renderBoard = () => {
    const devs = devsNow();
    board.innerHTML = boardMarkup(devs, { coverLabel: 'Consumer unit' });
    board.classList.toggle('cu-cover-off', tab === 'build' || !cover);
    board.classList.toggle('cu-building', tab === 'build');
    applyState(board, devs, onNow());
    syncDark();
    markSelection();
  };
  // Main switch off = the lights go out: the stage background goes dark.
  const syncDark = () => {
    const dark = tab === 'explore' ? !exOn.main : tab === 'build' ? powered && buildOn.main === false : false;
    $s('.cu-stage').classList.toggle('cu-dark', dark);
  };
  const refreshState = () => {
    applyState(board, devsNow(), onNow());
    syncDark();
  };

  const markSelection = () => {
    board.querySelectorAll('.cu-sel').forEach((e) => e.classList.remove('cu-sel'));
    if (tab === 'build') {
      if (selWay !== null) board.querySelector(`[data-way="${selWay}"]`)?.classList.add('cu-sel');
      return;
    }
    if (!selPart) return;
    const kindMatch = ['main', 'rcd', 'mcb', 'rcbo'].includes(selPart);
    board.querySelectorAll(kindMatch ? `.cu-dev[data-part="${selPart}"]` : `[data-part="${selPart}"]`).forEach((e) => e.classList.add('cu-sel'));
    if (selPart === 'test') board.querySelectorAll('.cu-tbtn').forEach((e) => e.classList.add('cu-sel'));
  };

  let toastTimer = 0;
  const showToast = (msg: string, ms = 3200) => {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-on'), ms);
  };

  // A part's explanation pops up beside the part on the stage, instead of sitting in the side panel.
  const pop = $s<HTMLElement>('#cu-pop');
  const sceneEl = $s<HTMLElement>('#cu-scene-board');
  const hidePop = () => {
    pop.hidden = true;
  };
  const placePop = (anchor: Element | null) => {
    const sr = sceneEl.getBoundingClientRect();
    const ar = anchor?.getBoundingClientRect();
    pop.style.maxHeight = `${Math.max(180, sr.height - 24)}px`;
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    let x = ar ? ar.left + ar.width / 2 - sr.left - w / 2 : 14;
    let y = ar ? (ar.bottom - sr.top + 12 + h <= sr.height - 8 ? ar.bottom - sr.top + 12 : ar.top - sr.top - 12 - h) : sr.height - h - 14;
    x = Math.max(10, Math.min(sr.width - w - 10, x));
    y = Math.max(10, Math.min(sr.height - h - 10, y));
    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;
  };

  /* ---------------------------------------------------------- explore tab */
  const say = $('#cu-say');
  const info = $('#cu-info');

  const partEl = (id: PartId) =>
    board.querySelector(['main', 'rcd', 'mcb', 'rcbo'].includes(id) ? `.cu-dev[data-part="${id}"]` : `[data-part="${id}"]`);
  const showPart = (id: PartId, anchor?: Element | null) => {
    selPart = id;
    const p = parts[id];
    const html = `<h2>${p.title}</h2><p>${p.text}</p><ul>${p.points.map((x) => `<li>${x}</li>`).join('')}</ul>${p.uk ? `<div class="uk"><b>UK standards</b>${p.uk}</div>` : ''}`;
    info.innerHTML = html;
    pop.innerHTML = `<button type="button" class="cu-pop-x" aria-label="Close" id="cu-pop-x">×</button>${html}`;
    pop.hidden = false;
    pop.classList.remove('cu-pop-in');
    void pop.offsetWidth;
    pop.classList.add('cu-pop-in');
    placePop(anchor ?? partEl(id));
    $s('#cu-pop-x').addEventListener('click', hidePop);
    panel.querySelectorAll<HTMLElement>('[data-partbtn]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.partbtn === id)));
    if (id === 'busbar') tick('busbar');
    if (tab === 'explore') markSelection();
  };

  const tick = (g: GoalId) => {
    if (goals.has(g)) return;
    goals.add(g);
    const li = panel.querySelector(`[data-goal="${g}"]`);
    li?.classList.add('done');
  };

  const deadCircuits = () => {
    const live = liveMap(EXPLORE, exOn);
    return EXPLORE.filter((d) => d.circuit && !live[d.id]);
  };

  const explain = (dev: BoardDev, nowOn: boolean, viaTest = false) => {
    const live = liveMap(EXPLORE, exOn);
    const dead = deadCircuits().map(circuitName);
    let msg: string;
    if (dev.kind === 'main') {
      msg = nowOn
        ? 'Main switch on: the busbar is live again and every circuit whose own switch is on has power.'
        : 'Main switch off: the busbars are dead, so every circuit is off. The meter tails coming in are still live, though: only the supplier can switch those off.';
    } else if (dev.kind === 'rcd') {
      const fed = EXPLORE.filter((d) => d.feed === dev.id).map(circuitName);
      msg = nowOn
        ? live[dev.id]
          ? `RCD back on. Its circuits (${fed.join(', ')}) have power again.`
          : 'The RCD is on, but the main switch is off, so nothing reaches it.'
        : `${viaTest ? 'The test button tripped the RCD' : 'The RCD is off'}: ${fed.join(', ')} all went dark together, because they share it. The RCBO circuits stayed on.`;
    } else if (!nowOn) {
      msg =
        dev.kind === 'rcbo'
          ? `${viaTest ? 'The test button tripped this RCBO' : 'RCBO off'}: only the ${circuitName(dev)} circuit lost power. The rest of the house stays on. That is the point of an RCBO.`
          : `Only the ${circuitName(dev)} circuit is off. An MCB switches just its own circuit.`;
    } else {
      msg = live[dev.id] ? `The ${circuitName(dev)} circuit is back on.` : `Switched on, but no power reaches it: the device feeding it is off.`;
    }
    if (dead.length && !msg.includes('every circuit')) msg += ` Off now: ${dead.join(', ')}.`;
    say.textContent = msg;
    say.classList.add('is-on');
    hidePop();
    showToast(msg, 7000);
  };

  const toggleExplore = (id: string, viaTest = false) => {
    const dev = EXPLORE.find((d) => d.id === id)!;
    const nowOn = viaTest ? false : !exOn[id];
    if (viaTest && !exOn[id]) {
      say.textContent = 'It is already off. Switch it back on first, then press T.';
      say.classList.add('is-on');
      showToast(say.textContent, 5000);
      return;
    }
    exOn = { ...exOn, [id]: nowOn };
    refreshState();
    explain(dev, nowOn, viaTest);
    if (dev.kind === 'main' && !nowOn) tick('main');
    if (dev.kind === 'rcbo' && !nowOn) tick('rcbo');
    if (dev.kind === 'rcd' && viaTest) tick('rcdtest');
  };

  const setCover = (on: boolean, byGuide = false) => {
    cover = on;
    board.classList.toggle('cu-cover-off', !on);
    const b = $s<HTMLButtonElement>('#cu-cover-btn');
    b.textContent = on ? 'Take cover off' : 'Put cover on';
    b.setAttribute('aria-pressed', String(!on));
    if (!on && !byGuide) tick('cover');
  };
  $s('#cu-cover-btn').addEventListener('click', () => setCover(!cover));
  $s('#cu-reset-btn').addEventListener('click', () => {
    exOn = allOn(EXPLORE);
    refreshState();
    say.textContent = 'Everything is back on.';
    showToast('Everything is back on.');
  });
  panel.querySelectorAll<HTMLElement>('[data-partbtn]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.partbtn as PartId;
      if (cover && !['main', 'rcd', 'mcb', 'rcbo', 'test', 'cover'].includes(id)) setCover(false);
      showPart(id);
    }),
  );

  /* ------------------------------------------------------- board clicks */
  const activateBoard = (target: Element) => {
    const lever = target.closest<SVGElement>('[data-lever]');
    const test = target.closest<SVGElement>('[data-test]');
    const way = target.closest<SVGElement>('[data-way]');
    if (tab === 'build') {
      if (powered && (lever || test)) {
        const id = (lever ?? test)!.dataset[lever ? 'lever' : 'test']!;
        buildOn = { ...buildOn, [id]: test ? false : !buildOn[id] };
        refreshState();
        return;
      }
      if (way) onWayPress(Number(way.dataset.way));
      return;
    }
    if (test) {
      toggleExplore(test.dataset.test!, true);
      return;
    }
    if (lever) {
      toggleExplore(lever.dataset.lever!);
      return;
    }
    const part = target.closest<SVGElement>('[data-part]');
    if (!part) hidePop();
    if (part) {
      const id = part.dataset.part as PartId;
      if (id === 'cover' && !cover) return;
      if (id === 'cover') {
        setCover(false); // clicking the lid lifts it off
        hidePop();
        return;
      }
      showPart(id, part);
    }
  };
  board.addEventListener('click', (e) => {
    if (suppressClick) return;
    activateBoard(e.target as Element);
  });
  board.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const t = e.target as Element;
    if (!t.matches('[role="button"]')) return;
    e.preventDefault();
    activateBoard(t);
  });

  /* ------------------------------------------------------------ build tab */
  const cardsEl = $s<HTMLElement>('#cu-cards');
  const quick = $s<HTMLElement>('#cu-quick');
  const editor = $s<HTMLElement>('#cu-editor');
  const status = $s<HTMLElement>('#cu-build-status');
  const powerBtn = $s<HTMLButtonElement>('#cu-power-btn');

  const allRight = () => ways.every((c, i) => c && ['ok', 'warn'].includes(wayCheck(i)!.state));

  const unpower = () => {
    if (!powered) return;
    clearTimers();
    powered = false;
    buildOn = {};
  };

  const renderBuildPanel = () => {
    // cards
    cardsEl.querySelectorAll<HTMLElement>('[data-card]').forEach((b) => {
      const id = b.dataset.card!;
      const w = ways.indexOf(id);
      b.setAttribute('aria-pressed', String(selCard === id));
      b.classList.toggle('is-placed', w >= 0);
      const st = w >= 0 ? wayCheck(w)!.state : null;
      b.dataset.state = st ?? '';
      b.querySelector('.cu-card-way')!.textContent = w >= 0 ? `Way ${w + 1} ${icon[st!]}` : '';
    });
    // quick place
    quick.hidden = !selCard;
    if (selCard) {
      quick.innerHTML = `<span>Put <b>${spec(selCard).name}</b> in way:</span>${ways.map((c, i) => `<button type="button" class="ghost" data-qway="${i}" aria-label="Way ${i + 1}${c ? `, now ${spec(c).name}` : ', empty'}">${i + 1}</button>`).join('')}`;
    }
    // editor
    const c = selWay !== null ? ways[selWay] : null;
    if (selWay === null || !c) {
      editor.innerHTML = `<p class="cu-hint">${ways.some(Boolean) ? 'Tap a filled way on the board to set its breaker.' : 'Drag a circuit card onto the board, or tap a card and then a way.'}</p>`;
    } else {
      const s = settings[c];
      const ch = wayCheck(selWay)!;
      const sp = spec(c);
      const prots: Protection[] = ['none', 'AC', 'A', 'F', 'B'];
      editor.innerHTML = `
        <div class="cu-ed-head"><span class="cu-ed-way">Way ${selWay + 1}</span><b>${sp.name}</b><small>${sp.detail}</small></div>
        <div class="wire-label">Breaker size (type B)</div>
        <div class="cu-rates" role="group" aria-label="Breaker size">${BUILD_RATINGS.map((r) => `<button type="button" class="ghost" data-brate="${r}" aria-pressed="${s.rating === r}">${r} A</button>`).join('')}</div>
        <div class="wire-label cu-mt">RCD protection (30 mA)</div>
        <div class="cu-rates" role="group" aria-label="RCD protection">${prots.map((p) => `<button type="button" class="ghost" data-bprot="${p}" aria-pressed="${s.prot === p}">${p === 'none' ? 'No RCD' : `Type ${p}`}</button>`).join('')}</div>
        <ul class="wire-results cu-fb" aria-live="polite">
          ${s.rating !== null ? `<li class="${ch.rating.state}">${ch.rating.msg}</li>` : ''}
          ${s.prot !== null ? `<li class="${ch.rcd.state}">${ch.rcd.msg}</li>` : ''}
        </ul>
        <div class="wire-actions"><button type="button" class="ghost" id="cu-unplace">Take it out</button></div>`;
    }
    // status
    const placed = ways.filter(Boolean).length;
    const good = ways.filter((c2, i) => c2 && ['ok', 'warn'].includes(wayCheck(i)!.state)).length;
    const bad = ways.filter((c2, i) => c2 && wayCheck(i)!.state === 'bad').length;
    const ready = allRight();
    status.classList.toggle('ok', ready);
    status.innerHTML = powered
      ? '<b>It works.</b> Every circuit is live and properly protected. Flip a few switches on the board, or press an RCBO’s T button: only that circuit goes off.'
      : ready
        ? '<b>All eight are right.</b> Press <b>Power up</b> on the board.'
        : `<b>Challenge:</b> ${placed} of 8 placed, ${good} right${bad ? `, ${bad} need a rethink` : ''}.`;
    powerBtn.disabled = !ready || powered;
    placeEditor();
  };

  // The breaker chooser floats just under the way being set, so the ways stay in view.
  function placeEditor() {
    const way = selWay !== null && ways[selWay] ? board.querySelector(`[data-way="${selWay}"]`) : null;
    editor.hidden = !way || tab !== 'build';
    if (editor.hidden || !way) return;
    const sr = sceneEl.getBoundingClientRect();
    const wr = way.getBoundingClientRect();
    const w = editor.offsetWidth;
    const h = editor.offsetHeight;
    const floor = sr.height - 150; // keep clear of the tray
    let y = wr.bottom - sr.top + 10;
    if (y + h > floor) y = Math.max(10, wr.top - sr.top - 10 - h);
    const x = Math.max(10, Math.min(sr.width - w - 10, wr.left + wr.width / 2 - sr.left - w / 2));
    editor.style.left = `${x}px`;
    editor.style.top = `${y}px`;
  }

  const renderBuild = () => {
    renderBoard();
    renderBuildPanel();
  };

  const place = (card: string, way: number) => {
    unpower();
    const from = ways.indexOf(card);
    const there = ways[way];
    if (from >= 0) ways[from] = there && there !== card ? there : null;
    else if (there) ways[way] = null;
    ways[way] = card;
    selCard = null;
    selWay = way;
    renderBuild();
    const ch = wayCheck(way)!;
    showToast(`${spec(card).name} in way ${way + 1}. ${ch.state === 'pending' ? 'Now choose its breaker and RCD.' : ''}`);
  };

  const onWayPress = (i: number) => {
    if (selCard) {
      place(selCard, i);
      return;
    }
    selWay = ways[i] ? i : null;
    renderBuild();
    if (!ways[i]) showToast('That way is empty. Pick a circuit card first.');
  };

  cardsEl.addEventListener('click', (e) => {
    if (suppressClick) return;
    const b = (e.target as Element).closest<HTMLElement>('[data-card]');
    if (!b) return;
    const id = b.dataset.card!;
    selCard = selCard === id ? null : id;
    const w = ways.indexOf(id);
    if (w >= 0) selWay = w;
    renderBuildPanel();
    markSelection();
  });
  quick.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-qway]');
    if (b && selCard) place(selCard, Number(b.dataset.qway));
  });
  editor.addEventListener('click', (e) => {
    const t = e.target as Element;
    const c = selWay !== null ? ways[selWay] : null;
    if (!c) return;
    const r = t.closest<HTMLElement>('[data-brate]');
    const p = t.closest<HTMLElement>('[data-bprot]');
    if (r) settings[c].rating = Number(r.dataset.brate);
    else if (p) settings[c].prot = p.dataset.bprot as Protection;
    else if (t.closest('#cu-unplace')) {
      ways[selWay!] = null;
      selWay = null;
    } else return;
    unpower();
    renderBuild();
    // keep keyboard focus on the same button after the re-render
    const sel = r ? `[data-brate="${r.dataset.brate}"]` : p ? `[data-bprot="${p.dataset.bprot}"]` : null;
    if (sel) editor.querySelector<HTMLElement>(sel)?.focus();
  });

  // dragging cards onto the board
  let drag: { id: string; x: number; y: number; ghost?: HTMLElement; pid: number } | null = null;
  let suppressClick = false;
  const wayAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y);
    const w = el?.closest<SVGElement>('[data-way]');
    return w ? Number(w.dataset.way) : null;
  };
  cardsEl.addEventListener('pointerdown', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-card]');
    if (!b || e.button !== 0) return;
    drag = { id: b.dataset.card!, x: e.clientX, y: e.clientY, pid: e.pointerId };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    if (!drag.ghost) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
      const g = document.createElement('div');
      g.className = 'cu-ghost';
      g.textContent = spec(drag.id).name;
      document.body.append(g);
      drag.ghost = g;
      document.body.classList.add('cu-dragging');
    }
    drag.ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    board.querySelectorAll('.cu-drop').forEach((el) => el.classList.remove('cu-drop'));
    drag.ghost.hidden = true;
    const w = wayAt(e.clientX, e.clientY);
    drag.ghost.hidden = false;
    if (w !== null) board.querySelector(`[data-way="${w}"]`)?.classList.add('cu-drop');
  });
  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pid) return;
    const d = drag;
    drag = null;
    if (!d.ghost) return;
    d.ghost.remove();
    document.body.classList.remove('cu-dragging');
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 0);
    const w = e.type === 'pointerup' ? wayAt(e.clientX, e.clientY) : null;
    if (w !== null) place(d.id, w);
    else board.querySelectorAll('.cu-drop').forEach((el) => el.classList.remove('cu-drop'));
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  powerBtn.addEventListener('click', () => {
    if (!allRight()) return;
    powered = true;
    buildOn = {};
    renderBuild();
    board.classList.add('cu-powering');
    later(() => {
      buildOn = { ...buildOn, main: true };
      refreshState();
    }, 350);
    ways.forEach((_, i) =>
      later(() => {
        buildOn = { ...buildOn, [`w${i}`]: true };
        refreshState();
      }, 750 + i * 170),
    );
    later(() => {
      board.classList.remove('cu-powering');
      showToast('Powered up. Every circuit is live.');
    }, 750 + WAYS * 170 + 200);
  });
  $s('#cu-clear-btn').addEventListener('click', () => {
    unpower();
    ways.fill(null);
    for (const c of circuits) settings[c.id] = { rating: null, prot: null };
    selCard = null;
    selWay = null;
    renderBuild();
  });

  /* ----------------------------------------------------------- curves tab */
  let curve: Curve = 'B';
  let rating = 32;
  let m = 1.5;
  let curveDone = false;
  const chart = $s<SVGSVGElement>('#cu-chart');
  const mIn = $<HTMLInputElement>('#cu-m');

  const renderChart = () => {
    chart.innerHTML = chartMarkup(curve, rating);
    updateMarker();
  };
  const updateMarker = () => {
    const r = tripAt(curve, m);
    const x = chartX(m);
    const amps = m * rating;
    const ampsTxt = amps >= 1000 ? `${(amps / 1000).toFixed(2)} kA` : `${amps < 20 ? amps.toFixed(1) : Math.round(amps)} A`;
    const q = (id: string) => chart.querySelector<SVGElement>(`#${id}`)!;
    q('cu-mk-line').setAttribute('x1', String(x));
    q('cu-mk-line').setAttribute('x2', String(x));
    const zoneCls = `is-${r.zone}`;
    chart.querySelector('#cu-marker')!.setAttribute('class', zoneCls);
    const { PY0, PY1 } = CHART_BOUNDS;
    const ya = isFinite(r.tMax) ? chartY(r.tMax) : PY0;
    const yb = isFinite(r.tMin) ? chartY(r.tMin) : PY0;
    q('cu-mk-range').setAttribute('x1', String(x));
    q('cu-mk-range').setAttribute('x2', String(x));
    q('cu-mk-range').setAttribute('y1', String(r.zone === 'none' ? PY0 : ya));
    q('cu-mk-range').setAttribute('y2', String(r.zone === 'none' ? PY0 : yb));
    for (const [id, y] of [
      ['cu-mk-a', ya],
      ['cu-mk-b', yb],
    ] as const) {
      q(id).setAttribute('cx', String(x));
      q(id).setAttribute('cy', String(y));
      q(id).style.display = r.zone === 'none' || (id === 'cu-mk-a' && !isFinite(r.tMax)) ? 'none' : '';
    }
    const tag = `${ampsTxt} · ${m < 10 ? m.toFixed(2) : m.toFixed(1)}×`;
    const t = q('cu-mk-tagt');
    t.textContent = tag;
    const w = tag.length * 7.6 + 18;
    const tx = Math.min(Math.max(x, CHART_BOUNDS.PX0 + w / 2 + 4), CHART_BOUNDS.PX1 - w / 2 - 4);
    t.setAttribute('x', String(tx));
    q('cu-mk-tagbg').setAttribute('x', String(tx - w / 2));
    q('cu-mk-tagbg').setAttribute('width', String(w));
    void PY1;

    // panel
    $('#cu-m-out').textContent = `${m < 10 ? m.toFixed(2) : m.toFixed(1)} × In`;
    $('#cu-amps').textContent = ampsTxt;
    const tt = $('#cu-ttrip');
    const v = $('#cu-verdict');
    const [lo, hi] = curve === 'B' ? [3, 5] : [5, 10];
    switch (r.zone) {
      case 'none':
        tt.textContent = 'Never';
        v.innerHTML = m <= 1 ? `<b>Normal load.</b> At or below its rating the breaker carries this all day.` : `<b>No trip.</b> Just over its rating, a breaker is built to carry the current for at least an hour without tripping (below 1.13 × In).`;
        break;
      case 'maybe':
        tt.textContent = `${fmtTime(r.tMin)}+`;
        v.innerHTML = `<b>A slight overload.</b> It may trip after a long while, or not at all for an hour. The standard only guarantees a trip within an hour from 1.45 × In.`;
        break;
      case 'thermal':
        tt.textContent = `${fmtTime(r.tMin)}–${fmtTime(r.tMax)}`;
        v.innerHTML = `<b>Overload: slow trip.</b> The bimetal strip heats up and bends until it releases the latch. The more current, the quicker. A slow trip is fine here: a cable can take a modest overload for a while.`;
        break;
      case 'either':
        tt.textContent = `${fmtTime(r.tMin)}–${fmtTime(r.tMax)}`;
        v.innerHTML = `<b>The grey zone.</b> Between ${lo} and ${hi} × In, a type ${curve} might trip instantly on its magnetic coil, or only slowly on its bimetal strip. It depends on the individual breaker.`;
        break;
      case 'instant':
        tt.textContent = `under ${fmtTime(r.tMax)}`;
        v.innerHTML = `<b>Short circuit: instant trip.</b> The current through the magnetic coil is big enough to snap the contacts open, usually within about a hundredth of a second.`;
        break;
    }
    // challenge
    const ch = $('#cu-curve-ch');
    const hit = curve === 'B' && rating === 32 && r.zone === 'instant' && m < 5.6;
    if (hit) curveDone = true;
    ch.classList.toggle('ok', curveDone);
    ch.innerHTML = curveDone
      ? `<b>Got it: about 160 A.</b> Five times 32 A. Above that a B32 is certain to trip instantly. For a fault to clear fast, the fault loop must let at least that much current flow (chapter 6).`
      : `<b>Challenge:</b> for a type B 32 A breaker, find the smallest current that is <i>certain</i> to trip it instantly.`;
  };

  panel.querySelectorAll<HTMLElement>('[data-curve]').forEach((b) =>
    b.addEventListener('click', () => {
      curve = b.dataset.curve as Curve;
      panel.querySelectorAll('[data-curve]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderChart();
    }),
  );
  panel.querySelectorAll<HTMLElement>('[data-rate]').forEach((b) =>
    b.addEventListener('click', () => {
      rating = Number(b.dataset.rate);
      panel.querySelectorAll('[data-rate]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderChart();
    }),
  );
  mIn.value = String(mToSlider(m));
  mIn.addEventListener('input', () => {
    m = sliderToM(Number(mIn.value));
    updateMarker();
  });
  panel.querySelectorAll<HTMLElement>('[data-mpreset]').forEach((b) =>
    b.addEventListener('click', () => {
      m = curvePresets.find((p) => p.id === b.dataset.mpreset)!.m;
      mIn.value = String(mToSlider(m));
      updateMarker();
    }),
  );

  /* -------------------------------------------------------------- RCD tab */
  const tester = $s<SVGSVGElement>('#cu-tester');
  const tq = (id: string) => tester.querySelector<SVGElement>(`#${id}`)!;
  let health: RcdHealth = 'healthy';
  let results: Partial<Record<RcdTest, RcdReading>> = {};
  const healthyPassed = new Set<RcdTest>();
  let testing = false;
  let raf = 0;
  const testBtns = panel.querySelectorAll<HTMLButtonElement>('[data-test-run]');

  const setRcd = (tripped: boolean) => {
    tq('cu-tr-knob').classList.toggle('is-off', tripped);
    tq('cu-tr-flag').classList.toggle('is-on', !tripped);
    tq('cu-tr-state').textContent = tripped ? 'TRIPPED' : 'ON';
    tq('cu-tr-state').classList.toggle('is-off', tripped);
    tq('cu-tr-circ').classList.toggle('is-dead', tripped);
  };
  const lcd = (v: string, unit: string, sub: string) => {
    tq('cu-lcd-v').textContent = v;
    tq('cu-lcd-u').textContent = unit;
    tq('cu-lcd-s').textContent = sub;
  };
  const setDial = (t: RcdTest) => {
    tq('cu-dial').style.transform = `rotate(${DIAL_ANGLE[t]}deg)`;
    tester.querySelectorAll('[data-mode]').forEach((e) => e.classList.toggle('is-on', (e as SVGElement).dataset.mode === t));
    tq('cu-lcd-top').textContent = `RCD 30 mA · ${t === 'ramp' ? 'RAMP' : TEST_INFO[t].label.replace(' ', '')} · ${TEST_INFO[t].current}`;
  };
  const setScale = (t: RcdTest, r: RcdReading | null) => {
    const g = tq('cu-scale');
    if (t === 'ramp') g.innerHTML = scaleMarkup('ma', 30, r ? r.value : null, r ? r.pass : null);
    else if (t === 'half') g.innerHTML = scaleMarkup('ma', 30, 15, r ? r.pass : null);
    else g.innerHTML = scaleMarkup('ms', t === 'x1' ? 300 : 40, r ? r.value : null, r ? r.pass : null);
  };

  const renderResults = () => {
    $('#cu-results').innerHTML = (['ramp', 'half', 'x1', 'x5'] as RcdTest[])
      .map((t) => {
        const r = results[t];
        const val = !r ? '–' : r.value === null ? 'no trip' : t === 'ramp' ? `${r.value} mA` : `${r.value} ms`;
        return `<tr><th scope="row">${TEST_INFO[t].label}</th><td>${TEST_INFO[t].limit}</td><td>${val}</td><td>${r ? `<span class="cu-pf ${r.pass ? 'ok' : 'bad'}">${r.pass ? 'Pass' : 'Fail'}</span>` : ''}</td></tr>`;
      })
      .join('');
    const ch = $('#cu-rcd-ch');
    const done = healthyPassed.size === 4;
    ch.classList.toggle('ok', done);
    ch.innerHTML = done
      ? '<b>The healthy RCD passed all four.</b> Now try the sluggish one: it trips at the right current, but too slowly. Only the timed tests catch that.'
      : `<b>Challenge:</b> run all four tests on the healthy RCD (${healthyPassed.size} of 4 passed).`;
  };

  const explainReading = (r: RcdReading) => {
    const s = $('#cu-rcd-say');
    const t = r.test;
    let msg = '';
    if (t === 'ramp') msg = r.pass ? `It tripped at ${r.value} mA. A 30 mA RCD should trip somewhere between half and all of its rating, so that is a pass.` : `It tripped at only ${r.value} mA, below half its rating. It would trip on the small leaks every home has: nuisance tripping.`;
    if (t === 'half') msg = r.pass ? 'At 15 mA (half its rating) it held on, as it should. Normal small leaks from appliances will not trip it.' : `It tripped at half its rating (after ${r.value} ms). That RCD is too touchy and will trip for no good reason.`;
    if (t === 'x1') msg = r.pass ? `At its full 30 mA it tripped in ${r.value} ms, well inside the 300 ms limit.` : `${r.value} ms is over the 300 ms limit. The RCD might not disconnect fast enough to protect someone. It needs replacing.`;
    if (t === 'x5') msg = r.pass ? `At 150 mA it tripped in ${r.value} ms, inside the 40 ms limit. Bigger leak, faster trip.` : `${r.value} ms at 150 mA is over the 40 ms limit: a sluggish mechanism.`;
    s.textContent = msg;
  };

  const finishTest = (r: RcdReading) => {
    testing = false;
    testBtns.forEach((b) => (b.disabled = false));
    tq('cu-tr-leak').classList.remove('is-on');
    tq('cu-test-btn').classList.remove('is-on');
    results = { ...results, [r.test]: r };
    if (health === 'healthy' && r.pass) healthyPassed.add(r.test);
    setScale(r.test, r);
    if (r.value === null) {
      lcd('NO', 'TRIP', `${r.pass ? 'PASS' : 'FAIL'}`);
    } else {
      setRcd(true);
      lcd(String(r.value), r.test === 'ramp' ? 'mA' : 'ms', r.pass ? 'TRIPPED · PASS' : 'TRIPPED · FAIL');
    }
    renderResults();
    explainReading(r);
  };

  const runTest = (t: RcdTest) => {
    if (testing) return;
    testing = true;
    testBtns.forEach((b) => (b.disabled = true));
    const r = runRcdTest(t, health);
    setDial(t);
    setScale(t, null);
    setRcd(false); // reset it before testing
    tq('cu-tr-leak').classList.add('is-on');
    tq('cu-test-btn').classList.add('is-on');
    $('#cu-rcd-say').textContent = t === 'ramp' ? 'Ramping the leak up 1 mA at a time…' : `Leaking ${TEST_INFO[t].current} to earth and timing…`;
    if (reduced) {
      finishTest(r);
      return;
    }
    const start = performance.now();
    if (t === 'ramp') {
      const target = r.value ?? 30;
      const step = (now: number) => {
        const mA = Math.min(target, Math.floor((now - start) / 90));
        lcd(String(mA), 'mA', 'RAMPING');
        tq('cu-scale').innerHTML = scaleMarkup('ma', 30, mA, null);
        if (mA >= target) finishTest(r);
        else raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    } else {
      // The real test is over in milliseconds; the count is slowed down so you can see it.
      const final = r.value ?? 1000;
      const dur = 700;
      const step = (now: number) => {
        const f = Math.min(1, (now - start) / dur);
        lcd(String(Math.round(final * f)), 'ms', 'TIMING (SLOWED DOWN)');
        if (f >= 1) finishTest(r);
        else raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
  };
  testBtns.forEach((b) => b.addEventListener('click', () => runTest(b.dataset.testRun as RcdTest)));
  panel.querySelectorAll<HTMLElement>('[data-health]').forEach((b) =>
    b.addEventListener('click', () => {
      if (testing) return;
      health = b.dataset.health as RcdHealth;
      panel.querySelectorAll('[data-health]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      results = {};
      setRcd(false);
      lcd('– –', '', 'READY');
      renderResults();
      $('#cu-rcd-say').textContent = health === 'healthy' ? 'A healthy RCD. Run the tests.' : health === 'sluggish' ? 'This RCD’s mechanism is stiff with age. Which tests catch it?' : 'This RCD trips too easily. Which tests catch it?';
    }),
  );

  // appliance game
  const gameDone: Record<string, boolean> = {};
  $('#cu-game').addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-pick]');
    if (!b) return;
    const row = b.closest<HTMLElement>('[data-game]')!;
    const item = rcdGame.find((g) => g.id === row.dataset.game)!;
    const pick = b.dataset.pick as RcdType;
    const ok = rcdSuits(item.need, pick);
    row.querySelectorAll('[data-pick]').forEach((x) => x.classList.remove('right', 'wrong'));
    b.classList.add(ok ? 'right' : 'wrong');
    const fb = row.querySelector('.cu-game-fb')!;
    fb.className = `cu-game-fb ${ok ? 'ok' : 'bad'}`;
    fb.textContent = ok
      ? pick === item.need
        ? `Yes, type ${pick}. ${item.why}`
        : `Type ${pick} works (it covers type ${item.need}), but type ${item.need} is enough. ${item.why}`
      : `Type ${pick} is not enough. ${item.why}`;
    if (ok) gameDone[item.id] = true;
    const n = Object.keys(gameDone).length;
    $('#cu-game-score').textContent = n === rcdGame.length ? `All ${n} matched.` : `${n} of ${rcdGame.length} matched.`;
  });

  // selectivity
  let upS = false;
  const selReset = () => {
    panel.querySelector('#cu-sel-up')!.classList.remove('is-off');
    panel.querySelector('#cu-sel-down')!.classList.remove('is-off');
    panel.querySelector('#cu-sel-lampa')!.classList.add('is-lit');
    panel.querySelector('#cu-sel-lampb')!.classList.add('is-lit');
    panel.querySelector('#cu-sel-fault')!.classList.remove('is-on');
    panel.querySelector('#cu-sel-upt')!.textContent = upS ? 'S-type' : 'general';
    $('#cu-sel-say').textContent = '';
  };
  panel.querySelectorAll<HTMLElement>('[data-up]').forEach((b) =>
    b.addEventListener('click', () => {
      upS = b.dataset.up === 's';
      panel.querySelectorAll('[data-up]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      selReset();
    }),
  );
  $('#cu-sel-reset').addEventListener('click', selReset);
  $('#cu-sel-go').addEventListener('click', () => {
    selReset();
    panel.querySelector('#cu-sel-fault')!.classList.add('is-on');
    $('#cu-sel-say').textContent = 'About 250 mA is leaking to earth…';
    later(() => {
      panel.querySelector('#cu-sel-down')!.classList.add('is-off');
      panel.querySelector('#cu-sel-lampb')!.classList.remove('is-lit');
      if (!upS) {
        panel.querySelector('#cu-sel-up')!.classList.add('is-off');
        panel.querySelector('#cu-sel-lampa')!.classList.remove('is-lit');
        $('#cu-sel-say').innerHTML =
          '<b>The whole house went dark.</b> 250 mA is over both ratings, so both RCDs race to trip and the 100 mA one can easily win. A bigger mA rating on its own does not give selectivity.';
      } else {
        $('#cu-sel-say').innerHTML =
          '<b>Only the faulty circuit went off.</b> The S-type is built to wait a moment before tripping, so the 30 mA RCD clears the fault first and the rest of the house stays on.';
      }
    }, 600);
  });
  selReset();

  /* ------------------------------------------------------------- quiz tab */
  mountQuiz($('#cu-view-quiz'), quiz, {
    retryHint: 'Have another look at the board and the tools, then try again.',
    onFinish: (score, total) => {
      if (score / total >= 0.75) complete();
    },
  });

  /* ----------------------------------------------------------------- tabs */
  const showTab = (t: Tab) => {
    if (testing) {
      cancelAnimationFrame(raf);
      testing = false;
      testBtns.forEach((b) => (b.disabled = false));
    }
    tab = t;
    for (const { id } of TABS) {
      $(`#cu-tab-${id}`).setAttribute('aria-selected', String(id === t));
      $(`#cu-view-${id}`).hidden = id !== t;
    }
    const scene = t === 'curves' ? 'curve' : t === 'rcds' ? 'tester' : 'board';
    $s<HTMLElement>('#cu-scene-board').hidden = scene !== 'board';
    $s<HTMLElement>('#cu-scene-curve').hidden = scene !== 'curve';
    $s<HTMLElement>('#cu-scene-tester').hidden = scene !== 'tester';
    $s<HTMLElement>('#cu-tb-explore').hidden = t === 'build';
    $s<HTMLElement>('#cu-tb-build').hidden = t !== 'build';
    $s<HTMLElement>('#cu-buildui').hidden = t !== 'build';
    $s('#cu-scene-board').classList.toggle('is-building', t === 'build');
    hidePop();
    if (t !== 'build') editor.hidden = true;
    if (scene === 'board') {
      renderBoard();
      if (t === 'build') renderBuildPanel();
    }
  };
  // The guide covers Explore and Build; the other tabs have their own tools and hide it.
  const openTab = (id: Tab) => {
    if (id === 'build') {
      guide.go(BUILD_STEP);
      guide.setVisible(true);
      return;
    }
    showTab(id);
    guide.setVisible(id === 'explore');
    if (id === 'explore' && guide.current() >= BUILD_STEP) guide.go(0);
  };
  TABS.forEach(({ id }) =>
    $(`#cu-tab-${id}`).addEventListener('click', () => openTab(id)),
  );
  panel.querySelector('.cu-tabs')!.addEventListener('keydown', (e) => {
    const k = (e as KeyboardEvent).key;
    if (k !== 'ArrowRight' && k !== 'ArrowLeft') return;
    const i = TABS.findIndex((x) => x.id === tab);
    const n = TABS[(i + (k === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length].id;
    openTab(n);
    $(`#cu-tab-${n}`).focus();
  });

  $('#cu-go-build').addEventListener('click', () => openTab('build'));

  // first paint
  showPart('main');
  hidePop();
  selPart = null;
  panel.querySelectorAll('[data-partbtn]').forEach((b) => b.setAttribute('aria-current', 'false'));
  renderBoard();
  renderChart();
  renderResults();
  setDial('ramp');
  setScale('ramp', null);
  setRcd(false);

  /* ------------------------------------------------ the guided walkthrough */
  // Each step puts the Explore board back to a known state, then rings the thing to touch.
  const toExplore = (coverOn: boolean) => {
    if (tab !== 'explore') {
      showTab('explore');
      guide?.setVisible(true);
    }
    exOn = allOn(EXPLORE);
    setCover(coverOn, true);
    selPart = null;
    renderBoard();
    say.classList.remove('is-on');
    say.textContent = '';
  };
  const lever = (id: string) => board.querySelector(`[data-lever="${id}"]`);
  const tBtn = (id: string) => board.querySelector(`[data-test="${id}"]`);
  const enterBuild = () => {
    if (tab !== 'build') showTab('build');
    guide?.setVisible(true);
  };
  const BUILD_STEP = 6;
  const guide = mountGuide(
    stage,
    [
      {
        kicker: 'Inside',
        title: 'Take the cover off',
        text: 'The consumer unit, or fuse box, splits the supply from the meter into separate circuits. A plastic cover hides the wiring. Only a competent person should ever open a real one.',
        tryIt: 'Click the cover on the board to lift it off.',
        onEnter: () => {
          toExplore(true);
          pulse(board.querySelector('.cu-cover-plate'));
        },
      },
      {
        kicker: 'Busbar and wires',
        title: 'The copper comb',
        text: 'Behind the cover, a copper busbar carries line to every breaker. Neutrals and earths have their own bars, and the meter tails come in at the main switch.',
        tryIt: 'Click the copper bar above the breakers and read the label.',
        onEnter: () => {
          toExplore(false);
          pulse(board.querySelector('[data-part="busbar"]'));
        },
      },
      {
        kicker: 'Main switch',
        title: 'Everything off at once',
        text: 'The main switch cuts every circuit together, so you can isolate the board. The meter tails feeding it stay live: only the supplier can switch those off.',
        tryIt: 'Switch the main switch off and watch the lights go out. "All on" brings it back.',
        onEnter: () => {
          toExplore(false);
          pulse(lever('main'));
        },
      },
      {
        kicker: 'MCB',
        title: 'Breakers guard cables',
        text: 'Each circuit has a miniature circuit breaker (MCB) sized to protect its cable. It trips slowly on an overload and almost instantly on a short circuit.',
        tryIt: 'Switch off the Lights MCB (B6). Only the lights go off.',
        onEnter: () => {
          toExplore(false);
          pulse(lever('m3'));
        },
      },
      {
        kicker: 'RCD',
        title: 'An RCD spots leaks',
        text: 'An RCD trips when current leaks to earth, for example through a person. Here one 30 mA RCD covers three circuits, so they all go off together.',
        tryIt: 'Press the T button on the RCD. Which circuits go dark?',
        onEnter: () => {
          toExplore(false);
          pulse(tBtn('rcd1'));
        },
      },
      {
        kicker: 'RCBO',
        title: 'An RCBO does both',
        text: 'An RCBO is a breaker and an RCD in one, for a single circuit. If it trips, only that circuit loses power.',
        tryIt: 'Press T on the Kitchen RCBO. Does anything else go off?',
        onEnter: () => {
          toExplore(false);
          pulse(tBtn('r1'));
        },
      },
      {
        kicker: 'Build it',
        title: 'Fill the empty board',
        text: 'Now you wire up a board. There are eight ways and eight circuits to place, from the cooker to the garage.',
        tryIt: 'Drag a circuit from the tray onto a way on the board, or tap a circuit and then a way.',
        onEnter: () => {
          enterBuild();
          pulse(stage.querySelector('#cu-cards'));
        },
      },
      {
        kicker: 'Build it',
        title: 'Choose each breaker',
        text: 'Every circuit needs a breaker big enough for its load but small enough to protect its cable, plus 30 mA RCD protection where the rules ask for it.',
        tryIt: 'Tap a filled way, then pick its breaker size and RCD type. Green ticks mean it is right.',
        onEnter: () => {
          enterBuild();
          pulse(stage.querySelector('#cu-editor') ?? stage.querySelector('#cu-cards'));
        },
      },
      {
        kicker: 'Build it',
        title: 'Power it up',
        text: 'When all eight ways are right, power the board up and try the switches. After this, the Curves and RCDs tabs have more tools, and the quiz ticks the chapter off.',
        tryIt: 'Press Power up, then flip a few switches.',
        onEnter: () => {
          enterBuild();
          pulse(powerBtn);
        },
      },
    ],
    { position: 'top-right' },
  );

  return {
    activate() {
      stage.querySelector('.cu-stage')!.classList.add('cu-anim');
    },
    deactivate() {
      stage.querySelector('.cu-stage')!.classList.remove('cu-anim');
      cancelAnimationFrame(raf);
      if (testing) {
        testing = false;
        testBtns.forEach((b) => (b.disabled = false));
        tq('cu-tr-leak').classList.remove('is-on');
        tq('cu-test-btn').classList.remove('is-on');
      }
      // finish any power-up sequence instantly
      if (timers.size) {
        clearTimers();
        if (powered) {
          buildOn = { main: true, ...Object.fromEntries(ways.map((_, i) => [`w${i}`, true])) };
          board.classList.remove('cu-powering');
          if (tab === 'build') refreshState();
        }
      }
    },
  };
};
