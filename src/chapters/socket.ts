import { parts, type PartId } from '../data/socket-lesson';
import { SocketScene } from '../scene/socket';
import { initPanel } from '../ui/panel';
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
    },
  );

  function choose(id: PartId | null) {
    current = id === current ? null : id;
    scene.select(current);
    panel.select(current);
    hotspotButtons.forEach((b, key) => b.setAttribute('aria-pressed', String(key === current)));
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

  // The chapter is done when the faceplate is screwed on over correct wiring.
  const render = scene.onWiringChange;
  scene.onWiringChange = () => {
    render();
    const { assignments, fit } = scene.getWiring();
    if (fit === 'fitted' && (['line', 'neutral', 'earth'] as const).every((id) => assignments[id] === id)) onComplete();
  };

  return {
    activate: () => scene.start(),
    deactivate: () => scene.pause(),
  };
}
