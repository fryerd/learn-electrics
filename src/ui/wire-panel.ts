import type { ColourScheme, SocketScene, WireId } from '../scene/socket';
import { WIRE_IDS } from '../scene/socket';
import { faultFor, swapNote } from '../data/wiring-faults';

// "Wire it" tab: Try (pick a core, pick a terminal) with instant Reveal (what you just did, and why).

const LETTER: Record<WireId, string> = { line: 'L', neutral: 'N', earth: 'E' };

const NAME: Record<ColourScheme, Record<WireId, string>> = {
  current: { line: 'Brown', neutral: 'Blue', earth: 'Green and yellow' },
  legacy: { line: 'Red', neutral: 'Black', earth: 'Green and yellow' },
};

const SWATCH: Record<ColourScheme, Record<WireId, string>> = {
  current: {
    line: '#6b3f1d',
    neutral: '#1f5fbf',
    earth: 'repeating-linear-gradient(90deg,#2f9e4f 0 5px,#f2c40f 5px 10px)',
  },
  legacy: {
    line: '#c6281d',
    neutral: '#161616',
    earth: 'repeating-linear-gradient(90deg,#2f9e4f 0 5px,#f2c40f 5px 10px)',
  },
};

const LEVEL_CLASS = { ok: 'ok', warn: 'warn', danger: 'bad' } as const;

export interface WirePanel {
  setScheme(scheme: ColourScheme): void;
}

export function initWirePanel(scene: SocketScene): WirePanel {
  const root = document.getElementById('view-wire')!;
  let scheme: ColourScheme = 'current';

  const render = () => {
    const { assignments, active } = scene.getWiring();
    const names = NAME[scheme];

    const onTerminal = (t: WireId) => WIRE_IDS.find((c) => assignments[c] === t) ?? null;

    const conductors = WIRE_IDS.map((id) => {
      const at = assignments[id];
      const state = active === id ? 'Choose a terminal' : at ? `On ${LETTER[at]}` : 'Loose';
      return `<button type="button" class="chip" data-act="pick" data-wire="${id}" aria-pressed="${active === id}">
        <span class="swatch" style="background:${SWATCH[scheme][id]}"></span>
        <span><b>${names[id]}</b><small>${state}</small></span>
      </button>`;
    }).join('');

    const terminals = WIRE_IDS.map((t) => {
      const who = onTerminal(t);
      const level = who ? LEVEL_CLASS[faultFor(who, t).level] : '';
      return `<button type="button" class="chip term ${level}" data-act="place" data-wire="${t}" ${active ? '' : 'aria-disabled="true"'}>
        <span class="letter">${LETTER[t]}</span>
        <span><b>Terminal ${LETTER[t]}</b><small>${who ? names[who] : 'Empty'}</small></span>
      </button>`;
    }).join('');

    // Instant feedback: one line per connected core, as soon as it is connected.
    const rows = WIRE_IDS.filter((id) => assignments[id] !== null)
      .map((id) => {
        const at = assignments[id]!;
        const f = faultFor(id, at);
        return `<li class="${LEVEL_CLASS[f.level]}"><b>${names[id]} on ${LETTER[at]}: ${f.title}.</b> ${f.text}</li>`;
      })
      .join('');
    const connected = WIRE_IDS.filter((id) => assignments[id] !== null).length;
    const allRight = WIRE_IDS.every((id) => assignments[id] === id);
    const swap = swapNote(assignments);
    let summary = '';
    if (connected === 3) {
      summary = allRight
        ? '<p class="wire-summary ok">All three are right.</p>'
        : `<p class="wire-summary bad">${swap ?? 'Not right yet.'} Pick up the red or amber cores and move them.</p>`;
    }
    const empty = connected === 0 ? '<p class="wire-hint">Connect a core and you will see straight away whether it is right.</p>' : '';

    root.innerHTML = `
      <div class="detail">
        <h2>Wire the socket</h2>
        <p>The three cores from the cable are loose. Pick one, then pick the terminal it belongs on. The terminals are marked L, N and E. You can also click straight on the 3D view.</p>
      </div>
      <div class="wire-columns">
        <div class="wire-group"><div class="wire-label">Cores</div>${conductors}</div>
        <div class="wire-group"><div class="wire-label">Terminals</div>${terminals}</div>
      </div>
      <div class="wire-actions">
        <button type="button" class="ghost" data-act="reset">Start again</button>
      </div>
      <div class="wire-feedback" aria-live="polite">${empty}<ul class="wire-results">${rows}</ul>${summary}</div>
      <button type="button" class="ghost soon" disabled>Test it with the meter (coming soon)</button>`;
  };

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('button[data-act]');
    if (!btn) return;
    const wire = btn.dataset.wire as WireId | undefined;
    switch (btn.dataset.act) {
      case 'pick':
        if (wire) scene.selectConductor(wire);
        break;
      case 'place':
        if (wire) scene.assignToTerminal(wire);
        break;
      case 'reset':
        scene.resetWiring();
        break;
    }
  });

  // Hovering (or focusing) a core in the list lifts it in the 3D view too.
  const hoverFrom = (e: Event) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('button[data-act="pick"]');
    scene.setHoverConductor(btn ? (btn.dataset.wire as WireId) : null);
  };
  root.addEventListener('mouseover', hoverFrom);
  root.addEventListener('focusin', hoverFrom);
  root.addEventListener('mouseout', () => scene.setHoverConductor(null));
  root.addEventListener('focusout', () => scene.setHoverConductor(null));

  scene.onWiringChange = render;
  render();

  return {
    setScheme(s) {
      scheme = s;
      render();
    },
  };
}
