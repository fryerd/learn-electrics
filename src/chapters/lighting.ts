import './lighting.css';
import { QUIZ_PASS, coreNotes, intro, levels, quiz, reveals, targets } from '../data/lighting-lesson';
import { mountGuide, pulse, type GuideStep } from '../ui/guide';
import { mountQuiz } from '../ui/quiz';
import { createCircuitView } from './lighting-circuit';
import { createExplorer } from './lighting-explorer';
import {
  LEVELS,
  POSITION_NAMES,
  addWire,
  analyse,
  circuitTerminals,
  nameSpec,
  sameWire,
  wireColour,
  type Analysis,
  type LevelId,
  type SwitchSpec,
  type Wire,
} from './lighting-sim';
import type { ChapterMount } from './types';

type Tab = 'switches' | 'wire' | 'quiz';

/**
 * Chapter 8: lighting and switches.
 * Switches tab: build a switch from gangs, poles and ways. Wire it tab: three levels of lamp circuits
 * with a live simulator. Quiz tab. The chapter is complete when the one-way and two-way levels are
 * solved (without "Show the answer") and the quiz is passed at 4 / 5 or better.
 */
export const mount: ChapterMount = ({ stage, panel, complete }) => {
  /* ------------------------------- state ------------------------------- */
  let tab: Tab = 'switches';
  let spec: SwitchSpec = { gangs: 1, poles: 1, ways: 1 };
  let throws = [0, 0, 0];
  const made = new Set<string>();
  let guidedSpec = false;

  let li = 0;
  const wires = LEVELS.map((l) => [...l.prewired]);
  const positions = LEVELS.map((l) => l.switches.map(() => 0));
  const revealed = LEVELS.map(() => false);
  const hintStep = LEVELS.map(() => -1);
  const solved = new Set<LevelId>();
  let quizPassed = false;
  let note = '';
  let cycle = 0;
  let analysis: Analysis = analyse(LEVELS[0].switches, wires[0]);
  let guideRoot: HTMLElement | null = null;

  /* ------------------------------- stage ------------------------------- */
  stage.classList.add('lt-stage');
  const seg = (name: string, label: string, opts: [string, string][]) => `
    <div class="lt-seg-row"><span class="wire-label" id="lt-${name}-label">${label}</span>
      <div class="lt-seg" role="group" aria-labelledby="lt-${name}-label">
        ${opts.map(([v, t]) => `<button type="button" data-${name}="${v}">${t}</button>`).join('')}
      </div></div>`;
  stage.innerHTML = `
    <div class="lt-main">
      <div class="lt-layer" id="lt-explorer-host"></div>
      <div class="lt-layer" id="lt-circuit-host" hidden></div>
      <div class="lt-status" id="lt-status" aria-live="polite"></div>
    </div>
    <div class="lt-tray" id="lt-tray" hidden>
      <div class="lt-tg" data-g="gangs">${seg('gangs', 'Gangs', [['1', '1'], ['2', '2'], ['3', '3']])}</div>
      <div class="lt-tg" data-g="ways">${seg('ways', 'Ways', [['1', '1-way'], ['2', '2-way'], ['int', 'Intermediate']])}</div>
      <div class="lt-tg" data-g="poles">${seg('poles', 'Poles', [['1', '1'], ['2', '2'], ['3', '3']])}</div>
      <div class="lt-tg" data-g="name"><div class="lt-name" id="lt-name" aria-live="polite"></div></div>
      <div class="lt-tg" data-g="flips">
        <div class="lt-flips" id="lt-flips"></div>
        <table class="lt-truth" id="lt-truth"></table>
      </div>
      <div class="lt-tg" data-g="checks">
        <div class="wire-feedback" aria-live="polite">
          <ul class="wire-results" id="lt-checks"></ul>
          <p class="wire-summary" id="lt-summary"></p>
          <div class="lt-note" id="lt-note"></div>
          <p class="lt-hint" id="lt-hint"></p>
        </div>
        <div class="wire-actions">
          <button type="button" class="ghost" id="lt-hint-btn">Show me a hint</button>
          <button type="button" class="ghost" id="lt-answer-btn">Show the answer</button>
          <button type="button" class="ghost" id="lt-reset-btn">Start again</button>
        </div>
      </div>
    </div>`;
  const tray = stage.querySelector<HTMLElement>('#lt-tray')!;
  const switchIds = ['gangs', 'ways', 'poles', 'name'];
  const wireIds = ['flips', 'checks'];
  const explorerHost = stage.querySelector<HTMLElement>('#lt-explorer-host')!;
  const circuitHost = stage.querySelector<HTMLElement>('#lt-circuit-host')!;
  const statusEl = stage.querySelector<HTMLElement>('#lt-status')!;

  const explorer = createExplorer(explorerHost, (g) => {
    throws[g] = 1 - throws[g];
    renderSwitches();
  });

  const view = createCircuitView(circuitHost, {
    addWire(a, b) {
      const before = wires[li];
      const next = addWire(before, { a, b });
      if (next === before) return;
      wires[li] = next;
      const T = Object.fromEntries(circuitTerminals(LEVELS[li].switches).map((t) => [t.id, t]));
      note = coreNotes[wireColour(T[a], T[b])] ?? '';
      stopCycle();
      renderWire();
    },
    removeWire(i) {
      wires[li] = wires[li].filter((_, j) => j !== i);
      note = '';
      stopCycle();
      renderWire();
    },
    flip(i) {
      stopCycle();
      positions[li][i] = 1 - positions[li][i];
      renderWire();
    },
  });

  /* ------------------------------- panel ------------------------------- */
  const reveal = (r: { title: string; body: string }) => `<details class="lt-reveal"><summary>${r.title}</summary><div>${r.body}</div></details>`;

  panel.innerHTML = `
    <div class="tabs" role="tablist">
      <button type="button" role="tab" id="lt-tab-switches" aria-selected="true">Switches</button>
      <button type="button" role="tab" id="lt-tab-wire" aria-selected="false">Wire it</button>
      <button type="button" role="tab" id="lt-tab-quiz" aria-selected="false">Quiz</button>
    </div>
    <section role="tabpanel" id="lt-view-switches">
      <div class="detail"><h2>${intro.title}</h2><p>${intro.text}</p></div>
      <p class="lt-note-line">Click the rockers on the picture to throw them. The guide on the left has the controls and the challenges.</p>
      <div class="uk"><b>UK practice</b>Most UK plate switches are made two-way, even when only one is fitted: wire COM and L1 and it works as a one-way switch.</div>
    </section>
    <section role="tabpanel" id="lt-view-wire" hidden>
      <details class="lt-reveal lt-wirelist"><summary id="lt-wire-count">Wires</summary><ul id="lt-wires"></ul></details>
      <div class="wire-label lt-gap">Find out more</div>
      ${reveal(reveals.loopIn)}
      ${reveal(reveals.neutral)}
      ${reveal(reveals.testing)}
      <div class="uk"><b>UK standards</b>Switches go in the line conductor, never the neutral. A blue core used as a switched line is identified brown at both ends, and a bare CPC is sleeved green-and-yellow.</div>
    </section>
    <section role="tabpanel" id="lt-view-quiz" hidden>
      <ul class="lt-req" id="lt-req"></ul>
      <div id="lt-quiz"></div>
    </section>`;

  const q = <T extends HTMLElement = HTMLElement>(id: string) => (panel.querySelector<T>(`#${id}`) ?? stage.querySelector<T>(`#${id}`))!;
  const all = <T extends HTMLElement>(sel: string) => [...panel.querySelectorAll<T>(sel), ...stage.querySelectorAll<T>(sel)];

  /* ------------------------------- tabs ------------------------------- */
  const setTab = (t: Tab) => {
    tab = t;
    (['switches', 'wire', 'quiz'] as Tab[]).forEach((k) => {
      q(`lt-tab-${k}`).setAttribute('aria-selected', String(k === t));
      q(`lt-view-${k}`).hidden = k !== t;
    });
    explorerHost.hidden = t !== 'switches';
    circuitHost.hidden = t === 'switches';
    if (t !== 'switches') renderWire();
    else renderSwitches();
    if (typeof showGroups === 'function') showGroups(t === 'switches' ? switchIds : t === 'wire' ? wireIds : []);
    placeGuide();
  };
  (['switches', 'wire', 'quiz'] as Tab[]).forEach((k) => q(`lt-tab-${k}`).addEventListener('click', () => setTab(k)));

  /* ----------------------------- switches tab ----------------------------- */
  const renderSwitches = () => {
    const int = spec.ways === 'int';
    all<HTMLButtonElement>('[data-gangs]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.gangs) === spec.gangs)));
    all<HTMLButtonElement>('[data-poles]').forEach((b) => {
      b.setAttribute('aria-pressed', String(!int && Number(b.dataset.poles) === spec.poles));
      b.disabled = int;
    });
    all<HTMLButtonElement>('[data-ways]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ways === String(spec.ways))));
    const nm = nameSpec(spec);
    q('lt-name').innerHTML = `<small>${int ? `${spec.gangs} gang · intermediate` : `${spec.gangs} gang · ${spec.poles} pole · ${spec.ways} way`}</small>
      <b>${nm.name}</b><p>${nm.use}</p>
      <span class="lt-pill ${nm.common ? 'ok' : ''}">${nm.common ? 'Common in UK homes' : 'Unusual in a house'}</span>`;

    const hit = targets.find((t) => t.spec.gangs === spec.gangs && t.spec.ways === spec.ways && (spec.ways === 'int' || t.spec.poles === spec.poles));
    const wasMade = hit ? made.has(hit.id) : true;
    if (hit && !guidedSpec) made.add(hit.id);
    if (hit && !wasMade && !guidedSpec) markMade(hit.id);
    explorer.render(spec, throws);
    if (tab === 'switches') statusEl.innerHTML = `<b>${nm.name}</b><span>Click a rocker to throw it</span>`;
  };
  const onSwitchClick = (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b) return;
    if (b.dataset.gangs) spec = { ...spec, gangs: Number(b.dataset.gangs) };
    else if (b.dataset.poles) spec = { ...spec, poles: Number(b.dataset.poles) };
    else if (b.dataset.ways) spec = { ...spec, ways: b.dataset.ways === 'int' ? 'int' : (Number(b.dataset.ways) as 1 | 2) };
    else return;
    throws = [0, 0, 0];
    renderSwitches();
  };
  panel.addEventListener('click', onSwitchClick);
  stage.querySelector('#lt-tray')!.addEventListener('click', onSwitchClick);

  /* ------------------------------- wire tab ------------------------------- */
  const level = () => LEVELS[li];
  const posName = (i: number, p: number) => {
    const sw = level().switches[i];
    return sw.type === 'one-way' ? (p ? 'on' : 'off') : POSITION_NAMES[sw.type][p];
  };

  /** The first answer wire not yet in place, for the hint pulse. */
  const nextMissing = (): Wire | undefined => level().answer.find((w) => !wires[li].some((x) => sameWire(x, w)));

  const renderWire = () => {
    const L = level();
    const copy = levels[L.id];
    analysis = analyse(L.switches, wires[li]);
    const combo = analysis.combos[positions[li].reduce((m, b) => m * 2 + b, 0)];
    if (analysis.solved && !revealed[li]) solved.add(L.id);

    const hintTerms = hintStep[li] >= 0 && !analysis.solved ? (() => {
      const w = nextMissing();
      return w ? [w.a, w.b] : [];
    })() : [];
    view.render({ level: L, wires: wires[li], positions: positions[li], state: combo, hint: hintTerms });

    q('lt-flips').innerHTML =
      L.switches.map((sw, i) => `<button type="button" class="ghost" data-flip="${i}">Flip ${sw.label.toLowerCase()} <b>${posName(i, positions[li][i])}</b></button>`).join('') +
      `<button type="button" class="primary" data-cycle="1">${cycle ? 'Stop' : 'Try every position'}</button>`;

    // truth table: every combination, click a row to set it
    q('lt-truth').innerHTML = `<thead><tr>${L.switches.map((s) => `<th>${s.label}</th>`).join('')}<th>Lamp</th></tr></thead><tbody>${analysis.combos
      .map((c, ci) => {
        const now = c.positions.every((p, i) => p === positions[li][i]);
        const lamp = c.short ? '<span class="lt-bad">trips</span>' : c.lit ? '<span class="lt-on">ON</span>' : c.lampLive ? '<span class="lt-bad">off, live!</span>' : 'off';
        return `<tr class="${now ? 'now' : ''}" data-combo="${ci}" tabindex="0">${c.positions.map((p, i) => `<td>${posName(i, p)}</td>`).join('')}<td>${lamp}</td></tr>`;
      })
      .join('')}</tbody>`;

    q('lt-checks').innerHTML = analysis.checks.map((c) => `<li class="${c.level === 'ok' ? 'ok' : c.level === 'warn' ? 'warn' : ''}"><b>${c.title}.</b> ${c.text}</li>`).join('');
    const sum = q('lt-summary');
    sum.className = 'wire-summary';
    if (analysis.solved) {
      sum.classList.add('ok');
      sum.innerHTML = revealed[li] ? 'That is the answer, working. Press “Start again” and build it yourself to tick off this level.' : `Solved. ${copy.solved}`;
    } else sum.textContent = '';
    q('lt-note').innerHTML = note;
    q('lt-hint').innerHTML = hintStep[li] >= 0 && !analysis.solved ? `<b>Hint ${hintStep[li] + 1}:</b> ${copy.hints[hintStep[li]]}` : '';
    q<HTMLButtonElement>('lt-hint-btn').textContent = hintStep[li] < 0 ? 'Show me a hint' : hintStep[li] < copy.hints.length - 1 ? 'Another hint' : 'Hint again';

    const T = Object.fromEntries(circuitTerminals(L.switches).map((t) => [t.id, t]));
    const nameOf = (id: string) => {
      const t = T[id];
      const comp = t.comp === 'sup' ? 'Supply' : t.comp === 'rose' ? 'Rose' : t.comp === 'lamp' ? 'Lamp' : L.switches.find((s) => s.id === t.comp)!.label;
      return `${comp} ${t.label}`;
    };
    q('lt-wire-count').textContent = `Wires (${wires[li].length}): list and remove`;
    q('lt-wires').innerHTML = wires[li].length
      ? wires[li]
          .map((w, i) => `<li><i class="lt-sw lt-c-${wireColour(T[w.a], T[w.b])}"></i>${nameOf(w.a)} → ${nameOf(w.b)} <button type="button" class="lt-x" data-remove="${i}" aria-label="Remove wire ${nameOf(w.a)} to ${nameOf(w.b)}">×</button></li>`)
          .join('')
      : '<li>No wires yet.</li>';

    // stage status chip
    if (tab !== 'switches') {
      const lamp = combo.short ? '<b class="lt-bad">Short circuit</b>' : combo.lit ? '<b class="lt-on">Lamp on</b>' : '<b>Lamp off</b>';
      statusEl.innerHTML = `${lamp}<span>${L.switches.map((_, i) => `${L.switches[i].label}: ${posName(i, positions[li][i])}`).join(' · ')}</span>`;
    }
    renderReq();
  };

  const stopCycle = () => {
    if (cycle) clearInterval(cycle);
    cycle = 0;
  };
  const startCycle = () => {
    stopCycle();
    let ci = 0;
    const step = () => {
      const combos = analysis.combos;
      positions[li] = [...combos[ci % combos.length].positions];
      ci++;
      renderWire();
      if (ci >= combos.length + 1) {
        stopCycle();
        renderWire();
      }
    };
    cycle = window.setInterval(step, 1100);
    step();
  };

  const setLevel = (i: number) => {
    stopCycle();
    li = i;
    note = '';
    renderWire();
    placeGuide();
  };

  const onWireClick = (e: Event) => {
    const t = e.target as HTMLElement;
    const b = t.closest<HTMLButtonElement>('button');
    const row = t.closest<HTMLElement>('[data-combo]');
    if (row) {
      stopCycle();
      positions[li] = [...analysis.combos[Number(row.dataset.combo)].positions];
      renderWire();
      return;
    }
    if (!b) return;
    if (b.dataset.flip) {
      stopCycle();
      const i = Number(b.dataset.flip);
      positions[li][i] = 1 - positions[li][i];
      renderWire();
    } else if (b.dataset.cycle) {
      if (cycle) {
        stopCycle();
        renderWire();
      } else startCycle();
    } else if (b.dataset.remove) {
      wires[li] = wires[li].filter((_, j) => j !== Number(b.dataset.remove));
      renderWire();
    } else if (b.id === 'lt-hint-btn') {
      hintStep[li] = Math.min(hintStep[li] + 1, levels[level().id].hints.length - 1);
      renderWire();
    } else if (b.id === 'lt-answer-btn') {
      wires[li] = [...level().answer];
      revealed[li] = true;
      note = '';
      startCycle();
    } else if (b.id === 'lt-reset-btn') {
      stopCycle();
      wires[li] = [...level().prewired];
      positions[li] = level().switches.map(() => 0);
      revealed[li] = false;
      hintStep[li] = -1;
      note = '';
      renderWire();
    }
  };
  q('lt-view-wire').addEventListener('click', onWireClick);
  stage.querySelector('#lt-tray')!.addEventListener('click', onWireClick);
  q('lt-truth').addEventListener('keydown', (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-combo]');
    if (row && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      row.click();
    }
  });

  /* ------------------------------- quiz + completion ------------------------------- */
  const renderReq = () => {
    const items: [boolean, string][] = [
      [solved.has('one-way'), 'Solve level 1 (one-way) yourself'],
      [solved.has('two-way'), 'Solve level 2 (two-way) yourself'],
      [quizPassed, `Score at least ${QUIZ_PASS} out of ${quiz.length} in the quiz`],
    ];
    q('lt-req').innerHTML = `<li class="lt-req-head">To finish this chapter</li>` + items.map(([ok, t]) => `<li class="${ok ? 'ok' : ''}"><i aria-hidden="true"></i>${t}</li>`).join('');
    if (items.every(([ok]) => ok)) complete();
  };
  mountQuiz(q('lt-quiz'), quiz, {
    retryHint: 'Flip a few switches in the “Wire it” tab, then try again.',
    onFinish: (score) => {
      if (score >= QUIZ_PASS) quizPassed = true;
      renderReq();
    },
  });

  renderSwitches();
  renderWire();
  setTab('switches');

  /* ------------------------------- stage guide ------------------------------- */
  // The free corner depends on the picture: the switch plate leaves the top clear; level 1's circuit
  // leaves the bottom right clear; levels 2 and 3 need the bottom for switches, so the card goes top right.
  function placeGuide() {
    if (!guideRoot) return;
    const corner = tab === 'switches' ? 'top-right' : li === 0 ? 'bottom-right' : 'top-right';
    guideRoot.classList.remove('gd-top-left', 'gd-top-right', 'gd-bottom-left', 'gd-bottom-right');
    guideRoot.classList.add(`gd-${corner}`);
  }
  const setSpec = (s: SwitchSpec) => {
    spec = s;
    throws = [0, 0, 0];
    guidedSpec = true; // set up by the guide: it does not count as the learner making the switch
    setTab('switches');
    guidedSpec = false;
  };
  /** Show only the controls this step is about. */
  function showGroups(ids: string[]) {
    tray.querySelectorAll<HTMLElement>('.lt-tg').forEach((g) => (g.hidden = !ids.includes(g.dataset.g!)));
    tray.hidden = ids.length === 0;
  }
  const segRow = (name: string) => tray.querySelector(`[data-${name}]`)?.closest('.lt-seg-row');
  const showLevel = (i: number) => {
    setTab('wire');
    setLevel(i);
    showGroups(wireIds);
  };
  const seen = new Set<number>();
  let refreshing = false;
  const MK_AT = 3;
  const makeStep = (t: (typeof targets)[number], i: number): GuideStep => ({
    kicker: `Make it · ${i + 1} of ${targets.length}`,
    title: t.label,
    text: 'Use Gangs, Ways and Poles under the picture to build the switch for the job. The front of the plate does not change with poles or ways: only what is behind it does.',
    tryIt: 'Match the switch to the job. Its name appears under the picture when you have it.',
    onEnter: () => {
      if (refreshing) return;
      if (!seen.has(i)) {
        seen.add(i);
        setSpec({ gangs: 1, poles: 1, ways: 1 });
      } else {
        guidedSpec = true; // arriving on a step never counts as making the switch
        setTab('switches');
        guidedSpec = false;
      }
      showGroups(switchIds);
    },
  });
  const steps: GuideStep[] = [
    {
      kicker: 'Gangs',
      title: 'Three words describe any switch',
      text: 'Gangs, poles and ways. Gangs is the easy one: how many separate switches share one faceplate. A 2-gang plate works two different lights.',
      tryIt: 'Pick 2 or 3 Gangs and watch more rockers appear on the plate.',
      onEnter: () => {
        if (refreshing) return;
        setSpec({ gangs: 1, poles: 1, ways: 1 });
        showGroups(['gangs', 'name']);
        pulse(segRow('gangs'));
      },
    },
    {
      kicker: 'Ways',
      title: 'One-way or two-way',
      text: 'Ways is how many positions each arm can connect to. A one-way switch just opens or closes. A two-way switch flips its common (COM) between L1 and L2, which lets two switches share one light.',
      tryIt: 'Click the rocker on the picture and watch the arm swap from L1 to L2.',
      onEnter: () => {
        setSpec({ gangs: 1, poles: 1, ways: 2 });
        showGroups(['ways', 'name']);
        pulse(segRow('ways'));
      },
    },
    {
      kicker: 'Poles',
      title: 'More poles, more arms',
      text: 'Poles is how many arms move together when you press one switch. A double-pole switch breaks line and neutral at once, which is why it is used to isolate things like a cooker.',
      tryIt: 'Set Poles to 3: that is the isolator for a bathroom fan with an overrun timer.',
      onEnter: () => {
        setSpec({ gangs: 1, poles: 2, ways: 1 });
        showGroups(['poles', 'name']);
        pulse(segRow('poles'));
      },
    },
    ...targets.map(makeStep),
    {
      kicker: 'Level 1',
      title: 'Wire a one-way light',
      text: 'The supply loops in to the ceiling rose, the lamp hangs from it, and a switch drop runs down to the switch. The switch always goes in the line, never the neutral. Click a terminal, then another, to run a core.',
      tryIt: 'Stuck? Press “Show me a hint” under the picture.',
      onEnter: () => {
        showLevel(0);
        pulse(q('lt-hint-btn'));
      },
    },
    {
      kicker: 'Level 2',
      title: 'Two switches, one light',
      text: 'For stairs, two two-way switches are joined by two strappers. The lamp lights only when both switches pick the same strapper, so either end can turn it on or off.',
      tryIt: 'Once it is wired, press “Try every position” and watch the truth table.',
      onEnter: () => {
        showLevel(1);
        pulse(tray.querySelector('[data-cycle]'));
      },
    },
    {
      kicker: 'Level 3',
      title: 'Add an intermediate',
      text: 'For three or more places, put an intermediate switch in the strappers. It either passes them straight through or swaps them over.',
      tryIt: 'Wire it, then flip each switch in turn: any one of the three should change the light.',
      onEnter: () => {
        showLevel(2);
        pulse(q('lt-flips'));
      },
    },
    {
      title: 'Now it is your turn',
      text: 'Solve levels 1 and 2 yourself (without “Show the answer”), then pass the quiz to tick this chapter off.',
      tryIt: 'Open the Quiz tab when you are ready.',
      onEnter: () => {
        showGroups([]);
        pulse(q('lt-tab-quiz'));
      },
    },
  ];
  const guide = mountGuide(stage, steps, { position: 'top-right' });
  /** A challenge switch was just made: tick its step. */
  function markMade(id: string) {
    const i = targets.findIndex((t) => t.id === id);
    if (i < 0) return;
    steps[MK_AT + i].kicker = `Make it · ${i + 1} of ${targets.length} · done ✓`;
    if (guide.current() === MK_AT + i) {
      refreshing = true;
      guide.go(MK_AT + i);
      refreshing = false;
    }
  }
  // On wide screens the card is inside the stage; on phones it is docked just after #stage.
  guideRoot = stage.querySelector<HTMLElement>(':scope > .gd') ?? (document.getElementById('stage')?.nextElementSibling as HTMLElement | null);
  placeGuide();

  return {
    activate() {
      view.activate();
    },
    deactivate() {
      stopCycle();
      view.deactivate();
    },
  };
};
