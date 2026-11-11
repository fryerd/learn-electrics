import { lesson, quiz } from '../data/special-locations-lesson';
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

  // The pictures and their controls live on the stage; the panel keeps the reading.
  const main = document.createElement('div');
  main.className = 'sl-main';
  const bar = document.createElement('div');
  bar.className = 'sl-trays';
  bar.hidden = true;
  stage.append(main, bar);
  const trayFor = () => {
    const d = document.createElement('div');
    d.className = 'sl-tray-host';
    d.hidden = true;
    bar.append(d);
    return d;
  };
  const trays = { bath: trayFor(), ip: trayFor(), fan: trayFor() };

  view('fit').innerHTML = `
    <div class="detail"><h2>${lesson.title}</h2><p>${lesson.intro}</p></div>
    <p class="sl-lead">The wall, its zones and the kit to fit are on the picture, with the controls under it. The guide walks you through them.</p>
    <div class="uk"><b>UK standards</b>BS 7671 section 701 covers rooms with a bath or shower. Every circuit serving the room needs 30 mA RCD protection. Supplementary bonding can often be left out where main bonding is in place and every circuit has that RCD protection: check the conditions before leaving it out.</div>`;
  view('ip').innerHTML = `
    <div class="detail"><h2>Decode an IP rating</h2>
      <p>X means “not rated” for that part; the optional letter says what a person cannot poke in. Pick the parts under the picture and watch it change.</p></div>
    <div class="uk"><b>UK standards</b>IP codes come from BS EN 60529. In a bathroom, fixed equipment in zones 1 and 2 needs at least IPX4 (IPX5 where water jets are used for cleaning), and zone 0 needs IPX7.</div>`;
  view('fan').innerHTML = `
    <div class="detail"><h2>The extractor fan</h2>
      <p>A <b>switched line</b> starts the fan with the light; a <b>permanent line</b> keeps its timer running. Try the controls under the picture, then tap the parts.</p></div>
    <div class="uk"><b>UK standards</b>The isolator, and any switch for the fan, must be outside the zones (often just outside the bathroom door). Fit the fuse rating the fan maker asks for.</div>`;

  const bath = mountBathroom(main, trays.bath);
  const ip = mountIp(main, trays.ip);
  const fan = mountFan(main, trays.fan);
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
    trays.bath.hidden = s !== 'bath';
    trays.ip.hidden = s !== 'ip';
    trays.fan.hidden = s !== 'fan';
    bar.hidden = !(s === 'bath' ? groupsOn.bath : s === 'ip' ? groupsOn.ip : groupsOn.fan);
  };
  /** Show only the controls this step is about (within the current picture's tray). */
  const groupsOn = { bath: true, ip: true, fan: true };
  const showGroups = (ids: string[]) => {
    const host = scene === 'bath' ? trays.bath : scene === 'ip' ? trays.ip : trays.fan;
    host.querySelectorAll<HTMLElement>('.sl-g').forEach((g) => (g.hidden = !ids.includes(g.dataset.g!)));
    bar.hidden = ids.length === 0;
    groupsOn[scene] = ids.length > 0;
    if (scene === 'bath') bath.resize();
    else if (scene === 'fan') fan.resize();
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
          showGroups([]);
          bath.showView('wall');
          bath.flashZones(['z0', 'z1', 'z2']);
        },
      },
      {
        kicker: 'Zones 0, 1, 2',
        title: 'The closer to the water, the stricter',
        text: 'Zone 0 is inside the bath. Zone 1 is above it, up to 2.25 m. Zone 2 is a 0.6 m band beyond that. Everything else is outside the zones, and there is no zone 3.',
        tryIt: 'Find the 2.25 m and 0.6 m marks on the wall, and the minimum IP rating for each zone below.',
        onEnter: () => {
          select('fit');
          showGroups(['zones']);
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
          showGroups(['items', 'fb', 'challenge']);
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
          showGroups(['items', 'fb']);
          bath.showView('wall');
          pulse(bath.tray);
        },
      },
      {
        kicker: 'Challenge',
        title: 'Fit every item',
        text: 'Fit all the items where they are allowed until the bathroom is signed off. Some have only one sensible home; one has nowhere in this room except a far corner.',
        tryIt: 'Watch the tally under the picture fill up.',
        onEnter: () => {
          select('fit');
          showGroups(['challenge', 'items', 'fb']);
          bath.showView('wall');
        },
      },
      {
        kicker: 'IP codes',
        title: 'What the rating means',
        text: 'An IP code says how well a box keeps things out: the first digit is solids and dust, the second is water. Kit in zones 1 and 2 needs at least IPX4.',
        tryIt: 'Set the water digit to 7.',
        onEnter: () => {
          select('ip');
          showGroups(['seg', 'presets']);
          ip.setCode('IPX4');
          pulse(ip.codeEl);
          pulse(ip.row('second'));
        },
      },
      {
        kicker: 'Game',
        title: 'Choose the IP rating',
        text: 'For each place, pick the rating that is enough. Too low is unsafe; too high costs more for nothing.',
        tryIt: 'Answer the questions under the picture.',
        onEnter: () => {
          select('ip');
          showGroups(['game']);
        },
      },
      {
        kicker: 'Extractor fan',
        title: 'Two lines and an isolator',
        text: 'The fan starts with the light on a switched line, and a permanent line keeps its timer running after. A three-pole isolator, outside the zones, cuts both lines and the neutral.',
        tryIt: 'Pull the cord on, then off, and watch the run-on. Then turn the isolator off.',
        onEnter: () => {
          select('fan');
          showGroups(['controls']);
          fan.reset();
          pulse(fan.lightBtn);
        },
      },
      {
        kicker: 'Extractor fan',
        title: 'Know the parts',
        text: 'Tap any part of the circuit on the picture, or its name below it, to see what it does and why it is there.',
        tryIt: 'Tap the three-pole isolator.',
        onEnter: () => {
          select('fan');
          showGroups(['parts']);
        },
      },
      {
        title: 'Now the quiz',
        text: 'You have fitted the bathroom, decoded IP ratings and wired the fan. Take the quiz to tick this chapter off.',
        tryIt: 'Open the Quiz tab.',
        onEnter: () => {
          select('fit');
          showGroups([]);
          bath.showView('wall');
          pulse(tabBtn('quiz'));
        },
      },
    ],
    { position: 'top-right' },
  );

  showScene('bath');
  void tab;
  return {
    activate() {
      ro.observe(main);
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
