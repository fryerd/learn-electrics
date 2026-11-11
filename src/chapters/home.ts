import { SocketScene } from '../scene/socket';

/**
 * The homepage hero: the 3D socket, screwed shut. A moment after the page loads it undoes its own
 * screws and opens up; from then on you can pull the cores out and plug them back in.
 */
export function mountHome() {
  const host = document.getElementById('home-canvas')!;
  const scene = new SocketScene(host);
  scene.pause();
  scene.setMode('wire');
  scene.presetFitted();

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer = 0;
  let touched = false;

  // Click the faceplate to open it; click the box or cable to close it up again.
  scene.onPartClick = (part) => {
    touched = true;
    const { fit } = scene.getWiring();
    if (fit === 'fitted' && (part === 'faceplate' || part === 'screws')) scene.setFitted(false);
    else if (fit === 'off' && part !== 'faceplate' && part !== 'screws') {
      scene.wireCorrectly(); // any loose or swapped cores go home first
      scene.setFitted(true);
    }
  };

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
