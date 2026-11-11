import './earthing.css';
import {
  analyseFault,
  arrangementById,
  arrangements,
  bondSpots,
  lesson,
  MCB_INSTANT,
  quiz,
  R1R2,
  sliderFromZe,
  U0,
  zeFromSlider,
  type ArrangementId,
  type PipeId,
} from '../data/earthing-lesson';
import { mountGuide, pulse } from '../ui/guide';
import { mountQuiz } from '../ui/quiz';
import { buildScene, faultLoop, polyline, spotPoint, TALL, WIDE, type Layout, type SceneState } from './earthing-scene';
import type { ChapterMount } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

const fmtOhm = (z: number) => `${z < 1 ? z.toFixed(2) : z < 10 ? z.toFixed(1) : Math.round(z)} Ω`;
const fmtA = (a: number) => `${a >= 100 ? Math.round(a) : a >= 10 ? a.toFixed(0) : a.toFixed(1)} A`;

type Goal = 'tns' | 'tncs' | 'tt-live' | 'tt-rcd';
const GOALS: { id: Goal; text: string }[] = [
  { id: 'tns', text: 'Cause a fault on TN-S and watch the breaker trip' },
  { id: 'tncs', text: 'Do the same on TN-C-S' },
  { id: 'tt-live', text: 'Try TT without an RCD: does the breaker trip?' },
  { id: 'tt-rcd', text: 'Make TT safe: fit an RCD and try again' },
];

/** Chapter 3: supply and earthing. Switch the arrangement, cause a fault, place the bonding clamps. */
export const mount: ChapterMount = ({ stage, panel, complete }) => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state: SceneState = {
    arr: 'tncs',
    mode: 'earth',
    bonds: { gas: null, water: null },
    fault: 'none',
    rcd: false,
    mcbTripped: false,
    rcdTripped: false,
    reduced,
  };
  let ze = arrangementById(state.arr).ze;
  let layout: Layout = WIDE;
  const goals = new Set<Goal>();
  let faultTimer = 0;
  let toastTimer = 0;
  let focusSpot: string | null = null;

  /* ------------------------------ the stage ------------------------------ */
  stage.innerHTML = `
    <div class="er-scene"></div>
    <div class="er-card" aria-live="polite"></div>
    <div class="er-toast" role="status" aria-live="polite" hidden></div>
    <div class="er-tray" hidden>
      <span class="er-tray-label">Bonding clamps</span>
      <button type="button" class="er-tray-clamp" data-tray="1" aria-label="Bonding clamp: drag it onto a pipe, or tap a ring on a pipe"><i></i></button>
      <button type="button" class="er-tray-clamp" data-tray="2" aria-label="Bonding clamp: drag it onto a pipe, or tap a ring on a pipe"><i></i></button>
    </div>`;
  const sceneHost = stage.querySelector<HTMLElement>('.er-scene')!;
  const card = stage.querySelector<HTMLElement>('.er-card')!;
  const toast = stage.querySelector<HTMLElement>('.er-toast')!;
  const tray = stage.querySelector<HTMLElement>('.er-tray')!;

  /* ------------------------------ the panel ------------------------------ */
  panel.innerHTML = `
    <div class="tabs" role="tablist">
      <button type="button" role="tab" id="er-tab-earth" aria-selected="true" aria-controls="er-view-earth">Earth</button>
      <button type="button" role="tab" id="er-tab-bond" aria-selected="false" aria-controls="er-view-bond">Bond</button>
      <button type="button" role="tab" id="er-tab-quiz" aria-selected="false" aria-controls="er-view-quiz">Quiz</button>
    </div>
    <section role="tabpanel" id="er-view-earth" aria-labelledby="er-tab-earth">
      <div class="detail"><h2>${lesson.title}</h2><p>${lesson.intro}</p></div>

      <div class="wire-label" id="er-arr-label">Earthing arrangement</div>
      <div class="er-seg" role="group" aria-labelledby="er-arr-label">
        ${arrangements.map((a) => `<button type="button" data-arr="${a.id}">${a.name}${a.aka ? `<small>${a.aka}</small>` : ''}</button>`).join('')}
      </div>
      <div class="er-letters" id="er-letters"></div>
      <p class="er-summary" id="er-summary"></p>

      <div class="er-actions">
        <button type="button" class="primary" id="er-fault">Cause a fault</button>
        <label class="er-check"><input type="checkbox" id="er-rcd" /> 30 mA RCD fitted</label>
      </div>

      <div class="slider-card">
        <label for="er-ze">External loop impedance Ze <b id="er-ze-out"></b></label>
        <input type="range" id="er-ze" min="0" max="1000" step="1" />
        <div class="er-ze-row"><small id="er-ze-typ"></small><button type="button" class="ghost er-small" id="er-ze-reset">Typical</button></div>
      </div>
      <div class="readouts">
        <div class="readout"><small>Zs = Ze + R1 + R2 (${R1R2} Ω)</small><b id="er-zs"></b></div>
        <div class="readout"><small>Fault current · ${U0} ÷ Zs</small><b id="er-i"></b></div>
      </div>
      <ul class="wire-results er-verdict" id="er-verdict"></ul>

      <div class="challenge" id="er-goals"></div>

      <div class="uk"><b>UK standards</b>Typical maximum Ze values declared by suppliers: TN-S about 0.8 Ω, TN-C-S about 0.35 Ω, TT often quoted up to about 21 Ω (and your own earth rod can make it higher). The earthing conductor to the MET is typically 16 mm² and main bonding typically 10 mm². A 32 A type B breaker trips almost instantly once the fault current reaches about 5 × 32 = ${MCB_INSTANT} A.</div>
    </section>
    <section role="tabpanel" id="er-view-bond" aria-labelledby="er-tab-bond" hidden>
      <div class="detail"><h2>${lesson.bondTitle}</h2><p>${lesson.bondIntro}</p></div>
      <div class="challenge" id="er-bond-goal"></div>
      <ul class="wire-results" id="er-bond-results"></ul>
      <div class="er-actions"><button type="button" class="ghost" id="er-bond-clear">Take the clamps off</button></div>
      <div class="uk"><b>On the clamp</b>Each bonding clamp carries a permanent label: “Safety electrical connection – do not remove”. The clamp itself must stay accessible for inspection.</div>
      <div class="uk er-gap"><b>Bathrooms: check</b>A bathroom may also need supplementary bonding. Check whether it can be left out: typically that is allowed when every circuit in the room has 30 mA RCD protection, meets its disconnection time, and the metal pipes there are already connected to main bonding.</div>
    </section>
    <section role="tabpanel" id="er-view-quiz" aria-labelledby="er-tab-quiz" hidden></section>`;

  const q = <T extends HTMLElement>(id: string) => panel.querySelector<T>(`#${id}`)!;
  const zeIn = q<HTMLInputElement>('er-ze');
  const rcdIn = q<HTMLInputElement>('er-rcd');
  const faultBtn = q<HTMLButtonElement>('er-fault');

  // tabs
  type Tab = 'earth' | 'bond' | 'quiz';
  const tabIds: Tab[] = ['earth', 'bond', 'quiz'];
  const selectTab = (k: Tab) => {
    tabIds.forEach((t) => {
      q(`er-tab-${t}`).setAttribute('aria-selected', String(t === k));
      q(`er-view-${t}`).hidden = t !== k;
    });
    const mode = k === 'bond' ? 'bond' : 'earth';
    if (mode !== state.mode) {
      state.mode = mode;
      resetFault(false);
      hideToast();
      render();
    }
  };
  tabIds.forEach((t) => q(`er-tab-${t}`).addEventListener('click', () => selectTab(t)));
  mountQuiz(q('er-view-quiz'), quiz, {
    retryHint: 'Have another go at causing faults and placing the clamps, then try again.',
    onFinish: (score, total) => {
      if (score / total >= 0.75) complete();
    },
  });

  /* ------------------------------ rendering ------------------------------ */
  let dotEls: SVGCircleElement[] = [];
  let loopPath = polyline([
    [0, 0],
    [1, 0],
  ]);

  const render = () => {
    sceneHost.innerHTML = buildScene(layout, state);
    const loop = faultLoop(layout, state.arr);
    loopPath = polyline([...loop.out, ...loop.back.slice(1)]);
    const layer = sceneHost.querySelector('.er-dots')!;
    dotEls = [];
    if (state.fault === 'flowing' || state.fault === 'live') {
      const n = Math.floor(loopPath.total / 28);
      for (let i = 0; i < n; i++) {
        const c = document.createElementNS(SVG_NS, 'circle');
        c.setAttribute('class', 'er-dot');
        c.setAttribute('r', '3.6');
        layer.append(c);
        dotEls.push(c);
      }
      placeDots();
    }
    tray.hidden = state.mode !== 'bond';
    stage.classList.toggle('er-mode-bond', state.mode === 'bond');
    const left = 2 - (state.bonds.gas ? 1 : 0) - (state.bonds.water ? 1 : 0);
    tray.querySelectorAll<HTMLButtonElement>('[data-tray]').forEach((b) => (b.hidden = Number(b.dataset.tray) > left));
    tray.classList.toggle('is-empty', left === 0);
    if (focusSpot) {
      sceneHost.querySelector<SVGGElement>(`[data-spot="${focusSpot}"]`)?.focus();
      focusSpot = null;
    }
  };

  const updatePanel = () => {
    const a = arrangementById(state.arr);
    panel.querySelectorAll<HTMLElement>('[data-arr]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.arr === state.arr)));
    q('er-letters').innerHTML = a.letters.map((l) => `<div class="er-letter"><b>${l.l}</b><span>${l.means}</span></div>`).join('');
    q('er-summary').innerHTML = `${a.summary} <span class="er-note">${a.note}</span>`;
    card.innerHTML = `<b>${a.name}${a.aka ? ` <span>(${a.aka})</span>` : ''}</b><small><i class="er-key"></i>Earth fault path: ${a.returnPath}</small>`;

    zeIn.value = String(sliderFromZe(ze));
    q('er-ze-out').textContent = fmtOhm(ze);
    q('er-ze-typ').textContent = `Typical for ${a.name}: up to about ${fmtOhm(a.ze)}`;
    const r = analyseFault(ze, state.rcd);
    q('er-zs').textContent = fmtOhm(r.zs);
    q('er-i').textContent = fmtA(r.current);
    const mcbRow =
      r.mcb === 'instant'
        ? `<li class="ok"><b>32 A type B breaker: trips almost instantly.</b> ${fmtA(r.current)} is more than the ${MCB_INSTANT} A it needs.</li>`
        : r.mcb === 'slow'
          ? `<li class="warn"><b>32 A type B breaker: far too slow.</b> ${fmtA(r.current)} is under the ${MCB_INSTANT} A it needs to trip quickly, so it could take minutes.</li>`
          : `<li><b>32 A type B breaker: never trips.</b> ${fmtA(r.current)} is less than its own 32 A rating. The case stays live.</li>`;
    const rcdRow = state.rcd
      ? `<li class="ok"><b>30 mA RCD: trips.</b> It sees ${fmtA(r.current)} leaking to earth, far more than 30 mA.</li>`
      : r.cleared
        ? ''
        : `<li class="warn"><b>No RCD fitted.</b> Nothing else will disconnect this fault.</li>`;
    q('er-verdict').innerHTML = mcbRow + rcdRow;

    const done = GOALS.every((g) => goals.has(g.id));
    const ch = q('er-goals');
    ch.classList.toggle('ok', done);
    ch.innerHTML = `<b>${done ? 'Nicely done.' : 'Challenge:'}</b> ${done ? 'Low Ze means a big fault current and a fast trip. TT can’t manage that, so it relies on an RCD.' : 'cause a fault on each arrangement.'}
      <ul class="er-goals">${GOALS.map((g) => `<li class="${goals.has(g.id) ? 'is-done' : ''}">${g.text}</li>`).join('')}</ul>`;

    faultBtn.textContent = state.fault === 'none' ? 'Cause a fault' : state.fault === 'cleared' ? 'Reset the breaker' : 'Clear the fault';
    rcdIn.checked = state.rcd;

    // bonding
    const res = (['gas', 'water'] as PipeId[]).map((pipe) => {
      const id = state.bonds[pipe];
      const name = pipe === 'gas' ? 'Gas pipe' : 'Water pipe';
      if (!id) return `<li class="warn"><b>${name}:</b> no clamp yet.</li>`;
      const s = bondSpots.find((b) => b.id === id)!;
      return `<li class="${s.ok ? 'ok' : ''}"><b>${name}: ${s.ok ? 'right' : 'not there'}.</b> ${s.reason}</li>`;
    });
    q('er-bond-results').innerHTML = res.join('');
    const bothOk = (['gas', 'water'] as PipeId[]).every((p) => bondSpots.find((b) => b.id === state.bonds[p])?.ok);
    const bg = q('er-bond-goal');
    bg.classList.toggle('ok', bothOk);
    bg.innerHTML = bothOk
      ? '<b>Both pipes bonded.</b> In a fault, the pipes, the MET and every earthed metal case now rise and fall together.'
      : '<b>Challenge:</b> put one bonding clamp on the gas pipe and one on the water pipe, in the right places. Drag a clamp from the tray, or tap a ring on a pipe.';
  };

  /* ------------------------------ fault logic ------------------------------ */
  const showToast = (html: string, kind: 'ok' | 'bad' | 'warn', ms = 0) => {
    clearTimeout(toastTimer);
    toast.innerHTML = html;
    toast.className = `er-toast is-${kind}`;
    toast.hidden = false;
    stage.classList.add('er-has-toast');
    if (ms) toastTimer = window.setTimeout(hideToast, ms);
  };
  function hideToast() {
    clearTimeout(toastTimer);
    toast.hidden = true;
    stage.classList.remove('er-has-toast');
  }

  function resetFault(rerender = true) {
    clearTimeout(faultTimer);
    state.fault = 'none';
    state.mcbTripped = false;
    state.rcdTripped = false;
    if (rerender) {
      hideToast();
      render();
      updatePanel();
    }
  }

  const finishFault = () => {
    const r = analyseFault(ze, state.rcd);
    const a = arrangementById(state.arr);
    if (r.cleared) {
      state.fault = 'cleared';
      state.mcbTripped = r.mcb === 'instant';
      state.rcdTripped = r.rcdTrips;
      const who = r.mcb === 'instant' && r.rcdTrips ? 'The RCD and breaker' : r.rcdTrips ? 'The RCD' : 'The breaker';
      showToast(`<b>Disconnected.</b> ${fmtA(r.current)} flowed. ${who} tripped in a fraction of a second, and the case is safe again.`, 'ok');
      if (state.arr === 'tns' && r.mcb === 'instant') goals.add('tns');
      if (state.arr === 'tncs' && r.mcb === 'instant') goals.add('tncs');
      if (state.arr === 'tt' && r.rcdTrips) goals.add('tt-rcd');
    } else {
      state.fault = 'live';
      showToast(
        `<b>Still live!</b> Only ${fmtA(r.current)} flows, so the breaker ${r.mcb === 'slow' ? 'would take far too long' : 'never trips'}. Anyone touching the case gets a shock.${state.arr === 'tt' ? ' This is why TT needs an RCD.' : ''}`,
        'bad',
      );
      if (a.id === 'tt') goals.add('tt-live');
    }
    render();
    updatePanel();
  };

  const startFault = () => {
    hideToast();
    state.fault = 'flowing';
    state.mcbTripped = false;
    state.rcdTripped = false;
    render();
    updatePanel();
    showToast(`<b>Fault!</b> Line has touched the metal case. Follow the current home…`, 'warn');
    faultTimer = window.setTimeout(finishFault, reduced ? 400 : 1800);
  };

  faultBtn.addEventListener('click', () => (state.fault === 'none' ? startFault() : resetFault()));
  rcdIn.addEventListener('change', () => {
    state.rcd = rcdIn.checked;
    resetFault();
  });
  zeIn.addEventListener('input', () => {
    ze = zeFromSlider(Number(zeIn.value));
    if (state.fault !== 'none') resetFault();
    else updatePanel();
  });
  q('er-ze-reset').addEventListener('click', () => {
    ze = arrangementById(state.arr).ze;
    resetFault();
  });
  panel.querySelectorAll<HTMLElement>('[data-arr]').forEach((b) =>
    b.addEventListener('click', () => {
      state.arr = b.dataset.arr as ArrangementId;
      ze = arrangementById(state.arr).ze;
      resetFault();
    }),
  );

  /* ------------------------------ bonding game ------------------------------ */
  const place = (spotId: string, from: PipeId | null) => {
    const s = bondSpots.find((b) => b.id === spotId)!;
    const left = 2 - (state.bonds.gas ? 1 : 0) - (state.bonds.water ? 1 : 0);
    if (from === null && left === 0 && state.bonds[s.pipe] === null) return; // no clamps left (cannot happen)
    if (from && from !== s.pipe) state.bonds[from] = null;
    state.bonds[s.pipe] = s.id;
    showToast(`<b>${s.ok ? 'Right.' : 'Not there.'}</b> ${s.reason}`, s.ok ? 'ok' : 'bad', 7000);
    render();
    updatePanel();
  };
  q('er-bond-clear').addEventListener('click', () => {
    state.bonds = { gas: null, water: null };
    hideToast();
    render();
    updatePanel();
  });

  const svgPoint = (cx: number, cy: number) => {
    const svg = sceneHost.querySelector<SVGSVGElement>('svg')!;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const nearestSpot = (cx: number, cy: number) => {
    const p = svgPoint(cx, cy);
    if (!p) return null;
    let best: string | null = null;
    let bd = 34;
    for (const b of bondSpots) {
      const [x, y] = spotPoint(layout, b.pipe, b.dy);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) {
        bd = d;
        best = b.id;
      }
    }
    return best;
  };

  let drag: { from: PipeId | null; ghost: HTMLElement; x0: number; y0: number; moved: boolean; over: string | null } | null = null;
  const highlight = (id: string | null) =>
    sceneHost.querySelectorAll<SVGGElement>('[data-spot]').forEach((g) => g.classList.toggle('is-over', g.dataset.spot === id));

  const startDrag = (e: PointerEvent, from: PipeId | null) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const ghost = document.createElement('div');
    ghost.className = 'er-ghost';
    ghost.innerHTML = '<i></i>';
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    document.body.append(ghost);
    drag = { from, ghost, x0: e.clientX, y0: e.clientY, moved: false, over: null };
    stage.classList.add('er-dragging');
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    drag.ghost.style.left = `${e.clientX}px`;
    drag.ghost.style.top = `${e.clientY}px`;
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) drag.moved = true;
    drag.over = nearestSpot(e.clientX, e.clientY);
    highlight(drag.over);
  };
  const endDrag = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    stage.classList.remove('er-dragging');
    drag?.ghost.remove();
    drag = null;
  };
  const onCancel = () => {
    highlight(null);
    endDrag();
  };
  const onUp = (e: PointerEvent) => {
    if (!drag) return;
    const { from, moved } = drag;
    const target = nearestSpot(e.clientX, e.clientY);
    endDrag();
    if (target && moved) place(target, from);
    else {
      highlight(null);
      if (!moved && from === null) showToast('Now tap a ring on the gas or water pipe to put the clamp there.', 'warn', 5000);
    }
  };
  tray.querySelectorAll<HTMLButtonElement>('[data-tray]').forEach((b) => {
    b.addEventListener('pointerdown', (e) => startDrag(e, null));
    b.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showToast('Tab to a ring on a pipe and press Enter to clamp it there.', 'warn', 5000);
        sceneHost.querySelector<SVGGElement>('[data-spot]')?.focus();
      }
    });
  });
  sceneHost.addEventListener('pointerdown', (e) => {
    const clamp = (e.target as Element).closest<SVGGElement>('[data-clamp]');
    if (clamp && state.mode === 'bond') startDrag(e, clamp.dataset.clamp as PipeId);
  });
  sceneHost.addEventListener('click', (e) => {
    const spot = (e.target as Element).closest<SVGGElement>('[data-spot]');
    if (spot) place(spot.dataset.spot!, null);
  });
  sceneHost.addEventListener('keydown', (e) => {
    const spot = (e.target as Element).closest<SVGGElement>('[data-spot]');
    if (spot && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      focusSpot = spot.dataset.spot!;
      place(spot.dataset.spot!, null);
    }
  });

  /* ------------------------------ layout + animation ------------------------------ */
  const chooseLayout = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    const scale = (l: Layout) => Math.min(w / l.w, h / l.h);
    const next = scale(TALL) > scale(WIDE) * 1.08 ? TALL : WIDE;
    if (next !== layout) {
      layout = next;
      render();
    }
  };
  const ro = new ResizeObserver(chooseLayout);
  ro.observe(stage);

  let offsetS = 0;
  function placeDots() {
    const n = dotEls.length;
    for (let i = 0; i < n; i++) {
      const [x, y] = loopPath.at(offsetS + (i * loopPath.total) / n);
      dotEls[i].setAttribute('cx', x.toFixed(1));
      dotEls[i].setAttribute('cy', y.toFixed(1));
    }
  }
  let raf = 0;
  let last = 0;
  const frame = (t: number) => {
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;
    if (dotEls.length && !reduced) {
      const amps = analyseFault(ze, state.rcd).current;
      offsetS += (50 + 55 * Math.log10(1 + amps)) * dt;
      placeDots();
    }
    raf = requestAnimationFrame(frame);
  };

  render();
  updatePanel();

  /* ------------------------------ the guided walkthrough ------------------------------ */
  const setArrangement = (id: ArrangementId, rcd = false) => {
    selectTab('earth');
    state.arr = id;
    state.rcd = rcd;
    ze = arrangementById(id).ze;
    resetFault();
  };
  const arrButton = (id: ArrangementId) => panel.querySelector(`[data-arr="${id}"]`);
  mountGuide(
    stage,
    [
      {
        title: 'A live metal case',
        text: 'If the line wire touches a metal case, the case becomes live. Earthing gives the fault current an easy path back to the transformer, so a big current flows and the breaker trips.',
        tryIt: 'Press “Cause a fault” and follow the orange dots home.',
        onEnter: () => {
          setArrangement('tncs');
          pulse(faultBtn);
        },
      },
      {
        kicker: 'TN-S',
        title: 'Earth via the cable sheath',
        text: 'Many older streets have a separate earth all the way back, usually the supply cable’s metal sheath. It is a good path, so a big fault current flows.',
        tryIt: 'Cause a fault and watch the breaker trip at once.',
        onEnter: () => {
          setArrangement('tns');
          pulse(arrButton('tns'));
        },
      },
      {
        kicker: 'TN-C-S (PME)',
        title: 'A shared neutral and earth',
        text: 'The most common UK arrangement today. In the street one PEN conductor is both neutral and earth; at your cutout it splits in two.',
        tryIt: 'Read the letters on the right, then cause a fault.',
        onEnter: () => {
          setArrangement('tncs');
          pulse(panel.querySelector('#er-letters'));
        },
      },
      {
        kicker: 'TT',
        title: 'Your own earth rod',
        text: 'Common in rural areas: no earth from the supplier, just your own rod. The ground conducts poorly, so only a few amps flow and the breaker never trips.',
        tryIt: 'Cause a fault, then tick “30 mA RCD fitted” and try again.',
        onEnter: () => {
          setArrangement('tt');
          pulse(rcdIn.closest('label'));
        },
      },
      {
        kicker: 'Ze (Ω)',
        title: 'Low Ze, fast trip',
        text: `Fault current is ${U0} V ÷ Zs (Ze plus the circuit’s own wires). A 32 A type B breaker trips almost instantly at about ${MCB_INSTANT} A, so the earth path must be low.`,
        tryIt: 'Drag the Ze slider up until the breaker becomes far too slow.',
        onEnter: () => {
          setArrangement('tncs');
          pulse(zeIn.closest('.slider-card'));
        },
      },
      {
        kicker: 'Main bonding',
        title: 'Bond the pipes',
        text: 'Metal gas and water pipes can bring a different voltage in from outside. Bonding them to the main earth terminal (MET) makes everything you touch rise together in a fault.',
        tryIt: 'Drag a clamp from the tray onto each pipe.',
        onEnter: () => {
          selectTab('bond');
          pulse(tray);
        },
      },
      {
        title: 'Now it is your turn',
        text: 'Finish the fault challenge on the Earth tab and get both clamps right on the Bond tab, then take the quiz to tick this chapter off.',
        tryIt: 'Open the Quiz tab when you are ready.',
        onEnter: () => pulse(q('er-tab-quiz')),
      },
    ],
    { position: 'top-left' },
  );

  return {
    activate() {
      chooseLayout();
      last = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    },
    deactivate() {
      cancelAnimationFrame(raf);
      endDrag();
    },
  };
};
