import './fault-loop.css';
import { challenges, lesson, quiz, startSetup, supplies } from '../data/fault-loop-lesson';
import { mountGuide, pulse, type GuideStep } from '../ui/guide';
import { mountQuiz } from '../ui/quiz';
import {
  analyse,
  CABLES,
  cableById,
  INSTANT_MULTIPLE,
  meterReading,
  r1r2PerMetre,
  RATINGS,
  type Result,
  type Setup,
} from './fault-loop-model';
import type { ChapterMount } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

/* ------------------------------ formatting ------------------------------ */
const ohm = (z: number) => `${z >= 10 ? z.toFixed(1) : z.toFixed(2)} Ω`;
const amps = (a: number) => (a >= 1000 ? `${(a / 1000).toFixed(2)} kA` : a >= 100 ? `${Math.round(a)} A` : `${a.toFixed(1)} A`);
const times = (m: number) => `${m >= 10 ? m.toFixed(0) : m.toFixed(1)} × In`;

/* -------------------------- Ze slider (log scale) -------------------------- */
const ZE_MIN = 0.05;
const ZE_MAX = 30;
const zeFromSlider = (v: number) => {
  const z = ZE_MIN * Math.pow(ZE_MAX / ZE_MIN, v / 1000);
  return z >= 5 ? Math.round(z * 10) / 10 : Math.round(z * 100) / 100;
};
const sliderFromZe = (z: number) => Math.round((1000 * Math.log(z / ZE_MIN)) / Math.log(ZE_MAX / ZE_MIN));

/* ------------------------------ stage layouts ------------------------------ */
interface Geo {
  w: number;
  h: number;
  xL: number; // left edge (transformer)
  xCU: number; // consumer unit
  xR: number; // appliance case wall
  yT: number;
  yB: number;
  appW: number;
  appTop: number;
  appBot: number;
  yF: number; // fault point
  barY: number;
  barX0: number;
  barX1: number;
  regionTop: number;
  big: number; // font size of big values
  pulses: number;
}
const WIDE: Geo = {
  w: 860, h: 540, xL: 130, xCU: 430, xR: 690, yT: 150, yB: 390, appW: 120, appTop: 182, appBot: 330, yF: 232,
  barY: 478, barX0: 40, barX1: 820, regionTop: 76, big: 26, pulses: 18,
};
const TALL: Geo = {
  w: 430, h: 600, xL: 50, xCU: 176, xR: 316, yT: 150, yB: 420, appW: 92, appTop: 182, appBot: 360, yF: 232,
  barY: 536, barX0: 20, barX1: 410, regionTop: 76, big: 21, pulses: 13,
};

type Phase = 'flow' | 'playing' | 'tripped' | 'stuck';

/** Chapter 6: the earth fault loop. A live loop picture, a sandbox, challenges and a virtual loop tester. */
export const mount: ChapterMount = ({ stage, panel, complete }) => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const s: Setup = { ...startSetup };
  let supplyKind = 'tncs';
  let r: Result = analyse(s);

  /* =============================== the stage =============================== */
  const chip = (attrs: string, label: string, small = '') =>
    `<button type="button" class="fl-opt" ${attrs} aria-pressed="false"><b>${label}</b>${small ? `<small>${small}</small>` : ''}</button>`;
  stage.innerHTML = `
    <div class="fl-stage">
      <div class="fl-main" id="fl-main">
      <div class="fl-loop-scene" id="fl-loop-scene">
        <div class="fl-svg-host" id="fl-svg-host"></div>
        <div class="fl-overlay">
          <button type="button" class="fl-play" id="fl-play"><span aria-hidden="true">▶</span> Play the fault</button>
          <p class="fl-status" id="fl-status" aria-live="polite"></p>
        </div>
      </div>
      <div class="fl-meter-scene" id="fl-meter-scene" hidden>
        <div class="fl-meter-box">
          ${meterSvg()}
          <button type="button" class="fl-test-btn" id="fl-test-stage" aria-label="Press test on the meter">TEST</button>
        </div>
      </div>
      </div>
      <div class="fl-tray" id="fl-tray">
      <div class="fl-group fl-tg" data-g="supply">
        <div class="wire-label">Supply · Ze</div>
        <div class="fl-row3" role="group" aria-label="Supply type">
          ${supplies.map((p) => chip(`data-supply="${p.id}"`, p.label, p.note)).join('')}
        </div>
        <div class="slider-card">
          <label for="fl-ze">Ze, outside your home <b id="fl-ze-out"></b></label>
          <input type="range" id="fl-ze" min="0" max="1000" step="1" />
        </div>
      </div>

      <div class="fl-group fl-tg" data-g="cable">
        <div class="wire-label">Cable · line / CPC in mm²</div>
        <div class="fl-cables" role="group" aria-label="Cable size">
          ${CABLES.map((c) => chip(`data-cable="${c.id}"`, c.id, `${r1r2PerMetre(c).toFixed(2)} mΩ/m`)).join('')}
        </div>
        <div class="fl-row2" role="group" aria-label="Circuit shape">
          ${chip('data-ring="0"', 'Radial', 'one run out')}${chip('data-ring="1"', 'Ring', 'out and back')}
        </div>
        <div class="slider-card">
          <label for="fl-len"><span id="fl-len-name">Run length</span> <b id="fl-len-out"></b></label>
          <input type="range" id="fl-len" min="1" max="200" step="1" />
        </div>
        <p class="fl-sum" id="fl-r1r2"></p>
      </div>

      <div class="fl-group fl-tg" data-g="brk">
        <div class="wire-label">Breaker</div>
        <div class="fl-row2" role="group" aria-label="Breaker type">
          ${chip('data-type="B"', 'Type B', 'trips at about 5 × In')}${chip('data-type="C"', 'Type C', 'trips at about 10 × In')}
        </div>
        <div class="fl-ratings" role="group" aria-label="Breaker rating">
          ${RATINGS.map((a) => chip(`data-rating="${a}"`, `${a} A`)).join('')}
        </div>
      </div>

      <div class="fl-group fl-tg" data-g="result">
      <div class="readouts fl-readouts">
        <div class="readout"><small>Zs = Ze + R1 + R2</small><b id="fl-o-zs"></b></div>
        <div class="readout"><small>If = 230 ÷ Zs</small><b id="fl-o-if"></b></div>
        <div class="readout"><small>If as a multiple</small><b id="fl-o-mult"></b></div>
        <div class="readout"><small>Limit · 80% of max</small><b id="fl-o-lim"></b></div>
      </div>
      <ul class="wire-results fl-verdict" id="fl-verdict" aria-live="polite"></ul>

      </div>
      <div class="fl-group fl-tg" data-g="answer"><button type="button" class="primary" id="fl-answer">None of them can</button></div>
      <div class="fl-group fl-tg" data-g="meter">
      <div class="fl-setup">
        <small>Testing the furthest socket of</small>
        <b id="fl-m-setup"></b>
        <button type="button" class="ghost fl-change" id="fl-m-change">Change the circuit</button>
      </div>
      <div class="readouts">
        <div class="readout"><small>Reading · Zs</small><b id="fl-m-zs">–</b></div>
        <div class="readout"><small>Prospective fault current</small><b id="fl-m-pfc">–</b></div>
      </div>
      <div class="fl-judge" id="fl-judge" aria-live="polite"><p class="wire-hint">Press test to take a reading.</p></div>
      </div>
      </div>
    </div>`;
  const st = <T extends Element>(id: string) => stage.querySelector<T>(`#${id}`)!;
  const svgHost = st<HTMLElement>('fl-svg-host');

  let geo: Geo = WIDE;
  let loopPath: SVGPathElement | null = null;
  let loopLen = 1;
  let pulses: SVGCircleElement[] = [];
  const el: Record<string, SVGElement> = {};

  const buildLoop = (g: Geo) => {
    geo = g;
    svgHost.innerHTML = loopSvg(g);
    svgHost.querySelectorAll<SVGElement>('[id^="fl-"]').forEach((e) => (el[e.id.slice(3)] = e));
    loopPath = svgHost.querySelector<SVGPathElement>('#fl-path');
    loopLen = loopPath!.getTotalLength();
    const layer = el['pulses'];
    pulses = [];
    for (let i = 0; i < g.pulses; i++) {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('class', 'fl-pulse');
      layer.append(c);
      pulses.push(c);
    }
    drawStage();
    placePulses();
  };

  /* =============================== the panel =============================== */

  panel.innerHTML = `
    <div class="tabs fl-tabs" role="tablist">
      <button type="button" role="tab" id="fl-tab-loop" aria-controls="fl-view-loop" aria-selected="true">Loop</button>
      <button type="button" role="tab" id="fl-tab-meter" aria-controls="fl-view-meter" aria-selected="false">Meter</button>
      <button type="button" role="tab" id="fl-tab-quiz" aria-controls="fl-view-quiz" aria-selected="false">Quiz</button>
    </div>

    <section role="tabpanel" id="fl-view-loop" aria-labelledby="fl-tab-loop">
      <div class="detail"><h2><span class="badge">6</span>${lesson.title}</h2><p>${lesson.intro}</p></div>

      <p class="fl-sum">Every control now sits under the picture, and the guide walks you through them one at a time.</p>

      <details class="fl-more">
        <summary>Why 0.4 seconds, 50 V and 30 mA?</summary>
        <p>During a fault the metal case is no longer at earth potential: it sits at a voltage until the breaker cuts the supply. The rules aim to cut it off before anyone touching that metal is exposed for long.</p>
        <p>Two numbers sit behind the rules of thumb. About <b>50 V</b> is treated as the highest touch voltage that can safely be left in place in ordinary dry conditions. <b>30 mA</b> is the trip level of the RCDs used for extra protection. Put them together: 50 V ÷ 0.03 A ≈ <b>1667 Ω</b>. So on a TT supply with a 30 mA RCD, an earth rod of up to that resistance would still keep the touch voltage under 50 V (in practice you want it far lower).</p>
        <p>Measured Zs is compared with <b>80%</b> of the maximum because the test is done with the cable cool. In use it warms up, and warm copper has more resistance.</p>
      </details>
      <div class="uk"><b>UK standards</b>BS 7671 (the 18th Edition) sets the maximum Zs for each type and rating of breaker, so that home final circuits on a TN supply disconnect within 0.4 s. The values here are for a 230 V supply.</div>
    </section>

    <section role="tabpanel" id="fl-view-meter" aria-labelledby="fl-tab-meter" hidden>
      <div class="detail"><h2><span class="badge">6</span>${lesson.meterTitle}</h2><p>${lesson.meterIntro}</p></div>
      <div class="wire-label fl-gap">How to judge a reading</div>
      <ol class="fl-steps">
        <li>Find the maximum Zs for the breaker’s type and rating.</li>
        <li>Take 80% of it, because the cable will be warmer in use.</li>
        <li>The reading must be at or below that figure.</li>
      </ol>
      <div class="fl-safety">
        <b>Live test: safety first</b>
        This test is done with the circuit switched on, so it is only for competent people using a proper instrument with leads and probes that meet HSE guidance GS38. Do it only after the dead tests have passed, above all the continuity of the CPC: if the earth path is broken, the test can put line voltage on the metalwork. Many testers have a “no trip” setting so the test does not trip an RCD.
      </div>
      <div class="uk"><b>UK standards</b>At the origin of the installation, the prospective fault current also tells you whether the breakers can safely interrupt that much current. Home breakers are commonly rated 6 kA.</div>
    </section>

    <section role="tabpanel" id="fl-view-quiz" aria-labelledby="fl-tab-quiz" hidden></section>`;

  const q = <T extends HTMLElement>(id: string) => (panel.querySelector<T>(`#${id}`) ?? stage.querySelector<T>(`#${id}`))!;
  const all = (sel: string) => [...panel.querySelectorAll<HTMLElement>(sel), ...stage.querySelectorAll<HTMLElement>(sel)];
  const zeIn = q<HTMLInputElement>('fl-ze');
  const lenIn = q<HTMLInputElement>('fl-len');

  /* --------------------------------- tabs --------------------------------- */
  type Tab = 'loop' | 'meter' | 'quiz';
  const tabs: Record<Tab, { btn: HTMLElement; view: HTMLElement }> = {
    loop: { btn: q('fl-tab-loop'), view: q('fl-view-loop') },
    meter: { btn: q('fl-tab-meter'), view: q('fl-view-meter') },
    quiz: { btn: q('fl-tab-quiz'), view: q('fl-view-quiz') },
  };
  const showTab = (k: Tab) => {
    for (const [key, { btn, view }] of Object.entries(tabs)) {
      btn.setAttribute('aria-selected', String(key === k));
      view.hidden = key !== k;
    }
    st<HTMLElement>('fl-meter-scene').hidden = k !== 'meter';
    st<HTMLElement>('fl-loop-scene').hidden = k === 'meter';
    if (typeof showGroups === 'function') showGroups(k === 'meter' ? ['meter'] : k === 'loop' ? loopIds : []);
  };
  (Object.keys(tabs) as Tab[]).forEach((k) => tabs[k].btn.addEventListener('click', () => showTab(k)));
  q('fl-m-change').addEventListener('click', () => showTab('loop'));

  mountQuiz(tabs.quiz.view, quiz, {
    retryHint: 'Have another play with the loop, then try again.',
    onFinish: (score, total) => {
      if (score / total >= 0.75) complete();
    },
  });

  /* ------------------------------ challenges ------------------------------ */
  // Each challenge is a step of the stage guide (see the end of this file). Its "Try it" box
  // doubles as live feedback while the learner works.
  let ci = 0;
  let loaded = -1;
  const solved = new Set<string>();
  let guide: ReturnType<typeof mountGuide> | undefined;
  let chStart = 0; // index of the first challenge step
  const plain = (h: string) => h.replace(/<\/?b>/g, '');
  let lastFb = '';
  let refreshing = false; // true while the feedback itself redraws the guide card

  const updateChallenge = () => {
    if (!guide) return;
    const c = challenges[ci];
    const at = chStart + ci;
    if (guide.current() !== at) return;
    let kicker = `Challenge ${ci + 1} of ${challenges.length}`;
    let text = '';
    if (solved.has(c.id)) {
      kicker += ' · solved ✓';
      text = `Solved. ${plain(c.answer ? c.answer.reveal : c.reveal)}`;
    } else if (loaded === ci) {
      const res = c.check(s, r);
      if (res.done) {
        solved.add(c.id);
        updateChallenge();
        return;
      }
      text = res.msg;
    } else {
      text = 'Setting up the circuit…';
    }
    if (text === lastFb) return;
    lastFb = text;
    chSteps[ci].kicker = kicker;
    chSteps[ci].tryIt = text;
    refreshing = true;
    guide.go(at);
    refreshing = false;
  };
  const chSteps: GuideStep[] = [];
  const answerBtn = q<HTMLButtonElement>('fl-answer');
  answerBtn.addEventListener('click', () => {
    solved.add(challenges[ci].id);
    updateChallenge();
    update();
  });

  /* ------------------------------ controls ------------------------------ */
  all('[data-supply]').forEach((b) =>
    b.addEventListener('click', () => {
      const p = supplies.find((x) => x.id === b.dataset.supply)!;
      supplyKind = p.id;
      s.ze = p.ze;
      update();
    }),
  );
  zeIn.addEventListener('input', () => {
    s.ze = zeFromSlider(Number(zeIn.value));
    if (s.ze >= 5) supplyKind = 'tt';
    else if (supplyKind === 'tt') supplyKind = 'tncs';
    update();
  });
  all('[data-cable]').forEach((b) =>
    b.addEventListener('click', () => {
      s.cable = b.dataset.cable!;
      update();
    }),
  );
  all('[data-ring]').forEach((b) =>
    b.addEventListener('click', () => {
      s.ring = b.dataset.ring === '1';
      update();
    }),
  );
  lenIn.addEventListener('input', () => {
    s.length = Number(lenIn.value);
    update();
  });
  all('[data-type]').forEach((b) =>
    b.addEventListener('click', () => {
      s.type = b.dataset.type as 'B' | 'C';
      update();
    }),
  );
  all('[data-rating]').forEach((b) =>
    b.addEventListener('click', () => {
      s.rating = Number(b.dataset.rating);
      update();
    }),
  );
  const press = (sel: string, on: (b: HTMLElement) => boolean) =>
    all(sel).forEach((b) => b.setAttribute('aria-pressed', String(on(b))));

  /* ------------------------------ the meter ------------------------------ */
  let reading: { zs: number; limit: number; label: string } | null = null;
  let testing = 0;
  const lcd = {
    main: st<SVGTextElement>('fl-lcd-main'),
    sub: st<SVGTextElement>('fl-lcd-sub'),
    mode: st<SVGTextElement>('fl-lcd-mode'),
  };
  const testBtns = [st<HTMLButtonElement>('fl-test-stage')];
  const judgeEl = q('fl-judge');

  const runTest = () => {
    if (testing) return;
    reading = null;
    testBtns.forEach((b) => (b.disabled = true));
    lcd.mode.textContent = 'TESTING';
    lcd.sub.textContent = '';
    judgeEl.innerHTML = '<p class="wire-hint">Testing…</p>';
    q('fl-m-zs').textContent = '…';
    q('fl-m-pfc').textContent = '…';
    let n = 0;
    const tick = () => {
      lcd.main.textContent = '-'.repeat((n % 4) + 1).padEnd(4, ' ');
      n++;
    };
    tick();
    const spin = window.setInterval(tick, 180);
    testing = window.setTimeout(
      () => {
        window.clearInterval(spin);
        testing = 0;
        testBtns.forEach((b) => (b.disabled = false));
        const z = meterReading(r.zs);
        const pfc = 230 / z;
        reading = { zs: z, limit: r.limit80, label: `${s.type}${s.rating}` };
        lcd.mode.textContent = 'Zs  L–PE';
        lcd.main.textContent = z >= 10 ? z.toFixed(1) : z.toFixed(2);
        lcd.sub.textContent = `PFC ${amps(pfc)}`;
        q('fl-m-zs').textContent = ohm(z);
        q('fl-m-pfc').textContent = amps(pfc);
        judgeEl.innerHTML = `
          <p><b>Your call:</b> the breaker is a type ${s.type} ${s.rating} A. Is ${ohm(z)} within the limit?</p>
          <div class="fl-row2">
            <button type="button" class="ghost" data-judge="ok">Within the limit</button>
            <button type="button" class="ghost" data-judge="high">Too high</button>
          </div>
          <div id="fl-judge-fb"></div>`;
        judgeEl.querySelectorAll<HTMLElement>('[data-judge]').forEach((b) =>
          b.addEventListener('click', () => judge(b.dataset.judge === 'ok')),
        );
      },
      reduced ? 300 : 1300,
    );
  };
  const judge = (saidOk: boolean) => {
    if (!reading) return;
    const ok = reading.zs <= reading.limit + 1e-9;
    const max = reading.limit / 0.8;
    const right = saidOk === ok;
    judgeEl.querySelector('#fl-judge-fb')!.innerHTML = `
      <ul class="wire-results"><li class="${right ? 'ok' : ''}"><b>${right ? 'Correct.' : 'Not quite.'}</b>
      A ${reading.label} allows ${ohm(max)}; 80% of that is ${ohm(reading.limit)}. The reading of ${ohm(reading.zs)} is
      ${ok ? 'at or under it, so it passes.' : 'over it, so it fails: the breaker might not clear a fault in time.'}</li></ul>`;
  };
  testBtns.forEach((b) => b.addEventListener('click', runTest));

  /* ------------------------------ play the fault ------------------------------ */
  let phase: Phase = 'flow';
  let playT = 0;
  let holdT = 0;
  const playBtn = st<HTMLButtonElement>('fl-play');
  const statusEl = st<HTMLElement>('fl-status');
  const setStatus = (t: string) => {
    if (statusEl.textContent !== t) statusEl.textContent = t;
  };
  const setPhase = (p: Phase) => {
    phase = p;
    stage.querySelector('.fl-stage')!.setAttribute('data-phase', p);
    playBtn.disabled = p !== 'flow';
    if (p === 'flow') setStatus('');
    if (p === 'tripped')
      setStatus(`Tripped in well under 0.1 s. The case is safe again.`);
    if (p === 'stuck')
      setStatus(
        r.mayNeverTrip
          ? '0.4 s gone and still live. With so little current this breaker may never trip.'
          : '0.4 s gone and still live. The breaker will only trip slowly, on overload.',
      );
    drawStage();
  };
  playBtn.addEventListener('click', () => {
    playT = 0;
    holdT = 0;
    if (reduced) setPhase(r.fastEnough ? 'tripped' : 'stuck');
    else setPhase('playing');
  });

  /* ============================== update / draw ============================== */
  const bandW = (z: number) => 4 + 24 * (1 - Math.exp(-z / 0.6));

  const drawStage = () => {
    if (!loopPath) return;
    const g = geo;
    const set = (k: string, a: string, v: string | number) => el[k]?.setAttribute(a, String(v));
    const txt = (k: string, v: string) => {
      if (el[k] && el[k].textContent !== v) el[k].textContent = v;
    };

    set('band-ze', 'stroke-width', bandW(s.ze));
    set('band-r1', 'stroke-width', bandW(r.r1));
    set('band-r2', 'stroke-width', bandW(r.r2));
    txt('ze-val', ohm(s.ze));
    txt('r1-val', ohm(r.r1));
    txt('r2-val', ohm(r.r2));
    txt('if-val', amps(r.fault));
    txt('mult-val', geo === TALL ? times(r.multiple) : `${times(r.multiple)} · needs ≈ ${INSTANT_MULTIPLE[s.type]}×`);
    txt('brk-label', `${s.type}${s.rating}`);
    const ret = supplies.find((x) => x.id === supplyKind)!;
    const via = supplyKind === 'tt' ? 'the ground' : supplyKind === 'tns' ? 'cable sheath' : 'PEN conductor';
    txt('ret-label', geo === TALL ? `via ${via.replace(' conductor', '')}` : `return via ${via}`);
    el['ret']?.setAttribute('class', `fl-ret fl-ret-${ret.id}`);

    // verdict pill
    const v = r.status;
    el['verdict']?.setAttribute('class', `fl-verdict-pill ${v}`);
    txt('verdict-t', v === 'pass' ? 'PASS' : v === 'warn' ? 'TOO CLOSE' : 'FAIL');
    txt('verdict-s', v === 'fail' ? 'too slow to disconnect' : v === 'warn' ? 'fails the 80% check' : 'disconnects in time');

    // stacked bar
    const scale = Math.max(r.maxZs * 1.18, r.zs * 1.04);
    const span = g.barX1 - g.barX0;
    const px = (z: number) => (z / scale) * span;
    let x = g.barX0;
    (
      [
        ['ze', s.ze, 'Ze'],
        ['r1', r.r1, 'R1'],
        ['r2', r.r2, 'R2'],
      ] as const
    ).forEach(([k, z, name]) => {
      const w = px(z);
      set(`bar-${k}`, 'x', x);
      set(`bar-${k}`, 'width', Math.max(0, w));
      set(`bar-${k}-t`, 'x', x + w / 2);
      txt(`bar-${k}-t`, w > 34 ? name : '');
      x += w;
    });
    txt('bar-title', `Zs = ${ohm(s.ze)} + ${ohm(r.r1)} + ${ohm(r.r2)} = ${ohm(r.zs)}`);
    const x80 = g.barX0 + px(r.limit80);
    const xMax = g.barX0 + px(r.maxZs);
    set('tick-80', 'x1', x80);
    set('tick-80', 'x2', x80);
    set('tick-max', 'x1', xMax);
    set('tick-max', 'x2', xMax);
    const close = xMax - g.barX0 < 150 || xMax - x80 < 8;
    if (close) {
      set('tick-80-t', 'x', g.barX0);
      set('tick-80-t', 'text-anchor', 'start');
      txt('tick-80-t', `limit ${ohm(r.limit80)} (80% of ${ohm(r.maxZs)})`);
      txt('tick-max-t', '');
    } else {
      set('tick-80-t', 'x', x80 - 4);
      set('tick-80-t', 'text-anchor', 'end');
      txt('tick-80-t', `80% limit ${ohm(r.limit80)}`);
      set('tick-max-t', 'x', xMax + 4);
      txt('tick-max-t', `max ${ohm(r.maxZs)}`);
    }

    // pulse look follows the fault current
    const norm = Math.min(1, Math.max(0, (Math.log10(r.fault) - 0.5) / 2.9));
    speed = 30 + 300 * norm;
    const rad = 2.6 + 3.2 * norm;
    pulses.forEach((p) => {
      p.setAttribute('r', rad.toFixed(1));
    });
    el['pulses']?.style.setProperty('opacity', phase === 'tripped' ? '0' : String(0.35 + 0.65 * norm));
  };

  let speed = 100;
  let offset = 0;
  const placePulses = () => {
    if (!loopPath) return;
    pulses.forEach((p, i) => {
      const pt = loopPath!.getPointAtLength((offset + (i * loopLen) / pulses.length) % loopLen);
      p.setAttribute('cx', pt.x.toFixed(1));
      p.setAttribute('cy', pt.y.toFixed(1));
    });
  };

  const update = () => {
    r = analyse(s);

    // controls
    q('fl-ze-out').textContent = ohm(s.ze);
    zeIn.value = String(sliderFromZe(s.ze));
    zeIn.setAttribute('aria-valuetext', ohm(s.ze));
    lenIn.value = String(s.length);
    q('fl-len-name').textContent = s.ring ? 'Ring length, end to end' : 'Run length';
    q('fl-len-out').textContent = `${s.length} m`;
    press('[data-supply]', (b) => b.dataset.supply === supplyKind);
    press('[data-cable]', (b) => b.dataset.cable === s.cable);
    press('[data-ring]', (b) => (b.dataset.ring === '1') === s.ring);
    press('[data-type]', (b) => b.dataset.type === s.type);
    press('[data-rating]', (b) => Number(b.dataset.rating) === s.rating);
    const perM = r1r2PerMetre(cableById(s.cable));
    q('fl-r1r2').innerHTML = s.ring
      ? `R1 + R2 at the middle of the ring = ${perM.toFixed(2)} mΩ/m × ${s.length} m ÷ 4 = <b>${ohm(r.r1r2)}</b>`
      : `R1 + R2 = ${perM.toFixed(2)} mΩ/m × ${s.length} m = <b>${ohm(r.r1r2)}</b>`;

    // readouts
    q('fl-o-zs').textContent = ohm(r.zs);
    q('fl-o-if').textContent = amps(r.fault);
    q('fl-o-mult').textContent = times(r.multiple);
    q('fl-o-lim').textContent = ohm(r.limit80);

    const need = INSTANT_MULTIPLE[s.type];
    const verdict =
      r.status === 'pass'
        ? `<li class="ok"><b>Pass.</b> Zs ${ohm(r.zs)} is under ${ohm(r.limit80)} (80% of ${ohm(r.maxZs)}). About ${times(r.multiple)} flows, more than the ≈ ${need}× a type ${s.type} needs to trip instantly, so it disconnects well inside 0.4 s.</li>`
        : r.status === 'warn'
          ? `<li class="warn"><b>Too close.</b> Zs ${ohm(r.zs)} is under the ${ohm(r.maxZs)} maximum, so it would trip in time today, but it is over the 80% figure of ${ohm(r.limit80)}. Once the cable warms up in use it could become too slow.</li>`
          : `<li><b>Fail.</b> Zs ${ohm(r.zs)} is over the ${ohm(r.maxZs)} maximum. Only ${amps(r.fault)} (${times(r.multiple)}) flows${
              r.multiple >= need ? ', and the tables allow for the supply running up to 5% low, so there is not enough margin over' : ', short of'
            } the ≈ ${need}× needed for an instant trip. So the metalwork could stay dangerous for ${r.mayNeverTrip ? 'a long time: this breaker may never trip at all' : 'seconds or longer'}.${s.ze >= 5 ? ' On a TT supply that is normal: an RCD has to do this job.' : ''}</li>`;
    const v = q('fl-verdict');
    if (v.innerHTML !== verdict) v.innerHTML = verdict;

    q('fl-m-setup').textContent = `${s.type}${s.rating} · ${s.cable} ${s.ring ? 'ring' : 'radial'}, ${s.length} m · Ze ${ohm(s.ze)}`;

    if (phase !== 'flow') setPhase('flow');
    drawStage();
    if (reduced) placePulses();
    updateChallenge();
  };

  /* ------------------------------ layout + animation ------------------------------ */
  const pickLayout = () => {
    const { width, height } = st<HTMLElement>('fl-main').getBoundingClientRect();
    if (!width || !height) return;
    const want = width >= 600 && width / height >= 1.12 ? WIDE : TALL;
    if (want !== geo || !loopPath) buildLoop(want);
  };
  const ro = new ResizeObserver(pickLayout);
  ro.observe(st<HTMLElement>('fl-main'));

  let raf = 0;
  let last = 0;
  let flicker = 0;
  const frame = (t: number) => {
    const realDt = last ? Math.min((t - last) / 1000, 0.5) : 0;
    const dt = Math.min(realDt, 0.05);
    last = t;

    // the play sequence runs on real time, so it keeps pace even if frames are dropped
    if (phase === 'playing') {
      playT += realDt;
      const factor = r.fastEnough ? 0.025 : 0.125; // slow motion
      const clock = playT * factor;
      setStatus(`Fault! t = ${clock.toFixed(2)} s (slow motion)`);
      if (r.fastEnough && playT >= 1.6) setPhase('tripped');
      else if (!r.fastEnough && clock >= 0.4) setPhase('stuck');
    } else if (phase === 'tripped' || phase === 'stuck') {
      holdT += realDt;
      if (holdT > 4) setPhase('flow');
    }

    if (phase !== 'tripped') offset = (offset + speed * dt) % loopLen;
    placePulses();

    flicker += dt;
    if (flicker > 0.07 && el['spark']) {
      flicker = 0;
      el['spark'].style.opacity = phase === 'tripped' ? '0' : (0.55 + Math.random() * 0.45).toFixed(2);
    }
    raf = requestAnimationFrame(frame);
  };

  pickLayout();
  if (!loopPath) buildLoop(WIDE);
  update();
  setPhase('flow');

  /* ------------------------------ the stage guide ------------------------------ */
  /** Put the loop back to the starting circuit, with some settings changed, and show the Loop tab. */
  const load = (change: Partial<Setup> = {}) => {
    showTab('loop');
    Object.assign(s, startSetup, change);
    supplyKind = s.ze >= 5 ? 'tt' : Math.abs(s.ze - 0.8) < 0.01 ? 'tns' : 'tncs';
    loaded = -1;
    update();
  };
  const cardOf = (e: Element) => e.closest('.slider-card') ?? e;
  const tray = st<HTMLElement>('fl-tray');
  /** Show only the controls this step is about. */
  function showGroups(ids: string[]) {
    tray.querySelectorAll<HTMLElement>('.fl-tg').forEach((g) => (g.hidden = !ids.includes(g.dataset.g!)));
    tray.hidden = ids.length === 0;
  }
  const point = (e: Element | null | undefined) => pulse(e);

  const loopIds = ['supply', 'cable', 'brk', 'result'];
  const seen = new Set<number>();
  const challengeStep = (i: number): GuideStep => {
    const c = challenges[i];
    const groups = [['cable', 'result'], ['cable', 'result'], ['brk', 'result'], ['supply', 'brk', 'result', 'answer']][i] ?? loopIds;
    const step: GuideStep = {
      kicker: `Challenge ${i + 1} of ${challenges.length}`,
      title: c.title,
      text: plain(c.ask),
      tryIt: 'Setting up the circuit…',
      onEnter: () => {
        if (refreshing) return;
        showTab('loop');
        showGroups(groups);
        ci = i;
        lastFb = '';
        answerBtn.hidden = !c.answer;
        if (c.answer) answerBtn.textContent = c.answer.label;
        if (!seen.has(i)) {
          seen.add(i);
          loaded = i;
          Object.assign(s, c.setup);
          supplyKind = c.setup.ze >= 5 ? 'tt' : Math.abs(c.setup.ze - 0.8) < 0.01 ? 'tns' : 'tncs';
          update();
        }
        queueMicrotask(updateChallenge);
      },
    };
    chSteps[i] = step;
    return step;
  };

  const steps: GuideStep[] = [
    {
      title: 'When metal goes live',
      text: 'If the line wire touches a metal case, current rushes through the case, back along the earth wire (CPC) and home to the transformer. That round trip is the earth fault loop.',
      tryIt: 'Follow the glowing dots from the transformer, through the spark and back along the bottom.',
      onEnter: () => {
        load();
        showGroups([]);
      },
    },
    {
      kicker: 'Ohms (Ω)',
      title: 'Zs adds up the whole loop',
      text: 'Zs = Ze + R1 + R2. Ze is the supply outside your home, R1 is your line wire and R2 your earth wire. The bar along the bottom stacks all three.',
      tryIt: 'Drag the Run length slider and watch R1, R2 and the bar grow.',
      onEnter: () => {
        load();
        showGroups(['cable']);
        point(cardOf(lenIn));
      },
    },
    {
      kicker: 'Amps (A)',
      title: 'Low Zs, fast trip',
      text: 'Fault current = 230 V ÷ Zs. A type B breaker trips instantly at about 5 times its rating, so a healthy loop trips it in a flash.',
      tryIt: 'Press “Play the fault” and watch the breaker trip in slow motion.',
      onEnter: () => {
        load();
        showGroups(['result']);
        pulse(playBtn);
      },
    },
    {
      kicker: '0.4 seconds',
      title: 'Too much cable fails',
      text: 'This radial is 55 m long. Zs is now too high, the current too small, and the metal case could stay live for longer than the 0.4 s allowed.',
      tryIt: 'Play the fault, then pick thicker cables until the verdict says PASS.',
      onEnter: () => {
        load({ length: 55 });
        showGroups(['cable', 'result']);
        point(tray.querySelector('.fl-cables'));
      },
    },
    {
      kicker: 'Type B or C',
      title: 'The breaker sets the limit',
      text: 'A type C needs about 10 times its rating to trip instantly, twice a type B, so its maximum Zs is about half. This garage circuit fails on a C32.',
      tryIt: 'Switch to Type B, then try lower ratings and watch the 80% limit on the bar move.',
      onEnter: () => {
        load({ ze: 0.8, length: 20, type: 'C' });
        showGroups(['brk', 'result']);
        point(tray.querySelector('[data-type]')?.parentElement);
      },
    },
    {
      kicker: 'TT supply',
      title: 'An earth rod is not enough',
      text: 'On a TT supply the fault current returns through the ground via your own earth rod, so Ze is far higher. Only a few amps flow, so an RCD has to do the job instead of the breaker.',
      tryIt: 'Try any breaker: none pass. Then press TN-C-S to compare.',
      onEnter: () => {
        load({ ze: 21, length: 20, rating: 6 });
        showGroups(['supply', 'brk', 'result']);
        point(tray.querySelector('[data-supply]')?.parentElement);
      },
    },
    ...challenges.map((_, i) => challengeStep(i)),
    {
      kicker: 'The loop tester',
      title: 'Measure Zs for real',
      text: 'Electricians measure Zs at the furthest socket with a loop tester. It sends a small current round the loop and works out Zs and the prospective fault current (230 V ÷ Zs).',
      tryIt: 'Press TEST on the meter.',
      onEnter: () => {
        load({ length: 30, type: 'B', rating: 32 });
        showTab('meter');
        showGroups(['meter']);
        pulse(st('fl-test-stage'));
      },
    },
    {
      kicker: 'Judging the reading',
      title: 'Is it low enough?',
      text: 'Find the maximum Zs for the breaker’s type and rating, take 80% of it because the cable will be warmer in use, then check the reading is at or below that. This test is done live, so only competent people with proper GS38 leads should do it.',
      tryIt: 'Press TEST, then say whether the reading is within the limit.',
      onEnter: () => {
        showTab('meter');
        showGroups(['meter']);
        pulse(st('fl-test-stage'));
      },
    },
    {
      title: 'Now the quiz',
      text: 'You have followed the loop, changed it and measured it. Take the quiz to tick this chapter off.',
      tryIt: 'Open the Quiz tab.',
      onEnter: () => {
        showTab('quiz');
        showGroups([]);
        pulse(tabs.quiz.btn);
      },
    },
  ];
  chStart = 6;
  guide = mountGuide(stage, steps, { position: 'top-left' });

  return {
    activate() {
      pickLayout();
      if (reduced) return;
      last = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    },
    deactivate() {
      cancelAnimationFrame(raf);
      if (phase !== 'flow') setPhase('flow');
    },
  };
};

/* ================================ SVG builders ================================ */

function loopSvg(g: Geo): string {
  const midY = (g.yT + g.yB) / 2;
  const tTop = midY - 34;
  const tBot = midY + 34;
  const wx = g.xR + 14; // where the line drops into the appliance
  const loopD = `M${g.xL} ${tTop} V${g.yT} H${wx} V${g.yF} H${g.xR} V${g.yB} H${g.xL} Z`;
  const small = g === TALL;
  const cuHalf = small ? 26 : 36;
  const cuL = g.xCU - cuHalf;
  const cuR = g.xCU + cuHalf;
  const leftMid = small ? (g.xL + cuL) / 2 + 10 : (g.xL + g.xCU) / 2;
  const zeX = small ? leftMid : leftMid + 16;
  const rightMid = (cuR + g.xR) / 2;

  return `
  <svg viewBox="0 0 ${g.w} ${g.h}" class="fl-svg" role="img" aria-label="The earth fault loop: from the transformer along the line conductor, through the fault into the metal case, back along the CPC and the supply's earth return to the transformer.">
    <defs>
      <filter id="fl-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <linearGradient id="fl-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3f5f7"/><stop offset="1" stop-color="#cfd5dc"/></linearGradient>
      <filter id="fl-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#1d232b" flood-opacity="0.14"/></filter>
    </defs>

    <!-- regions -->
    <rect class="fl-region" x="8" y="${g.regionTop}" width="${cuL - 22}" height="${g.yB + 54 - g.regionTop}" rx="16"/>
    <rect class="fl-region fl-home" x="${cuL - 6}" y="${g.regionTop}" width="${g.w - cuL - 2}" height="${g.yB + 54 - g.regionTop}" rx="16"/>
    <text class="fl-region-t" x="22" y="${g.regionTop + 22}">SUPPLY NETWORK</text>
    <text class="fl-region-t" x="${cuL + 8}" y="${g.regionTop + 22}">YOUR INSTALLATION</text>

    <!-- resistance bands: width follows each resistance -->
    <path id="fl-band-ze" class="fl-band fl-band-ze" d="M${cuL} ${g.yT} H${g.xL} V${g.yB} H${cuL}"/>
    <path id="fl-band-r1" class="fl-band fl-band-r1" d="M${cuR} ${g.yT} H${wx} V${g.yF}"/>
    <path id="fl-band-r2" class="fl-band fl-band-r2" d="M${g.xR} ${g.appBot} V${g.yB} H${cuR}"/>

    <!-- consumer unit -->
    <rect class="fl-cu" x="${cuL}" y="${g.yT - 34}" width="${cuHalf * 2}" height="${g.yB - g.yT + 66}" rx="10"/>
    <text class="fl-small fl-mid" x="${g.xCU}" y="${g.yB + 50}">Consumer unit</text>

    <!-- appliance -->
    <rect class="fl-case" id="fl-case" x="${g.xR}" y="${g.appTop}" width="${g.appW}" height="${g.appBot - g.appTop}" rx="10" filter="url(#fl-shadow)"/>
    <circle class="fl-case-dial" cx="${g.xR + g.appW / 2 + 6}" cy="${g.appBot - 44}" r="${small ? 18 : 24}"/>
    <text class="fl-small fl-mid" x="${g.xR + g.appW / 2 + 4}" y="${g.appTop - 10}">Metal case</text>

    <!-- conductors -->
    <path id="fl-ret" class="fl-ret fl-ret-tncs" d="M${g.xCU - 20} ${g.yB} H${g.xL} V${tBot}"/>
    <path class="fl-line" d="M${g.xL} ${tTop} V${g.yT} H${g.xCU - 22}"/>
    <path class="fl-line fl-line-r1" d="M${g.xCU + 22} ${g.yT} H${wx} V${g.yF - 6} q0 6 -6 6 H${g.xR + 3}"/>
    <path class="fl-cpc" d="M${g.xR} ${g.appBot} V${g.yB} H${g.xCU + 20}"/>
    <path class="fl-cpc fl-cpc-y" d="M${g.xR} ${g.appBot} V${g.yB} H${g.xCU + 20}"/>
    <line class="fl-wall" x1="${g.xR}" y1="${g.yF}" x2="${g.xR}" y2="${g.appBot}"/>
    <circle class="fl-term" cx="${g.xR}" cy="${g.appBot}" r="4.5"/>

    <!-- transformer + earthed star point -->
    <g class="fl-tx">
      <circle cx="${g.xL}" cy="${midY - 13}" r="22"/>
      <circle cx="${g.xL}" cy="${midY + 13}" r="22"/>
    </g>
    <text class="fl-small" x="${g.xL + 30}" y="${midY - 40}">Transformer</text>
    <path class="fl-earth" d="M${g.xL} ${g.yB} v14 m-12 0 h24 m-18 6 h12 m-7 6 h2"/>

    <!-- MET + breaker -->
    <rect class="fl-met" x="${g.xCU - 26}" y="${g.yB - 11}" width="52" height="22" rx="4"/>
    <text class="fl-met-t" x="${g.xCU}" y="${g.yB + 5}">MET</text>
    <g class="fl-brk">
      <rect x="${g.xCU - 24}" y="${g.yT - 22}" width="48" height="44" rx="7"/>
      <rect class="fl-lever" x="${g.xCU - 6}" y="${g.yT - 16}" width="12" height="14" rx="3"/>
      <text id="fl-brk-label" class="fl-brk-t" x="${g.xCU}" y="${g.yT + 16}">B32</text>
    </g>

    <!-- current pulses -->
    <path id="fl-path" d="${loopD}" fill="none" stroke="none"/>
    <g id="fl-pulses" class="fl-pulses" filter="url(#fl-glow)"></g>

    <!-- the fault -->
    <path id="fl-spark" class="fl-spark" filter="url(#fl-glow)" d="M${g.xR + 3} ${g.yF} l-9 -12 l5 0 l-8 -12 l13 13 l-5 0 l9 11 l12 -6 l-4 5 l12 -2 l-14 8 z"/>
    <text class="fl-fault-t" x="${g.xR + 12}" y="${g.yF + 24}">fault</text>

    <!-- labels -->
    <text class="fl-cap fl-mid" x="${zeX}" y="${midY + 40}">${small ? 'Ze' : 'Ze · supply side'}</text>
    <text id="fl-ze-val" class="fl-val fl-mid fl-c-ze" x="${zeX}" y="${midY + 40 + g.big}" style="font-size:${g.big}px">0.35 Ω</text>
    <text id="fl-ret-label" class="fl-small fl-mid" x="${leftMid}" y="${g.yB + 26}">return via PEN</text>

    <text class="fl-cap fl-mid" x="${rightMid}" y="${g.yT + 40}">R1 · line</text>
    <text id="fl-r1-val" class="fl-val fl-mid fl-c-r1" x="${rightMid}" y="${g.yT + 40 + g.big - 2}" style="font-size:${g.big - 4}px">0.22 Ω</text>
    <text class="fl-cap fl-mid" x="${rightMid}" y="${g.yB - 30 - (g.big - 4)}">R2 · CPC</text>
    <text id="fl-r2-val" class="fl-val fl-mid fl-c-r2" x="${rightMid}" y="${g.yB - 30}" style="font-size:${g.big - 4}px">0.36 Ω</text>

    <text class="fl-cap fl-mid" x="${rightMid}" y="${midY - 8}">${small ? 'fault current' : 'fault current If'}</text>
    <text id="fl-if-val" class="fl-val fl-mid fl-c-if" x="${rightMid}" y="${midY - 8 + g.big}" style="font-size:${g.big}px">400 A</text>
    <text id="fl-mult-val" class="fl-small fl-mid" x="${rightMid}" y="${midY + g.big + 12}">12 × In</text>

    <!-- verdict -->
    <g id="fl-verdict" class="fl-verdict-pill pass">
      <rect x="${g.w - (small ? 166 : 200)}" y="16" width="${small ? 150 : 184}" height="50" rx="12"/>
      <text id="fl-verdict-t" class="fl-verdict-t" x="${g.w - (small ? 152 : 184)}" y="38">PASS</text>
      <text id="fl-verdict-s" class="fl-verdict-s" x="${g.w - (small ? 152 : 184)}" y="56">disconnects in time</text>
    </g>

    <!-- Zs adds up -->
    <text id="fl-bar-title" class="fl-bar-title" x="${g.barX0}" y="${g.barY - 14}">Zs</text>
    <rect class="fl-bar-bg" x="${g.barX0}" y="${g.barY}" width="${g.barX1 - g.barX0}" height="24" rx="6"/>
    <rect id="fl-bar-ze" class="fl-bar fl-f-ze" y="${g.barY}" height="24"/>
    <rect id="fl-bar-r1" class="fl-bar fl-f-r1" y="${g.barY}" height="24"/>
    <rect id="fl-bar-r2" class="fl-bar fl-f-r2" y="${g.barY}" height="24"/>
    <line id="fl-tick-80" class="fl-tick" y1="${g.barY - 6}" y2="${g.barY + 30}"/>
    <line id="fl-tick-max" class="fl-tick fl-tick-max" y1="${g.barY - 6}" y2="${g.barY + 30}"/>
    <text id="fl-bar-ze-t" class="fl-bar-t" y="${g.barY + 17}"></text>
    <text id="fl-bar-r1-t" class="fl-bar-t" y="${g.barY + 17}"></text>
    <text id="fl-bar-r2-t" class="fl-bar-t" y="${g.barY + 17}"></text>
    <text id="fl-tick-80-t" class="fl-small" y="${g.barY + 46}"></text>
    <text id="fl-tick-max-t" class="fl-small fl-soft" y="${g.barY + 46}"></text>
  </svg>`;
}

function meterSvg(): string {
  return `
  <svg viewBox="0 0 480 460" class="fl-meter-svg" role="img" aria-label="A loop tester plugged into a socket. Its screen shows the Zs reading and the prospective fault current.">
    <defs>
      <filter id="fl-mshadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#1d232b" flood-opacity="0.18"/></filter>
      <linearGradient id="fl-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2c540"/><stop offset="1" stop-color="#e0a92a"/></linearGradient>
    </defs>
    <!-- socket -->
    <rect x="24" y="36" width="176" height="176" rx="18" class="fl-plate" filter="url(#fl-mshadow)"/>
    <rect x="148" y="58" width="34" height="22" rx="5" class="fl-rocker"/>
    <text x="165" y="96" class="fl-msmall fl-mid">ON</text>
    <!-- plug in the socket -->
    <rect x="56" y="84" width="96" height="108" rx="16" class="fl-plug"/>
    <rect x="94" y="100" width="20" height="10" rx="2" class="fl-plug-mark"/>
    <text x="104" y="158" class="fl-plug-t fl-mid">TEST</text>
    <path d="M104 192 C104 290 160 330 248 330" class="fl-lead"/>
    <!-- meter -->
    <rect x="232" y="64" width="228" height="376" rx="26" fill="url(#fl-body)" class="fl-mbody" filter="url(#fl-mshadow)"/>
    <rect x="250" y="84" width="192" height="122" rx="12" class="fl-bezel"/>
    <rect x="260" y="94" width="172" height="102" rx="6" class="fl-lcd"/>
    <text id="fl-lcd-mode" x="270" y="114" class="fl-lcd-s">Zs  L–PE</text>
    <text x="422" y="114" class="fl-lcd-s fl-end">NO TRIP</text>
    <text id="fl-lcd-main" x="402" y="160" class="fl-lcd-big fl-end">- - -</text>
    <text x="422" y="160" class="fl-lcd-u fl-end">Ω</text>
    <text id="fl-lcd-sub" x="270" y="186" class="fl-lcd-s"></text>
    <!-- rotary dial -->
    <circle cx="346" cy="268" r="40" class="fl-dial"/>
    <path d="M346 268 L322 246" class="fl-pointer"/>
    <circle cx="346" cy="268" r="9" class="fl-knob"/>
    <text x="300" y="226" class="fl-msmall fl-mid">LOOP</text>
    <text x="394" y="226" class="fl-msmall fl-mid">RCD</text>
    <text x="400" y="318" class="fl-msmall fl-mid">Ω</text>
    <text x="292" y="318" class="fl-msmall fl-mid">OFF</text>
    <circle cx="346" cy="378" r="34" class="fl-test-ring"/>
  </svg>`;
}
