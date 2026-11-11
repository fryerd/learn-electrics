import {
  ipCommon,
  ipFirst,
  ipGame,
  ipLetter,
  ipSecond,
  ipSentence,
  ipText,
  parseIp,
  type IpCode,
  type IpFirst,
  type IpLetter,
  type IpSecond,
} from '../data/special-locations-lesson';

/* Small illustrations, 120 x 100: an enclosure (the box) and what it is up against. */
const BOX = `<rect class="sl-ip-box" x="66" y="34" width="44" height="50" rx="7"/><circle class="sl-ip-led" cx="88" cy="50" r="4"/>`;
const STOP = `<path class="sl-ip-stop" d="M58 38v42"/>`;

const hand = `<path class="sl-ip-obj" d="M8 46c0-6 5-9 12-9h22c6 0 10 4 10 9v14c0 6-4 10-10 10H22c-8 0-14-5-14-12z"/><path class="sl-ip-obj-line" d="M20 46h22M20 54h24M20 62h20"/>`;
const finger = `<path class="sl-ip-obj" d="M6 50h38a8 8 0 0 1 0 16H6z"/><path class="sl-ip-obj-line" d="M38 52a5 5 0 0 1 0 12M24 54v8"/>`;
const tool = `<rect class="sl-ip-obj" x="4" y="52" width="22" height="12" rx="4"/><path class="sl-ip-obj-line sl-ip-shaft" d="M26 58h28"/>`;
const wire = `<path class="sl-ip-wire" d="M4 66c10-14 18 4 28-6s12-2 22-2"/>`;

const solidArt: Record<IpFirst, string> = {
  X: `${BOX}<text class="sl-ip-q" x="34" y="66" text-anchor="middle">?</text>`,
  '0': `<rect class="sl-ip-box sl-ip-open" x="66" y="34" width="44" height="50" rx="7"/><path class="sl-ip-gap" d="M66 46v26"/>${hand.replace(/class="sl-ip-obj"/, 'class="sl-ip-obj" transform="translate(22 0)"')}`,
  '1': `${BOX}${STOP}${hand}`,
  '2': `${BOX}${STOP}${finger}`,
  '3': `${BOX}${STOP}${tool}`,
  '4': `${BOX}${STOP}${wire}`,
  '5': `${BOX}<g class="sl-ip-dust">${dust(14, true)}</g>`,
  '6': `${BOX}${STOP}<g class="sl-ip-dust">${dust(14, false)}</g>`,
};

function dust(n: number, leak: boolean) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = 8 + ((i * 37) % 46);
    const y = 26 + ((i * 53) % 58);
    s += `<circle cx="${x}" cy="${y}" r="${1.6 + (i % 3) * 0.7}" style="--d:${(i % 5) * 0.3}s"/>`;
  }
  if (leak) s += `<circle cx="76" cy="74" r="1.7"/><circle cx="96" cy="70" r="1.3"/>`;
  return s;
}

const drop = (x: number, y: number, rot = 0, d = 0) =>
  `<path class="sl-ip-drop" style="--d:${d}s" transform="translate(${x} ${y}) rotate(${rot})" d="M0 -6c3 4 4.5 6.5 4.5 8.6a4.5 4.5 0 0 1 -9 0c0-2.1 1.5-4.6 4.5-8.6z"/>`;

const waterArt: Record<IpSecond, string> = {
  X: `${BOX}<text class="sl-ip-q" x="34" y="66" text-anchor="middle">?</text>`,
  '0': `${BOX}<text class="sl-ip-q" x="34" y="66" text-anchor="middle">–</text>`,
  '1': `${BOX}<g class="sl-ip-fall">${drop(78, 12)}${drop(92, 4, 0, 0.4)}${drop(102, 16, 0, 0.8)}</g>`,
  '2': `<g transform="rotate(15 88 60)">${BOX}</g><g class="sl-ip-fall">${drop(76, 10)}${drop(92, 2, 0, 0.4)}${drop(104, 14, 0, 0.8)}</g>`,
  '3': `${BOX}<g class="sl-ip-spray"><path d="M88 30L60 4M88 30L74 2M88 30V0M88 30L102 2M88 30L116 4"/></g>`,
  '4': `${BOX}<g class="sl-ip-fall">${drop(52, 40, -70)}${drop(50, 66, -90, 0.3)}${drop(80, 12, 0, 0.6)}${drop(102, 14, 20, 0.2)}${drop(116, 92, 160, 0.5)}${drop(56, 92, -140, 0.8)}</g>`,
  '5': `${BOX}<path class="sl-ip-nozzle" d="M4 52h18l8 4v4l-8 4H4z"/><path class="sl-ip-jet" d="M30 58H62"/>`,
  '6': `${BOX}<path class="sl-ip-nozzle" d="M2 48h20l10 6v8l-10 6H2z"/><path class="sl-ip-jet sl-ip-jet-big" d="M32 58H62"/>`,
  '7': `<rect class="sl-ip-pool" x="4" y="22" width="112" height="72" rx="6"/><path class="sl-ip-surface" d="M4 22q14-6 28 0t28 0t28 0t28 0"/>${BOX}<text class="sl-ip-small" x="18" y="40">1 m</text>`,
  '8': `<rect class="sl-ip-pool sl-ip-deep" x="4" y="4" width="112" height="90" rx="6"/><path class="sl-ip-surface" d="M4 4q14-5 28 0t28 0t28 0t28 0"/>${BOX}<text class="sl-ip-small" x="16" y="24">deep</text>`,
};

const letterArt: Record<Exclude<IpLetter, ''>, string> = {
  A: `${BOX}${STOP}${hand}`,
  B: `${BOX}${STOP}${finger}`,
  C: `${BOX}${STOP}${tool}`,
  D: `${BOX}${STOP}${wire}`,
};

const art = (inner: string) => `<svg viewBox="0 0 120 100" class="sl-ip-art" aria-hidden="true">${inner}</svg>`;

export interface IpScene {
  setVisible(v: boolean): void;
  /** Show a code such as "IPX4" in the decoder. */
  setCode(text: string): void;
  /** The big code on the stage. */
  codeEl: HTMLElement;
  /** A digit picker row in the side panel. */
  row(part: 'first' | 'second' | 'letter'): HTMLElement | null;
}

export function mountIp(stage: HTMLElement, view: HTMLElement): IpScene {
  let code: IpCode = { first: '6', second: '5', letter: '' };

  const root = document.createElement('div');
  root.className = 'sl-scene sl-ip';
  root.hidden = true;
  root.innerHTML = `
    <div class="sl-ip-wrap">
      <div class="sl-ip-code" aria-live="polite" aria-atomic="true">
        <span class="sl-ip-ip">IP</span><span class="sl-ip-d sl-ip-d1" id="sl-ipc1"></span><span class="sl-ip-d sl-ip-d2" id="sl-ipc2"></span><span class="sl-ip-d sl-ip-d3" id="sl-ipc3"></span>
      </div>
      <p class="sl-ip-sentence" id="sl-ip-sentence"></p>
      <div class="sl-ip-cards">
        <figure class="sl-ip-card sl-ip-card1"><div id="sl-ipa1"></div><figcaption><small>1st digit · solids and dust</small><b id="sl-ipt1"></b><span id="sl-ipl1"></span></figcaption></figure>
        <figure class="sl-ip-card sl-ip-card2"><div id="sl-ipa2"></div><figcaption><small>2nd digit · water</small><b id="sl-ipt2"></b><span id="sl-ipl2"></span></figcaption></figure>
        <figure class="sl-ip-card sl-ip-card3" id="sl-ipcard3"><div id="sl-ipa3"></div><figcaption><small>Optional letter · touching</small><b id="sl-ipt3"></b><span id="sl-ipl3"></span></figcaption></figure>
      </div>
    </div>`;
  stage.append(root);

  const seg = (name: string, label: string, values: string[], show = (v: string) => v) => `
    <div class="sl-seg-row">
      <div class="wire-label">${label}</div>
      <div class="sl-seg" role="radiogroup" aria-label="${label}">
        ${values.map((v) => `<button type="button" role="radio" data-${name}="${v}" aria-checked="false">${show(v)}</button>`).join('')}
      </div>
    </div>`;

  view.innerHTML = `
    <div class="detail"><h2>Decode an IP rating</h2>
      <p>Pick the parts and watch the picture. X means “not rated” for that part; the optional letter says what a person cannot poke in.</p></div>
    ${seg('first', 'First digit: solids', ['X', '0', '1', '2', '3', '4', '5', '6'])}
    ${seg('second', 'Second digit: water', ['X', '0', '1', '2', '3', '4', '5', '6', '7', '8'])}
    ${seg('letter', 'Letter (optional)', ['', 'A', 'B', 'C', 'D'], (v) => v || 'None')}
    <div class="wire-label sl-gap">Ratings you will see</div>
    <div class="presets">${ipCommon.map((c) => `<button type="button" class="ghost" data-code="${c}">${c}</button>`).join('')}</div>

    <div class="wire-label sl-gap">Game: choose the IP rating</div>
    <div class="sl-game" id="sl-game"></div>
    <div class="uk sl-gap"><b>UK standards</b>IP codes come from BS EN 60529. In a bathroom, fixed equipment in zones 1 and 2 needs at least IPX4 (IPX5 where water jets are used for cleaning), and zone 0 needs IPX7.</div>`;

  const q = <T extends Element>(sel: string, el: ParentNode = root) => el.querySelector<T>(sel)!;

  const render = () => {
    q('#sl-ipc1').textContent = code.first;
    q('#sl-ipc2').textContent = code.second;
    q('#sl-ipc3').textContent = code.letter;
    q<HTMLElement>('#sl-ipc3').hidden = !code.letter;
    q('#sl-ip-sentence').textContent = ipSentence(code);
    q('#sl-ipa1').innerHTML = art(solidArt[code.first]);
    q('#sl-ipa2').innerHTML = art(waterArt[code.second]);
    q('#sl-ipt1').textContent = `${code.first} · ${ipFirst[code.first].short}`;
    q('#sl-ipl1').textContent = ipFirst[code.first].long;
    q('#sl-ipt2').textContent = `${code.second} · ${ipSecond[code.second].short}`;
    q('#sl-ipl2').textContent = ipSecond[code.second].long;
    const c3 = q<HTMLElement>('#sl-ipcard3');
    c3.hidden = !code.letter;
    if (code.letter) {
      q('#sl-ipa3').innerHTML = art(letterArt[code.letter]);
      q('#sl-ipt3').textContent = `${code.letter} · ${ipLetter[code.letter].short}`;
      q('#sl-ipl3').textContent = ipLetter[code.letter].long;
    }
    // little "pop" on change
    root.querySelectorAll('.sl-ip-card').forEach((c) => {
      c.classList.remove('pop');
      void (c as HTMLElement).offsetWidth;
      c.classList.add('pop');
    });
    (['first', 'second', 'letter'] as const).forEach((k) =>
      view.querySelectorAll<HTMLElement>(`[data-${k}]`).forEach((b) => {
        const on = b.dataset[k] === code[k];
        b.setAttribute('aria-checked', String(on));
        b.tabIndex = on ? 0 : -1;
      }),
    );
    view.querySelectorAll<HTMLElement>('[data-code]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.code === ipText(code))));
  };

  (['first', 'second', 'letter'] as const).forEach((k) => {
    const btns = [...view.querySelectorAll<HTMLButtonElement>(`[data-${k}]`)];
    btns.forEach((b, i) => {
      b.addEventListener('click', () => {
        (code as unknown as Record<string, string>)[k] = b.dataset[k]!;
        render();
      });
      // Arrow keys move along a radio group.
      b.addEventListener('keydown', (e) => {
        const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const n = btns[(i + step + btns.length) % btns.length];
        n.click();
        n.focus();
      });
    });
  });
  view.querySelectorAll<HTMLElement>('[data-code]').forEach((b) =>
    b.addEventListener('click', () => {
      code = parseIp(b.dataset.code!)!;
      render();
    }),
  );

  /* ------------------------------------------------------------------ the game */
  let gi = 0;
  let gScore = 0;
  let answered = false;
  const game = q<HTMLElement>('#sl-game', view);

  const renderGame = () => {
    if (gi >= ipGame.length) {
      game.innerHTML = `<div class="challenge ${gScore === ipGame.length ? 'ok' : ''}"><b>${gScore} / ${ipGame.length}.</b> ${
        gScore === ipGame.length ? 'Every place got the right rating.' : 'Look at the decoder for the ones you missed, then have another go.'
      }</div><div class="wire-actions"><button type="button" class="ghost" data-game="again">Play again</button></div>`;
      game.querySelector('[data-game="again"]')!.addEventListener('click', () => {
        gi = 0;
        gScore = 0;
        renderGame();
      });
      return;
    }
    const t = ipGame[gi];
    answered = false;
    game.innerHTML = `
      <div class="sl-game-card">
        <div class="quiz-progress">Place ${gi + 1} of ${ipGame.length} · score ${gScore}</div>
        <p class="sl-game-place">${t.place}</p>
        <div class="sl-game-opts">${t.options.map((o, i) => `<button type="button" class="ghost" data-opt="${i}">${o}</button>`).join('')}</div>
        <div class="sl-game-fb" aria-live="polite"></div>
      </div>`;
    const opts = [...game.querySelectorAll<HTMLButtonElement>('[data-opt]')];
    opts.forEach((b, i) =>
      b.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const right = i === t.answer;
        if (right) gScore++;
        opts.forEach((x, j) => {
          x.disabled = true;
          if (j === t.answer) x.classList.add('right');
          else if (j === i) x.classList.add('wrong');
        });
        const parsed = parseIp(t.options[i]);
        if (parsed) {
          code = parsed;
          render();
        }
        const fb = game.querySelector<HTMLElement>('.sl-game-fb')!;
        fb.innerHTML = `<div class="why"><b>${right ? 'Right.' : `Not quite: ${t.options[t.answer]}.`}</b> ${t.why}</div>
          <button type="button" class="primary" data-game="next">${gi + 1 < ipGame.length ? 'Next place' : 'See score'}</button>`;
        const next = fb.querySelector<HTMLButtonElement>('[data-game="next"]')!;
        next.addEventListener('click', () => {
          gi++;
          renderGame();
        });
        next.focus();
      }),
    );
  };

  render();
  renderGame();
  return {
    setVisible(v) {
      root.hidden = !v;
    },
    setCode(text) {
      const c = parseIp(text);
      if (!c) return;
      code = c;
      render();
    },
    codeEl: q<HTMLElement>('.sl-ip-code'),
    row: (part) => view.querySelector<HTMLElement>(`[data-${part}]`)?.closest<HTMLElement>('.sl-seg-row') ?? null,
  };
}
