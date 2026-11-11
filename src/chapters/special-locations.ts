import { quiz } from '../data/special-locations-lesson';
import { mountGuide, pulse } from '../ui/guide';
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
    // The guide sits bottom-right, except over the fan, whose bottom-right holds the fan itself.
    stage.classList.toggle('sl-guide-top', s === 'fan');
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

  const tabBtn = (t: Tab) => panel.querySelector<HTMLElement>(`#sl-tab-${t}`)!;
  mountGuide(
    stage,
    [
      {
        title: 'Water and wet skin',
        text: 'Wet skin lets far more current through your body than dry skin, so a room with a bath or shower has its own rules. Every circuit in the room needs 30 mA RCD protection, and the room is split into zones.',
        onEnter: () => {
          select('fit');
          bath.showView('wall');
          bath.flashZones(['z0', 'z1', 'z2']);
        },
      },
      {
        kicker: 'Zones 0, 1, 2',
        title: 'The closer to the water, the stricter',
        text: 'Zone 0 is inside the bath. Zone 1 is above it, up to 2.25 m. Zone 2 is a 0.6 m band beyond that. Everything else is outside the zones, and there is no zone 3.',
        tryIt: 'Find the 2.25 m and 0.6 m marks on the wall.',
        onEnter: () => {
          select('fit');
          bath.showView('wall');
          bath.flashZones(['z1', 'z2']);
        },
      },
      {
        kicker: 'Fit out',
        title: 'Place the kit',
        text: 'Each item has its own rules: what rating it needs, and which zones it may go in. The tick or cross on the wall tells you straight away.',
        tryIt: 'Drag the shaver supply unit onto the wall, first in zone 1, then in zone 2.',
        onEnter: () => {
          select('fit');
          bath.showView('wall');
          pulse(bath.tray);
        },
      },
      {
        kicker: '3 m rule',
        title: 'Sockets stay well away',
        text: 'An ordinary 13 A socket must be at least 3 m sideways from the edge of zone 1: the red dashed line under the wall. In a small bathroom that rules out most places.',
        tryIt: 'Place the 13 A socket by the door, then near the basin, and watch the measurement.',
        onEnter: () => {
          select('fit');
          bath.showView('wall');
          pulse(bath.tray);
        },
      },
      {
        kicker: 'IP codes',
        title: 'What the rating means',
        text: 'An IP code says how well a box keeps things out: the first digit is solids and dust, the second is water. Kit in zones 1 and 2 needs at least IPX4.',
        tryIt: 'Set the water digit to 7.',
        onEnter: () => {
          select('ip');
          ip.setCode('IPX4');
          pulse(ip.codeEl);
          pulse(ip.row('second'));
        },
      },
      {
        kicker: 'Extractor fan',
        title: 'Two lines and an isolator',
        text: 'The fan starts with the light on a switched line, and a permanent line keeps its timer running after. A three-pole isolator, outside the zones, cuts both lines and the neutral.',
        tryIt: 'Pull the cord on, then off, and watch the run-on. Then turn the isolator off.',
        onEnter: () => {
          select('fan');
          fan.reset();
          pulse(fan.lightBtn);
        },
      },
      {
        title: 'Now it is your turn',
        text: 'Fit every item in the bathroom until it is signed off, play the IP game, then take the quiz to tick this chapter off.',
        tryIt: 'Open the Quiz tab when you are ready.',
        onEnter: () => {
          select('fit');
          bath.showView('wall');
          pulse(tabBtn('quiz'));
        },
      },
    ],
    { position: 'bottom-right' },
  );

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
