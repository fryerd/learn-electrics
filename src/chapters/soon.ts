import type { Chapter } from '../data/chapters';
import type { ChapterContext } from './types';

/** The "coming soon" page for a chapter that is not built yet. */
export function renderSoon(ctx: ChapterContext, c: Chapter) {
  ctx.stage.innerHTML = `
    <div class="soon-stage">
      <svg viewBox="0 0 48 48" class="soon-icon" aria-hidden="true">${c.icon}</svg>
      <h2>${c.n}. ${c.title}</h2>
      <p>Coming soon</p>
    </div>`;
  ctx.panel.innerHTML = `
    <div class="pane-body detail">
      <h2><span class="badge">${c.n}</span>${c.title}</h2>
      <p class="act">${c.act}</p>
      <p>${c.blurb}</p>
      <div class="wire-label">What you will do here</div>
      <ul>${c.doing.map((d) => `<li>${d}</li>`).join('')}</ul>
      <div class="uk"><b>Not built yet</b>This chapter is on the map but has no page yet. The finished chapters are marked on the strip below.</div>
    </div>`;
}
