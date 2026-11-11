import { SocketScene } from '../scene/socket';

/**
 * The homepage hero: the 3D socket, screwed shut. A moment after the page loads it undoes its own
 * screws and opens up; from then on you can pull the cores out and plug them back in.
 */
export function mountHome() {
  const host = document.getElementById('home-canvas')!;
  const toggle = document.getElementById('home-toggle') as HTMLButtonElement;
  const hint = document.getElementById('home-hint')!;
  const scene = new SocketScene(host);
  scene.pause();
  scene.setMode('wire');
  scene.presetFitted();

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer = 0;
  let touched = false;

  const refresh = () => {
    const { fit } = scene.getWiring();
    const open = fit === 'off' || fit === 'removing';
    toggle.textContent = open ? 'Close it up' : 'Open it up';
    toggle.disabled = fit === 'fitting' || fit === 'removing';
    hint.style.visibility = open ? 'visible' : 'hidden';
  };
  scene.onWiringChange = refresh;

  toggle.addEventListener('click', () => {
    touched = true;
    const { fit } = scene.getWiring();
    if (fit === 'off') {
      scene.wireCorrectly(); // any loose or swapped cores go home first
      scene.setFitted(true);
    } else if (fit === 'fitted') scene.setFitted(false);
  });
  refresh();

  return {
    activate() {
      scene.start();
      if (!touched) {
        clearTimeout(timer);
        timer = window.setTimeout(() => !touched && scene.setFitted(false), reduced ? 300 : 1400);
      }
    },
    deactivate() {
      clearTimeout(timer);
      scene.pause();
    },
  };
}
