import { lesson, parts, quiz, type PartId } from '../data/socket-lesson';
import { mountQuiz } from './quiz';

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
  mountQuiz(viewQuiz, quiz, { retryHint: 'Have another look around the socket, then try again.' });

  return { select };
}
