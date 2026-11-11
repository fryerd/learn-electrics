import { SocketScene } from '../scene/socket';

/** The homepage hero: the 3D socket, slowly turning, behind the "Enter the curriculum" button. */
export function mountHome() {
  const host = document.getElementById('home-canvas')!;
  const scene = new SocketScene(host);
  scene.setAutoRotate(true);
  scene.pause();

  return {
    activate: () => scene.start(),
    deactivate: () => scene.pause(),
  };
}
