import type { GameModule } from '../game/module';
import type { Session } from './session';
import type { Shell } from '../ui/shell';

/** Own all gameplay input here; engine listeners must use the same active gate. */
export class InputService {
  private abort = new AbortController();
  constructor(root: HTMLElement, canvas: HTMLCanvasElement, game: GameModule, session: Session, shell: Shell, unlock: () => void, resume: () => void) {
    const { signal } = this.abort;
    root.addEventListener('pointerdown', () => { if (!session.state.busy && !session.state.hidden && !session.state.suspended) unlock(); }, { signal, capture: true });
    canvas.addEventListener('pointerdown', event => {
      if (!session.active) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      game.pointer(event.clientX - rect.left, event.clientY - rect.top);
    }, { signal });
    window.addEventListener('keydown', event => {
      if (session.state.busy || session.state.hidden || session.state.suspended) return;
      unlock();
      shell.trapFocus(event, session.state.screen, session.state.settings);
      const target = event.target as HTMLElement;
      const editing = target.matches('input, select, textarea, [contenteditable="true"]');
      if (event.code === 'Escape' && !event.repeat) {
        event.preventDefault();
        if (session.state.settings) session.settings(false);
        else if (session.active) session.pause();
        else if (session.state.screen === 'paused') resume();
        return;
      }
      if (editing) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code) && !target.closest('button')) event.preventDefault();
      if (session.active) game.key(event.code, true);
    }, { signal });
    window.addEventListener('keyup', event => { if (session.active) game.key(event.code, false); }, { signal });
    if (!session.hostOwnsVisibility) window.addEventListener('blur', () => { game.clearInput(); session.pause(); }, { signal });
    const stopScroll = (event: Event) => {
      if (session.state.busy || session.state.suspended) return; // Portal overlays retain their controls.
      if (!(event.target as Element).closest('[data-scroll], .panel, select, input')) event.preventDefault();
    };
    root.addEventListener('wheel', stopScroll, { signal, passive: false });
    root.addEventListener('touchmove', stopScroll, { signal, passive: false });
  }
  destroy(): void { this.abort.abort(); }
}
