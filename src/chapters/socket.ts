import { parts, type PartId } from '../data/socket-lesson';
import { SocketScene } from '../scene/socket';
import { mountGuide, pulse } from '../ui/guide';
import { initPanel, type Tab } from '../ui/panel';
import { initWirePanel } from '../ui/wire-panel';

/** Chapter 7: the 13 A socket. Explore it, wire it, fit the faceplate. */
export function mountSocket(onComplete: () => void) {
  const host = document.getElementById('canvas-host')!;
  const hotspotLayer = document.getElementById('hotspots')!;

  const scene = new SocketScene(host);
  let current: PartId | null = null;

  const wirePanel = initWirePanel(scene);
  const stage = document.querySelector('.stage')!;
  const hint = document.getElementById('hint')!;
  const EXPLORE_HINT = hint.textContent ?? '';

  // The guide drives the tabs through the same path as a click; this flag tells the tab handler
  // the change came from the guide (so it does not try to move the guide in return).
  let guide: ReturnType<typeof mountGuide> | undefined;
  let driving = false;
  const drive = (tab: Tab) => {
    driving = true;
    panel.showTab(tab);
    driving = false;
  };

  const panel = initPanel(
    (id) => choose(id),
    (tab) => {
      // The "Wire it" tab switches the 3D scene into hands-on mode; the other tabs return to exploring.
      const wire = tab === 'wire';
      scene.setMode(wire ? 'wire' : 'explore');
      stage.classList.toggle('wire-mode', wire);
      hint.textContent = wire ? 'Pick a core, then pick its terminal' : EXPLORE_HINT;
      if (!wire) {
        current = null;
        panel.select(null);
        hotspotButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      }
      // The learner changed tab by hand: keep the guide on a step that matches what is on screen.
      if (!driving && guide) {
        guide.setVisible(tab !== 'quiz');
        const i = guide.current();
        if (tab === 'wire' && i < WIRE_STEP) guide.go(WIRE_STEP);
        else if (tab === 'parts' && i >= WIRE_STEP) guide.go(1);
      }
    },
  );

  /** Show one part (or none): camera, panel and markers together. */
  function show(id: PartId | null) {
    current = id;
    scene.select(current);
    panel.select(current);
    hotspotButtons.forEach((b, key) => b.setAttribute('aria-pressed', String(key === current)));
  }
  /** Tapping the selected part again clears it. */
  function choose(id: PartId | null) {
    show(id === current ? null : id);
  }
  scene.onSelect = (id) => choose(id);

  // Numbered hotspots, positioned every frame from the 3D anchors.
  const hotspotButtons = new Map<PartId, HTMLButtonElement>();
  for (const p of parts) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hotspot hidden';
    b.textContent = String(p.n);
    b.setAttribute('aria-label', `${p.n}. ${p.title}`);
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => choose(p.id));
    hotspotLayer.append(b);
    hotspotButtons.set(p.id, b);
  }

  scene.onFrame = (anchors) => {
    for (const a of anchors) {
      const b = hotspotButtons.get(a.id);
      if (!b) continue;
      b.classList.toggle('hidden', !a.visible);
      b.classList.toggle('occluded', a.occluded);
      b.style.setProperty('--x', `${a.x.toFixed(1)}px`);
      b.style.setProperty('--y', `${a.y.toFixed(1)}px`);
    }
  };

  // Toolbar
  document.getElementById('btn-reset')!.addEventListener('click', () => {
    current = null;
    scene.resetView();
    panel.select(null);
    hotspotButtons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
  });

  const toggle = (id: string, fn: (on: boolean) => void) => {
    const btn = document.getElementById(id)!;
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      fn(on);
    });
  };
  toggle('btn-rotate', (on) => scene.setAutoRotate(on));
  toggle('btn-colours', (on) => {
    scene.setColourScheme(on ? 'legacy' : 'current');
    wirePanel.setScheme(on ? 'legacy' : 'current');
  });

  /* ------------------------------- the guide ------------------------------- */
  const wireView = document.getElementById('view-wire')!;
  /** Tour a part: back to exploring if needed, then fly to it. */
  const tour = (id: PartId | null) => {
    drive('parts');
    show(id);
    if (!id) scene.resetView();
  };
  const WIRE_STEP = 5;
  const FIT_STEP = 6;

  guide = mountGuide(
    document.getElementById('stage-socket')!,
    [
      {
        kicker: 'The 13 A socket',
        title: 'Looking inside a socket',
        text: 'This socket has been pulled out of its back box and turned round, so you are looking at the back of it. Each numbered marker is a part worth knowing.',
        tryIt: 'Drag to spin it round and scroll (or pinch) to zoom. Reset view brings it back.',
        onEnter: () => tour(null),
      },
      {
        kicker: 'Parts 1 and 2',
        title: 'The faceplate and its screws',
        text: 'The faceplate is the part you see in the room; the body behind it holds the terminals. Two screws, one at the top and one at the bottom, hold it to the back box.',
        tryIt: 'Tap marker 2 to see the fixing screws.',
        onEnter: () => tour('faceplate'),
      },
      {
        kicker: 'Parts 3, 4 and 5',
        title: 'Three terminals: L, N and E',
        text: 'Line (brown) brings the current in and neutral (blue) takes it back. Earth (green and yellow) is the safety path if something goes wrong. Each terminal is marked with its letter.',
        tryIt: 'Tap 4 and then 5 to read about neutral and earth.',
        onEnter: () => tour('line'),
      },
      {
        kicker: 'Parts 6 and 8',
        title: 'How the cable gets in',
        text: 'Grey twin and earth cable comes into the box through a knockout. A grommet in the hole stops the metal edge cutting into the sheath.',
        tryIt: 'Tap 8 to see the knockout and grommet.',
        onEnter: () => tour('sheath'),
      },
      {
        kicker: 'Parts 7 and 9',
        title: 'Earthing a metal box',
        text: 'A metal back box could become live in a fault, so a short green and yellow earth tail links it to the socket’s earth terminal. Plastic boxes do not need one.',
        tryIt: 'Tap 9 to find the earth tail.',
        onEnter: () => tour('backbox'),
      },
      {
        kicker: 'Your turn',
        title: 'Wire it yourself',
        text: 'The three cores are loose now. Pick a core, then pick the terminal it belongs on, here or in the panel. You will see straight away whether it is right.',
        tryIt: 'Pick the brown core, then terminal L. Then do the blue and the green and yellow.',
        onEnter: () => {
          drive('wire');
          pulse(wireView.querySelector('.wire-columns'));
        },
      },
      {
        kicker: 'Finish the job',
        title: 'Fit the faceplate',
        text: 'With all three cores connected, screw the faceplate back on. If anything is on the wrong terminal, the panel tells you what and why.',
        tryIt: 'Press Fit the faceplate. When it is on, try the Quiz tab.',
        onEnter: () => {
          drive('wire');
          const fit = wireView.querySelector<HTMLButtonElement>('[data-act="fit"]');
          pulse(fit && !fit.disabled ? fit : wireView.querySelector('.wire-columns'));
        },
      },
    ],
    { position: 'top-right' },
  );

  // The chapter is done when the faceplate is screwed on over correct wiring.
  const render = scene.onWiringChange;
  let wasRight = false;
  scene.onWiringChange = () => {
    render();
    const { assignments, fit } = scene.getWiring();
    const right = (['line', 'neutral', 'earth'] as const).every((id) => assignments[id] === id);
    // All three cores just went on correctly: move the guide on to fitting the faceplate.
    if (right && !wasRight && fit === 'off' && guide?.current() === WIRE_STEP) guide.go(FIT_STEP);
    wasRight = right;
    if (fit === 'fitted' && right) {
      onComplete();
      pulse(document.getElementById('tab-quiz'));
    }
  };

  return {
    activate: () => scene.start(),
    deactivate: () => scene.pause(),
  };
}
