// Chapter 11: the "Certificate" tab. A simplified EIC / EICR with a schedule of test results that checks
// itself as the learner fills it in. Placeholder details only (A.N. Other), never real people or places.

import { inspections } from '../data/certification-lesson';
import {
  LIGHT_RATING,
  RING_RATING,
  TYPE_B_MAX_ZS,
  certOutcome,
  checkField,
  checkRcd,
  zsLimit,
  type CertField,
  type CertValues,
  type Circuit,
} from './certification-model';

const ROWS: { field: CertField; label: string; ringOnly?: boolean; hint: string }[] = [
  { field: 'r1', label: 'r1 (line, end to end)', ringOnly: true, hint: 'Ω' },
  { field: 'rn', label: 'rn (neutral, end to end)', ringOnly: true, hint: 'Ω' },
  { field: 'r2', label: 'r2 (CPC, end to end)', ringOnly: true, hint: 'Ω' },
  { field: 'r1r2', label: 'R1 + R2', hint: 'Ω' },
  { field: 'irLN', label: 'Insulation L–N', hint: 'MΩ' },
  { field: 'irLE', label: 'Insulation L–CPC', hint: 'MΩ' },
  { field: 'irNE', label: 'Insulation N–CPC', hint: 'MΩ' },
  { field: 'polarity', label: 'Polarity', hint: '' },
  { field: 'zs', label: 'Zs (measured)', hint: 'Ω' },
];

export function mountCertificate(root: HTMLElement, getZe: () => number, fromLog: () => CertValues) {
  let doc: 'eic' | 'eicr' = 'eic';
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const input = (id: string, unit: string, label: string) =>
    `<span class="ct-in-wrap"><input class="ct-in" id="${id}" inputmode="decimal" autocomplete="off" aria-label="${label}"/><i>${unit}</i></span>`;
  const tick = (id: string, label: string) =>
    `<select class="ct-in ct-sel" id="${id}" aria-label="${label}"><option value=""></option><option value="✓">✓</option><option value="✗">✗</option></select>`;

  root.innerHTML = `
    <div class="detail"><h2>The paperwork</h2>
      <p>Every result goes on the schedule. Fill it in from your log (or type), and the certificate checks each value against its limit.</p></div>
    <div class="ct-doc-toggle" role="group" aria-label="Which document">
      <button type="button" class="ghost" data-doc="eic" aria-pressed="true">EIC · new work</button>
      <button type="button" class="ghost" data-doc="eicr" aria-pressed="false">EICR · existing</button>
    </div>
    <div class="ct-cert" id="ct-cert">
      <header class="ct-cert-head">
        <b id="ct-doc-title"></b>
        <small>Simplified, for learning. Based on the BS 7671 model forms.</small>
      </header>
      <dl class="ct-cert-details">
        <dt>Client</dt><dd>A.N. Other</dd>
        <dt>Installation</dt><dd>1 Example Road, Anytown</dd>
        <dt>Extent</dt><dd id="ct-extent"></dd>
        <dt>Supply</dt><dd>TN-C-S · 230 V · Ze <span id="ct-ze"></span> Ω</dd>
        <dt>Main switch</dt><dd>100 A, 2-pole</dd>
      </dl>

      <div class="ct-cert-sec">Schedule of circuit details and test results</div>
      <button type="button" class="ghost ct-fill" id="ct-fill">Fill from my log</button>
      <table class="ct-sched">
        <thead><tr><th></th><th>C1 Ring<small>B${RING_RATING} · 2.5/1.5 mm²</small></th><th>C2 Lights<small>B${LIGHT_RATING} · 1.5/1.0 mm²</small></th></tr></thead>
        <tbody>
          <tr class="ct-limit"><th>Max Zs (80%)</th><td>${zsLimit(RING_RATING).toFixed(2)} Ω<small>of ${TYPE_B_MAX_ZS[RING_RATING]}</small></td><td>${zsLimit(LIGHT_RATING).toFixed(2)} Ω<small>of ${TYPE_B_MAX_ZS[LIGHT_RATING]}</small></td></tr>
          ${ROWS.map(
            (r) => `<tr><th>${r.label}</th>
              <td>${r.field === 'polarity' ? tick(`ring-${r.field}`, `Ring ${r.label}`) : input(`ring-${r.field}`, r.hint, `Ring ${r.label}`)}</td>
              <td>${r.ringOnly ? '<span class="ct-na">n/a</span>' : r.field === 'polarity' ? tick(`light-${r.field}`, `Lights ${r.label}`) : input(`light-${r.field}`, r.hint, `Lights ${r.label}`)}</td></tr>`,
          ).join('')}
        </tbody>
      </table>
      <table class="ct-sched ct-rcd-t">
        <thead><tr><th>RCD 30 mA</th><th>×1<small>≤ 300 ms</small></th><th>×5<small>≤ 40 ms</small></th><th>Test button</th></tr></thead>
        <tbody><tr><th>Both circuits</th><td>${input('rcd1', 'ms', 'RCD trip time at 1x')}</td><td>${input('rcd5', 'ms', 'RCD trip time at 5x')}</td><td>${tick('rcdButton', 'RCD test button')}</td></tr></tbody>
      </table>

      <div class="ct-cert-sec">Schedule of inspections</div>
      <ul class="ct-insp">
        ${inspections
          .map(
            (t, i) => `<li><span>${t}</span><select class="ct-in ct-sel" id="ct-insp-${i}" aria-label="${t}">
              <option value="✓">✓</option><option value="✗">✗</option><option value="N/A">N/A</option></select></li>`,
          )
          .join('')}
      </ul>

      <div class="ct-outcome" id="ct-outcome" aria-live="polite"></div>

      <div class="ct-cert-sec">Next inspection</div>
      <div class="ct-next">
        <label>Property <select class="ct-in ct-sel" id="ct-occ"><option value="owner">Owner-occupied home</option><option value="rented">Rented home</option></select></label>
        <label>Recommended in <select class="ct-in ct-sel" id="ct-int">
          <option value="1">1 year</option><option value="3">3 years</option><option value="5">5 years</option><option value="10" selected>10 years</option></select></label>
      </div>
      <p class="ct-next-note" id="ct-next-note"></p>
      <dl class="ct-cert-details ct-sign">
        <dt>Inspected by</dt><dd>A.N. Inspector (placeholder)</dd>
        <dt>Date</dt><dd>${today}</dd>
      </dl>
    </div>
    <div class="wire-actions"><button type="button" class="primary" id="ct-print">Print / save as PDF</button></div>`;

  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const values = (): CertValues => {
    const circ = (c: Circuit) => Object.fromEntries(ROWS.filter((r) => c === 'ring' || !r.ringOnly).map((r) => [r.field, $<HTMLInputElement>(`${c}-${r.field}`).value]));
    return { ring: circ('ring'), light: circ('light'), rcd1: $<HTMLInputElement>('rcd1').value, rcd5: $<HTMLInputElement>('rcd5').value, rcdButton: $<HTMLSelectElement>('rcdButton').value };
  };

  const check = () => {
    const v = values();
    const mark = (el: HTMLElement, c: string) => {
      el.classList.toggle('bad', c === 'bad');
      el.classList.toggle('ok', c === 'ok');
    };
    for (const c of ['ring', 'light'] as Circuit[])
      for (const r of ROWS) {
        if (c === 'light' && r.ringOnly) continue;
        mark($(`${c}-${r.field}`), checkField(c, r.field, v[c][r.field], v[c]));
      }
    (['rcd1', 'rcd5', 'rcdButton'] as const).forEach((f) => mark($(f), checkRcd(f, v[f])));
    const insp = inspections.map((_, i) => $<HTMLSelectElement>(`ct-insp-${i}`).value);
    inspections.forEach((_, i) => mark($(`ct-insp-${i}`), insp[i] === '✗' ? 'bad' : 'ok'));
    const res = certOutcome(v, insp);
    const out = $('ct-outcome');
    out.className = `ct-outcome ${res.outcome}`;
    const eicr = doc === 'eicr';
    if (res.outcome === 'incomplete')
      out.innerHTML = `<b>Not finished</b>${res.missing} result${res.missing === 1 ? '' : 's'} still to fill in. Nothing outside limits so far.`;
    else if (res.outcome === 'satisfactory')
      out.innerHTML = eicr
        ? '<b>Overall: satisfactory</b>Every result is within limits and nothing failed inspection.'
        : '<b>Ready to issue</b>Every result is within limits: the work meets the standard and the certificate can be signed.';
    else
      out.innerHTML = eicr
        ? `<b>Overall: unsatisfactory</b>${res.problems} item${res.problems === 1 ? '' : 's'} outside limits or failed inspection (highlighted). Each needs a code and putting right.`
        : `<b>Cannot be issued yet</b>${res.problems} item${res.problems === 1 ? '' : 's'} outside limits (highlighted). New work must be put right and retested before it is certified.`;
  };

  const setDoc = (d: 'eic' | 'eicr') => {
    doc = d;
    root.querySelectorAll<HTMLElement>('[data-doc]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.doc === d)));
    $('ct-doc-title').textContent = d === 'eic' ? 'Electrical Installation Certificate' : 'Electrical Installation Condition Report';
    $('ct-extent').textContent = d === 'eic' ? 'New ring final circuit and lighting circuit' : 'Whole installation (existing)';
    check();
  };

  const nextNote = () => {
    const occ = $<HTMLSelectElement>('ct-occ').value;
    const yrs = Number($<HTMLSelectElement>('ct-int').value);
    const typical = occ === 'owner' ? 10 : 5;
    $('ct-next-note').textContent =
      `Typically about ${typical} years for ${occ === 'owner' ? 'an owner-occupied home' : 'a rented home'}. The inspector recommends the interval and can choose a shorter one if the condition calls for it.` +
      (yrs > typical ? ` ${yrs} years is longer than usual for this property.` : '');
  };

  root.querySelectorAll<HTMLElement>('[data-doc]').forEach((b) => b.addEventListener('click', () => setDoc(b.dataset.doc as 'eic' | 'eicr')));
  root.querySelectorAll<HTMLElement>('.ct-in').forEach((el) => el.addEventListener('input', check));
  root.querySelectorAll<HTMLElement>('.ct-in').forEach((el) => el.addEventListener('change', check));
  $('ct-occ').addEventListener('change', () => {
    $<HTMLSelectElement>('ct-int').value = $<HTMLSelectElement>('ct-occ').value === 'owner' ? '10' : '5';
    nextNote();
  });
  $('ct-int').addEventListener('change', nextNote);
  $('ct-fill').addEventListener('click', () => {
    const v = fromLog();
    for (const c of ['ring', 'light'] as Circuit[])
      for (const r of ROWS) {
        if (c === 'light' && r.ringOnly) continue;
        const val = v[c][r.field];
        if (val !== undefined) $<HTMLInputElement>(`${c}-${r.field}`).value = val;
      }
    if (v.rcd1) $<HTMLInputElement>('rcd1').value = v.rcd1;
    if (v.rcd5) $<HTMLInputElement>('rcd5').value = v.rcd5;
    if (v.rcdButton) $<HTMLSelectElement>('rcdButton').value = v.rcdButton;
    check();
  });

  // Print just the certificate: copy it (with its current values) into a print-only root.
  $('ct-print').addEventListener('click', () => {
    const cert = $('ct-cert');
    cert.querySelectorAll('input').forEach((i) => i.setAttribute('value', i.value));
    cert.querySelectorAll('select').forEach((s) => s.querySelectorAll('option').forEach((o) => o.toggleAttribute('selected', o.value === s.value)));
    const printRoot = document.createElement('div');
    printRoot.className = 'ct-print-root';
    printRoot.append(cert.cloneNode(true));
    document.body.append(printRoot);
    document.documentElement.classList.add('ct-printing');
    const done = () => {
      document.documentElement.classList.remove('ct-printing');
      printRoot.remove();
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
    setTimeout(done, 1000);
  });

  const refresh = () => {
    $('ct-ze').textContent = getZe().toFixed(2);
  };
  setDoc('eic');
  nextNote();
  refresh();
  return {
    refresh,
    /** A new board: clear the results. */
    reset() {
      root.querySelectorAll<HTMLInputElement>('input.ct-in').forEach((i) => (i.value = ''));
      root.querySelectorAll<HTMLSelectElement>('[id^="ring-"], [id^="light-"], #rcdButton').forEach((s) => (s.value = ''));
      refresh();
      check();
    },
  };
}
