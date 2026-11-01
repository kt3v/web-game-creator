// Bundled only by the browser test server, never into the game's dist/.
import { AppBase } from 'playcanvas';
import { Game } from '../src/game/game';

export async function probeEngine() {
  const canvas = document.createElement('canvas');
  canvas.id = 'engine-test'; document.body.append(canvas);
  const game = new Game(canvas, {
    audio: { load: async () => {}, play: () => () => {} }, finish: () => {},
  });
  const viewport = { width: 320, height: 180, pixelRatio: 1, touch: false, reducedMotion: false };
  game.resize(viewport); // Container measurement can arrive before async engine startup.
  await game.load();
  const app = AppBase.getApplication(canvas.id)!;
  let updates = 0;
  app.on('update', () => updates++);
  game.update(1 / 60);
  const menuUpdates = updates;
  game.setActive(true); game.update(1 / 60);
  const playingUpdates = updates;
  game.setActive(false); game.update(1 / 60); game.render(0);
  // A native engine RAF would continue updating here even though Game is paused.
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const pausedUpdates = updates;
  const cameras = app.root.children.filter(entity => entity instanceof Object && 'camera' in entity).length;
  const webgl = canvas.getContext('webgl2') !== null;
  const initialSize = [canvas.width, canvas.height];
  game.resize({ ...viewport, pixelRatio: .75 }); game.render(0);
  const lowSize = [canvas.width, canvas.height];
  let destroyed = false;
  app.on('destroy', () => { destroyed = true; });
  game.destroy(); game.destroy();
  return { menuUpdates, playingUpdates, pausedUpdates, cameras, webgl, initialSize, lowSize, destroyed,
    released: !AppBase.getApplication(canvas.id) };
}
