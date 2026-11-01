import './ui/style.css';
import { Application } from './app/application';
import { Game } from './game/game';
import { PokiPlatform } from './platform/poki';
import { YoolaPlatform } from './platform/yoola';
const platform = import.meta.env.VITE_GAME_PLATFORM === 'yoola'
  ? new YoolaPlatform()
  : new PokiPlatform(import.meta.env.VITE_GAME_PLATFORM === 'poki' || import.meta.env.DEV && new URLSearchParams(location.search).get('poki') === '1');
// SDK initialization starts immediately, in parallel with the game's assets.
void platform.init();
const root = document.querySelector<HTMLElement>('#app')!;
const app = new Application(root, platform, (canvas, services) => new Game(canvas, services));
void app.load().catch(() => {
  app.destroy();
  root.replaceChildren();
  const panel = document.createElement('div'); panel.className = 'boot';
  const button = document.createElement('button'); button.textContent = 'Reload game';
  button.addEventListener('click', () => location.reload()); panel.append(button); root.append(panel);
});
if (import.meta.hot) import.meta.hot.dispose(() => app.destroy());
