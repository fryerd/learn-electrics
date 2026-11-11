import './certification.css';
import { certification, quiz, reference, verdicts, zsTable } from '../data/certification-lesson';
import { mountGuide, pulse } from '../ui/guide';
import { mountQuiz } from '../ui/quiz';
import { allTerms, createBoard } from './certification-board';
import { mountCertificate } from './certification-cert';
import {
  assess,
  describeFault,
  describeTest,
  generateBoard,
  measure,
  placeLabel,
  placeOf,
  scoreFindings,
  summariseLog,
  type Assessment,
  type Board,
  type Fault,
  type Link,
  type LoggedRow,
  type Mode,
  type Place,
  type RcdTest,
  type Reading,
  type RigState,
  type Term,
  type Verdict,
} from './certification-model';
import type { ChapterMount } from './types';

type Tab = 'test' | 'faults' | 'cert' | 'guide' | 'quiz';

const MODES: { id: Mode; label: string; name: string; angle: number }[] = [
  { id: 'off', label: 'OFF', name: 'Off', angle: -120 },
  { id: 'cont', label: 'Ω', name: 'Continuity', angle: -60 },
  { id: 'ir', label: 'MΩ', name: 'Insulation', angle: 0 },
  { id: 'zs', label: 'Zs', name: 'Loop impedance', angle: 60 },
  { id: 'rcd', label: 'RCD', name: 'RCD', angle: 120 },
];
const LCD_MODE: Record<Mode, string> = { off: '', cont: 'CONTINUITY', ir: 'INSULATION', zs: 'LOOP Zs', rcd: 'RCD 30 mA' };

const LINKS: { id: Link; label: string; help: string }[] = [
  { id: 'none', label: 'No link · end to end', help: 'Ring step 1: put the probes on the two ends of one conductor (leg A and leg B) to read r1, rn or r2.' },
  { id: 'ring-LN', label: 'Ring step 2 · L–N crossed', help: 'Line of leg A is joined to neutral of leg B, and the other way round. Now read L to N at each socket.' },
  { id: 'ring-LE', label: 'Ring step 3 · L–CPC crossed', help: 'Line of each leg is joined to the CPC of the other. Read L to CPC at each socket: the highest reading is R1 + R2.' },
  { id: 'light-LE', label: 'Lights · L–CPC linked', help: 'Line is linked to CPC at the board. Read L to CPC at each light: that is R1 + R2, and it proves polarity.' },
];
const RCD_TESTS: { id: RcdTest; label: string }[] = [
  { id: 'half', label: '×½' },
  { id: 'x1', label: '×1' },
  { id: 'x5', label: '×5' },
  { id: 'ramp', label: 'Ramp' },
  { id: 'button', label: 'Test button' },
];

const newSeed = () => 1 + Math.floor(Math.random() * 999_999);
const freshRig = (): RigState => ({
  supplyOn: false,
  rcdTripped: false,
  nulled: false,
  lampsOut: false,
  mode: 'off',
  link: 'none',
  red: null,
  black: null,
  point: null,
  rcdTest: null,
});

const faultPlace = (f: Fault): Place =>
  f.kind === 'polarity'
    ? f.at === 'socket'
      ? { type: 'socket', i: f.i }
      : { type: 'light', i: f.i }
    : f.kind === 'no-cpc' || f.kind === 'dud-socket'
      ? { type: 'socket', i: f.i }
      : f.kind === 'low-ir'
        ? { type: 'lighting' }
        : f.kind === 'slow-rcd'
          ? { type: 'rcd' }
          : { type: 'ring' };

/** Chapter 11: certification and fault-finding. A virtual test rig, a find-the-faults board and a certificate. */
export const mount: ChapterMount = ({ stage, panel, complete }) => {
  let seed = newSeed();
  let board: Board = generateBoard(seed);
  let rig = freshRig();
  let nextProbe: 'red' | 'black' = 'red';
  let rows: LoggedRow[] = [];
  let nextId = 1;
  let revealed = false;
  let diagnosed = false;
  let quizPassed = false;
  let current: { state: RigState; reading: Reading; assessment: Assessment } = { state: rig, reading: measure(board, rig), assessment: { flag: 'info', hint: '' } };

  /* ------------------------------ the picture ------------------------------ */
  const hint = document.createElement('div');
  hint.className = 'hint ct-hint-top';
  stage.append(hint);
  const view = createBoard(stage, {
    onTerm: (t) => placeProbe(t),
    onPoint: (p) => {
      if (rig.mode === 'zs') plugIn(p);
    },
    onMain: () => toggleSupply(),
    onRcd: () => resetRcd(),
    onRcdTest: () => {
      if (rig.mode !== 'rcd') setMode('rcd');
      runRcd('button');
    },
  });

  /* ------------------------------- the panel ------------------------------- */
  const tabNames: [Tab, string][] = [
    ['test', 'Test'],
    ['faults', 'Faults'],
    ['cert', 'Cert'],
    ['guide', 'Notes'],
    ['quiz', 'Quiz'],
  ];
  const termOptions = (() => {
    const groups = new Map<string, string[]>();
    for (const t of allTerms()) {
      if (!groups.has(t.group)) groups.set(t.group, []);
      groups.get(t.group)!.push(`<option value="${t.term}">${t.label}</option>`);
    }
    return `<option value="">Not placed</option>${[...groups].map(([g, o]) => `<optgroup label="${g}">${o.join('')}</optgroup>`).join('')}`;
  })();
  const pointOptions = `<option value="">Not plugged in</option>${[0, 1, 2, 3, 4, 5].map((i) => `<option value="S${i}">Socket ${i + 1}</option>`).join('')}${[0, 1, 2, 3].map((i) => `<option value="P${i}">Light ${i + 1}</option>`).join('')}`;

  panel.innerHTML = `
    <div class="tabs ct-tabs" role="tablist">
      ${tabNames.map(([id, label], i) => `<button type="button" role="tab" id="ct-tab-${id}" aria-controls="ct-view-${id}" aria-selected="${i === 0}">${label}</button>`).join('')}
    </div>

    <section role="tabpanel" id="ct-view-test" aria-labelledby="ct-tab-test">
      <div class="detail"><h2>${certification.title}</h2><p>${certification.intro}</p></div>

      <div class="ct-device">
        <div class="ct-lcd" aria-live="polite">
          <div class="ct-lcd-top"><span id="ct-lcd-mode"></span><span id="ct-lcd-err"></span></div>
          <div class="ct-lcd-main"><b id="ct-lcd-main"></b><i id="ct-lcd-unit"></i></div>
          <div class="ct-lcd-sub" id="ct-lcd-sub"></div>
        </div>
        <div class="ct-dial" role="radiogroup" aria-label="Tester function">
          <div class="ct-knob" aria-hidden="true"><i id="ct-pointer"></i></div>
          ${MODES.map((m) => {
            const a = ((m.angle - 90) * Math.PI) / 180;
            return `<button type="button" role="radio" class="ct-dial-btn" data-mode="${m.id}" aria-label="${m.name}" aria-checked="false"
              style="left:calc(50% + ${(Math.cos(a) * 70).toFixed(1)}px);top:${(84 + Math.sin(a) * 62).toFixed(1)}px">${m.label}</button>`;
          }).join('')}
        </div>
      </div>

      <div class="ct-power">
        <button type="button" class="ghost ct-main-btn" id="ct-main"></button>
        <button type="button" class="ghost" id="ct-reset" hidden>Reset RCD</button>
      </div>

      <div id="ct-controls"></div>

      <div class="ct-probes" id="ct-probes">
        <label class="ct-probe ct-probe-red"><span>Red probe</span><select id="ct-red">${termOptions}</select></label>
        <label class="ct-probe ct-probe-black"><span>Black probe</span><select id="ct-black">${termOptions}</select></label>
      </div>
      <div class="ct-probes" id="ct-plug" hidden>
        <label class="ct-probe"><span>Plug-in lead at</span><select id="ct-point">${pointOptions}</select></label>
      </div>

      <div class="challenge ct-feedback" id="ct-feedback" aria-live="polite"></div>
      <div class="wire-actions">
        <button type="button" class="primary" id="ct-log">Log reading</button>
        <span class="wire-note" id="ct-log-note"></span>
      </div>
      <div class="uk"><b>UK standards</b>BS 7671 asks for the dead tests (continuity, insulation resistance, polarity) before the installation is switched on, then the live tests (earth fault loop impedance, RCDs).</div>
    </section>

    <section role="tabpanel" id="ct-view-faults" aria-labelledby="ct-tab-faults" hidden>
      <div class="detail"><h2>Find the faults</h2><p>${certification.faultsIntro}</p></div>
      <div class="ct-board-bar"><span id="ct-board-name"></span><button type="button" class="ghost" id="ct-new">New board</button></div>
      <div class="ct-goal" id="ct-goal"></div>
      <div class="wire-label">Schedule of test results</div>
      <ol class="ct-rows" id="ct-rows"></ol>
      <div class="wire-actions"><button type="button" class="primary" id="ct-reveal">Reveal the faults</button></div>
      <div id="ct-result" aria-live="polite"></div>
    </section>

    <section role="tabpanel" id="ct-view-cert" aria-labelledby="ct-tab-cert" hidden></section>

    <section role="tabpanel" id="ct-view-guide" aria-labelledby="ct-tab-guide" hidden>
      <div class="detail"><h2>Which test, and when</h2><p>Do them in this order. The first four are dead tests, with the supply isolated. The last two need the power on.</p></div>
      <ol class="ct-guide">
        ${reference
          .map(
            (r) => `<li class="${r.live ? 'live' : 'dead'}"><div class="ct-guide-head"><b>${r.n}. ${r.title}</b><span class="ct-tagline">${r.live ? 'Live' : 'Dead'}</span></div>
            <p><strong>Proves:</strong> ${r.proves}</p><p><strong>How:</strong> ${r.how}</p><p><strong>Pass:</strong> ${r.pass}</p></li>`,
          )
          .join('')}
      </ol>
      <div class="wire-label">Maximum Zs, type B breakers (0.4 s)</div>
      <table class="ct-zs-table">
        <thead><tr><th>Rating</th><th>Table</th><th>80% (compare with)</th></tr></thead>
        <tbody>${zsTable.map((z) => `<tr><td>${z.rating} A</td><td>${z.max.toFixed(2)} Ω</td><td>${(z.max * 0.8).toFixed(2)} Ω</td></tr>`).join('')}</tbody>
      </table>
      <div class="wire-label">The paperwork</div>
      <div class="detail"><ul>
        <li><b>New work:</b> an Electrical Installation Certificate (EIC), with a Schedule of Inspections and a Schedule of Circuit Details and Test Results.</li>
        <li><b>An existing installation:</b> an Electrical Installation Condition Report (EICR), which says whether it is satisfactory for continued use.</li>
        <li><b>How often:</b> typically about every 10 years for an owner-occupied home and 5 years for a rented one. The inspector recommends the interval.</li>
      </ul></div>
    </section>

    <section role="tabpanel" id="ct-view-quiz" aria-labelledby="ct-tab-quiz" hidden></section>`;

  const $ = <T extends HTMLElement>(id: string) => panel.querySelector<T>(`#${id}`)!;

  const selectTab = (k: Tab) => {
    for (const [id] of tabNames) {
      $(`ct-tab-${id}`).setAttribute('aria-selected', String(id === k));
      $(`ct-view-${id}`).hidden = id !== k;
    }
  };
  for (const [id] of tabNames) $(`ct-tab-${id}`).addEventListener('click', () => selectTab(id));

  const cert = mountCertificate($('ct-view-cert'), () => board.ze, () => summariseLog(board, rows));

  const checkComplete = () => {
    if (diagnosed && quizPassed) complete();
    renderGoal();
  };
  mountQuiz($('ct-view-quiz'), quiz, {
    retryHint: 'Have another look at the Notes tab, then try again.',
    onFinish: (score, total) => {
      if (score / total >= 0.75) quizPassed = true;
      checkComplete();
    },
  });

  /* ------------------------------ the rig ------------------------------ */
  const take = () => {
    current = { state: { ...rig }, reading: measure(board, rig), assessment: assess(board, rig) };
  };

  const placeProbe = (t: Term) => {
    if (rig.mode === 'zs') {
      const head = t.split('.')[0];
      if (head[0] === 'S' || head[0] === 'P') plugIn(head);
      return;
    }
    if (rig.mode !== 'cont' && rig.mode !== 'ir') {
      flashHint(rig.mode === 'off' ? 'Turn the dial to Ω or MΩ first' : 'RCD tests need no probes');
      return;
    }
    if (rig.red === t) rig.red = null;
    else if (rig.black === t) rig.black = null;
    else {
      const which = !rig.red ? 'red' : !rig.black ? 'black' : nextProbe;
      rig[which] = t;
      nextProbe = which === 'red' ? 'black' : 'red';
    }
    changed();
  };
  const plugIn = (p: string) => {
    rig.point = rig.point === p ? null : p;
    changed();
  };
  const setMode = (m: Mode) => {
    rig.mode = m;
    rig.rcdTest = null;
    renderControls();
    changed();
  };
  const toggleSupply = () => {
    rig.supplyOn = !rig.supplyOn;
    if (!rig.supplyOn) rig.rcdTripped = false;
    rig.rcdTest = null;
    changed();
  };
  const resetRcd = () => {
    if (!rig.rcdTripped) return;
    rig.rcdTripped = false;
    rig.rcdTest = null;
    changed();
  };
  const runRcd = (t: RcdTest) => {
    rig.rcdTest = t;
    take();
    if (current.reading.tripped) {
      rig.rcdTripped = true;
      view.pulseRcd();
    }
    render(false);
  };

  let hintTimer = 0;
  const flashHint = (text: string) => {
    hint.textContent = text;
    clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => render(false), 1800);
  };

  const renderControls = () => {
    const c = $('ct-controls');
    switch (rig.mode) {
      case 'off':
        c.innerHTML = `<p class="ct-help">Turn the dial to choose a test. Start with the dead tests (Ω, then MΩ) with the main switch off.</p>`;
        break;
      case 'cont':
        c.innerHTML = `
          <div class="ct-row-ctl"><button type="button" class="ghost" id="ct-null"></button><span class="ct-help" id="ct-null-note"></span></div>
          <div class="wire-label">Link at the board</div>
          <div class="ct-links" role="radiogroup" aria-label="Test link at the board">
            ${LINKS.map((l) => `<button type="button" role="radio" class="ct-chip" data-link="${l.id}" aria-checked="${rig.link === l.id}">${l.label}</button>`).join('')}
          </div>
          <p class="ct-help" id="ct-link-help"></p>`;
        $('ct-null').addEventListener('click', () => {
          rig.nulled = true;
          changed();
        });
        c.querySelectorAll<HTMLElement>('[data-link]').forEach((b) =>
          b.addEventListener('click', () => {
            rig.link = b.dataset.link as Link;
            changed();
          }),
        );
        break;
      case 'ir':
        c.innerHTML = `
          <label class="ct-check"><input type="checkbox" id="ct-lamps" ${rig.lampsOut ? 'checked' : ''}/> Lamps out and equipment disconnected</label>
          <p class="ct-help">The tester puts 500 V DC between the two probes. Test line–neutral, line–CPC and neutral–CPC on each circuit (the circuit ends at the board are easiest).</p>`;
        $<HTMLInputElement>('ct-lamps').addEventListener('change', (e) => {
          rig.lampsOut = (e.target as HTMLInputElement).checked;
          changed();
        });
        break;
      case 'zs':
        c.innerHTML = `<p class="ct-help">Click a socket or light on the board to plug the tester in there. It reads Zs (line to earth loop) and the prospective fault current.</p>`;
        break;
      case 'rcd':
        c.innerHTML = `
          <div class="ct-rcd-btns">${RCD_TESTS.map((t) => `<button type="button" class="ghost" data-rcd="${t.id}">${t.label}</button>`).join('')}</div>
          <p class="ct-help">The tester leaks a measured current to earth and times the trip. A 30 mA RCD must not trip at ×½, must trip within 300 ms at ×1 and within 40 ms at ×5.</p>`;
        c.querySelectorAll<HTMLElement>('[data-rcd]').forEach((b) => b.addEventListener('click', () => runRcd(b.dataset.rcd as RcdTest)));
        break;
    }
  };

  const changed = () => {
    take();
    render(true);
  };

  /** Redraw everything from state. */
  const render = (fromState: boolean) => {
    if (fromState) take();
    const { reading, assessment } = current;

    // dial
    const m = MODES.find((x) => x.id === rig.mode)!;
    $('ct-pointer').style.transform = `rotate(${m.angle}deg)`;
    panel.querySelectorAll<HTMLElement>('[data-mode]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === rig.mode)));

    // display
    const lcd = { mode: LCD_MODE[rig.mode], main: reading.text, unit: reading.unit, sub: reading.sub ?? '', error: reading.error ?? '' };
    $('ct-lcd-mode').textContent = lcd.mode;
    $('ct-lcd-err').textContent = lcd.error;
    $('ct-lcd-main').textContent = lcd.main;
    $('ct-lcd-unit').textContent = lcd.unit;
    $('ct-lcd-sub').textContent = lcd.sub;
    panel.querySelector('.ct-lcd')!.classList.toggle('off', rig.mode === 'off');

    // power
    const main = $('ct-main');
    main.textContent = rig.supplyOn ? 'Main switch: ON · switch off' : 'Main switch: OFF · switch on';
    main.classList.toggle('on', rig.supplyOn);
    $('ct-reset').hidden = !rig.rcdTripped;

    // mode controls
    if (rig.mode === 'cont') {
      const n = $('ct-null');
      n.textContent = rig.nulled ? 'Leads nulled ✓' : 'Null the leads';
      n.toggleAttribute('disabled', rig.nulled);
      $('ct-null-note').textContent = rig.nulled ? '' : 'Clip the probes together and zero out their resistance first.';
      panel.querySelectorAll<HTMLElement>('[data-link]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.link === rig.link)));
      $('ct-link-help').textContent = LINKS.find((l) => l.id === rig.link)!.help;
    }
    if (rig.mode === 'rcd') panel.querySelectorAll<HTMLElement>('[data-rcd]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.rcd === current.state.rcdTest)));

    // probes
    const usesProbes = rig.mode === 'cont' || rig.mode === 'ir';
    $('ct-probes').hidden = !usesProbes;
    $('ct-plug').hidden = rig.mode !== 'zs';
    $<HTMLSelectElement>('ct-red').value = rig.red ?? '';
    $<HTMLSelectElement>('ct-black').value = rig.black ?? '';
    $<HTMLSelectElement>('ct-point').value = rig.point ?? '';

    // feedback
    const fb = $('ct-feedback');
    fb.className = `challenge ct-feedback ${assessment.flag}`;
    fb.hidden = !assessment.hint;
    fb.innerHTML = assessment.hint ? `<b>${assessment.flag === 'bad' ? 'Hmm.' : assessment.flag === 'ok' ? 'Good.' : 'Note.'}</b> ${assessment.hint}` : '';
    const loggable = canLog();
    $<HTMLButtonElement>('ct-log').disabled = !loggable || revealed;

    // stage hint
    hint.textContent =
      rig.mode === 'off'
        ? 'Choose a test on the tester'
        : rig.mode === 'zs'
          ? 'Click a socket or light to plug in'
          : rig.mode === 'rcd'
            ? 'Run an RCD test from the panel'
            : `Click a terminal to place the ${!rig.red ? 'red' : !rig.black ? 'black' : nextProbe} probe`;

    view.update({
      supplyOn: rig.supplyOn,
      rcdTripped: rig.rcdTripped,
      mode: rig.mode,
      link: rig.link,
      red: rig.red,
      black: rig.black,
      point: rig.point,
      lcd,
      marks: revealed ? board.faults.map((f, i) => ({ place: faultPlace(f), n: i + 1, found: lastScore?.results[i].state === 'found' })) : [],
    });
  };

  const canLog = () => {
    const r = current.reading;
    if (current.state.mode === 'off') return false;
    if (r.error && r.error !== 'Polarity reversed' && r.error !== 'No earth') return false;
    return r.value !== null || r.error === 'Polarity reversed';
  };

  /* ------------------------------ the log ------------------------------ */
  const logReading = () => {
    if (!canLog() || revealed) return;
    const s = current.state;
    const test = describeTest(s);
    const text = `${current.reading.error ?? ''} ${current.reading.text} ${current.reading.unit}`.trim();
    const note = $('ct-log-note');
    if (rows.some((r) => r.test === test && `${r.error ?? ''} ${r.text} ${r.unit}`.trim() === text)) {
      note.textContent = 'Already logged.';
      return;
    }
    rows.push({
      id: nextId++,
      test,
      place: placeOf(s),
      text: current.reading.text,
      unit: current.reading.unit,
      value: current.reading.value,
      error: current.reading.error,
      flag: current.assessment.flag,
      hint: current.assessment.hint,
      verdict: 'ok',
      state: s,
    });
    note.innerHTML = `Logged. ${rows.length} reading${rows.length === 1 ? '' : 's'} on the <button type="button" class="ct-linkbtn" id="ct-go-faults">schedule</button>.`;
    $('ct-go-faults').addEventListener('click', () => selectTab('faults'));
    renderRows();
  };

  const verdictNote = (r: LoggedRow) => {
    if (revealed) return '';
    if (r.verdict === 'ok' && r.flag === 'bad') return 'Look again: this reading does not fit a healthy installation.';
    if (r.verdict !== 'ok' && r.flag !== 'bad') return 'This reading is what a healthy installation gives here.';
    return '';
  };

  const renderRows = () => {
    const list = $('ct-rows');
    if (!rows.length) {
      list.innerHTML = `<li class="ct-empty">No readings yet. Take one on the Test tab and press <b>Log reading</b>.</li>`;
    } else {
      list.innerHTML = rows
        .map(
          (r) => `<li class="ct-row ${r.flag}" data-row="${r.id}">
            <div class="ct-row-top"><small>${r.id}. ${r.test}</small><button type="button" class="ct-del" data-del="${r.id}" aria-label="Remove reading ${r.id}" ${revealed ? 'disabled' : ''}>×</button></div>
            <div class="ct-row-mid"><span class="ct-place">${placeLabel(r.place)}</span><b class="ct-val">${r.error ? `<em>${r.error}</em> ` : ''}${r.text}<i>${r.unit}</i></b></div>
            <label class="ct-verdict"><span>Shows</span><select data-verdict="${r.id}" ${revealed ? 'disabled' : ''}>
              ${verdicts.map((v) => `<option value="${v.id}" ${v.id === r.verdict ? 'selected' : ''}>${v.label}</option>`).join('')}
            </select></label>
            <p class="ct-row-note">${verdictNote(r)}</p>
          </li>`,
        )
        .join('');
    }
    list.querySelectorAll<HTMLSelectElement>('[data-verdict]').forEach((s) =>
      s.addEventListener('change', () => {
        const r = rows.find((x) => x.id === Number(s.dataset.verdict))!;
        r.verdict = s.value as Verdict;
        s.closest('li')!.querySelector('.ct-row-note')!.textContent = verdictNote(r);
      }),
    );
    list.querySelectorAll<HTMLElement>('[data-del]').forEach((b) =>
      b.addEventListener('click', () => {
        rows = rows.filter((x) => x.id !== Number(b.dataset.del));
        renderRows();
      }),
    );
    $<HTMLButtonElement>('ct-reveal').disabled = revealed || !rows.length;
    $('ct-board-name').textContent = `Board #${seed} · ${board.faults.length} faults hidden`;
  };

  const renderGoal = () => {
    $('ct-goal').innerHTML = `<b>To finish the chapter</b>
      <span class="${diagnosed ? 'done' : ''}">${diagnosed ? '✓' : '○'} Find every fault on one board</span>
      <span class="${quizPassed ? 'done' : ''}">${quizPassed ? '✓' : '○'} Score 75% or more in the quiz</span>`;
  };

  let lastScore: ReturnType<typeof scoreFindings> | null = null;
  const reveal = () => {
    revealed = true;
    const s = scoreFindings(board, rows);
    lastScore = s;
    if (s.complete) diagnosed = true;
    const icon = { found: '✓', misnamed: '~', missed: '✗' };
    const word = { found: 'Found', misnamed: 'Spotted, but named differently', missed: 'Missed' };
    $('ct-result').innerHTML = `
      <div class="ct-score ${s.complete ? 'ok' : ''}"><b>${s.found} / ${s.total}</b> faults found${s.falseAlarms.length ? ` · ${s.falseAlarms.length} false alarm${s.falseAlarms.length === 1 ? '' : 's'}` : ''}
        <p>${s.complete ? 'Every fault diagnosed. That board is fully diagnosed.' : 'Not all of them this time. Press New board and try another.'}</p></div>
      <ul class="wire-results">${s.results
        .map((r, i) => `<li class="${r.state === 'found' ? 'ok' : r.state === 'misnamed' ? 'warn' : ''}"><b>${i + 1}. ${icon[r.state]} ${word[r.state]}.</b> ${describeFault(r.fault)}</li>`)
        .join('')}
      ${s.falseAlarms.map((r) => `<li class="warn"><b>False alarm:</b> reading ${r.id} (${r.test}) is what a healthy installation gives.</li>`).join('')}</ul>`;
    renderRows();
    checkComplete();
    render(false);
  };

  const newBoard = () => {
    seed = newSeed();
    board = generateBoard(seed);
    rig = freshRig();
    nextProbe = 'red';
    rows = [];
    revealed = false;
    lastScore = null;
    $('ct-result').innerHTML = '';
    $('ct-log-note').textContent = '';
    cert.reset();
    renderControls();
    renderRows();
    changed();
  };

  /* ------------------------------ wiring up ------------------------------ */
  panel.querySelectorAll<HTMLElement>('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode as Mode)));
  $('ct-main').addEventListener('click', toggleSupply);
  $('ct-reset').addEventListener('click', resetRcd);
  $('ct-log').addEventListener('click', logReading);
  $('ct-reveal').addEventListener('click', reveal);
  $('ct-new').addEventListener('click', newBoard);
  $<HTMLSelectElement>('ct-red').addEventListener('change', (e) => {
    rig.red = (e.target as HTMLSelectElement).value || null;
    changed();
  });
  $<HTMLSelectElement>('ct-black').addEventListener('change', (e) => {
    rig.black = (e.target as HTMLSelectElement).value || null;
    changed();
  });
  $<HTMLSelectElement>('ct-point').addEventListener('change', (e) => {
    rig.point = (e.target as HTMLSelectElement).value || null;
    changed();
  });

  renderControls();
  renderRows();
  renderGoal();
  changed();

  /* ------------------------------ the guided walkthrough ------------------------------ */
  /** Put the rig into a clean state for a guide step: chosen test, supply on or off, probes lifted. */
  const setUp = (mode: Mode, supplyOn: boolean, link: Link = 'none') => {
    selectTab('test');
    rig.supplyOn = supplyOn;
    rig.rcdTripped = false;
    rig.link = link;
    rig.red = null;
    rig.black = null;
    rig.point = null;
    nextProbe = 'red';
    setMode(mode);
  };
  const onStage = (sel: string) => stage.querySelector(sel);
  const dial = (m: Mode) => panel.querySelector(`[data-mode="${m}"]`);
  mountGuide(
    stage,
    [
      {
        title: 'Prove it, then write it down',
        text: 'New wiring is not finished until it is tested and the results recorded. This board has a consumer unit, a ring of six sockets, four lights and a tester.',
        tryIt: 'Find the main switch on the consumer unit. It is off, so the circuits are isolated for the dead tests.',
        onEnter: () => {
          setUp('off', false);
          pulse(onStage('.ct-main'));
        },
      },
      {
        kicker: 'Dead test · Ω',
        title: 'Continuity: is it joined up?',
        text: 'With the power off, a low-resistance ohmmeter proves each conductor runs unbroken from end to end. Null the leads first so their own resistance is not counted.',
        tryIt: 'Press "Null the leads", then click the two RING line (brown) ends, leg A and leg B, to read r1.',
        onEnter: () => {
          setUp('cont', false);
          pulse(dial('cont'));
          pulse(onStage('.ct-ends'));
        },
      },
      {
        kicker: 'Dead test · Ω',
        title: 'Cross the ring, check every socket',
        text: 'Join the line of each leg to the CPC of the other at the board. On a healthy ring every socket then reads about the same, and the highest reading is R1 + R2.',
        tryIt: 'Click the L and E terminals of S1, then of S5. The readings should be close.',
        onEnter: () => {
          setUp('cont', false, 'ring-LE');
          rig.nulled = true;
          changed();
          pulse(panel.querySelector('.ct-links'));
          pulse(onStage('[data-place="S0"]'));
        },
      },
      {
        kicker: 'Dead test · MΩ',
        title: 'Insulation: nothing leaking',
        text: 'The tester pushes 500 V DC between conductors that should be kept apart. You want a high reading: at least 1 MΩ, and healthy circuits often read off the scale.',
        tryIt: 'Tick "Lamps out", then click the LIGHTS line and neutral ends at the board.',
        onEnter: () => {
          setUp('ir', false);
          pulse(dial('ir'));
          pulse(panel.querySelector('.ct-check'));
        },
      },
      {
        kicker: 'Live test · Zs',
        title: 'Loop impedance: will the breaker trip?',
        text: 'Now the power goes on. Zs is the resistance of the path a fault current would take. It must be low enough for the breaker to trip quickly; compare it with 80% of the table value.',
        tryIt: 'Click a socket on the board to plug the tester in, and read Zs.',
        onEnter: () => {
          setUp('zs', true);
          pulse(onStage('[data-place="S5"]'));
        },
      },
      {
        kicker: 'Live test · RCD',
        title: 'RCD: fast enough to protect people',
        text: 'The tester leaks a set current to earth and times the trip. A 30 mA RCD should not trip at ×½, should trip within 300 ms at ×1 and within 40 ms at ×5.',
        tryIt: 'Press ×½, then ×1. After a trip, click the RCD on the board to reset it.',
        onEnter: () => {
          setUp('rcd', true);
          pulse(panel.querySelector('.ct-rcd-btns'));
        },
      },
      {
        title: 'Record it, and hunt the faults',
        text: 'Every reading goes on a schedule of test results, which becomes the certificate. This board has hidden faults: log readings, say what each shows, then reveal the answers.',
        tryIt: 'Press "Log reading" for a few tests, then open the Faults tab. The Cert and Quiz tabs finish the chapter.',
        onEnter: () => {
          pulse($('ct-log'));
          pulse($('ct-tab-faults'));
        },
      },
    ],
    { position: 'top-right' },
  );

  return {
    activate() {
      cert.refresh();
    },
    deactivate() {
      clearTimeout(hintTimer);
    },
  };
};
