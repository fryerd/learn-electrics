import {
  BASIN,
  BATH_D,
  BATH_H,
  BATH_L,
  CEIL,
  DOOR,
  ROOM_D,
  ROOM_W,
  SOCKET_GAP,
  WINDOW,
  ZONE2_W,
  ZONE_TOP,
  classify,
  itemById,
  items,
  judge,
  minIp,
  settle,
  spotPosition,
  spots,
  zoneName,
  zoneWhere,
  type ItemId,
  type Judgement,
  type Status,
  type Zone,
} from '../data/special-locations-lesson';
import { iconSvg, icons } from './special-locations-icons';

/* Elevation (the back wall) and plan (from above), both in metres mapped to SVG units. */
const S = 140;
const X0 = 72;
const FLOOR = 404;
const ex = (m: number) => X0 + m * S;
const ey = (m: number) => FLOOR - m * S;

const PS = 128;
const PX0 = 104;
const PY0 = 50;
const px = (m: number) => PX0 + m * PS;
const py = (m: number) => PY0 + m * PS;

const VB_W = 900;
const VIEW_H = 470;
/** Extra space under the landscape picture so the view toolbar never covers a label. */
const TOOLBAR_ROOM = 44;

const statusWord: Record<Status, string> = { ok: 'Allowed', check: 'Check', bad: 'Not allowed' };
const statusMark: Record<Status, string> = { ok: '✓', check: '?', bad: '✕' };

interface Placed {
  x: number;
  y: number;
  j: Judgement;
}

export interface BathroomScene {
  resize(): void;
  setVisible(v: boolean): void;
  /** Switch between the wall view and the view from above (both show at once on tall stages). */
  showView(m: 'wall' | 'plan'): void;
  /** Light up some zones on the wall for a moment. */
  flashZones(zones: Zone[]): void;
  /** The tray of items in the side panel. */
  tray: HTMLElement;
}

export function mountBathroom(stage: HTMLElement, view: HTMLElement): BathroomScene {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const placed = new Map<ItemId, Placed>();
  let selected: ItemId | null = null;
  let last: ItemId | null = null;
  let mode: 'wall' | 'plan' = 'wall';
  let portrait = false;
  let tk = 1;
  let signedOff = false;

  /* ------------------------------------------------------------------ stage */
  const root = document.createElement('div');
  root.className = 'sl-scene sl-bath';
  root.innerHTML = `
    <svg class="sl-svg" viewBox="0 0 ${VB_W} ${VIEW_H}" role="img" aria-label="A bathroom with its zones: zone 0 inside the bath, zone 1 above it up to 2.25 m, zone 2 a 0.6 m band beyond, and outside the zones.">
      <defs>
        <pattern id="sl-tiles" width="${S * 0.3}" height="${S * 0.3}" patternUnits="userSpaceOnUse" x="${X0}" y="${FLOOR}">
          <rect width="${S * 0.3}" height="${S * 0.3}" fill="#eef3f6"/>
          <path d="M0 0H${S * 0.3}M0 0V${S * 0.3}" stroke="#d3dde4" stroke-width="1.5"/>
        </pattern>
        <pattern id="sl-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="12" height="12" fill="rgba(179,56,44,0.06)"/>
          <path d="M0 0V12" stroke="rgba(179,56,44,0.28)" stroke-width="3"/>
        </pattern>
        <pattern id="sl-boards" width="${PS * 0.9}" height="${PS * 0.18}" patternUnits="userSpaceOnUse" x="${PX0}" y="${PY0}">
          <rect width="${PS * 0.9}" height="${PS * 0.18}" fill="#f1ece2"/>
          <path d="M0 ${PS * 0.18}H${PS * 0.9}M${PS * 0.45} 0V${PS * 0.18}" stroke="#e1d9ca" stroke-width="1.5"/>
        </pattern>
        <clipPath id="sl-room-clip"><rect x="${px(0)}" y="${py(0)}" width="${ROOM_W * PS}" height="${ROOM_D * PS}"/></clipPath>
        <filter id="sl-soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#1d232b" flood-opacity="0.18"/></filter>
      </defs>
      <g id="sl-elev">${elevationArt()}</g>
      <g id="sl-plan">${planArt()}</g>
    </svg>
    <div class="sl-banner" id="sl-banner" hidden></div>
    <div class="toolbar sl-viewbar" role="group" aria-label="View">
      <button type="button" data-view="wall" aria-pressed="true">Wall view</button>
      <button type="button" data-view="plan" aria-pressed="false">From above</button>
    </div>`;
  stage.append(root);

  const svg = root.querySelector<SVGSVGElement>('.sl-svg')!;
  const elev = svg.querySelector<SVGGElement>('#sl-elev')!;
  const plan = svg.querySelector<SVGGElement>('#sl-plan')!;
  const tokensLayer = svg.querySelector<SVGGElement>('#sl-tokens')!;
  const planDots = svg.querySelector<SVGGElement>('#sl-plan-dots')!;
  const measure = svg.querySelector<SVGGElement>('#sl-measure')!;
  const callout = svg.querySelector<SVGGElement>('#sl-callout')!;
  const stamp = svg.querySelector<SVGGElement>('#sl-stamp')!;
  const banner = root.querySelector<HTMLElement>('#sl-banner')!;
  const zoneEls = {
    z0: svg.querySelector('#sl-ez0')!,
    z1: svg.querySelector('#sl-ez1')!,
    z2: svg.querySelector('#sl-ez2')!,
    out: svg.querySelector('#sl-eout')!,
  } as Record<Zone, Element>;

  /* ------------------------------------------------------------------ panel */
  view.innerHTML = `
    <div class="sl-g" data-g="challenge"><div class="challenge" id="sl-challenge"></div></div>
    <div class="sl-g" data-g="items">
      <div class="wire-label">Items to fit</div>
      <div class="sl-tray" role="group" aria-label="Items to fit">
        ${items
          .map(
            (it) => `<button type="button" class="chip sl-item" data-item="${it.id}" aria-pressed="false">
              ${iconSvg(it.id)}<span class="sl-item-text"><b>${it.name}</b><small>${it.sub}</small></span><span class="sl-mark" aria-hidden="true"></span>
            </button>`,
          )
          .join('')}
      </div>
      <div class="sl-place" id="sl-place" hidden>
        <div class="wire-label">Or place the <span id="sl-place-name"></span> in</div>
        <div class="sl-spots">${spots.map((s) => `<button type="button" class="ghost" data-spot="${s.id}">${s.label}</button>`).join('')}</div>
      </div>
      <div class="wire-actions"><button type="button" class="ghost" id="sl-reset">Start again</button></div>
    </div>
    <div class="sl-g" data-g="fb"><div id="sl-fb" aria-live="polite"></div></div>
    <div class="sl-g" data-g="zones">
      <div class="wire-label">The zones</div>
      <ul class="sl-zones">
        ${(['z0', 'z1', 'z2', 'out'] as Zone[])
          .map(
            (z) => `<li><i class="sl-sw sl-sw-${z}"></i><div><b>${zoneName[z]}</b> ${zoneWhere[z]}<small>Minimum: ${minIp[z]}</small></div></li>`,
          )
          .join('')}
      </ul>
    </div>`;

  const q = <T extends Element>(sel: string) => view.querySelector<T>(sel)!;
  const chips = new Map<ItemId, HTMLButtonElement>();
  view.querySelectorAll<HTMLButtonElement>('[data-item]').forEach((b) => chips.set(b.dataset.item as ItemId, b));

  /* ------------------------------------------------------------------ helpers */
  const clientToWall = (cx: number, cy: number) => {
    const ctm = elev.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(cx, cy).matrixTransform(ctm.inverse());
    const x = (p.x - X0) / S;
    const y = (FLOOR - p.y) / S;
    const inside = x >= -0.05 && x <= ROOM_W + 0.05 && y >= -0.1 && y <= CEIL + 0.1;
    return { x, y, inside };
  };

  const highlight = (z: Zone | null) => {
    (Object.keys(zoneEls) as Zone[]).forEach((k) => zoneEls[k].classList.toggle('is-hot', k === z));
  };

  const setMode = (m: 'wall' | 'plan') => {
    mode = m;
    root.querySelectorAll<HTMLElement>('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === m)));
    layout();
  };

  const layout = () => {
    if (portrait) {
      svg.setAttribute('viewBox', `0 0 ${VB_W} ${VIEW_H * 2}`);
      elev.style.display = '';
      plan.style.display = '';
      plan.setAttribute('transform', `translate(0 ${VIEW_H})`);
    } else {
      svg.setAttribute('viewBox', `0 0 ${VB_W} ${VIEW_H + TOOLBAR_ROOM}`);
      elev.style.display = mode === 'wall' ? '' : 'none';
      plan.style.display = mode === 'plan' ? '' : 'none';
      plan.removeAttribute('transform');
    }
    root.classList.toggle('is-portrait', portrait);
  };

  const ensureWall = () => {
    if (!portrait && mode !== 'wall') setMode('wall');
  };

  /* ------------------------------------------------------------------ rendering */
  const tokenMarkup = (id: ItemId, p: Placed) => {
    const sel = id === selected ? ' is-selected' : '';
    return `<g class="sl-token is-${p.j.status}${sel}" data-token="${id}" transform="translate(${ex(p.x).toFixed(1)} ${ey(p.y).toFixed(1)}) scale(${tk})">
      <circle class="sl-tok-ring" r="27"/>
      <circle class="sl-tok-bg" r="21"/>
      <svg x="-13" y="-13" width="26" height="26" viewBox="0 0 24 24" class="sl-tok-icon"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[id]}</g></svg>
      <circle class="sl-tok-badge" cx="15" cy="-15" r="8.5"/>
      <text class="sl-tok-mark" x="15" y="-11.2" text-anchor="middle">${statusMark[p.j.status]}</text>
    </g>`;
  };

  const planPos = (id: ItemId, p: Placed) => {
    if (id === 'mat') return { x: p.x, y: p.j.zone === 'z0' ? BATH_D / 2 : 1.7 };
    if (id === 'light' || id === 'selv') return { x: p.x, y: 0.5 };
    return { x: p.x, y: 0.16 };
  };

  const render = () => {
    tokensLayer.innerHTML = [...placed].map(([id, p]) => tokenMarkup(id, p)).join('');
    planDots.innerHTML = [...placed]
      .map(([id, p]) => {
        const pp = planPos(id, p);
        return `<g class="sl-token sl-token-plan is-${p.j.status}" transform="translate(${px(pp.x).toFixed(1)} ${py(pp.y).toFixed(1)}) scale(${tk * 0.72})">
          <circle class="sl-tok-bg" r="21"/>
          <svg x="-13" y="-13" width="26" height="26" viewBox="0 0 24 24" class="sl-tok-icon"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[id]}</g></svg>
        </g>`;
      })
      .join('');
    renderMeasure();
    renderCallout();
    renderPanel();
  };

  const renderMeasure = () => {
    const s = placed.get('socket');
    if (!s || s.j.zone !== 'out') {
      measure.innerHTML = '';
      return;
    }
    const y = ey(s.y);
    const x1 = ex(BATH_L);
    const x2 = ex(s.x);
    const ok = s.j.status === 'ok';
    const gx = ex(BATH_L + SOCKET_GAP);
    measure.setAttribute('class', ok ? 'sl-measure is-ok' : 'sl-measure is-bad');
    measure.innerHTML = `
      <line class="sl-measure-guide" x1="${gx}" y1="${ey(ZONE_TOP)}" x2="${gx}" y2="${FLOOR}"/>
      <line class="sl-measure-edge" x1="${x1}" y1="${y - 16}" x2="${x1}" y2="${y + 16}"/>
      <line class="sl-measure-line" x1="${x1}" y1="${y}" x2="${x2 - 24 * tk}" y2="${y}"/>
      <path class="sl-measure-head" d="M${x1} ${y}l9 -5v10z"/>
      <text class="sl-lbl sl-measure-text" x="${(x1 + x2) / 2}" y="${y - 10}" text-anchor="middle">${(s.j.distance ?? 0).toFixed(1)} m ${ok ? '≥ 3 m' : '< 3 m'}</text>`;
  };

  const renderCallout = () => {
    const id = last;
    const p = id ? placed.get(id) : undefined;
    if (!id || !p) {
      callout.innerHTML = '';
      return;
    }
    const label = `${zoneName[p.j.zone]} · ${statusWord[p.j.status]}`;
    const cx = ex(p.x);
    const above = ey(p.y) - 40 * tk > ey(CEIL) + 18;
    const cy = above ? ey(p.y) - 34 * tk : ey(p.y) + 34 * tk;
    callout.setAttribute('class', `sl-callout is-${p.j.status}`);
    callout.innerHTML = `<rect class="sl-callout-bg" rx="8"/><text class="sl-lbl sl-callout-text" text-anchor="middle">${label}</text>`;
    const text = callout.querySelector<SVGTextElement>('text')!;
    const rect = callout.querySelector<SVGRectElement>('rect')!;
    const fs = parseFloat(getComputedStyle(svg).getPropertyValue('--sl-fs')) || 13;
    const w = (text.getComputedTextLength?.() || label.length * fs * 0.5) + fs * 1.3;
    const h = fs * 1.75;
    const left = Math.min(VB_W - w - 6, Math.max(6, cx - w / 2));
    rect.setAttribute('x', String(left));
    rect.setAttribute('y', String(cy - h / 2));
    rect.setAttribute('width', String(w));
    rect.setAttribute('height', String(h));
    text.setAttribute('x', String(left + w / 2));
    text.setAttribute('y', String(cy + fs * 0.36));
    if (!reduced) {
      callout.classList.remove('pop');
      void callout.getBoundingClientRect();
      callout.classList.add('pop');
    }
  };

  const renderPanel = () => {
    const okCount = [...placed.values()].filter((p) => p.j.status === 'ok').length;
    const total = items.length;
    chips.forEach((b, id) => {
      const p = placed.get(id);
      b.setAttribute('aria-pressed', String(id === selected));
      b.dataset.status = p ? p.j.status : '';
      const mark = b.querySelector('.sl-mark')!;
      mark.textContent = p ? statusMark[p.j.status] : '';
      b.setAttribute('aria-label', `${itemById(id)!.name}${p ? `: placed in ${zoneName[p.j.zone]}, ${statusWord[p.j.status].toLowerCase()}` : ': not placed yet'}`);
    });

    const done = okCount === total;
    const ch = q<HTMLElement>('#sl-challenge');
    ch.classList.toggle('ok', done);
    ch.innerHTML = `${
      done
        ? '<b>Bathroom signed off.</b> Every item is somewhere it is allowed. Try moving the socket closer to the bath to see the 3 m rule bite.'
        : `<b>Challenge:</b> fit all ${total} items where they are allowed. Some have only one sensible home; one has nowhere in this room except a far corner.`
    }<div class="sl-tally"><span class="sl-bar"><i style="width:${(okCount / total) * 100}%"></i></span><b>${okCount} / ${total}</b> allowed</div>`;

    const place = q<HTMLElement>('#sl-place');
    place.hidden = !selected;
    if (selected) q('#sl-place-name').textContent = itemById(selected)!.name.toLowerCase();

    const fbId = selected ?? last;
    const fb = q<HTMLElement>('#sl-fb');
    const p = fbId ? placed.get(fbId) : undefined;
    if (fbId && p) {
      const it = itemById(fbId)!;
      fb.innerHTML = `<div class="sl-fb is-${p.j.status}">
        <div class="sl-fb-head">${iconSvg(fbId)}<b>${it.name}</b><span class="sl-pill is-${p.j.status}">${statusWord[p.j.status]}</span></div>
        <dl>
          <dt>Where</dt><dd>${zoneName[p.j.zone]}${p.j.distance !== undefined ? `, ${p.j.distance.toFixed(1)} m from zone 1` : ''}</dd>
          <dt>Needs here</dt><dd>${p.j.minIp}</dd>
          <dt>Why</dt><dd>${p.j.reason}</dd>
        </dl></div>`;
    } else if (fbId) {
      fb.innerHTML = `<div class="sl-fb"><div class="sl-fb-head">${iconSvg(fbId)}<b>${itemById(fbId)!.name}</b></div><p class="sl-fb-tip">Drag it onto the wall, tap the wall, or use a button above.</p></div>`;
    } else {
      fb.innerHTML = '';
    }

    banner.hidden = !selected;
    if (selected) banner.innerHTML = `Tap the wall to place the <b>${itemById(selected)!.name.toLowerCase()}</b>`;

    if (done !== signedOff) {
      signedOff = done;
      stamp.classList.toggle('is-on', done);
      svg.classList.toggle('is-done', done);
    }
  };

  const select = (id: ItemId | null) => {
    selected = selected === id ? null : id;
    renderPanel();
    tokensLayer.querySelectorAll('.sl-token').forEach((t) => t.classList.toggle('is-selected', (t as SVGElement).dataset.token === selected));
  };

  const place = (id: ItemId, x: number, y: number) => {
    const s = settle(id, x, y);
    placed.set(id, { ...s, j: judge(id, s.x, s.y) });
    last = id;
    selected = null;
    render();
  };

  /* ------------------------------------------------------------------ drag from the tray */
  let ghost: HTMLElement | null = null;
  let drag: { id: ItemId; sx: number; sy: number; active: boolean; pid: number; from: 'tray' | 'token' } | null = null;

  const moveGhost = (cx: number, cy: number) => {
    if (ghost) ghost.style.transform = `translate(${cx}px, ${cy}px)`;
  };

  const startDrag = () => {
    if (!drag) return;
    drag.active = true;
    ensureWall();
    if (drag.from === 'tray') {
      ghost = document.createElement('div');
      ghost.className = 'sl-ghost';
      ghost.innerHTML = iconSvg(drag.id);
      document.body.append(ghost);
    }
    root.classList.add('is-dragging');
  };

  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pid) return;
    if (!drag.active && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) startDrag();
    if (!drag.active) return;
    e.preventDefault();
    moveGhost(e.clientX, e.clientY);
    const w = clientToWall(e.clientX, e.clientY);
    if (w && w.inside) {
      const s = settle(drag.id, w.x, w.y);
      highlight(classify(s.x, s.y));
      if (drag.from === 'token') {
        const t = tokensLayer.querySelector<SVGGElement>(`[data-token="${drag.id}"]`);
        t?.setAttribute('transform', `translate(${ex(s.x)} ${ey(s.y)}) scale(${tk})`);
      }
    } else highlight(null);
  };

  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pid) return;
    const d = drag;
    drag = null;
    ghost?.remove();
    ghost = null;
    root.classList.remove('is-dragging');
    highlight(null);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    if (!d.active) {
      if (d.from === 'tray') select(d.id);
      else {
        last = d.id;
        select(d.id);
        renderCallout();
      }
      return;
    }
    const w = clientToWall(e.clientX, e.clientY);
    if (w && w.inside) place(d.id, w.x, w.y);
    else render(); // snap a dragged token back
  };

  const onCancel = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pid) return;
    drag = null;
    ghost?.remove();
    ghost = null;
    root.classList.remove('is-dragging');
    highlight(null);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    render();
  };

  const beginPointer = (e: PointerEvent, id: ItemId, from: 'tray' | 'token') => {
    if (e.button !== 0) return;
    drag = { id, sx: e.clientX, sy: e.clientY, active: false, pid: e.pointerId, from };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  chips.forEach((b, id) => {
    b.addEventListener('pointerdown', (e) => beginPointer(e, id, 'tray'));
    // Keyboard (Enter / Space) arrives as a click with detail 0; pointer clicks are handled in onUp.
    b.addEventListener('click', (e) => {
      if (e.detail === 0) select(id);
    });
  });

  tokensLayer.addEventListener('pointerdown', (e) => {
    const t = (e.target as Element).closest<SVGGElement>('[data-token]');
    if (!t) return;
    e.stopPropagation();
    beginPointer(e, t.dataset.token as ItemId, 'token');
  });

  // Click-to-place: with an item selected, tap the wall.
  elev.addEventListener('click', (e) => {
    if (!selected || (e.target as Element).closest('[data-token]')) return;
    const w = clientToWall(e.clientX, e.clientY);
    if (w && w.inside) place(selected, w.x, w.y);
  });
  plan.addEventListener('click', () => {
    if (selected && !portrait) setMode('wall');
  });

  view.querySelectorAll<HTMLElement>('[data-spot]').forEach((b) =>
    b.addEventListener('click', () => {
      if (!selected) return;
      ensureWall();
      const id = selected;
      const pos = spotPosition(id, b.dataset.spot!);
      place(id, pos.x, pos.y);
      chips.get(id)?.focus();
    }),
  );

  q('#sl-reset').addEventListener('click', () => {
    placed.clear();
    selected = null;
    last = null;
    render();
  });

  root.querySelectorAll<HTMLElement>('[data-view]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.view as 'wall' | 'plan')));

  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && selected) select(null);
  });
  view.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && selected) select(null);
  });

  /* ------------------------------------------------------------------ sizing */
  const resize = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    portrait = h / w > 0.85;
    layout();
    const vbH = portrait ? VIEW_H * 2 : VIEW_H + TOOLBAR_ROOM;
    const scale = Math.min(w / VB_W, h / vbH);
    const fs = Math.max(13, 12.5 / scale);
    tk = Math.min(2.2, Math.max(1, 0.82 / scale));
    svg.style.setProperty('--sl-fs', `${fs.toFixed(1)}px`);
    svg.style.setProperty('--sl-fs-big', `${Math.max(16, 15 / scale).toFixed(1)}px`);
    render();
  };

  let flashTimer = 0;
  const flashZones = (zones: Zone[]) => {
    clearTimeout(flashTimer);
    (Object.keys(zoneEls) as Zone[]).forEach((k) => zoneEls[k].classList.toggle('is-hot', zones.includes(k)));
    flashTimer = window.setTimeout(() => highlight(null), 2600);
  };

  render();
  return {
    resize,
    setVisible(v) {
      root.hidden = !v;
      if (v) resize();
    },
    showView: (m) => {
      if (!portrait) setMode(m);
    },
    flashZones,
    tray: q<HTMLElement>('.sl-tray'),
  };
}

/* ======================================================================== artwork */

function elevationArt(): string {
  const wallTop = ey(CEIL);
  const zTop = ey(ZONE_TOP);
  const z2x = ex(BATH_L + ZONE2_W);
  const bx1 = ex(BATH_L);
  const bathTop = ey(BATH_H);
  return `
    <text class="sl-lbl sl-view-title" x="${X0}" y="30">THE WALL VIEW · looking at the bath wall</text>
    <!-- wall, tiles, ceiling, floor -->
    <rect class="sl-wall" x="${X0}" y="${wallTop}" width="${ROOM_W * S}" height="${CEIL * S}"/>
    <rect x="${X0}" y="${ey(2.0)}" width="${(BATH_L + ZONE2_W) * S}" height="${2.0 * S}" fill="url(#sl-tiles)"/>
    <rect class="sl-slab" x="${X0 - 12}" y="${wallTop - 12}" width="${ROOM_W * S + 24}" height="12" rx="3"/>
    <rect class="sl-floor" x="${X0 - 12}" y="${FLOOR}" width="${ROOM_W * S + 24}" height="10" rx="3"/>
    <rect class="sl-slab" x="${X0 - 12}" y="${wallTop - 12}" width="12" height="${CEIL * S + 22}" rx="3"/>
    <rect class="sl-slab" x="${ex(ROOM_W)}" y="${wallTop - 12}" width="12" height="${CEIL * S + 22}" rx="3"/>

    <!-- window above the bath -->
    <g class="sl-window">
      <rect x="${ex(WINDOW.x0)}" y="${ey(WINDOW.y1)}" width="${(WINDOW.x1 - WINDOW.x0) * S}" height="${(WINDOW.y1 - WINDOW.y0) * S}" rx="4"/>
      <path d="M${ex((WINDOW.x0 + WINDOW.x1) / 2)} ${ey(WINDOW.y1)}V${ey(WINDOW.y0)}M${ex(WINDOW.x0)} ${ey(WINDOW.y1 - 0.18)}H${ex(WINDOW.x1)}"/>
      <path class="sl-glint" d="M${ex(WINDOW.x0 + 0.08)} ${ey(WINDOW.y0 + 0.2)}l26 -26M${ex(WINDOW.x0 + 0.08)} ${ey(WINDOW.y0 + 0.08)}l40 -40"/>
    </g>

    <!-- basin and mirror -->
    <g class="sl-fixture">
      <rect x="${ex(BASIN.x0 + 0.05)}" y="${ey(1.75)}" width="${(BASIN.x1 - BASIN.x0 - 0.1) * S}" height="${0.6 * S}" rx="10" class="sl-mirror"/>
      <path d="M${ex(BASIN.x0)} ${ey(0.85)}H${ex(BASIN.x1)}l-10 34a10 10 0 0 1 -10 8H${ex(BASIN.x0) + 20}a10 10 0 0 1 -10 -8z"/>
      <path d="M${ex((BASIN.x0 + BASIN.x1) / 2)} ${ey(0.85) + 42}V${FLOOR}" class="sl-pedestal"/>
      <path d="M${ex((BASIN.x0 + BASIN.x1) / 2) - 4} ${ey(0.85)}v-14h12" class="sl-tap"/>
    </g>

    <!-- door -->
    <g class="sl-door">
      <rect x="${ex(DOOR.x0)}" y="${ey(DOOR.h)}" width="${(DOOR.x1 - DOOR.x0) * S}" height="${DOOR.h * S}" rx="3"/>
      <rect x="${ex(DOOR.x0) + 14}" y="${ey(DOOR.h) + 16}" width="${(DOOR.x1 - DOOR.x0) * S - 28}" height="${0.8 * S}" rx="3" class="sl-door-panel"/>
      <rect x="${ex(DOOR.x0) + 14}" y="${ey(1.0) + 6}" width="${(DOOR.x1 - DOOR.x0) * S - 28}" height="${0.8 * S}" rx="3" class="sl-door-panel"/>
      <circle cx="${ex(DOOR.x1) - 14}" cy="${ey(1.0)}" r="4.5" class="sl-handle"/>
    </g>

    <!-- zones -->
    <g class="sl-zones-layer">
      <rect id="sl-eout" class="sl-zone sl-zone-out" x="${z2x}" y="${wallTop}" width="${ex(ROOM_W) - z2x}" height="${CEIL * S}"/>
      <rect id="sl-ez1" class="sl-zone sl-zone-z1" x="${X0}" y="${zTop}" width="${BATH_L * S}" height="${bathTop - zTop}"/>
      <rect id="sl-ez2" class="sl-zone sl-zone-z2" x="${bx1}" y="${zTop}" width="${ZONE2_W * S}" height="${FLOOR - zTop}"/>
      <path class="sl-zone-edge" d="M${X0} ${zTop}H${z2x}V${FLOOR}M${bx1} ${zTop}V${bathTop}"/>
    </g>

    <!-- the bath (cut away to show zone 0) -->
    <g class="sl-bath-art">
      <path class="sl-bath-body" d="M${X0} ${bathTop - 6}H${bx1}V${FLOOR - 4}H${X0}z"/>
      <path id="sl-ez0" class="sl-zone sl-zone-z0" d="M${X0 + 10} ${bathTop + 4}H${bx1 - 10}V${FLOOR - 40}a26 26 0 0 1 -26 26H${X0 + 36}a26 26 0 0 1 -26 -26z"/>
      <path class="sl-water-line" d="M${X0 + 12} ${bathTop + 18}q22 -6 44 0t44 0t44 0t44 0t44 0"/>
      <rect class="sl-bath-rim" x="${X0 - 4}" y="${bathTop - 10}" width="${BATH_L * S + 8}" height="12" rx="6"/>
      <path class="sl-tap" d="M${X0 + 26} ${bathTop - 10}v-16h16"/>
    </g>

    <!-- zone labels -->
    <text class="sl-lbl sl-zl sl-zl-light" x="${(X0 + bx1) / 2}" y="${FLOOR - 24}" text-anchor="middle">ZONE 0</text>
    <text class="sl-lbl sl-zl" x="${(X0 + bx1) / 2}" y="${ey(1.1)}" text-anchor="middle">ZONE 1</text>
    <text class="sl-lbl sl-zl" transform="translate(${(bx1 + z2x) / 2 + 5} ${ey(1.1)}) rotate(-90)" text-anchor="middle">ZONE 2</text>
    <text class="sl-lbl sl-zl sl-zl-out" x="${ex(4.45)}" y="${ey(2.18)}" text-anchor="middle">OUTSIDE THE ZONES</text>

    <!-- dimensions -->
    <g class="sl-dim">
      <path d="M${z2x + 12} ${zTop}V${FLOOR}M${z2x + 6} ${zTop}h12"/>
      <text class="sl-lbl" x="${z2x + 18}" y="${ey(1.65)}">2.25 m</text>
      <path d="M${bx1} ${FLOOR + 26}H${z2x}M${bx1} ${FLOOR + 20}v12M${z2x} ${FLOOR + 20}v12"/>
      <text class="sl-lbl" x="${(bx1 + z2x) / 2}" y="${FLOOR + 50}" text-anchor="middle">0.6 m</text>
      <path class="sl-dim-socket" d="M${bx1} ${FLOOR + 26}H${ex(BATH_L + SOCKET_GAP)}M${ex(BATH_L + SOCKET_GAP)} ${FLOOR + 20}v12"/>
      <text class="sl-lbl sl-dim-socket-text" x="${ex(BATH_L + SOCKET_GAP) - 6}" y="${FLOOR + 50}" text-anchor="end">3 m: no 13 A sockets</text>
    </g>

    <g id="sl-measure"></g>
    <g id="sl-tokens"></g>
    <g id="sl-callout" class="sl-callout"></g>

    <g id="sl-stamp" class="sl-stamp" transform="translate(${ex(3.9)} ${ey(1.25)})">
      <g class="sl-stamp-inner">
        <circle r="92" class="sl-stamp-ring"/>
        <circle r="80" class="sl-stamp-ring sl-stamp-thin"/>
        <path d="M-28 -34l18 18 36 -40" class="sl-stamp-tick"/>
        <text y="16" text-anchor="middle" class="sl-stamp-text">BATHROOM</text>
        <text y="44" text-anchor="middle" class="sl-stamp-text">SIGNED OFF</text>
      </g>
    </g>`;
}

function planArt(): string {
  const r0 = px(0);
  const t0 = py(0);
  const W = ROOM_W * PS;
  const D = ROOM_D * PS;
  const bx = px(BATH_L);
  const by = py(BATH_D);
  const z2x = px(BATH_L + ZONE2_W);
  const z2y = py(BATH_D + ZONE2_W);
  const R = SOCKET_GAP * PS;
  // Within 3 m of zone 1: the bath outline grown by 3 m in every direction, clipped to the room.
  const noSocket = `M${r0} ${t0}H${px(BATH_L + SOCKET_GAP)}V${by}A${R} ${R} 0 0 1 ${bx} ${py(BATH_D + SOCKET_GAP)}H${r0}z`;
  const ang = (34 * Math.PI) / 180;
  const ax = bx + Math.cos(ang) * R;
  const ay = by + Math.sin(ang) * R;
  const doorW = (DOOR.x1 - DOOR.x0) * PS;
  return `
    <text class="sl-lbl sl-view-title" x="${r0}" y="28">FROM ABOVE · the bath wall is at the top</text>
    <rect x="${r0}" y="${t0}" width="${W}" height="${D}" fill="url(#sl-boards)"/>
    <g clip-path="url(#sl-room-clip)">
      <path class="sl-nosocket" d="${noSocket}"/>
    </g>
    <path class="sl-nosocket-edge" d="M${px(BATH_L + SOCKET_GAP)} ${t0}V${by}A${R} ${R} 0 0 1 ${px(BATH_L + Math.sqrt(SOCKET_GAP ** 2 - (ROOM_D - BATH_D) ** 2))} ${py(ROOM_D)}"/>
    <text class="sl-lbl sl-nosocket-text" x="${px(2.2)}" y="${py(2.25)}" text-anchor="middle">NO 13 A SOCKETS</text>
    <text class="sl-lbl sl-yessocket-text" x="${px(4.85)}" y="${py(2.35)}" text-anchor="middle">SOCKETS OK</text>

    <path class="sl-zone sl-plan-z2" d="M${bx} ${t0}H${z2x}V${z2y}H${r0}V${by}H${bx}z"/>
    <rect class="sl-zone sl-plan-z1" x="${r0}" y="${t0}" width="${BATH_L * PS}" height="${BATH_D * PS}"/>
    <rect class="sl-bath-plan" x="${r0 + 8}" y="${t0 + 8}" width="${BATH_L * PS - 16}" height="${BATH_D * PS - 16}" rx="34"/>
    <circle class="sl-plug" cx="${r0 + 34}" cy="${t0 + (BATH_D * PS) / 2}" r="5"/>
    <path class="sl-zone-edge" d="M${bx} ${t0}V${by}H${r0}M${z2x} ${t0}V${z2y}H${r0}"/>

    <!-- basin -->
    <path class="sl-fixture-plan" d="M${px(BASIN.x0)} ${t0}H${px(BASIN.x1)}V${py(0.32)}a${((BASIN.x1 - BASIN.x0) * PS) / 2} 22 0 0 1 -${(BASIN.x1 - BASIN.x0) * PS} 0z"/>
    <!-- door, opening into the room -->
    <path class="sl-door-swing" d="M${px(DOOR.x0)} ${t0}V${t0 + doorW}A${doorW} ${doorW} 0 0 0 ${px(DOOR.x1)} ${t0}"/>
    <rect class="sl-door-leaf" x="${px(DOOR.x0) - 3}" y="${t0}" width="6" height="${doorW}" rx="2"/>

    <!-- walls (with gaps for the window and door) -->
    <rect class="sl-plan-wall" x="${r0 - 9}" y="${t0 - 9}" width="${W + 18}" height="${D + 18}" rx="4"/>
    <rect class="sl-plan-gap sl-plan-glass" x="${px(WINDOW.x0)}" y="${t0 - 13}" width="${(WINDOW.x1 - WINDOW.x0) * PS}" height="13"/>
    <path class="sl-plan-window" d="M${px(WINDOW.x0)} ${t0 - 9}h${(WINDOW.x1 - WINDOW.x0) * PS}M${px(WINDOW.x0)} ${t0 - 4}h${(WINDOW.x1 - WINDOW.x0) * PS}"/>
    <rect class="sl-plan-gap" x="${px(DOOR.x0)}" y="${t0 - 13}" width="${doorW}" height="13"/>

    <text class="sl-lbl sl-zl" x="${(r0 + bx) / 2 + 14}" y="${by - 12}" text-anchor="middle">ZONES 0 + 1</text>
    <text class="sl-lbl sl-zl" x="${(r0 + bx) / 2}" y="${(by + z2y) / 2 + 5}" text-anchor="middle">ZONE 2</text>

    <g class="sl-dim">
      <path d="M${bx} ${py(BATH_D / 2)}H${z2x}"/>
      <text class="sl-lbl" x="${(bx + z2x) / 2}" y="${py(BATH_D / 2) - 8}" text-anchor="middle">0.6 m</text>
      <path class="sl-dim-socket" d="M${bx} ${by}L${ax} ${ay}"/>
      <circle class="sl-dim-dot" cx="${bx}" cy="${by}" r="4"/>
      <text class="sl-lbl sl-dim-socket-text" x="${(bx + ax) / 2 + 10}" y="${(by + ay) / 2 - 8}">3 m</text>
    </g>
    <g id="sl-plan-dots"></g>`;
}
