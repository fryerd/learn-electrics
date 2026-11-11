import './guide.css';
import { chapters } from '../data/chapters';

/** One step of a chapter's walkthrough, shown in a card on the main stage. */
export interface GuideStep {
  /** Small label above the title, e.g. "Volts (V)". */
  kicker?: string;
  title: string;
  /** One to three short sentences. */
  text: string;
  /** Something to do right now, shown in a highlighted box. */
  tryIt?: string;
  /** Runs each time the learner arrives on this step: set controls, highlight the thing to touch. */
  onEnter?: () => void;
}

export interface GuideOptions {
  /** Which corner of the stage the card sits in (on phones it always spans the top). */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Called when the learner reaches the last step. */
  onFinish?: () => void;
}

/** Briefly ring an element so the learner notices what to touch. */
export function pulse(el: Element | null | undefined, ms = 1900) {
  if (!el) return;
  el.classList.remove('gd-pulse');
  void (el as HTMLElement).offsetWidth; // restart the animation
  el.classList.add('gd-pulse');
  setTimeout(() => el.classList.remove('gd-pulse'), ms);
}

/**
 * A step-by-step guide on the stage: the same pattern as the power-network journey, for any chapter.
 * The card sits over the picture; the picture and the side panel stay fully usable underneath.
 */
export function mountGuide(stage: HTMLElement, steps: GuideStep[], opts: GuideOptions = {}) {
  const root = document.createElement('div');
  root.className = `gd gd-${opts.position ?? 'top-left'}`;
  root.innerHTML = `
    <div class="gd-card" role="region" aria-label="Guide">
      <div class="gd-head">
        <span class="gd-count"></span>
        <button type="button" class="gd-min" aria-label="Hide the guide" title="Hide the guide">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div aria-live="polite">
        <div class="gd-kicker"></div>
        <h2 class="gd-title"></h2>
        <p class="gd-text"></p>
        <div class="gd-try" hidden><b>Try it</b><span></span></div>
      </div>
      <div class="gd-nav">
        <button type="button" class="gd-back">&lsaquo; Back</button>
        <div class="gd-dots"></div>
        <button type="button" class="gd-next">Next &rsaquo;</button>
      </div>
    </div>
    <button type="button" class="gd-open" hidden>Guide</button>`;
  stage.append(root);

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const card = $('.gd-card');
  const count = $('.gd-count');
  const kicker = $('.gd-kicker');
  const title = $('.gd-title');
  const text = $('.gd-text');
  const tryBox = $('.gd-try');
  const back = $<HTMLButtonElement>('.gd-back');
  const next = $<HTMLButtonElement>('.gd-next');
  const dots = $('.gd-dots');
  const open = $<HTMLButtonElement>('.gd-open');
  let index = 0;

  steps.forEach((s, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'gd-dot';
    d.setAttribute('aria-label', `Step ${i + 1}: ${s.title}`);
    d.addEventListener('click', () => go(i));
    dots.append(d);
  });

  function go(i: number) {
    index = Math.max(0, Math.min(steps.length - 1, i));
    const s = steps[index];
    count.textContent = `Step ${index + 1} of ${steps.length}`;
    kicker.textContent = s.kicker ?? '';
    kicker.hidden = !s.kicker;
    title.textContent = s.title;
    text.textContent = s.text;
    tryBox.hidden = !s.tryIt;
    if (s.tryIt) tryBox.querySelector('span')!.textContent = s.tryIt;
    back.disabled = index === 0;
    const last = index === steps.length - 1;
    next.innerHTML = last ? 'Next chapter &rsaquo;' : 'Next &rsaquo;';
    dots.querySelectorAll('.gd-dot').forEach((d, j) => {
      d.classList.toggle('is-on', j === index);
      d.classList.toggle('is-past', j < index);
      d.setAttribute('aria-current', String(j === index));
    });
    open.textContent = `Guide ${index + 1}/${steps.length}`;
    s.onEnter?.();
    if (last) opts.onFinish?.();
  }

  const setHidden = (hide: boolean) => {
    card.hidden = hide;
    open.hidden = !hide;
    (hide ? open : card.querySelector<HTMLElement>('.gd-next'))?.focus?.({ preventScroll: true });
  };
  $('.gd-min').addEventListener('click', () => setHidden(true));
  open.addEventListener('click', () => setHidden(false));
  back.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => {
    if (index < steps.length - 1) return go(index + 1);
    // Last step: carry on to the next chapter (or back to the homepage after the final one).
    const here = chapters.findIndex((c) => location.hash.replace(/^#\/?/, '') === c.id);
    const after = chapters[here + 1];
    location.hash = here >= 0 && after ? `#/${after.id}` : '#/';
  });

  // Wide screens: the card floats over the picture. Phones: it is docked as its own block under the
  // picture (so it never covers it), and follows its chapter being shown or hidden.
  const phone = matchMedia('(max-width: 880px)');
  let wanted = true;
  const sync = () => {
    root.hidden = stage.hidden || !wanted;
  };
  const place = () => {
    root.style.left = root.style.top = root.style.right = root.style.bottom = ''; // back to its corner
    if (phone.matches) {
      document.getElementById('stage')!.after(root);
      root.classList.add('gd-docked');
    } else {
      stage.append(root);
      root.classList.remove('gd-docked');
    }
    sync();
  };
  phone.addEventListener('change', place);

  // Wide screens: drag the card by its header to wherever suits you on the stage.
  const head = $('.gd-head');
  head.addEventListener('pointerdown', (e) => {
    if (phone.matches || (e.target as HTMLElement).closest('button')) return;
    const parent = root.offsetParent as HTMLElement | null;
    if (!parent) return;
    e.preventDefault();
    head.setPointerCapture(e.pointerId);
    const dx = e.clientX - root.offsetLeft;
    const dy = e.clientY - root.offsetTop;
    root.classList.add('gd-dragging');
    const move = (m: PointerEvent) => {
      const x = Math.max(0, Math.min(parent.clientWidth - root.offsetWidth, m.clientX - dx));
      const y = Math.max(0, Math.min(parent.clientHeight - root.offsetHeight, m.clientY - dy));
      root.style.right = root.style.bottom = 'auto';
      root.style.left = `${x}px`;
      root.style.top = `${y}px`;
    };
    const up = () => {
      root.classList.remove('gd-dragging');
      head.removeEventListener('pointermove', move);
      head.removeEventListener('pointerup', up);
      head.removeEventListener('pointercancel', up);
    };
    head.addEventListener('pointermove', move);
    head.addEventListener('pointerup', up);
    head.addEventListener('pointercancel', up);
  });
  new MutationObserver(sync).observe(stage, { attributes: true, attributeFilter: ['hidden'] });
  place();

  go(0);
  return {
    go,
    current: () => index,
    /** Hide or show the whole guide (for example when the learner moves to a tab the guide does not apply to). */
    setVisible(visible: boolean) {
      wanted = visible;
      sync();
    },
  };
}
