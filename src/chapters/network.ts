import './network.css';
import {
  HV_CABLE_OHMS,
  appliances,
  finds,
  fuseRatings,
  hvPowers,
  hvVolts,
  network,
  owners,
  quiz,
  scenarios,
  stages,
  type Owner,
} from '../data/network-lesson';
import { mountGuide, pulse } from '../ui/guide';
import { mountQuiz } from '../ui/quiz';
import { fmtAmps, fmtPercent, fmtPower, supplyLoad, supplyState, transmit, UK_VOLTS } from './network-calc';
import { OVERVIEW, routes, sceneSVG, type Box } from './network-scene';
import type { ChapterMount } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';
type Tab = 'journey' | 'hv' | 'supply' | 'quiz';
type VB = [x: number, y: number, w: number, h: number];

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const level = (v: string) => (/kV/.test(v) ? (parseFloat(v.replace(/[^\d.]/g, '')) >= 132 ? 'ehv' : 'hv') : 'lv');
const ownerName = (o: Owner) => owners[o].short;

/** Chapter 2: the power network. A landscape from power station to consumer unit, plus two tools. */
export const mount: ChapterMount = ({ stage, panel, complete: onComplete }) => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = stages.length;

  /* ================================ the stage ================================ */
  const GAUGE_MAX = 180;
  const gx = 200;
  const gy = 200;
  const gr = 160;
  const gPoint = (a: number, r = gr) => {
    const th = Math.PI * (1 - clamp(a, 0, GAUGE_MAX) / GAUGE_MAX);
    return [gx + r * Math.cos(th), gy - r * Math.sin(th)] as const;
  };
  const arc = (a0: number, a1: number, r = gr) => {
    const [x0, y0] = gPoint(a0, r);
    const [x1, y1] = gPoint(a1, r);
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  let ticks = '';
  for (let a = 0; a <= GAUGE_MAX; a += 10) {
    const [x0, y0] = gPoint(a, gr - 20);
    const [x1, y1] = gPoint(a, gr - (a % 40 === 0 ? 34 : 27));
    ticks += `M ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} `;
  }
  const tickLabels = [0, 40, 80, 120, 160]
    .map((a) => {
      const [x, y] = gPoint(a, gr - 50);
      return `<text class="nw-glabel" x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" text-anchor="middle">${a}</text>`;
    })
    .join('');

  stage.innerHTML = `
  <div class="nw-root">
    <div class="nw-scene" data-scene="map">
      <svg class="nw-map" id="nw-map" role="img" aria-label="A landscape following electricity from a power station, over pylons and through substations, down a street to a cutaway house with its cut-out, meter and consumer unit.">${sceneSVG()}</svg>
      <div class="nw-hud" aria-live="polite">
        <small id="nw-hud-step">Stage 1 of ${N}</small>
        <b id="nw-hud-title">Power station</b>
        <div class="nw-volt" id="nw-hud-v">≈ 25 kV</div>
        <small id="nw-hud-sub"></small>
        <span class="nw-ownchip" id="nw-hud-own" hidden></span>
      </div>
      <div class="nw-bar">
        <button type="button" class="nw-float nw-overview" id="nw-overview" aria-pressed="false">Whole route</button>
        <button type="button" class="nw-step" id="nw-back" aria-label="Previous stage">‹</button>
        <div class="nw-dots" role="group" aria-label="Stages">${stages
          .map((s, i) => `<button type="button" class="nw-dot" data-dot="${i}" aria-label="${i + 1}. ${s.title}"><i></i></button>`)
          .join('')}</div>
        <span class="nw-count" id="nw-count">1 / ${N}</span>
        <button type="button" class="nw-step" id="nw-next" aria-label="Next stage">›</button>
      </div>
    </div>

    <div class="nw-scene nw-hv" data-scene="hv" hidden>
      <div class="nw-hv-head">
        <div><small>Sending</small><b id="nw-hv-what">1 MW at 230 V</b></div>
        <div><small>Current</small><b id="nw-hv-amps">–</b></div>
        <div><small>Heat lost</small><b id="nw-hv-loss">–</b></div>
      </div>
      <svg class="nw-hv-svg" viewBox="0 0 600 210" role="img" aria-label="A power station sending power along a cable to a town. The cable glows when it wastes power as heat.">
        <defs>
          <filter id="nw-blur" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="9"/></filter>
        </defs>
        <g class="nw-hv-station">
          <rect class="nw-hall" x="20" y="96" width="74" height="64" rx="5"/>
          <rect class="nw-chimney" x="74" y="56" width="11" height="42" rx="2"/>
          <circle class="nw-gen" cx="48" cy="130" r="13"/>
          <path class="nw-genmark" d="M 41 130 q 3.5 -7 7 0 t 7 0"/>
        </g>
        <text class="nw-hv-label" x="12" y="190">Power station</text>
        <g class="nw-hv-town">
          ${[0, 1, 2]
            .map(
              (i) =>
                `<rect class="nw-wall" x="${492 + i * 30}" y="${118 - (i % 2) * 10}" width="26" height="${42 + (i % 2) * 10}"/><path class="nw-roof" d="M ${489 + i * 30} ${118 - (i % 2) * 10} l 16 -16 l 16 16 z"/><rect class="nw-win nw-winlit" x="${500 + i * 30}" y="${128 - (i % 2) * 10}" width="10" height="10" rx="1.5"/>`,
            )
            .join('')}
        </g>
        <text class="nw-hv-label" x="537" y="190" text-anchor="middle">Town</text>
        <path id="nw-hv-glow" class="nw-hv-glow" d="M 100 130 Q 300 168 486 130" filter="url(#nw-blur)"/>
        <g class="nw-hv-shimmer" id="nw-hv-shimmer">
          ${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M ${150 + i * 55} 128 q 6 -10 0 -20 t 0 -20" style="animation-delay:${-i * 0.37}s"/>`).join('')}
        </g>
        <path class="nw-hv-sheath" d="M 100 130 Q 300 168 486 130"/>
        <path id="nw-hv-core" class="nw-hv-core" d="M 100 130 Q 300 168 486 130"/>
        <g id="nw-hv-dots"></g>
        <text class="nw-hv-ohm" x="293" y="186" text-anchor="middle">same cable each time · ${HV_CABLE_OHMS} Ω</text>
      </svg>
      <div class="nw-hv-low">
        <div class="nw-xsec">
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="nw-xsec-ring" cx="60" cy="60" r="56"/><circle id="nw-xsec" class="nw-xsec-cu" cx="60" cy="60" r="10"/></svg>
          <p id="nw-xsec-text">Copper needed, to scale</p>
        </div>
        <div class="nw-bars">
          <div class="nw-bars-head">Heat lost at each voltage <small>(log scale: each step is a big jump)</small></div>
          ${hvVolts
            .map(
              (v) =>
                `<div class="nw-barrow" data-v="${v.v}"><span>${v.label}</span><div class="nw-track"><i></i></div><b></b></div>`,
            )
            .join('')}
        </div>
      </div>
    </div>

    <div class="nw-scene nw-sup" data-scene="supply" hidden>
      <svg class="nw-gauge" viewBox="0 0 400 290" role="img" aria-label="A gauge showing the current the house draws, against the main fuse rating.">
        <path class="nw-gtrack" d="${arc(0, GAUGE_MAX)}"/>
        <path class="nw-gband nw-gok" id="nw-g-ok"/>
        <path class="nw-gband nw-gnear" id="nw-g-near"/>
        <path class="nw-gband nw-gover" id="nw-g-over"/>
        <path class="nw-gfill" id="nw-g-fill"/>
        <path class="nw-gticks" d="${ticks}"/>
        ${tickLabels}
        <g id="nw-g-fuse"><path class="nw-gfuse" d=""/><text class="nw-gfuse-t" text-anchor="middle"></text></g>
        <g id="nw-needle"><path class="nw-needle" d="M ${gx - 5} ${gy} L ${gx} ${gy - gr + 26} L ${gx + 5} ${gy} Z"/></g>
        <circle class="nw-hub" cx="${gx}" cy="${gy}" r="11"/>
        <text class="nw-gbig" id="nw-g-amps" x="${gx}" y="254" text-anchor="middle">0 A</text>
        <text class="nw-gsub" id="nw-g-sub" x="${gx}" y="280" text-anchor="middle">of a 100 A main fuse</text>
      </svg>
      <div class="nw-stack-wrap">
        <div class="nw-stack" id="nw-stack"><span class="nw-fuse-mark" id="nw-fuse-mark"></span></div>
        <div class="nw-stack-axis"><span>0 A</span><span>${GAUGE_MAX} A</span></div>
      </div>
      <div class="nw-status" id="nw-status" aria-live="polite"></div>
    </div>
  </div>`;

  const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = stage) => root.querySelector<T>(sel)!;
  const svg = $<SVGSVGElement>('#nw-map');
  const routeEls = [...svg.querySelectorAll<SVGPathElement>('.nw-route')];
  const tagEls = [...svg.querySelectorAll<SVGTextElement>('.nw-tag')];
  const pulseHead = $<SVGGElement>('#nw-pulse-head');
  const trails = [...svg.querySelectorAll<SVGCircleElement>('.nw-trail')];
  routeEls.forEach((p, i) => p.style.setProperty('--own', owners[stages[i].owner].colour));
  svg.querySelectorAll<SVGElement>('.nw-own').forEach((r) => r.style.setProperty('--own', owners[r.dataset.owner as Owner].colour));

  /* ================================ the panel ================================ */
  panel.innerHTML = `
    <div class="tabs nw-tabs" role="tablist">
      <button type="button" role="tab" data-tab="journey" aria-selected="true">Journey</button>
      <button type="button" role="tab" data-tab="hv" aria-selected="false">Why HV?</button>
      <button type="button" role="tab" data-tab="supply" aria-selected="false">Supply</button>
      <button type="button" role="tab" data-tab="quiz" aria-selected="false">Quiz</button>
    </div>

    <section role="tabpanel" class="nw-view" data-view="journey">
      <div class="detail"><h2>${network.title}</h2><p>${network.intro}</p></div>
      <div class="nw-card" id="nw-card">
        <div class="nw-card-head"><span class="badge" id="nw-card-n">1</span><h3 id="nw-card-title"></h3></div>
        <div class="nw-card-v" id="nw-card-v"></div>
        <p id="nw-card-text"></p>
        <p class="nw-card-own" id="nw-card-own"></p>
      </div>

      <button type="button" class="nw-switch" id="nw-own-toggle" aria-pressed="false"><span class="nw-knob" aria-hidden="true"></span>Show who owns what</button>
      <ul class="nw-legend" id="nw-legend" hidden>${(Object.keys(owners) as Owner[])
        .map((o) => `<li><i style="background:${owners[o].colour}"></i><span><b>${owners[o].label}</b>${owners[o].text}</span></li>`)
        .join('')}</ul>

      <div class="challenge" id="nw-find" aria-live="polite"></div>

      <div class="uk"><b>UK standards</b>The supply is nominally 230 V. It is allowed to sit anywhere from about 216 V to 253 V (230 V +10% / −6%), so a reading of 240 V at a socket is perfectly normal.</div>
    </section>

    <section role="tabpanel" class="nw-view" data-view="hv" hidden>
      <div class="detail"><h2>Why high voltage?</h2><p>The grid moves huge amounts of power. Pick how much to send and at what voltage, and watch the current and the heat wasted in the same cable.</p></div>
      <div class="wire-label">Power to send</div>
      <div class="nw-seg" role="group" aria-label="Power to send">${hvPowers
        .map((p) => `<button type="button" data-power="${p.w}">${p.label}</button>`)
        .join('')}</div>
      <p class="nw-note" id="nw-power-note"></p>
      <div class="wire-label">Voltage</div>
      <div class="nw-seg" role="group" aria-label="Voltage">${hvVolts
        .map((v) => `<button type="button" data-volts="${v.v}">${v.label}</button>`)
        .join('')}</div>
      <div class="readouts">
        <div class="readout"><small>Current · I = P ÷ V</small><b id="nw-hv-i">–</b></div>
        <div class="readout"><small>Heat lost · I² × R</small><b id="nw-hv-l">–</b></div>
      </div>
      <div class="challenge" id="nw-hv-challenge" aria-live="polite"></div>
      <div class="detail nw-explain">
        <p><b>The rule:</b> power is volts × amps (P = V × I). For the same power, ten times the voltage needs a tenth of the current.</p>
        <p>The heat a cable wastes is I² × R, so a tenth of the current wastes only a <b>hundredth</b> of the heat. Smaller currents also mean thinner, cheaper cables.</p>
        <p>So why not 400 kV at home? It needs huge insulators and clearances, and it would be lethal. Transformers step it down in stages as it gets closer to people.</p>
      </div>
    </section>

    <section role="tabpanel" class="nw-view" data-view="supply" hidden>
      <div class="detail"><h2>Will my supply cope?</h2><p>The whole house shares one main fuse in the cut-out. Switch appliances on and watch the current climb towards it.</p></div>
      <div class="wire-label">Main fuse in the cut-out</div>
      <div class="nw-seg" role="group" aria-label="Main fuse rating">${fuseRatings
        .map((f) => `<button type="button" data-fuse="${f}">${f} A</button>`)
        .join('')}</div>
      <div class="wire-label nw-gap">Appliances</div>
      <div class="nw-apps">${appliances
        .map(
          (a) =>
            `<button type="button" class="chip" data-app="${a.id}" aria-pressed="false"><span class="nw-sw" style="background:${a.colour}"></span><span><b>${a.label}</b><small>${a.kw} kW · ${fmtAmps((a.kw * 1000) / UK_VOLTS)}</small></span></button>`,
        )
        .join('')}</div>
      <div class="presets">${scenarios.map((s) => `<button type="button" class="ghost" data-scn="${s.id}">${s.label}</button>`).join('')}</div>
      <div class="readouts">
        <div class="readout"><small>Total power</small><b id="nw-sup-kw">0 kW</b></div>
        <div class="readout"><small>Current at 230 V</small><b id="nw-sup-a">0 A</b></div>
      </div>
      <div class="challenge" id="nw-sup-challenge" aria-live="polite"></div>
      <div class="detail nw-explain">
        <p><b>Diversity.</b> Adding up every appliance gives a scary number, but real homes never run everything flat out together. Ovens and hobs switch their elements on and off to hold a temperature, a kettle runs for a few minutes, and nobody showers while drying clothes and cooking a roast. Designers allow for this "diversity", so a 100 A supply copes with far more than 100 A of appliances on paper.</p>
        <p>A fuse also tolerates a short, small overload. It is a big or long overload that blows it.</p>
      </div>
      <div class="uk"><b>UK practice</b>Adding a big load such as an EV charger or a heat pump? The installer normally has to tell the DNO first, and the DNO may need to upgrade the main fuse or the service cable.</div>
    </section>

    <section role="tabpanel" class="nw-view" data-view="quiz" hidden></section>`;

  const p$ = <T extends Element = HTMLElement>(sel: string) => panel.querySelector<T>(sel)!;

  /* ------------------------------- tabs ------------------------------- */
  let tab: Tab = 'journey';
  const sceneFor = (t: Tab) => (t === 'hv' ? 'hv' : t === 'supply' ? 'supply' : 'map');
  const setTab = (t: Tab) => {
    tab = t;
    panel.querySelectorAll<HTMLElement>('[role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    panel.querySelectorAll<HTMLElement>('[role=tabpanel]').forEach((v) => (v.hidden = v.dataset.view !== t));
    stage.querySelectorAll<HTMLElement>('.nw-scene').forEach((s) => (s.hidden = s.dataset.scene !== sceneFor(t)));
    if (sceneFor(t) === 'map') retarget(true);
    if (t === 'hv') hvLayout();
    guide?.setVisible(sceneFor(t) === 'map');
  };
  let guide: ReturnType<typeof mountGuide> | undefined;
  panel.querySelectorAll<HTMLElement>('[role=tab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab as Tab)));

  mountQuiz(p$('[data-view="quiz"]'), quiz, {
    retryHint: 'Take another trip along the route and play with the two tools, then try again.',
    onFinish: (score, total) => {
      if (score / total >= 0.75) onComplete();
    },
  });

  /* ================================ journey ================================ */
  let focus = 0; // -1 = whole route
  let owning = false;
  let findIdx = 0;
  let findMsg = '';

  // camera
  let vb: VB = [...boxToVB(routes[0].cam)];
  let camFrom: VB = vb;
  let camTo: VB = vb;
  let camT = 1;
  let camStart = 0;

  function boxToVB([x0, y0, x1, y1]: Box): VB {
    const W = svg.clientWidth || 800;
    const H = svg.clientHeight || 500;
    const A = W / H;
    let w = (x1 - x0) * 1.08;
    let h = (y1 - y0) * 1.08;
    if (w / h < A) w = h * A;
    else h = w / A;
    const cx = (x0 + x1) / 2;
    // On tall, narrow stages nudge the view up a little: there is more to see above ground than below.
    const cy = (y0 + y1) / 2 - (A < 1 ? h * 0.06 : 0);
    return [cx - w / 2, cy - h / 2, w, h];
  }
  function applyVB(v: VB) {
    svg.setAttribute('viewBox', v.map((n) => n.toFixed(2)).join(' '));
    svg.style.setProperty('--nw-u', String(v[2] / (svg.clientWidth || 800)));
  }
  function retarget(instant = false) {
    const box = focus < 0 ? OVERVIEW : routes[focus].cam;
    camTo = boxToVB(box);
    if (instant || reduced) {
      vb = camTo;
      camT = 1;
      applyVB(vb);
    } else {
      camFrom = vb;
      camT = 0;
      camStart = performance.now();
    }
  }
  new ResizeObserver(() => {
    if (sceneFor(tab) === 'map') retarget(true);
    if (tab === 'hv') hvLayout();
  }).observe(stage);

  // pulse
  let lens: number[] = [];
  let seg = 0;
  let dist = 0;
  let hold = 0;
  let shownV = '';
  const ensureLens = () => {
    if (!lens.length || lens.some((l) => !l)) lens = routeEls.map((p) => p.getTotalLength());
  };
  const resetPulse = () => {
    seg = focus < 0 ? 0 : focus;
    dist = 0;
    hold = 0;
  };

  function select(i: number, picked = false) {
    focus = i;
    resetPulse();
    retarget();
    renderJourney();
    if (picked && i >= 0) checkFind(i);
  }

  function checkFind(i: number) {
    if (findIdx >= finds.length) return;
    const f = finds[findIdx];
    if (stages[i].id === f.answer) {
      findMsg = `<b>Found it.</b> ${f.got}`;
      findIdx++;
    } else {
      findMsg = `Not that one: that is the <b>${stages[i].title.toLowerCase()}</b>. Have another look.`;
    }
    renderFind(stages[i].id === f.answer);
  }
  function renderFind(justGot = false) {
    const el = p$('#nw-find');
    const done = findIdx >= finds.length;
    el.classList.toggle('ok', done || justGot);
    if (done) {
      el.innerHTML = `${findMsg ? `<p>${findMsg}</p>` : ''}<b>All three found.</b> You can trace the supply from the grid to your own consumer unit.`;
      return;
    }
    el.innerHTML = `<b>Spot it (${findIdx + 1} of ${finds.length}):</b> ${finds[findIdx].ask} Click it on the map.${
      findMsg ? `<p class="nw-findmsg">${findMsg}</p>` : ''
    }`;
  }

  function renderJourney() {
    const over = focus < 0;
    const s = over ? null : stages[focus];
    // stepper
    stage.querySelectorAll<HTMLElement>('[data-dot]').forEach((d) => {
      const i = Number(d.dataset.dot);
      d.setAttribute('aria-current', String(i === focus));
      d.classList.toggle('past', !over && i < focus);
    });
    $<HTMLButtonElement>('#nw-back').disabled = focus <= 0;
    $<HTMLButtonElement>('#nw-next').disabled = focus >= N - 1;
    $('#nw-count').textContent = over ? `All ${N}` : `${focus + 1} / ${N}`;
    $('#nw-overview').setAttribute('aria-pressed', String(over));
    $('#nw-overview').textContent = over ? 'Close up' : 'Whole route';
    // map highlights
    routeEls.forEach((r, i) => r.classList.toggle('on', over || i === focus));
    tagEls.forEach((t) => t.classList.toggle('show', !over && Number(t.dataset.stage) === focus));
    svg.querySelectorAll<SVGElement>('.nw-part').forEach((p) => p.classList.toggle('on', Number(p.dataset.part) === focus));
    svg.classList.toggle('nw-owning', owning);
    // HUD
    $('#nw-hud-step').textContent = over ? 'The whole route' : `Stage ${focus + 1} of ${N}`;
    $('#nw-hud-title').textContent = over ? 'Power station to plug' : s!.title;
    // card
    const card = s ?? stages[0];
    p$('#nw-card').classList.toggle('nw-dim', over);
    p$('#nw-card-n').textContent = over ? '•' : String(focus + 1);
    p$('#nw-card-title').textContent = over ? 'The whole route' : card.title;
    p$('#nw-card-v').innerHTML = over
      ? `<span class="nw-vchip ehv">400 kV</span> → <span class="nw-vchip lv">230 V</span>`
      : card.vIn === card.vOut
        ? `<span class="nw-vchip ${level(card.vIn)}">${card.vIn}</span>${card.sub ? `<small>${card.sub}</small>` : ''}`
        : `<span class="nw-vchip ${level(card.vIn)}">${card.vIn}</span> → <span class="nw-vchip ${level(card.vOut)}">${card.vOut}</span>${card.sub ? `<small>${card.sub}</small>` : ''}`;
    p$('#nw-card-text').textContent = over
      ? 'The pulse is making the whole trip. Pick any stage on the map, or use the arrows under it, to look closer.'
      : card.text;
    const own = owners[card.owner];
    p$('#nw-card-own').innerHTML = over ? '' : `<i style="background:${own.colour}"></i>Owned by: <b>${own.label}</b>`;
    // owner chip
    const chip = $('#nw-hud-own');
    chip.hidden = !owning || over;
    if (s) {
      chip.textContent = `Owner: ${ownerName(s.owner)}`;
      chip.style.background = owners[s.owner].colour;
    }
    if (reduced) placeStaticPulse();
  }

  const go = (d: number) => select(clamp((focus < 0 ? -1 : focus) + d, 0, N - 1));
  $('#nw-back').addEventListener('click', () => go(-1));
  $('#nw-next').addEventListener('click', () => go(1));
  $('#nw-overview').addEventListener('click', () => select(focus < 0 ? 0 : -1));
  stage.querySelectorAll<HTMLElement>('[data-dot]').forEach((d) => d.addEventListener('click', () => select(Number(d.dataset.dot), true)));
  svg.querySelectorAll<SVGElement>('.nw-hit').forEach((h) =>
    h.addEventListener('click', () => select(Number(h.dataset.stage), true)),
  );
  $('.nw-scene[data-scene="map"]').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
  });
  const setOwning = (o: boolean) => {
    owning = o;
    p$('#nw-own-toggle').setAttribute('aria-pressed', String(owning));
    p$('#nw-legend').hidden = !owning;
    renderJourney();
  };
  p$('#nw-own-toggle').addEventListener('click', () => setOwning(!owning));

  function setHudVoltage(v: string, sub: string | undefined) {
    if (v === shownV) return;
    const el = $('#nw-hud-v');
    const stepped = shownV !== '';
    shownV = v;
    el.textContent = v;
    el.className = `nw-volt ${level(v)}`;
    $('#nw-hud-sub').textContent = sub ?? '';
    if (stepped && !reduced) {
      el.classList.remove('bump');
      void el.getBoundingClientRect();
      el.classList.add('bump');
    }
  }

  function placePulse(i: number, d: number) {
    const p = routeEls[i].getPointAtLength(d);
    const u = vb[2] / (svg.clientWidth || 800);
    pulseHead.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${u.toFixed(4)})`);
    trails.forEach((t, k) => {
      const q = routeEls[i].getPointAtLength(Math.max(0, d - (k + 1) * 9 * u));
      t.setAttribute('cx', q.x.toFixed(1));
      t.setAttribute('cy', q.y.toFixed(1));
      t.setAttribute('r', ((3.6 - k) * u).toFixed(2));
    });
    const r = routes[i];
    const s = stages[i];
    const after = r.switchX !== undefined && p.x >= r.switchX;
    setHudVoltage(r.switchX === undefined ? s.vOut : after ? s.vOut : s.vIn, s.sub && (r.switchX === undefined || after) ? s.sub : undefined);
    svg.classList.toggle('nw-lit', i === N - 1 && d >= lens[i] - 1);
  }
  function placeStaticPulse() {
    ensureLens();
    const i = focus < 0 ? N - 1 : focus;
    placePulse(i, lens[i]);
  }

  /* ================================ why high voltage ================================ */
  let hvW = 1_000_000;
  let hvV = 230;
  const hvCore = $<SVGPathElement>('#nw-hv-core');
  const hvDotsLayer = $<SVGGElement>('#nw-hv-dots');
  const HV_DOTS = 22;
  const hvDots: SVGCircleElement[] = [];
  for (let i = 0; i < HV_DOTS; i++) {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('class', 'nw-hv-dot');
    c.setAttribute('r', '3.4');
    hvDotsLayer.append(c);
    hvDots.push(c);
  }
  let hvLen = 0;
  let hvSpeed = 0;
  let hvCount = HV_DOTS;
  let hvOffset = 0;
  function hvLayout() {
    if (!hvLen) hvLen = hvCore.getTotalLength();
  }
  const heatColour = (h: number) => {
    // copper → orange → white-hot
    const stops = [
      [196, 122, 58],
      [255, 96, 31],
      [255, 233, 168],
    ];
    const t = clamp(h, 0, 1) * 2;
    const a = stops[Math.floor(Math.min(t, 1.999))];
    const b = stops[Math.floor(Math.min(t, 1.999)) + 1];
    const f = t - Math.floor(Math.min(t, 1.999));
    return `rgb(${a.map((x, k) => Math.round(x + (b[k] - x) * f)).join(',')})`;
  };

  function updateHV() {
    const r = transmit(hvW, hvV, HV_CABLE_OHMS);
    const pw = hvPowers.find((p) => p.w === hvW)!;
    const vl = hvVolts.find((v) => v.v === hvV)!;
    panel.querySelectorAll<HTMLElement>('[data-power]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.power) === hvW)));
    panel.querySelectorAll<HTMLElement>('[data-volts]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.volts) === hvV)));
    p$('#nw-power-note').textContent = `${pw.label} is ${pw.note}.`;
    const impossible = r.lossFrac >= 1;
    const lossText = impossible ? `${fmtPower(r.lossW)}: over 100%!` : `${fmtPower(r.lossW)} (${fmtPercent(r.lossFrac)})`;
    p$('#nw-hv-i').textContent = fmtAmps(r.amps);
    p$('#nw-hv-l').textContent = impossible ? 'Over 100%' : fmtPercent(r.lossFrac);
    $('#nw-hv-what').textContent = `${pw.label} at ${vl.label}`;
    $('#nw-hv-amps').textContent = fmtAmps(r.amps);
    $('#nw-hv-loss').textContent = lossText;
    $('#nw-hv-loss').classList.toggle('bad', impossible);

    // the cable: glow and colour from how much it wastes (log scale, 0.001% → 100%)
    const h = clamp((Math.log10(r.lossFrac) + 3) / 3, 0, 1);
    const col = heatColour(h);
    hvCore.style.stroke = col;
    const glow = $<SVGPathElement>('#nw-hv-glow');
    glow.style.stroke = col;
    glow.style.opacity = String(h * 0.95);
    glow.style.strokeWidth = String(14 + 40 * h);
    $('#nw-hv-shimmer').style.opacity = String(Math.max(0, (h - 0.35) / 0.65));
    stage.querySelector('.nw-hv')!.classList.toggle('nw-melt', impossible);

    // flow: speed and density follow the current (log, so 0.25 A and 43,000 A both read)
    const f = clamp((Math.log10(r.amps) + 1) / 5.7, 0, 1);
    hvSpeed = 25 + 230 * f;
    hvCount = Math.round(4 + (HV_DOTS - 4) * f);
    hvDots.forEach((d, i) => (d.style.opacity = i < hvCount ? '1' : '0'));

    // copper cross-section to scale against the 230 V case
    const i230 = hvW / 230;
    $('#nw-xsec').setAttribute('r', (2 + 54 * Math.sqrt(r.amps / i230)).toFixed(1));
    const vs400 = 400_000 / hvV;
    $('#nw-xsec-text').innerHTML =
      hvV === 400_000
        ? 'Copper needed, to scale: the slimmest of the four.'
        : `Copper needed, to scale: roughly <b>${Math.round(vs400).toLocaleString('en-GB')}×</b> the area of the 400 kV cable.`;

    // comparison bars
    stage.querySelectorAll<HTMLElement>('.nw-barrow').forEach((row) => {
      const v = Number(row.dataset.v);
      const t = transmit(hvW, v, HV_CABLE_OHMS);
      const pct = clamp((Math.log10(Math.max(t.lossW, 0.1)) + 1) / 10.5, 0.02, 1) * 100;
      row.querySelector<HTMLElement>('i')!.style.width = `${pct}%`;
      row.querySelector<HTMLElement>('i')!.style.background = heatColour(clamp((Math.log10(t.lossFrac) + 3) / 3, 0, 1));
      row.querySelector('b')!.textContent = t.lossFrac >= 1 ? `${fmtPower(t.lossW)} !` : fmtPower(t.lossW);
      row.classList.toggle('on', v === hvV);
    });

    // challenge: the lowest voltage that wastes under 1%
    const best = hvVolts.find((v) => transmit(hvW, v.v, HV_CABLE_OHMS).lossFrac < 0.01)!;
    const ch = p$('#nw-hv-challenge');
    const hit = hvV === best.v;
    ch.classList.toggle('ok', hit);
    ch.innerHTML = hit
      ? `<b>That’s it.</b> At ${pw.label}, ${best.label} is the lowest voltage that wastes under 1%. Every step lower multiplies the waste${
          best.v === 11_000 ? ' by hundreds' : ''
        }. Try a bigger power and see the answer move up.`
      : r.lossFrac < 0.01
        ? `<b>Under 1%, nice.</b> But can you go lower and still waste less than 1% of ${pw.label}?`
        : `<b>Try:</b> sending ${pw.label}, find the <b>lowest</b> voltage that wastes less than 1% of it as heat.`;
  }
  panel.querySelectorAll<HTMLElement>('[data-power]').forEach((b) =>
    b.addEventListener('click', () => {
      hvW = Number(b.dataset.power);
      updateHV();
    }),
  );
  panel.querySelectorAll<HTMLElement>('[data-volts]').forEach((b) =>
    b.addEventListener('click', () => {
      hvV = Number(b.dataset.volts);
      updateHV();
    }),
  );

  /* ================================ will my supply cope? ================================ */
  let fuse = 100;
  const on = new Set<string>();
  let shownAmps = 0;
  let targetAmps = 0;
  const stack = $('#nw-stack');
  const segs = new Map<string, HTMLElement>();
  for (const a of appliances) {
    const s = document.createElement('span');
    s.className = 'nw-seg-fill';
    s.style.background = a.colour;
    s.title = a.label;
    s.innerHTML = `<em>${a.label}</em>`;
    stack.insertBefore(s, $('#nw-fuse-mark'));
    segs.set(a.id, s);
  }

  function updateSupply() {
    const load = supplyLoad(appliances.filter((a) => on.has(a.id)).map((a) => a.kw));
    targetAmps = load.amps;
    const state = supplyState(load.amps, fuse);
    panel.querySelectorAll<HTMLElement>('[data-fuse]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.fuse) === fuse)));
    panel.querySelectorAll<HTMLElement>('[data-app]').forEach((b) => b.setAttribute('aria-pressed', String(on.has(b.dataset.app!))));
    p$('#nw-sup-kw').textContent = `${load.kw.toFixed(1)} kW`;
    p$('#nw-sup-a').textContent = fmtAmps(load.amps);
    p$('#nw-sup-a').className = `nw-state-${state}`;

    // gauge bands
    $('#nw-g-ok').setAttribute('d', arc(0, fuse * 0.8, gr - 15));
    $('#nw-g-near').setAttribute('d', arc(fuse * 0.8, fuse, gr - 15));
    $('#nw-g-over').setAttribute('d', arc(fuse, GAUGE_MAX, gr - 15));
    const [fx0, fy0] = gPoint(fuse, gr + 13);
    const [fx1, fy1] = gPoint(fuse, gr - 26);
    const [tx, ty] = gPoint(fuse, gr + 26);
    $('#nw-g-fuse path').setAttribute('d', `M ${fx0.toFixed(1)} ${fy0.toFixed(1)} L ${fx1.toFixed(1)} ${fy1.toFixed(1)}`);
    const ft = $<SVGTextElement>('#nw-g-fuse text');
    ft.setAttribute('x', tx.toFixed(1));
    ft.setAttribute('y', (ty + 2).toFixed(1));
    ft.textContent = `${fuse} A fuse`;
    $('#nw-g-sub').textContent = `of a ${fuse} A main fuse · ${load.kw.toFixed(1)} kW`;

    // stacked bar
    for (const a of appliances) {
      const s = segs.get(a.id)!;
      const w = on.has(a.id) ? ((a.kw * 1000) / UK_VOLTS / GAUGE_MAX) * 100 : 0;
      s.style.width = `${Math.min(w, 100)}%`;
      s.classList.toggle('wide', w > 9);
    }
    $('#nw-fuse-mark').style.left = `${(fuse / GAUGE_MAX) * 100}%`;
    $('#nw-fuse-mark').dataset.label = `${fuse} A`;
    stack.classList.toggle('over', load.amps > GAUGE_MAX);

    const st = $('#nw-status');
    st.className = `nw-status ${state}`;
    const headroom = fuse - load.amps;
    st.innerHTML =
      on.size === 0
        ? `<span class="nw-fuse-ico" aria-hidden="true"></span><span><b>Nothing on.</b> Switch on some appliances in the panel.</span>`
        : state === 'ok'
          ? `<span class="nw-fuse-ico" aria-hidden="true"></span><span><b>Fine.</b> ${fmtAmps(load.amps)} of ${fuse} A, with ${fmtAmps(headroom)} to spare.</span>`
          : state === 'near'
            ? `<span class="nw-fuse-ico" aria-hidden="true"></span><span><b>Getting close.</b> ${fmtAmps(load.amps)} of ${fuse} A. Fine for a while, but there is not much room left.</span>`
            : `<span class="nw-fuse-ico" aria-hidden="true"></span><span><b>Over the limit.</b> ${fmtAmps(load.amps)} on a ${fuse} A fuse. Kept up for long, this would blow the cut-out fuse and leave the house in the dark.</span>`;

    // challenge: teatime + the car
    const ch = p$('#nw-sup-challenge');
    const tea = ['oven', 'hob', 'shower'].every((id) => on.has(id));
    const ev = on.has('ev');
    ch.classList.toggle('ok', tea && ev);
    ch.innerHTML =
      tea && ev
        ? `<b>${state === 'over' ? 'No, it won’t.' : 'Just about.'}</b> Shower, oven and hob plus the car is ${fmtAmps(load.amps)}. This is why many EV chargers watch the house’s total current and slow down when it is busy.`
        : tea
          ? `<b>Teatime:</b> shower, oven and hob are on. Now plug in the car (EV charger). Will it fit under ${fuse} A?`
          : `<b>Try:</b> it’s teatime. Turn on the <b>shower</b>, <b>oven</b> and <b>hob</b>, then see whether the <b>EV charger</b> can join them.`;
  }
  panel.querySelectorAll<HTMLElement>('[data-fuse]').forEach((b) =>
    b.addEventListener('click', () => {
      fuse = Number(b.dataset.fuse);
      updateSupply();
    }),
  );
  panel.querySelectorAll<HTMLElement>('[data-app]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.app!;
      if (on.has(id)) on.delete(id);
      else on.add(id);
      updateSupply();
    }),
  );
  panel.querySelectorAll<HTMLElement>('[data-scn]').forEach((b) =>
    b.addEventListener('click', () => {
      on.clear();
      scenarios.find((s) => s.id === b.dataset.scn)!.on.forEach((id) => on.add(id));
      updateSupply();
    }),
  );

  function drawGauge(a: number) {
    const deg = (clamp(a, 0, GAUGE_MAX + 6) / GAUGE_MAX) * 180 - 90;
    $('#nw-needle').setAttribute('transform', `rotate(${deg.toFixed(2)} ${gx} ${gy})`);
    $('#nw-g-fill').setAttribute('d', a > 0.3 ? arc(0, Math.min(a, GAUGE_MAX), gr) : '');
    $('#nw-g-amps').textContent = `${Math.round(a)} A`;
    const st = supplyState(a, fuse);
    $('#nw-g-amps').setAttribute('class', `nw-gbig nw-state-${st}`);
    $('#nw-g-fill').setAttribute('class', `nw-gfill nw-state-${st}`);
  }

  /* ================================ animation ================================ */
  let raf = 0;
  let last = 0;
  const frame = (t: number) => {
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;
    const scene = sceneFor(tab);

    if (scene === 'map') {
      ensureLens();
      if (camT < 1) {
        camT = Math.min(1, (t - camStart) / 900);
        const e = easeInOut(camT);
        vb = camFrom.map((v, k) => v + (camTo[k] - v) * e) as VB;
        applyVB(vb);
      }
      if (!reduced) {
        const speed = focus < 0 ? 520 : Math.max(60, vb[2] * 0.32);
        if (hold > 0) {
          hold -= dt;
          if (hold <= 0) resetPulse(); // pause over: go round again
        } else {
          dist += speed * dt;
          if (dist >= lens[seg]) {
            if (focus < 0 && seg < N - 1) {
              dist -= lens[seg];
              seg++;
            } else {
              dist = lens[seg];
              hold = focus < 0 ? 1.4 : 0.9;
            }
          }
        }
        placePulse(seg, Math.min(dist, lens[seg]));
      }
    } else if (scene === 'hv') {
      hvLayout();
      hvOffset = (hvOffset + (reduced ? 0 : hvSpeed) * dt) % hvLen;
      for (let i = 0; i < hvCount; i++) {
        const p = hvCore.getPointAtLength((hvOffset + (i * hvLen) / hvCount) % hvLen);
        hvDots[i].setAttribute('cx', p.x.toFixed(1));
        hvDots[i].setAttribute('cy', p.y.toFixed(1));
      }
    } else {
      shownAmps = reduced ? targetAmps : shownAmps + (targetAmps - shownAmps) * Math.min(1, dt * 7);
      if (Math.abs(targetAmps - shownAmps) < 0.05) shownAmps = targetAmps;
      drawGauge(shownAmps);
    }
    raf = requestAnimationFrame(frame);
  };

  renderJourney();
  renderFind();
  updateHV();
  updateSupply();
  drawGauge(0);
  setHudVoltage(stages[0].vIn, stages[0].sub);

  /* ================================ the guided walkthrough ================================ */
  const idx = (id: string) => stages.findIndex((s) => s.id === id);
  // Each step shows one part of the trip on the map. The bar under the map still steps through all the stages.
  const show = (id: string | null, own = false) => {
    if (tab !== 'journey') setTab('journey');
    if (owning !== own) setOwning(own);
    select(id ? idx(id) : -1);
  };
  guide = mountGuide(
    stage,
    [
      {
        title: 'Power station to plug',
        text: 'Your electricity makes a long trip before it reaches the socket. The glowing pulse follows it from the power station, across the country and down your street into the house.',
        tryIt: 'Watch the voltage in the box at the top left fall as the pulse travels.',
        onEnter: () => {
          show(null);
          pulse(stage.querySelector('.nw-hud'));
        },
      },
      {
        kicker: '≈ 25 kV → 400 kV',
        title: 'Up for the long trip',
        text: 'A power station generator makes electricity at up to about 25 kV. A step-up transformer raises it to 400 kV (or 275 kV) for the pylons. High voltage means a small current, so little is lost as heat.',
        tryIt: 'Open the "Why HV?" tab and compare the heat lost at 230 V with 400 kV, then come back here.',
        onEnter: () => {
          show('tx');
          pulse(panel.querySelector('[data-tab="hv"]'));
        },
      },
      {
        kicker: '400 kV → 132 → 33 → 11 kV',
        title: 'Stepping down in stages',
        text: 'Near towns, substations step the voltage down a bit at a time. At the grid supply point the regional network company (the DNO) takes over.',
        tryIt: 'Press › under the map to follow the pulse through each substation.',
        onEnter: () => {
          show('gsp');
          pulse(stage.querySelector('#nw-next'));
        },
      },
      {
        kicker: '11 kV → 400 V',
        title: 'The transformer in your street',
        text: 'The green box at the end of the road makes the last step: 400 V three-phase. Measured from one phase to neutral, that is the 230 V you get at home. Houses are shared across the three phases.',
        tryIt: 'Press › to follow the street cable towards the houses.',
        onEnter: () => {
          show('local');
          pulse(stage.querySelector('#nw-next'));
        },
      },
      {
        kicker: '230 V',
        title: 'Into the house',
        text: 'A service cable brings one phase and neutral to the cut-out: the sealed main fuse, typically 60 to 100 A. Only the DNO may open it.',
        tryIt: 'Press › to see the meter and then the consumer unit.',
        onEnter: () => {
          show('cutout');
          pulse(stage.querySelector('#nw-next'));
        },
      },
      {
        title: 'Who owns what',
        text: 'Different companies own different parts. The DNO owns the network up to and including the cut-out, your supplier looks after the meter, and everything after the meter is yours.',
        tryIt: 'Click each part of the house on the map and read the owner chip in the box at the top left.',
        onEnter: () => {
          show('meter', true);
          pulse(panel.querySelector('#nw-own-toggle'));
        },
      },
      {
        title: 'Now it is your turn',
        text: 'Try the "Spot it" challenge on the right, then use the "Why HV?" and "Supply" tools. Take the quiz to tick this chapter off.',
        tryIt: 'Open the Quiz tab when you are ready.',
        onEnter: () => {
          show('cu');
          pulse(panel.querySelector('[data-tab="quiz"]'));
        },
      },
    ],
    { position: 'top-right' },
  );

  return {
    activate() {
      retarget(true);
      if (reduced) placeStaticPulse();
      last = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    },
    deactivate() {
      cancelAnimationFrame(raf);
    },
  };
};
