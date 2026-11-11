import { basics, presets, quiz } from '../data/basics-lesson';
import { mountGuide, pulse } from '../ui/guide';
import { mountQuiz } from '../ui/quiz';
import type { ChapterMount } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

const fmtV = (v: number) => `${Math.round(v)} V`;
const fmtR = (r: number) => `${Math.round(r)} Ω`;
const fmtA = (a: number) => `${a >= 10 ? a.toFixed(1) : a.toFixed(2)} A`;
const fmtW = (w: number) => (w >= 1000 ? `${(w / 1000).toFixed(1)} kW` : `${Math.round(w)} W`);

// Layout of the pipe animation (SVG units).
const PIPE_X0 = 195;
const PIPE_LEN = 300;
const PIPE_Y = 279;
const PIPE_H = 34;
const VALVE_X = 320;
const WATER_BOTTOM = 307;
const WATER_MAX = 225;
const DOTS = 26;

/** Chapter 1: electricity basics. A water-pipe animation driven by voltage and resistance sliders. */
export const mount: ChapterMount = ({ stage, panel, complete: onComplete }) => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let volts = 230;
  let ohms = 100;
  let find: 'V' | 'I' | 'R' = 'I';

  /* ------------------------------ the picture ------------------------------ */
  stage.innerHTML = `
    <svg viewBox="0 0 640 404" class="bs-svg" role="img" aria-label="A tank (voltage) feeding a pipe with a narrow section (resistance); the flow is the current and a lamp at the end shows the power.">
      <defs><clipPath id="bs-tank-clip"><rect x="44" y="74" width="142" height="233" rx="10"/></clipPath></defs>
      <text class="bs-label" x="115" y="54" text-anchor="middle">VOLTAGE · pressure</text>
      <rect class="bs-water" id="bs-water" x="44" y="100" width="142" height="207" clip-path="url(#bs-tank-clip)"/>
      <rect class="bs-tank" x="40" y="70" width="150" height="240" rx="12"/>
      <text class="bs-big" id="bs-v" x="115" y="200" text-anchor="middle">230 V</text>

      <rect class="bs-pipe" x="190" y="${PIPE_Y - PIPE_H / 2}" width="${PIPE_LEN + 12}" height="${PIPE_H}"/>
      <g id="bs-dots"></g>
      <rect class="bs-valve" id="bs-valve-top" x="${VALVE_X}" y="${PIPE_Y - PIPE_H / 2}" width="60" height="8"/>
      <rect class="bs-valve" id="bs-valve-bot" x="${VALVE_X}" y="${PIPE_Y + PIPE_H / 2 - 8}" width="60" height="8"/>
      <text class="bs-label" x="350" y="334" text-anchor="middle">RESISTANCE · narrow pipe</text>
      <text class="bs-big" id="bs-r" x="350" y="358" text-anchor="middle">100 Ω</text>

      <text class="bs-label" x="258" y="236" text-anchor="middle">CURRENT · flow</text>
      <text class="bs-big" id="bs-i" x="258" y="258" text-anchor="middle">2.30 A</text>

      <circle class="bs-glow" id="bs-glow" cx="538" cy="${PIPE_Y}" r="40"/>
      <circle class="bs-lamp" cx="538" cy="${PIPE_Y}" r="26"/>
      <path class="bs-fil" d="M527 ${PIPE_Y + 6} l5 -10 l6 10 l6 -10 l5 10"/>
      <text class="bs-label" x="538" y="222" text-anchor="middle">POWER · work done</text>
      <text class="bs-big" id="bs-p" x="538" y="334" text-anchor="middle">529 W</text>

      <foreignObject x="30" y="320" width="170" height="40"><div class="bs-slider slider-card"><input type="range" id="bs-vin" aria-label="Voltage" min="0" max="250" step="1" value="${volts}" /></div></foreignObject>
      <foreignObject x="265" y="366" width="170" height="36"><div class="bs-slider slider-card"><input type="range" id="bs-rin" aria-label="Resistance" min="5" max="600" step="1" value="${ohms}" /></div></foreignObject>
    </svg>`;
  const g = (id: string) => stage.querySelector<SVGElement>(`#${id}`)!;
  const dotsLayer = g('bs-dots');
  const dots: SVGCircleElement[] = [];
  for (let i = 0; i < DOTS; i++) {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('class', 'bs-dot');
    c.setAttribute('cy', String(PIPE_Y + ((i % 3) - 1) * 6));
    dotsLayer.append(c);
    dots.push(c);
  }

  /* ------------------------------- the panel ------------------------------- */
  panel.innerHTML = `
    <div class="tabs" role="tablist">
      <button type="button" role="tab" id="bs-tab-play" aria-selected="true">Play</button>
      <button type="button" role="tab" id="bs-tab-quiz" aria-selected="false">Quiz</button>
    </div>
    <section role="tabpanel" id="bs-view-play">
      <div class="detail"><h2>${basics.title}</h2><p>${basics.intro}</p></div>

      <div class="readouts">
        <div class="readout"><small>Current · I = V ÷ R</small><b id="bs-iout">2.30 A</b></div>
        <div class="readout"><small>Power · P = V × I</small><b id="bs-pout">529 W</b></div>
      </div>

      <div class="wire-label">Try an appliance</div>
      <div class="presets">${presets.map((p) => `<button type="button" class="ghost" data-preset="${p.id}">${p.label}</button>`).join('')}</div>

      <div class="challenge" id="bs-challenge"></div>

      <div class="wire-label">Ohm’s law triangle</div>
      <div class="tri">
        <svg viewBox="0 0 120 100" class="tri-svg" aria-hidden="true">
          <path class="tri-shape" d="M60 6 L112 94 H8 Z"/>
          <line class="tri-line" x1="34" y1="58" x2="86" y2="58"/>
          <line class="tri-line" x1="60" y1="58" x2="60" y2="94"/>
          <text id="bs-tri-V" x="60" y="48" text-anchor="middle">V</text>
          <text id="bs-tri-I" x="35" y="84" text-anchor="middle">I</text>
          <text id="bs-tri-R" x="85" y="84" text-anchor="middle">R</text>
        </svg>
        <div class="tri-side">
          <div class="tri-buttons" role="group" aria-label="Cover one letter to find it">
            <button type="button" class="ghost" data-find="V">Find V</button>
            <button type="button" class="ghost" data-find="I">Find I</button>
            <button type="button" class="ghost" data-find="R">Find R</button>
          </div>
          <p class="tri-formula" id="bs-formula" aria-live="polite"></p>
        </div>
      </div>

      <div class="uk"><b>UK standards</b>The supply is nominally 230 V, and is allowed to sit anywhere from about 216 V to 253 V.</div>
    </section>
    <section role="tabpanel" id="bs-view-quiz" hidden></section>`;

  const q = <T extends HTMLElement>(id: string) => panel.querySelector<T>(`#${id}`)!;
  const vin = stage.querySelector<HTMLInputElement>('#bs-vin')!;
  const rin = stage.querySelector<HTMLInputElement>('#bs-rin')!;

  // tabs
  const tabs: Record<'play' | 'quiz', { btn: HTMLElement; view: HTMLElement }> = {
    play: { btn: q('bs-tab-play'), view: q('bs-view-play') },
    quiz: { btn: q('bs-tab-quiz'), view: q('bs-view-quiz') },
  };
  (Object.keys(tabs) as ('play' | 'quiz')[]).forEach((k) =>
    tabs[k].btn.addEventListener('click', () => {
      for (const [key, { btn, view }] of Object.entries(tabs)) {
        btn.setAttribute('aria-selected', String(key === k));
        view.hidden = key !== k;
      }
    }),
  );
  mountQuiz(tabs.quiz.view, quiz, {
    retryHint: 'Have another play with the sliders, then try again.',
    onFinish: (score) => {
      if (score >= 3) onComplete();
    },
  });

  /* ------------------------------- the maths ------------------------------- */
  let speed = 0;

  const update = () => {
    const current = ohms > 0 ? volts / ohms : 0;
    const power = volts * current;

    // water level = pressure
    const h = Math.max(volts > 0 ? 6 : 0, (volts / 250) * WATER_MAX);
    const water = g('bs-water');
    water.setAttribute('y', String(WATER_BOTTOM - h));
    water.setAttribute('height', String(h));
    g('bs-v').textContent = fmtV(volts);
    g('bs-r').textContent = fmtR(ohms);
    g('bs-i').textContent = fmtA(current);
    g('bs-p').textContent = fmtW(power);

    // narrow pipe = resistance
    const gap = 30 * (1 - 0.88 * ((ohms - 5) / 595)) + 1;
    const wall = (PIPE_H - gap) / 2;
    g('bs-valve-top').setAttribute('height', String(wall));
    g('bs-valve-bot').setAttribute('y', String(PIPE_Y + PIPE_H / 2 - wall));
    g('bs-valve-bot').setAttribute('height', String(wall));

    // flow speed = current (log-ish so both 0.4 A and 40 A look sensible)
    speed = current === 0 ? 0 : 14 + 150 * Math.min(1, Math.log10(1 + current * 10) / Math.log10(501));
    const dotR = Math.min(4, gap / 2.4);
    dots.forEach((d) => d.setAttribute('r', String(dotR)));

    // lamp brightness = power
    const glow = g('bs-glow');
    glow.setAttribute('r', String(30 + Math.min(26, power / 90)));
    glow.style.opacity = String(Math.min(0.7, power / 1800));

    // panel readouts
    q('bs-iout').textContent = fmtA(current);
    q('bs-pout').textContent = fmtW(power);

    // challenge
    const ch = q('bs-challenge');
    const hit = Math.abs(volts - 230) <= 2 && Math.abs(current - 13) <= 1;
    ch.classList.toggle('ok', hit);
    ch.innerHTML = hit
      ? `<b>That’s it.</b> About 13 A at 230 V is roughly 3 kW: a kettle or heater. 13 A is also the biggest fuse a UK plug takes.`
      : `<b>Challenge:</b> at 230 V, choose a resistance so that about 13 A flows. What sort of appliance is that?`;

    // triangle
    (['V', 'I', 'R'] as const).forEach((k) => {
      const t = panel.querySelector<SVGTextElement>(`#bs-tri-${k}`)!;
      t.textContent = k === find ? '?' : k;
      t.classList.toggle('covered', k === find);
    });
    panel.querySelectorAll<HTMLElement>('[data-find]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.find === find)));
    const formula =
      find === 'V'
        ? `V = I × R = ${current.toFixed(2)} × ${Math.round(ohms)} = ${Math.round(volts)} V`
        : find === 'I'
          ? `I = V ÷ R = ${Math.round(volts)} ÷ ${Math.round(ohms)} = ${current.toFixed(2)} A`
          : `R = V ÷ I = ${Math.round(volts)} ÷ ${current.toFixed(2)} = ${Math.round(ohms)} Ω`;
    q('bs-formula').textContent = formula;
  };

  vin.addEventListener('input', () => {
    volts = Number(vin.value);
    update();
  });
  rin.addEventListener('input', () => {
    ohms = Number(rin.value);
    update();
  });
  panel.querySelectorAll<HTMLElement>('[data-preset]').forEach((b) =>
    b.addEventListener('click', () => {
      const p = presets.find((x) => x.id === b.dataset.preset)!;
      volts = p.volts;
      ohms = p.ohms;
      vin.value = String(volts);
      rin.value = String(ohms);
      update();
    }),
  );
  panel.querySelectorAll<HTMLElement>('[data-find]').forEach((b) =>
    b.addEventListener('click', () => {
      find = b.dataset.find as 'V' | 'I' | 'R';
      update();
    }),
  );
  update();

  /* ------------------------------ the guided walkthrough ------------------------------ */
  const setValues = (v: number, r: number) => {
    volts = v;
    ohms = r;
    vin.value = String(v);
    rin.value = String(r);
    update();
  };
  const card = (el: HTMLElement) => el.closest('.slider-card') ?? el;
  mountGuide(
    stage,
    [
      {
        title: 'Water in a pipe',
        text: 'Electricity is a flow, like water in a pipe. To understand it you need three ideas: the pressure pushing the water, how narrow the pipe is, and how much actually flows. The picture shows all three at once.',
        onEnter: () => setValues(230, 100),
      },
      {
        kicker: 'Volts (V)',
        title: 'Voltage is the pressure',
        text: 'The tank is the push behind the flow. UK mains sits at 230 V, a nicely full tank. A lower voltage means a lower tank and a weaker push.',
        tryIt: 'Drag the Voltage slider down and watch the tank drain and the flow slow.',
        onEnter: () => pulse(card(vin)),
      },
      {
        kicker: 'Ohms (Ω)',
        title: 'Resistance is the narrow pipe',
        text: 'A narrow pipe holds the flow back. The more resistance, the less gets through. Long, thin wires and heating elements have more resistance.',
        tryIt: 'Raise the Resistance and watch the pipe narrow and the dots thin out.',
        onEnter: () => {
          setValues(230, 100);
          pulse(card(rin));
        },
      },
      {
        kicker: 'Amps (A)',
        title: 'Current is the flow',
        text: 'Current is how much really flows: voltage divided by resistance, I = V ÷ R. More push or less resistance gives more current. Cables and breakers are chosen by current.',
        tryIt: 'Press "3 kW kettle". That is about 13 A: see how fast the dots move.',
        onEnter: () => pulse(panel.querySelector('.presets')),
      },
      {
        kicker: 'Watts (W)',
        title: 'Power is the work done',
        text: 'Power is how fast energy is used: P = V × I. The lamp glows brighter as the power rises. A lamp uses about 100 W; a kettle about 3,000 W.',
        tryIt: 'Change either slider and watch the lamp and the power reading.',
        onEnter: () => pulse(panel.querySelector('.readouts')),
      },
      {
        title: 'Now it is your turn',
        text: 'Try the 13 A challenge and the Ohm’s law triangle on the right, then take the quiz to tick this chapter off.',
        tryIt: 'Open the Quiz tab when you are ready.',
        onEnter: () => pulse(tabs.quiz.btn),
      },
    ],
    { position: 'top-right' },
  );

  /* ------------------------------ the animation ------------------------------ */
  let raf = 0;
  let last = 0;
  let offset = 0;
  const frame = (t: number) => {
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;
    offset = (offset + (reduced ? 0 : speed) * dt) % PIPE_LEN;
    for (let i = 0; i < DOTS; i++) {
      const x = PIPE_X0 + ((offset + (i * PIPE_LEN) / DOTS) % PIPE_LEN);
      dots[i].setAttribute('cx', x.toFixed(1));
    }
    raf = requestAnimationFrame(frame);
  };

  return {
    activate() {
      last = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    },
    deactivate() {
      cancelAnimationFrame(raf);
    },
  };
};
