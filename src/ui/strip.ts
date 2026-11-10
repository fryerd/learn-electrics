import { chapters, type Chapter } from '../data/chapters';
import { doneCount, isDone, onProgress } from '../progress';

/** The chapter strip along the bottom: one card per chapter, plus the header progress chip. */
export function initStrip(onChoose: (id: string) => void) {
  const scroll = document.getElementById('strip-scroll')!;
  const next = document.getElementById('strip-next')!;
  const act = document.getElementById('strip-act')!;
  let current = '';

  const cardHtml = (c: Chapter) => {
    const state = isDone(c.id)
      ? '<span class="chapter-state done" title="Finished" aria-label="Finished"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
      : c.built
        ? ''
        : '<span class="chapter-state soon">Soon</span>';
    return `<button type="button" class="chapter-card ${c.built ? '' : 'is-soon'}" data-id="${c.id}">
      <span class="chapter-thumb"><svg viewBox="0 0 48 48" aria-hidden="true">${c.icon}</svg></span>
      <span class="chapter-text"><small>${c.n}</small><b>${c.title}</b></span>
      ${state}
    </button>`;
  };

  const render = () => {
    scroll.innerHTML = chapters.map(cardHtml).join('');
    scroll.querySelectorAll<HTMLElement>('.chapter-card').forEach((el) => {
      el.setAttribute('aria-current', String(el.dataset.id === current));
      el.addEventListener('click', () => onChoose(el.dataset.id!));
    });
    // header progress chip
    const n = doneCount();
    document.getElementById('progress-count')!.textContent = `${n}/${chapters.length}`;
    (document.getElementById('progress-fill') as HTMLElement).style.width = `${(n / chapters.length) * 100}%`;
  };

  next.addEventListener('click', () => {
    const atEnd = scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth - 4;
    scroll.scrollTo({ left: atEnd ? 0 : scroll.scrollLeft + scroll.clientWidth * 0.8, behavior: 'smooth' });
  });

  onProgress(render);
  render();

  return {
    setCurrent(id: string) {
      current = id;
      scroll.querySelectorAll<HTMLElement>('.chapter-card').forEach((el) => {
        el.setAttribute('aria-current', String(el.dataset.id === id));
      });
      const c = chapters.find((x) => x.id === id);
      act.textContent = c ? c.act : '';
      const card = scroll.querySelector<HTMLElement>(`.chapter-card[data-id="${id}"]`);
      card?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    },
  };
}
