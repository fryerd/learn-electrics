import { fanParts, type FanPart } from '../data/special-locations-lesson';

const VB_W = 640;
const VB_H = 420;
/** The run-on is minutes in real life; here it is sped up. */
const RUN_ON = 8;

// Lanes (y) into and out of the isolator.
const Y_SL = 196;
const Y_L = 236;
const Y_N = 276;
const Y_E = 316;
const ISO_X0 = 398;
const ISO_X1 = 466;
const FAN_X = 568;

export interface FanScene {
  setVisible(v: boolean): void;
  activate(): void;
  deactivate(): void;
  resize(): void;
  /** Light off, isolator on, fan stopped. */
  reset(): void;
  lightBtn: HTMLElement;
  isoBtn: HTMLElement;
}

export function mountFan(stage: HTMLElement, view: HTMLElement): FanScene {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lightOn = false;
  let isoOn = true;
  let runOn = 0;
  let current: FanPart | null = null;
  const tried = { start: false, runon: false, isolated: false };

  const wire = (id: string, part: FanPart, cls: string, d: string) =>
    `<g class="sl-part sl-wire ${cls}" data-part="${part}" id="sl-w-${id}">
      <path class="sl-wire-hit" d="${d}"/><path class="sl-wire-base" d="${d}"/><path class="sl-wire-flow" d="${d}"/>
    </g>`;

  const pole = (y: number) => `<path class="sl-pole" data-y="${y}" d="M${ISO_X0 + 16} ${y}L${ISO_X1 - 16} ${y}"/>
    <circle class="sl-term" cx="${ISO_X0 + 16}" cy="${y}" r="3.5"/><circle class="sl-term" cx="${ISO_X1 - 16}" cy="${y}" r="3.5"/>`;

  const root = document.createElement('div');
  root.className = 'sl-scene sl-fan';
  root.hidden = true;
  root.innerHTML = `
    <svg class="sl-svg" viewBox="0 0 ${VB_W} ${VB_H}" role="img" aria-label="An extractor fan circuit: lighting circuit, pull-cord switch and light, a fused connection on the permanent line, a three-pole isolator, and the fan with its run-on timer.">
      <defs><filter id="sl-fan-soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#1d232b" flood-opacity="0.16"/></filter></defs>

      ${wire('ntop', 'neutral', 'sl-c-n', `M116 44H360V74`)}
      ${wire('feed', 'line', 'sl-c-l', `M116 96H162`)}
      ${wire('sl1', 'sl', 'sl-c-sl', `M214 96H338M272 96V${Y_SL}H${ISO_X0 + 16}`)}
      ${wire('perm1', 'line', 'sl-c-l', `M116 ${Y_L}H226`)}
      ${wire('perm2', 'line', 'sl-c-l', `M300 ${Y_L}H${ISO_X0 + 16}`)}
      ${wire('n1', 'neutral', 'sl-c-n', `M116 ${Y_N}H${ISO_X0 + 16}`)}
      ${wire('e1', 'earth', 'sl-c-e', `M116 ${Y_E}H${ISO_X0 + 16}`)}
      ${wire('slo', 'sl', 'sl-c-sl', `M${ISO_X1 - 16} ${Y_SL}H500V218H516`)}
      ${wire('lo', 'line', 'sl-c-l', `M${ISO_X1 - 16} ${Y_L}H516`)}
      ${wire('no', 'neutral', 'sl-c-n', `M${ISO_X1 - 16} ${Y_N}H500V254H516`)}

      <g class="sl-part sl-box" data-part="supply">
        <rect class="sl-card" x="16" y="22" width="100" height="318" rx="14" filter="url(#sl-fan-soft)"/>
        <text class="sl-lbl sl-strong" transform="translate(58 180) rotate(-90)" text-anchor="middle">LIGHTING CIRCUIT</text>
        <text class="sl-lbl" transform="translate(84 180) rotate(-90)" text-anchor="middle">30 mA RCD</text>
      </g>
      <text class="sl-lbl sl-wl" x="124" y="38">N</text>
      <text class="sl-lbl sl-wl" x="124" y="90">L</text>
      <text class="sl-lbl sl-wl" x="124" y="${Y_L - 6}">L</text>
      <text class="sl-lbl sl-wl" x="124" y="${Y_N - 6}">N</text>
      <text class="sl-lbl sl-wl" x="124" y="${Y_E - 6}">E</text>
      <text class="sl-lbl sl-wl sl-wl-sl" x="280" y="${Y_SL - 8}">SL</text>

      <g class="sl-part sl-box" data-part="pull">
        <rect class="sl-card" x="160" y="74" width="56" height="44" rx="10" filter="url(#sl-fan-soft)"/>
        <circle class="sl-term" cx="172" cy="96" r="3.5"/><circle class="sl-term" cx="204" cy="96" r="3.5"/>
        <path class="sl-contact" id="sl-contact" d="M172 96L202 84"/>
        <path class="sl-cord" id="sl-cord" d="M188 118V158"/>
        <circle class="sl-bead" id="sl-bead" cx="188" cy="164" r="6"/>
        <text class="sl-lbl" x="188" y="66" text-anchor="middle">PULL-CORD</text>
      </g>

      <g class="sl-part sl-box" data-part="lamp">
        <circle class="sl-lamp-glow" id="sl-lamp-glow" cx="360" cy="96" r="38"/>
        <circle class="sl-lamp" id="sl-lamp" cx="360" cy="96" r="22"/>
        <path class="sl-lamp-x" d="M345 81l30 30M375 81l-30 30"/>
        <text class="sl-lbl" x="396" y="101">LIGHT</text>
      </g>

      <g class="sl-part sl-box" data-part="fcu">
        <rect class="sl-card" x="226" y="${Y_L - 22}" width="74" height="44" rx="10" filter="url(#sl-fan-soft)"/>
        <rect class="sl-fuse" x="246" y="${Y_L - 7}" width="34" height="14" rx="7"/>
        <path class="sl-fuse-wire" d="M246 ${Y_L}H280"/>
        <text class="sl-lbl" x="263" y="${Y_L + 40}" text-anchor="middle">FUSED · 3 A</text>
      </g>

      <g class="sl-part sl-box" data-part="isolator">
        <rect class="sl-card sl-iso" x="${ISO_X0}" y="${Y_SL - 24}" width="${ISO_X1 - ISO_X0}" height="${Y_E - Y_SL + 46}" rx="12" filter="url(#sl-fan-soft)"/>
        <g id="sl-poles">${pole(Y_SL)}${pole(Y_L)}${pole(Y_N)}</g>
        <path class="sl-gang" id="sl-gang" d="M${(ISO_X0 + ISO_X1) / 2} ${Y_SL - 6}V${Y_N + 6}"/>
        <circle class="sl-term sl-term-e" cx="${ISO_X0 + 16}" cy="${Y_E}" r="5"/>
        <text class="sl-lbl sl-strong" x="${(ISO_X0 + ISO_X1) / 2}" y="${Y_SL - 34}" text-anchor="middle">ISOLATOR</text>
        <text class="sl-lbl sl-iso-state" id="sl-iso-state" x="${(ISO_X0 + ISO_X1) / 2}" y="${Y_E + 4}" text-anchor="middle"></text>
      </g>

      <g class="sl-part sl-box" data-part="fan">
        <rect class="sl-card" x="514" y="200" width="16" height="72" rx="5"/>
        <circle class="sl-fan-ring" cx="${FAN_X}" cy="236" r="46" filter="url(#sl-fan-soft)"/>
        <g id="sl-blades" transform="translate(${FAN_X} 236)">
          ${[0, 1, 2, 3].map((i) => `<path class="sl-blade" transform="rotate(${i * 90})" d="M0 -6C10 -16 12 -30 4 -36C-6 -32 -8 -18 0 -6z"/>`).join('')}
          <circle class="sl-hub" r="7"/>
        </g>
        <text class="sl-lbl sl-strong" x="${FAN_X}" y="168" text-anchor="middle">FAN</text>
        <text class="sl-lbl sl-timer" id="sl-timer" x="${FAN_X}" y="306" text-anchor="middle"></text>
      </g>

      <text class="sl-lbl sl-foot" x="${VB_W / 2}" y="392" text-anchor="middle">Tap any part to see what it does</text>
    </svg>`;
  stage.append(root);

  view.innerHTML = `
    <div class="sl-g" data-g="controls">
      <div class="sl-fan-controls">
        <button type="button" class="primary" id="sl-btn-light" aria-pressed="false">Pull the light cord</button>
        <button type="button" class="ghost" id="sl-btn-iso" aria-pressed="true">Isolator: on</button>
      </div>
      <div class="readouts">
        <div class="readout"><small>Light</small><b id="sl-r-light">Off</b></div>
        <div class="readout"><small>Fan</small><b id="sl-r-fan">Stopped</b></div>
      </div>
      <ul class="wire-results sl-tries" id="sl-tries"></ul>
    </div>
    <div class="sl-g" data-g="parts">
      <div class="wire-label">Parts</div>
      <div class="parts-list sl-parts">${fanParts.map((p, i) => `<button type="button" data-partbtn="${p.id}"><span class="badge">${i + 1}</span>${p.name}</button>`).join('')}</div>
      <div class="sl-explain" id="sl-explain" aria-live="polite"></div>
    </div>`;

  const sq = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const vq = <T extends Element>(sel: string) => view.querySelector<T>(sel)!;
  const blades = sq<SVGGElement>('#sl-blades');

  const running = () => isoOn && (lightOn || runOn > 0);

  const explain = (id: FanPart | null) => {
    current = id;
    root.querySelectorAll<SVGElement>('[data-part]').forEach((g) => g.classList.toggle('is-picked', g.dataset.part === id));
    view.querySelectorAll<HTMLElement>('[data-partbtn]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.partbtn === id)));
    const p = fanParts.find((x) => x.id === id);
    vq('#sl-explain').innerHTML = p ? `<div class="sl-fb"><div class="sl-fb-head"><b>${p.name}</b></div><p>${p.text}</p></div>` : '';
  };

  const render = () => {
    const live: Record<string, boolean> = {
      ntop: lightOn,
      feed: true,
      sl1: lightOn,
      perm1: true,
      perm2: true,
      n1: running(),
      e1: false,
      slo: isoOn && lightOn,
      lo: isoOn,
      no: running(),
    };
    for (const [id, on] of Object.entries(live)) sq(`#sl-w-${id}`).classList.toggle('is-live', on);
    sq('#sl-contact').setAttribute('d', lightOn ? 'M172 96L204 96' : 'M172 96L202 84');
    sq('#sl-cord').setAttribute('d', lightOn ? 'M188 118V170' : 'M188 118V158');
    sq('#sl-bead').setAttribute('cy', lightOn ? '176' : '164');
    sq('#sl-lamp').classList.toggle('is-on', lightOn);
    sq('#sl-lamp-glow').classList.toggle('is-on', lightOn);
    root.querySelectorAll<SVGPathElement>('.sl-pole').forEach((p) => {
      const y = Number(p.dataset.y);
      p.setAttribute('d', isoOn ? `M${ISO_X0 + 16} ${y}L${ISO_X1 - 16} ${y}` : `M${ISO_X0 + 16} ${y}L${ISO_X1 - 20} ${y - 14}`);
    });
    sq('#sl-gang').setAttribute('transform', isoOn ? '' : 'translate(-4 -7)');
    sq('#sl-iso-state').textContent = isoOn ? 'ON' : 'OFF';
    sq('.sl-iso').classList.toggle('is-off', !isoOn);
    const run = running();
    sq('#sl-timer').textContent = !isoOn ? 'isolated' : lightOn ? 'running' : runOn > 0 ? `run-on ${Math.ceil(runOn)} s` : 'stopped';
    root.classList.toggle('is-running', run);

    const lb = vq<HTMLButtonElement>('#sl-btn-light');
    lb.setAttribute('aria-pressed', String(lightOn));
    lb.textContent = lightOn ? 'Pull the cord: light off' : 'Pull the cord: light on';
    const ib = vq<HTMLButtonElement>('#sl-btn-iso');
    ib.setAttribute('aria-pressed', String(isoOn));
    ib.textContent = isoOn ? 'Isolator: on' : 'Isolator: off';
    vq('#sl-r-light').textContent = lightOn ? 'On' : 'Off';
    vq('#sl-r-fan').textContent = !isoOn ? 'Dead (isolated)' : lightOn ? 'Running' : runOn > 0 ? `Run-on · ${Math.ceil(runOn)} s` : 'Stopped';

    const t = (done: boolean, todo: string, did: string) => `<li class="${done ? 'ok' : 'warn'}">${done ? did : todo}</li>`;
    vq('#sl-tries').innerHTML =
      t(tried.start, 'Try: switch the light on. What does the fan do?', '<b>Light on, fan on.</b> The switched line told it to start.') +
      t(tried.runon, 'Try: now switch the light off.', '<b>It keeps going.</b> The timer runs it from the permanent line, then stops.') +
      t(tried.isolated, 'Try: turn the isolator off, then pull the cord.', '<b>Nothing at the fan.</b> All poles are broken, so it is safe to work on.');
  };

  vq('#sl-btn-light').addEventListener('click', () => {
    const was = lightOn;
    lightOn = !lightOn;
    if (lightOn && isoOn) tried.start = true;
    if (was && !lightOn && isoOn) {
      runOn = RUN_ON;
      if (tried.start) tried.runon = true;
    }
    if (lightOn && !isoOn) tried.isolated = true;
    render();
    ensureLoop();
  });
  vq('#sl-btn-iso').addEventListener('click', () => {
    isoOn = !isoOn;
    if (!isoOn) runOn = 0;
    if (!isoOn && lightOn) tried.isolated = true;
    render();
    ensureLoop();
  });

  root.querySelectorAll<SVGGElement>('[data-part]').forEach((g) => {
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', fanParts.find((p) => p.id === g.dataset.part)!.name);
    g.addEventListener('click', () => explain(g.dataset.part as FanPart));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        explain(g.dataset.part as FanPart);
      }
    });
  });
  view.querySelectorAll<HTMLElement>('[data-partbtn]').forEach((b) => b.addEventListener('click', () => explain(b.dataset.partbtn as FanPart)));

  /* ------------------------------------------------------------------ animation */
  let raf = 0;
  let last = 0;
  let angle = 0;
  let speed = 0;
  let active = false;
  let visible = false;

  const frame = (t: number) => {
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;
    if (runOn > 0 && !lightOn && isoOn) {
      const before = Math.ceil(runOn);
      runOn = Math.max(0, runOn - dt);
      if (Math.ceil(runOn) !== before) render();
    }
    const target = running() ? 540 : 0;
    speed += (target - speed) * Math.min(1, dt * 2.2);
    if (!reduced) {
      angle = (angle + speed * dt) % 360;
      blades.setAttribute('transform', `translate(${FAN_X} 236) rotate(${angle.toFixed(1)})`);
    }
    const idle = !running() && speed < 1 && runOn === 0;
    if (idle) {
      speed = 0;
      raf = 0;
      last = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  const ensureLoop = () => {
    if (active && visible && !raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  };
  const stopLoop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const resize = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    const scale = Math.min(w / VB_W, h / VB_H);
    sq<SVGSVGElement>('.sl-svg').style.setProperty('--sl-fs', `${Math.max(12, 12.5 / scale).toFixed(1)}px`);
  };

  render();
  explain(null);
  void current;
  return {
    setVisible(v) {
      visible = v;
      root.hidden = !v;
      if (v) {
        resize();
        ensureLoop();
      } else stopLoop();
    },
    activate() {
      active = true;
      ensureLoop();
    },
    deactivate() {
      active = false;
      stopLoop();
    },
    resize,
    reset() {
      lightOn = false;
      isoOn = true;
      runOn = 0;
      render();
      ensureLoop();
    },
    lightBtn: vq<HTMLElement>('#sl-btn-light'),
    isoBtn: vq<HTMLElement>('#sl-btn-iso'),
  };
}
