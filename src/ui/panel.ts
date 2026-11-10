import { lesson, parts, quiz, type PartId } from '../data/socket-lesson';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export interface Panel {
  select(id: PartId | null): void;
}

export type Tab = 'parts' | 'wire' | 'quiz';

export function initPanel(onSelect: (id: PartId) => void, onTab: (tab: Tab) => void = () => {}): Panel {
  const viewParts = $('view-parts');
  const viewQuiz = $('view-quiz');
  const tabParts = $('tab-parts');
  const tabQuiz = $('tab-quiz');

  /* ------------------------------- tabs ------------------------------- */
  const tabs: Record<Tab, { btn: HTMLElement; view: HTMLElement }> = {
    parts: { btn: tabParts, view: viewParts },
    wire: { btn: $('tab-wire'), view: $('view-wire') },
    quiz: { btn: tabQuiz, view: viewQuiz },
  };
  const showTab = (which: Tab, notify = true) => {
    for (const [key, { btn, view }] of Object.entries(tabs)) {
      btn.setAttribute('aria-selected', String(key === which));
      view.hidden = key !== which;
    }
    if (notify) onTab(which);
  };
  for (const key of Object.keys(tabs) as Tab[]) tabs[key].btn.addEventListener('click', () => showTab(key));

  /* ------------------------------- parts ------------------------------ */
  const detail = document.createElement('div');
  detail.className = 'detail';
  const list = document.createElement('div');
  list.className = 'parts-list';
  viewParts.append(detail, list);

  const buttons = new Map<PartId, HTMLButtonElement>();
  for (const p of parts) {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<span class="badge">${p.n}</span><span>${p.title}</span>`;
    b.addEventListener('click', () => onSelect(p.id));
    list.append(b);
    buttons.set(p.id, b);
  }

  const renderIntro = () => {
    detail.innerHTML = `<h2>${lesson.title}</h2><p>${lesson.intro}</p>`;
  };
  renderIntro();

  const select = (id: PartId | null) => {
    buttons.forEach((b, key) => b.setAttribute('aria-current', String(key === id)));
    if (!id) return renderIntro();
    const p = parts.find((x) => x.id === id)!;
    detail.innerHTML = `
      <h2><span class="badge">${p.n}</span>${p.title}</h2>
      <p>${p.short}</p>
      <ul>${p.points.map((x) => `<li>${x}</li>`).join('')}</ul>
      ${p.uk ? `<div class="uk"><b>UK standards</b>${p.uk}</div>` : ''}`;
    showTab('parts', false);
  };

  /* ------------------------------- quiz ------------------------------- */
  let qi = 0;
  let score = 0;
  const renderQuiz = () => {
    viewQuiz.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'quiz';
    viewQuiz.append(wrap);

    if (qi >= quiz.length) {
      wrap.innerHTML = `
        <div class="quiz-progress">Finished</div>
        <p class="score">${score} / ${quiz.length}</p>
        <p>${score === quiz.length ? 'Full marks. Nicely done.' : 'Have another look around the socket, then try again.'}</p>
        <button class="primary" type="button" id="quiz-restart">Try again</button>`;
      wrap.querySelector('#quiz-restart')!.addEventListener('click', () => {
        qi = 0;
        score = 0;
        renderQuiz();
      });
      return;
    }

    const q = quiz[qi];
    wrap.innerHTML = `
      <div class="quiz-progress">Question ${qi + 1} of ${quiz.length}</div>
      <h2>${q.q}</h2>
      <div class="options"></div>
      <div class="feedback" aria-live="polite"></div>`;
    const opts = wrap.querySelector('.options')!;
    const fb = wrap.querySelector('.feedback')!;
    const btns = q.options.map((text, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.addEventListener('click', () => {
        const right = i === q.answer;
        if (right) score++;
        btns.forEach((x, j) => {
          x.disabled = true;
          if (j === q.answer) x.classList.add('right');
          else if (j === i) x.classList.add('wrong');
        });
        fb.innerHTML = `<div class="why"><b>${right ? 'Correct.' : 'Not quite.'}</b> ${q.why}</div>
          <button class="primary" type="button" id="quiz-next">${qi + 1 < quiz.length ? 'Next' : 'See score'}</button>`;
        fb.querySelector('#quiz-next')!.addEventListener('click', () => {
          qi++;
          renderQuiz();
        });
        (fb.querySelector('#quiz-next') as HTMLButtonElement).focus();
      });
      opts.append(b);
      return b;
    });
  };
  renderQuiz();

  return { select };
}
