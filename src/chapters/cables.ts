import './cables.css';
import {
  APPLIANCES,
  BREAKERS,
  CAPACITY,
  CHALLENGES,
  GROUPING,
  METHODS,
  MV_PER_A_M,
  NOMINAL_V,
  SIZES,
  appliance,
  cables,
  quiz,
  type ChallengeId,
  type MethodId,
  type Size,
} from '../data/cables-lesson';
import { mountGuide, pulse } from '../ui/guide';
import { mountQuiz } from '../ui/quiz';
import {
  AMBIENT,
  capacity,
  designCurrent,
  dropLimit,
  evaluate,
  groupFactor,
  maxLength,
  settle,
  step,
  suggest,
  voltDrop,
  type Design,
  type SimState,
} from './cables-model';
import { createScene, type SceneView } from './cables-scene';
import type { ChapterMount } from './types';

const a1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
const num = (n: number) => (Number.isInteger(n) ? String(n) : a1(n));
const sizeTxt = (s: number) => (s === 1 ? '1.0' : String(s));
const TICK = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CROSS = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 6l8 8M14 6l-8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;

type Tab = 'design' | 'calc' | 'quiz';

/** Chapter 5: cables and circuit design. Ib ≤ In ≤ Iz, and volt drop. */
export const mount: ChapterMount = ({ stage, panel, complete }) => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const design: Design = { applianceId: 'sh85', breaker: 32, size: 4, method: 'C', group: 1, length: 20 };
  let sim: SimState = { temp: AMBIENT, trip: 0, tripped: false };
  let current = designCurrent(appliance(design.applianceId).watts);
  let tries = 0;
  const done = new Set<ChallengeId>();

  /* ------------------------------ the stage ------------------------------ */
  stage.innerHTML = `
    <div class="cb-stage">
      <div class="cb-scene"></div>
      <div class="cb-status" id="cb-status">
        <span class="cb-status-dot" aria-hidden="true"></span>
        <div><b id="cb-status-title"></b><span id="cb-status-text"></span></div>
        <button type="button" class="primary cb-reset" id="cb-reset-stage" hidden>Reset breaker</button>
      </div>
      <p class="cb-sr" aria-live="polite" id="cb-live"></p>
    </div>`;
  const scene = createScene(stage.querySelector<HTMLElement>('.cb-scene')!, reduced);
  const sq = <T extends HTMLElement>(id: string) => stage.querySelector<T>(`#${id}`)!;

  /* ------------------------------ the panel ------------------------------ */
  const chips = <T extends string | number>(name: string, items: { v: T; html: string }[], cls = '') =>
    `<div class="cb-seg ${cls}" role="group" aria-label="${name}">${items
      .map((i) => `<button type="button" class="cb-opt" data-${name}="${i.v}">${i.html}</button>`)
      .join('')}</div>`;

  panel.innerHTML = `
    <div class="tabs" role="tablist">
      <button type="button" role="tab" id="cb-tab-design" aria-selected="true" aria-controls="cb-view-design">Design</button>
      <button type="button" role="tab" id="cb-tab-calc" aria-selected="false" aria-controls="cb-view-calc">Calculate</button>
      <button type="button" role="tab" id="cb-tab-quiz" aria-selected="false" aria-controls="cb-view-quiz">Quiz</button>
    </div>

    <section role="tabpanel" id="cb-view-design" aria-labelledby="cb-tab-design">
      <div class="detail"><h2>${cables.title}</h2><p>${cables.intro}</p></div>
      <div class="cb-rule" aria-label="Ib is at most In, which is at most Iz">
        <div><b>Ib</b><small>the load</small><span id="cb-r-ib"></span></div><i>≤</i>
        <div><b>In</b><small>the breaker</small><span id="cb-r-in"></span></div><i>≤</i>
        <div><b>Iz</b><small>the cable</small><span id="cb-r-iz"></span></div>
      </div>

      <ul class="cb-challenges" id="cb-challenges">
        ${CHALLENGES.map((c) => `<li data-ch="${c.id}"><span class="cb-tick" aria-hidden="true">${TICK}</span><span>${c.text}</span></li>`).join('')}
      </ul>

      <div class="cb-step"><div class="wire-label"><span class="cb-n">1</span> The load</div>
        ${chips('app', APPLIANCES.map((a) => ({ v: a.id, html: a.label })), 'cb-two')}
        <p class="cb-worked" id="cb-ib-line"></p>
        <p class="cb-note" id="cb-app-note"></p>
      </div>

      <div class="cb-step"><div class="wire-label"><span class="cb-n">2</span> Breaker rating In</div>
        ${chips('brk', BREAKERS.map((b) => ({ v: b, html: `${b} A` })), 'cb-five')}
      </div>

      <div class="cb-step"><div class="wire-label"><span class="cb-n">3</span> Cable size (twin and earth)</div>
        ${chips('size', SIZES.map((s) => ({ v: s, html: `${sizeTxt(s)}<small>mm²</small>` })), 'cb-seven')}
      </div>

      <div class="cb-step"><div class="wire-label"><span class="cb-n">4</span> How it is installed</div>
        ${chips('method', METHODS.map((m) => ({ v: m.id, html: `<b>${m.id} · ${m.name}</b><small>${m.detail}</small>` })), 'cb-methods')}
        ${chips('group', GROUPING.map((g) => ({ v: g.n, html: `${g.label}<small>× ${g.factor.toFixed(1)}</small>` })), 'cb-three')}
        <p class="cb-worked" id="cb-iz-line"></p>
      </div>

      <div class="cb-step"><div class="wire-label"><span class="cb-n">5</span> Stretch the run</div>
        <div class="slider-card">
          <label for="cb-len">Cable length <b id="cb-len-out">20 m</b></label>
          <input type="range" id="cb-len" min="2" max="100" step="1" value="20" />
        </div>
        <div class="cb-lenbar" aria-hidden="true"><i id="cb-lenbar-ok"></i><span id="cb-lenbar-max"></span></div>
        <p class="cb-worked" id="cb-vd-line"></p>
      </div>

      <div class="wire-label cb-gap">Live checks</div>
      <ul class="wire-results cb-checks" id="cb-checks" aria-live="polite"></ul>
      <p class="wire-summary" id="cb-summary"></p>
      <div class="wire-actions">
        <button type="button" class="ghost" id="cb-suggest" disabled>Suggest a design</button>
        <span class="wire-note" id="cb-suggest-note">Have a go yourself first.</span>
      </div>

      <div class="cb-step cb-test"><div class="wire-label">Stress test: push more current</div>
        <p class="cb-note">The breaker is there to protect the cable. Push the current up and see who gives in first: the breaker or the cable.</p>
        <div class="slider-card">
          <label for="cb-amps">Current drawn <b id="cb-amps-out"></b></label>
          <input type="range" id="cb-amps" min="0" max="100" step="0.5" value="37" />
        </div>
        <div class="wire-actions">
          <button type="button" class="ghost" id="cb-normal">Normal load</button>
          <button type="button" class="ghost" id="cb-over">Overload (1.5×)</button>
          <button type="button" class="primary" id="cb-reset" hidden>Reset breaker</button>
        </div>
      </div>

      <div class="uk"><b>UK standards</b>BS 7671 (the 18th Edition) asks for Ib ≤ In ≤ Iz, and recommends keeping volt drop within 3% (6.9 V) for lighting and 5% (11.5 V) for other circuits fed from the public supply. The figures here are simplified for learning: real design uses the full tables, applies several correction factors at once (grouping, hot surroundings, thermal insulation) and checks fault protection too.</div>
    </section>

    <section role="tabpanel" id="cb-view-calc" aria-labelledby="cb-tab-calc" hidden>
      <div class="detail"><h2>Calculators</h2><p>The same sums a designer does, worked through with your numbers. It starts with a 7 kW shower on 6 mm² cable over 20 m.</p></div>
      <div class="cb-form">
        <label>Power (W)<input type="number" id="cc-p" min="0" max="20000" step="100" value="7000" inputmode="decimal" /></label>
        <label>Length (m)<input type="number" id="cc-l" min="0" max="300" step="1" value="20" inputmode="decimal" /></label>
        <label>Cable size<select id="cc-s">${SIZES.map((s) => `<option value="${s}"${s === 6 ? ' selected' : ''}>${sizeTxt(s)} mm²</option>`).join('')}</select></label>
        <label>Method<select id="cc-m">${METHODS.map((m) => `<option value="${m.id}"${m.id === 'C' ? ' selected' : ''}>${m.id} · ${m.name}</option>`).join('')}</select></label>
        <label>Grouping<select id="cc-g">${GROUPING.map((g) => `<option value="${g.n}">${g.label} (×${g.factor.toFixed(1)})</option>`).join('')}</select></label>
        <label>Circuit<select id="cc-c">
          <option value="radial">Power, 5% (11.5 V)</option>
          <option value="light">Lighting, 3% (6.9 V)</option>
          <option value="ring">Ring, 5%, current shared</option>
        </select></label>
      </div>
      <button type="button" class="ghost cb-use" id="cc-use">Use my design</button>
      <div class="cb-calc" id="cc-out"></div>
      <div class="wire-label cb-gap">Simplified capacity table (amps)</div>
      <div class="cb-table-wrap"><table class="cb-table" id="cc-table">
        <thead><tr><th scope="col">Size</th><th scope="col">A</th><th scope="col">B</th><th scope="col">C</th><th scope="col">mV/A/m</th></tr></thead>
        <tbody>${SIZES.map(
          (s) =>
            `<tr data-row="${s}"><th scope="row">${sizeTxt(s)} mm²</th>${(['A', 'B', 'C'] as const)
              .map((m) => `<td data-col="${m}">${num(CAPACITY[s][m])}</td>`)
              .join('')}<td>${MV_PER_A_M[s]}</td></tr>`,
        ).join('')}</tbody>
      </table></div>
      <p class="cb-note">Approximate values for 2-core PVC twin and earth (copper, 70 °C, 30 °C surroundings). For learning only: use the full BS 7671 tables for real work.</p>
    </section>

    <section role="tabpanel" id="cb-view-quiz" aria-labelledby="cb-tab-quiz" hidden></section>`;

  const q = <T extends HTMLElement>(id: string) => panel.querySelector<T>(`#${id}`)!;

  // tabs
  const tabIds: Tab[] = ['design', 'calc', 'quiz'];
  tabIds.forEach((k) =>
    q(`cb-tab-${k}`).addEventListener('click', () => {
      tabIds.forEach((t) => {
        q(`cb-tab-${t}`).setAttribute('aria-selected', String(t === k));
        q(`cb-view-${t}`).hidden = t !== k;
      });
    }),
  );
  mountQuiz(q('cb-view-quiz'), quiz, {
    retryHint: 'Have another go at the design tab, then try again.',
    onFinish: (score, total) => {
      if (score / total >= 0.75) complete();
    },
  });

  /* --------------------------- design: wiring up --------------------------- */
  const ampsIn = q<HTMLInputElement>('cb-amps');
  const lenIn = q<HTMLInputElement>('cb-len');

  const resetSim = () => {
    sim = { temp: sim.temp, trip: 0, tripped: false };
  };

  const onDesignChange = (counts = true) => {
    if (counts) tries++;
    current = designCurrent(appliance(design.applianceId).watts);
    resetSim();
    refresh();
  };

  const bind = (name: string, apply: (v: string) => void) =>
    panel.querySelectorAll<HTMLButtonElement>(`[data-${name}]`).forEach((b) =>
      b.addEventListener('click', () => {
        apply(b.dataset[name]!);
        onDesignChange(name !== 'app');
      }),
    );
  bind('app', (v) => {
    design.applianceId = v;
    if (appliance(v).ring && design.breaker > 32) design.breaker = 32;
  });
  bind('brk', (v) => (design.breaker = Number(v)));
  bind('size', (v) => (design.size = Number(v) as Size));
  bind('method', (v) => (design.method = v as MethodId));
  bind('group', (v) => (design.group = Number(v) as 1 | 2 | 3));
  lenIn.addEventListener('input', () => {
    design.length = Number(lenIn.value);
    tries++;
    refresh();
  });
  lenIn.addEventListener('change', () => refresh());

  q('cb-suggest').addEventListener('click', () => {
    const s = suggest(design);
    if (!s) {
      q('cb-suggest-note').textContent = 'Nothing in our table passes at this length. Shorten the run.';
      return;
    }
    design.breaker = s.breaker;
    design.size = s.size;
    onDesignChange(false);
    q('cb-suggest-note').textContent = `Smallest breaker that covers the load (${s.breaker} A), then the smallest cable that passes every check (${sizeTxt(s.size)} mm²).`;
  });

  ampsIn.addEventListener('input', () => {
    current = Number(ampsIn.value);
    refresh();
  });
  q('cb-normal').addEventListener('click', () => {
    current = designCurrent(appliance(design.applianceId).watts);
    resetSim();
    refresh();
  });
  q('cb-over').addEventListener('click', () => {
    current = Math.round(designCurrent(appliance(design.applianceId).watts) * 1.5 * 2) / 2;
    resetSim();
    refresh();
  });
  const resetBreaker = () => {
    resetSim();
    refresh();
  };
  q('cb-reset').addEventListener('click', resetBreaker);
  sq('cb-reset-stage').addEventListener('click', resetBreaker);

  /* ------------------------------ refresh ------------------------------ */
  let ev = evaluate(design);
  let lastStatus = '';

  const view = (): SceneView => {
    const m = METHODS.find((x) => x.id === design.method)!;
    return {
      kind: ev.app.kind,
      label: ev.app.label,
      breaker: design.breaker,
      size: design.size,
      method: design.method,
      methodName: m.name,
      group: design.group,
      length: design.length,
      current: sim.tripped ? 0 : current,
      temp: sim.temp,
      tripped: sim.tripped,
      drop: ev.drop,
      limit: ev.limit,
      dropNow: voltDrop(MV_PER_A_M[design.size], current, design.length, !!ev.app.ring),
    };
  };

  const markChallenge = (id: ChallengeId) => {
    if (done.has(id)) return;
    done.add(id);
    q('cb-challenges').querySelector(`[data-ch="${id}"]`)?.classList.add('ok');
  };

  /** Stage status card and the parts of the panel that depend on the simulation. */
  const refreshLive = () => {
    const app = ev.app;
    const who = app.short.toLowerCase();
    let cls = 'ok';
    let title = 'Running happily';
    let text = `${a1(current)} A flowing. The cable is at ${Math.round(sim.temp)} °C.`;
    const dropNow = voltDrop(MV_PER_A_M[design.size], current, design.length, !!app.ring);
    if (sim.tripped) {
      cls = 'bad';
      title = 'Breaker tripped';
      text = `${a1(current)} A is more than the ${design.breaker} A breaker allows. It switched off to protect the cable.`;
    } else if (current <= 0) {
      cls = 'idle';
      title = 'Switched off';
      text = 'No current, no heat, no volt drop.';
    } else if (ev.ib > design.breaker + 1e-9 && sim.temp < 71) {
      cls = 'warn';
      title = 'Breaker too small';
      text = `The ${who} needs ${a1(ev.ib)} A but the breaker is only ${design.breaker} A, so it would trip as the load runs. Choose a bigger breaker.`;
    } else if (sim.temp >= 85) {
      cls = 'bad';
      title = 'The cable is cooking';
      text = `${a1(current)} A through a cable that can only carry ${num(ev.iz)} A here, and the ${design.breaker} A breaker will not trip.`;
    } else if (sim.temp > 71) {
      cls = 'warn';
      title = 'Cable running hot';
      text = `Over 70 °C the PVC insulation softens and ages fast. ${a1(current)} A is more than the ${num(ev.iz)} A it can carry here.`;
    } else if (dropNow > ev.limit + 1e-9) {
      cls = 'warn';
      title = 'Not enough voltage';
      text = `The ${who} only gets ${a1(NOMINAL_V - dropNow)} V: the run loses ${a1(dropNow)} V, more than the ${a1(ev.limit)} V allowed.`;
    }
    const st = sq('cb-status');
    st.className = `cb-status ${cls}`;
    sq('cb-status-title').textContent = title;
    sq('cb-status-text').textContent = text;
    sq('cb-reset-stage').hidden = !sim.tripped;
    q('cb-reset').hidden = !sim.tripped;
    if (title !== lastStatus) {
      lastStatus = title;
      sq('cb-live').textContent = `${title}. ${text}`;
    }
    if (sim.temp >= 85 && !sim.tripped) markChallenge('cook');
  };

  const refresh = () => {
    ev = evaluate(design);
    const app = ev.app;

    const press = (name: string, v: string | number) =>
      panel.querySelectorAll<HTMLButtonElement>(`[data-${name}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[name] === String(v))));
    press('app', design.applianceId);
    press('brk', design.breaker);
    press('size', design.size);
    press('method', design.method);
    press('group', design.group);

    q('cb-r-ib').textContent = `${a1(ev.ib)} A`;
    q('cb-r-in').textContent = `${design.breaker} A`;
    q('cb-r-iz').textContent = `${num(ev.iz)} A`;
    q('cb-ib-line').innerHTML = `Ib = P ÷ U = ${app.watts} ÷ ${NOMINAL_V} = <b>${a1(ev.ib)} A</b>`;
    const note = q('cb-app-note');
    note.textContent = app.note ?? '';
    note.hidden = !app.note;
    q('cb-iz-line').innerHTML = `Iz = It × factor = ${num(ev.it)} × ${ev.factor.toFixed(1)} = <b>${num(ev.iz)} A</b>`;

    lenIn.value = String(design.length);
    q('cb-len-out').textContent = `${design.length} m`;
    const maxL = ev.maxLen;
    const pct = Math.min(100, (Math.min(maxL, 100) / 100) * 100);
    q('cb-lenbar-ok').style.width = `${pct}%`;
    q('cb-lenbar-max').textContent = Number.isFinite(maxL) ? (maxL >= 100 ? 'OK beyond 100 m' : `OK up to ${Math.floor(maxL)} m`) : '';
    q('cb-vd-line').innerHTML = `Volt drop = ${MV_PER_A_M[design.size]} × ${a1(ev.ib)} × ${design.length} ÷ 1000${app.ring ? ' ÷ 4' : ''} = <b>${a1(ev.drop)} V</b> (limit ${a1(ev.limit)} V)`;

    q('cb-checks').innerHTML = ev.checks
      .map((c) => `<li class="${c.ok ? 'ok' : ''}"><span class="cb-mark" aria-label="${c.ok ? 'Pass' : 'Fail'}">${c.ok ? TICK : CROSS}</span><div><b>${c.title}</b><span>${c.reason}</span></div></li>`)
      .join('');
    const sum = q('cb-summary');
    sum.className = `wire-summary ${ev.allOk ? 'ok' : 'bad'}`;
    if (ev.allOk) {
      const best = suggest(design);
      const smaller = best && best.breaker === design.breaker && best.size < design.size;
      sum.textContent = smaller ? `All three pass. ${sizeTxt(best.size)} mm² would also do: thicker cable costs more.` : 'All three pass. That circuit is safe and works well.';
    } else {
      const n = ev.checks.filter((c) => !c.ok).length;
      sum.textContent = `${n} check${n > 1 ? 's' : ''} to fix.`;
    }
    const sBtn = q<HTMLButtonElement>('cb-suggest');
    sBtn.disabled = tries < 2;
    if (tries >= 2 && q('cb-suggest-note').textContent === 'Have a go yourself first.') q('cb-suggest-note').textContent = '';

    // stress test slider
    const top = Math.ceil(Math.max(design.breaker, ev.iz, ev.ib) * 2);
    ampsIn.max = String(top);
    ampsIn.value = String(current);
    q('cb-amps-out').textContent = `${a1(current)} A`;

    if (design.applianceId === 'sh85' && ev.allOk) markChallenge('shower');
    if (app.lighting && !ev.checks[2].ok) markChallenge('stretch');

    if (reduced) sim = sim.tripped ? sim : settle(current, design.breaker, ev.iz);
    scene.render(view());
    refreshLive();
  };

  refresh();

  /* ------------------------------ stage guide ------------------------------ */
  const showTab = (k: Tab) => q(`cb-tab-${k}`).click();
  /** Set part of the design without counting it as the learner's own try, and go back to normal load. */
  const setDesign = (d: Partial<Design>) => {
    Object.assign(design, d);
    showTab('design');
    onDesignChange(false);
  };
  const chipsOf = (name: string) => panel.querySelector(`[data-${name}]`)?.closest('.cb-seg');
  mountGuide(
    stage,
    [
      {
        kicker: 'Ib ≤ In ≤ Iz',
        title: 'Three numbers, one deal',
        text: 'Every circuit balances three currents: what the load needs (Ib), what the breaker allows (In) and what the cable can carry (Iz). The breaker sits in the middle.',
        tryIt: 'Find the Ib ≤ In ≤ Iz strip at the top of the panel. Here an 8.5 kW shower is happy on 6 mm² cable.',
        onEnter: () => {
          setDesign({ applianceId: 'sh85', breaker: 40, size: 6, method: 'C', group: 1, length: 20 });
          pulse(q('cb-r-ib').closest('.cb-rule'));
        },
      },
      {
        kicker: 'Ib · the load',
        title: 'Start with what the appliance needs',
        text: 'The design current is the power divided by the voltage: Ib = P ÷ 230. A bigger shower draws more current, so everything after it has to be bigger too.',
        tryIt: 'Pick the 10.5 kW shower and watch Ib and the checks change.',
        onEnter: () => pulse(chipsOf('app')),
      },
      {
        kicker: 'In · the breaker',
        title: 'The breaker must cover the load',
        text: 'The breaker rating must be at least the design current, or it would trip every time the appliance runs. The 8.5 kW shower needs about 37 A.',
        tryIt: 'Choose a 32 A breaker and read the warning at the top of the picture. Then go back to 40 A.',
        onEnter: () => {
          setDesign({ applianceId: 'sh85', breaker: 40, size: 6, method: 'C', group: 1 });
          pulse(chipsOf('brk'));
        },
      },
      {
        kicker: 'Iz · the cable',
        title: 'Where a cable runs changes what it can carry',
        text: 'Current heats a cable. Clipped to a wall, the heat escapes; buried in insulation or bunched with other cables, it cannot, so the same cable carries less.',
        tryIt: 'Switch from “Clipped direct” to “In insulation” and watch Iz fall below the breaker.',
        onEnter: () => {
          setDesign({ applianceId: 'sh85', breaker: 40, size: 6, method: 'C', group: 1 });
          pulse(chipsOf('method'));
        },
      },
      {
        kicker: 'Why In ≤ Iz',
        title: 'The breaker protects the cable',
        text: 'Here a 63 A breaker feeds 4 mm² cable that can only take about 36 A, and the load is pushed to 1.5 times normal. The breaker lets it all through, so the cable heats up instead.',
        tryIt: 'Watch the cable temperature climb. Then fix it: pick a 40 A breaker and 6 mm² cable.',
        onEnter: () => {
          setDesign({ applianceId: 'sh85', breaker: 63, size: 4, method: 'C', group: 1 });
          q('cb-over').click();
          pulse(chipsOf('brk'));
        },
      },
      {
        kicker: 'Volt drop',
        title: 'Long runs lose voltage',
        text: 'Every metre of cable eats a little voltage. Lighting is only allowed to lose about 3% (6.9 V), so a long run on thin cable can fail even when it is cool.',
        tryIt: 'Drag the Cable length slider up until the volt drop check turns red.',
        onEnter: () => {
          setDesign({ applianceId: 'light', breaker: 6, size: 1.5, method: 'C', group: 1, length: 20 });
          pulse(lenIn.closest('.slider-card'));
        },
      },
      {
        title: 'Now design your own',
        text: 'Work through the three challenges in the panel, try the stress test and the calculators, then take the quiz to tick this chapter off.',
        tryIt: 'Open the Quiz tab when you are ready.',
        onEnter: () => pulse(q('cb-tab-quiz')),
      },
    ],
    { position: 'top-right' },
  );

  /* ----------------------------- calculators ----------------------------- */
  const cc = {
    p: q<HTMLInputElement>('cc-p'),
    l: q<HTMLInputElement>('cc-l'),
    s: q<HTMLSelectElement>('cc-s'),
    m: q<HTMLSelectElement>('cc-m'),
    g: q<HTMLSelectElement>('cc-g'),
    c: q<HTMLSelectElement>('cc-c'),
  };
  const calc = () => {
    const p = Math.max(0, Number(cc.p.value) || 0);
    const len = Math.max(0, Number(cc.l.value) || 0);
    const size = Number(cc.s.value) as Size;
    const method = cc.m.value as MethodId;
    const g = Number(cc.g.value) as 1 | 2 | 3;
    const kind = cc.c.value;
    const ring = kind === 'ring';
    const ib = designCurrent(p);
    const it = CAPACITY[size][method];
    const f = groupFactor(g);
    const iz = capacity(size, method, f);
    const mv = MV_PER_A_M[size];
    const limit = dropLimit(kind === 'light');
    const vd = voltDrop(mv, ib, len, ring);
    const ml = maxLength(limit, mv, ib, ring);
    const ok = vd <= limit + 1e-9;
    const r4 = ring ? ' ÷ 4' : '';
    const r4m = ring ? ' × 4' : '';
    q('cc-out').innerHTML = `
      <div class="cb-card"><small>Design current</small>
        <p>Ib = P ÷ U</p><p>= ${p} ÷ ${NOMINAL_V}</p><p class="cb-ans">= ${a1(ib)} A</p></div>
      <div class="cb-card"><small>Cable capacity</small>
        <p>Iz = It × factor</p><p>= ${num(it)} × ${f.toFixed(1)}</p><p class="cb-ans">= ${num(iz)} A</p></div>
      <div class="cb-card ${ok ? 'ok' : 'bad'}"><small>Volt drop</small>
        <p>Vd = mV/A/m × Ib × L ÷ 1000${r4}</p><p>= ${mv} × ${a1(ib)} × ${len} ÷ 1000${r4}</p>
        <p class="cb-ans">= ${a1(vd)} V</p>
        <p class="cb-verdict">${(vd / NOMINAL_V * 100).toFixed(1)}% of 230 V: ${ok ? 'within' : 'over'} the ${a1(limit)} V limit</p></div>
      <div class="cb-card"><small>Maximum length</small>
        <p>Lmax = limit${r4m} ÷ (mV/A/m × Ib ÷ 1000)</p><p>= ${a1(limit)}${r4m} ÷ (${mv} × ${a1(ib)} ÷ 1000)</p>
        <p class="cb-ans">= ${Number.isFinite(ml) ? `${a1(ml)} m` : 'no limit (no current)'}</p></div>`;
    q('cc-table').querySelectorAll('tr[data-row]').forEach((tr) => {
      const on = (tr as HTMLElement).dataset.row === String(size);
      tr.classList.toggle('cb-on', on);
      tr.querySelectorAll<HTMLElement>('td[data-col]').forEach((td) => td.classList.toggle('cb-hit', on && td.dataset.col === method));
    });
  };
  Object.values(cc).forEach((el) => el.addEventListener('input', calc));
  q('cc-use').addEventListener('click', () => {
    const app = appliance(design.applianceId);
    cc.p.value = String(app.watts);
    cc.l.value = String(design.length);
    cc.s.value = String(design.size);
    cc.m.value = design.method;
    cc.g.value = String(design.group);
    cc.c.value = app.ring ? 'ring' : app.lighting ? 'light' : 'radial';
    calc();
  });
  calc();

  /* ------------------------------ animation ------------------------------ */
  let raf = 0;
  let lastT = 0;
  let acc = 0;
  const frame = (t: number) => {
    const dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 0;
    lastT = t;
    const wasTripped = sim.tripped;
    sim = step(sim, dt, current, design.breaker, ev.iz);
    if (sim.tripped !== wasTripped) scene.render(view());
    else scene.frame(dt, view());
    acc += dt;
    if (sim.tripped !== wasTripped || acc > 0.2) {
      acc = 0;
      refreshLive();
    }
    raf = requestAnimationFrame(frame);
  };

  return {
    activate() {
      if (reduced) return;
      lastT = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    },
    deactivate() {
      cancelAnimationFrame(raf);
    },
  };
};
