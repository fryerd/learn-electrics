import { chapters, type Chapter } from '../data/chapters';
import { doneCount, isDone, onProgress } from '../progress';

/** The chapter pills along the top of the page (inside the course), plus the header progress chip. */
export function initPills(onChoose: (id: string) => void) {
  const scroll = document.getElementById('pills-scroll')!;
  const next = document.getElementById('pills-next')!;
  let current = '';

  const pillHtml = (c: Chapter) => {
    const done = isDone(c.id);
    return `<button type="button" class="pill ${done ? 'is-done' : ''}" data-id="${c.id}" title="${c.n}. ${c.title}">
      <span class="pill-ico"><svg viewBox="0 0 48 48" aria-hidden="true">${c.icon}</svg></span>
      <span class="pill-n">${c.n}</span>
      <span class="pill-t">${c.short}</span>
      ${done ? '<span class="pill-tick" aria-label="Finished"><svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : ''}
    </button>`;
  };

  const render = () => {
    scroll.innerHTML = chapters.map(pillHtml).join('');
    scroll.querySelectorAll<HTMLElement>('.pill').forEach((el) => {
      el.setAttribute('aria-current', String(el.dataset.id === current));
      el.addEventListener('click', () => onChoose(el.dataset.id!));
    });
    const n = doneCount();
    document.getElementById('progress-count')!.textContent = `${n}/${chapters.length}`;
    (document.getElementById('progress-fill') as HTMLElement).style.width = `${(n / chapters.length) * 100}%`;
  };

  next.addEventListener('click', () => {
    const atEnd = scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth - 4;
    scroll.scrollTo({ left: atEnd ? 0 : scroll.scrollLeft + scroll.clientWidth * 0.7, behavior: 'smooth' });
  });

  onProgress(render);
  render();

  return {
    setCurrent(id: string) {
      current = id;
      scroll.querySelectorAll<HTMLElement>('.pill').forEach((el) => el.setAttribute('aria-current', String(el.dataset.id === id)));
      scroll.querySelector<HTMLElement>(`.pill[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    },
  };
}
