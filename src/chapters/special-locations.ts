import { quiz } from '../data/special-locations-lesson';
import { mountQuiz } from '../ui/quiz';
import { mountBathroom } from './special-locations-bathroom';
import { mountFan } from './special-locations-fan';
import { mountIp } from './special-locations-ip';
import type { ChapterMount } from './types';
import './special-locations.css';

type Tab = 'fit' | 'ip' | 'fan' | 'quiz';
const TABS: { id: Tab; label: string }[] = [
  { id: 'fit', label: 'Fit out' },
  { id: 'ip', label: 'IP codes' },
  { id: 'fan', label: 'Fan' },
  { id: 'quiz', label: 'Quiz' },
];

/** Chapter 9: special locations (bathrooms) and IP codes. */
export const mount: ChapterMount = ({ stage, panel, complete }) => {
  stage.classList.add('sl-stage');
  panel.innerHTML = `
    <div class="tabs sl-tabs" role="tablist" aria-label="Chapter 9 sections">
      ${TABS.map((t, i) => `<button type="button" role="tab" id="sl-tab-${t.id}" aria-controls="sl-view-${t.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${t.label}</button>`).join('')}
    </div>
    ${TABS.map((t, i) => `<section role="tabpanel" id="sl-view-${t.id}" aria-labelledby="sl-tab-${t.id}"${i === 0 ? '' : ' hidden'}></section>`).join('')}`;
  const view = (t: Tab) => panel.querySelector<HTMLElement>(`#sl-view-${t}`)!;

  const bath = mountBathroom(stage, view('fit'));
  const ip = mountIp(stage, view('ip'));
  const fan = mountFan(stage, view('fan'));
  mountQuiz(view('quiz'), quiz, {
    retryHint: 'Have another go at fitting out the bathroom and decoding a few IP codes, then try again.',
    onFinish: (score, total) => {
      if (score / total >= 0.75) complete();
    },
  });

  let tab: Tab = 'fit';
  let scene: 'bath' | 'ip' | 'fan' = 'bath';
  const showScene = (s: typeof scene) => {
    scene = s;
    bath.setVisible(s === 'bath');
    ip.setVisible(s === 'ip');
    fan.setVisible(s === 'fan');
  };

  const select = (t: Tab, focus = false) => {
    tab = t;
    TABS.forEach(({ id }) => {
      const b = panel.querySelector<HTMLElement>(`#sl-tab-${id}`)!;
      b.setAttribute('aria-selected', String(id === t));
      b.tabIndex = id === t ? 0 : -1;
      view(id).hidden = id !== t;
      if (id === t && focus) b.focus();
    });
    // The quiz keeps whatever picture was last on the stage.
    if (t === 'fit') showScene('bath');
    else if (t === 'ip') showScene('ip');
    else if (t === 'fan') showScene('fan');
  };

  TABS.forEach(({ id }, i) => {
    const b = panel.querySelector<HTMLElement>(`#sl-tab-${id}`)!;
    b.addEventListener('click', () => select(id));
    b.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      select(TABS[(i + step + TABS.length) % TABS.length].id, true);
    });
  });

  const ro = new ResizeObserver(() => {
    if (scene === 'bath') bath.resize();
    else if (scene === 'fan') fan.resize();
  });

  showScene('bath');
  void tab;
  return {
    activate() {
      ro.observe(stage);
      fan.activate();
      if (scene === 'bath') bath.resize();
      else if (scene === 'fan') fan.resize();
    },
    deactivate() {
      ro.disconnect();
      fan.deactivate();
    },
  };
};
