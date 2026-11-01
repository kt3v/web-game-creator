import type { Settings } from '../core/settings';
import type { SessionState, Screen } from '../core/session';
import { config } from '../app/config';

export type Action = 'play' | 'pause' | 'resume' | 'restart' | 'menu' | 'settings' | 'close-settings' | 'reset-settings';
export class Shell {
  readonly canvas: HTMLCanvasElement;
  private lastScreen?: string;
  private lastRender?: string;
  private wasBusy = false;
  private focused?: HTMLElement;
  private abort = new AbortController();
  constructor(readonly root: HTMLElement, onAction: (action: Action) => void, onSettings: (patch: Partial<Settings>) => void) {
    root.innerHTML = `
      <canvas id="game" aria-label="Game area" tabindex="0"></canvas>
      <div class="game-placeholder" hidden>Game area</div>
      <div class="hud" hidden><button data-action="pause">Pause</button></div>
      <section class="screen" data-screen="menu" aria-label="Main menu" hidden>
        <div class="panel">
          <h1>${config.title}</h1>
          <button class="primary" data-action="play">Play</button>
          <button data-action="settings">Settings</button>
        </div>
      </section>
      <section class="screen shade" data-screen="paused" role="dialog" aria-modal="true" aria-labelledby="pause-title" hidden>
        <div class="panel"><h1 id="pause-title">Paused</h1>
          <button class="primary" data-action="resume">Resume</button>
          <div class="button-pair"><button data-action="restart">Restart</button><button data-action="settings">Settings</button></div>
          <button class="quiet" data-action="menu">Main menu</button>
        </div>
      </section>
      <section class="screen shade" data-screen="results" role="dialog" aria-modal="true" aria-labelledby="result-title" hidden>
        <div class="panel"><h1 id="result-title">Results</h1>
          <button class="primary" data-action="restart">Play again</button>
          <button data-action="menu">Main menu</button>
        </div>
      </section>
      <section id="settings" class="screen shade" role="dialog" aria-modal="true" aria-labelledby="settings-title" hidden>
        <div class="panel settings-panel"><div class="panel-heading"><h1 id="settings-title">Settings</h1><button class="icon-button" data-action="close-settings" aria-label="Close settings">×</button></div>
          <div class="settings-scroll" data-scroll>
            <fieldset><legend>Audio</legend>${(['master', 'music', 'effects', 'ui'] as const).map(channel => `<label class="setting-row"><span>${{ master: 'Master', music: 'Music', effects: 'Sounds', ui: 'Interface' }[channel]}</span><input aria-label="${channel} volume" type="range" min="0" max="100" step="1" data-setting="${channel}"><output data-output="${channel}"></output></label>`).join('')}</fieldset>
            <fieldset><legend>Display & controls</legend>
              <label class="setting-row"><span>UI mode</span><select data-setting="uiMode"><option value="auto">Auto</option><option value="desktop">Desktop</option><option value="touch">Touch</option></select></label>
              <label class="setting-row"><span>Graphics</span><select data-setting="quality"><option value="auto">Auto</option><option value="low">Low</option><option value="high">High</option></select></label>
              <label class="setting-row"><span>Reduce motion</span><input type="checkbox" data-setting="reducedMotion"></label>
            </fieldset>
          </div>
          <button class="quiet" data-action="reset-settings">Reset settings</button>
        </div>
      </section>
      <div class="orientation screen shade" hidden><div class="panel"><h1>Rotate your device</h1><p>Play in ${config.orientation} mode.</p></div></div>
      <div class="boot" role="status">Loading…</div>`;
    this.canvas = root.querySelector('#game')!;
    const { signal } = this.abort;
    root.addEventListener('click', event => {
      const button = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
      if (button && !button.disabled && !root.inert) onAction(button.dataset.action as Action);
    }, { signal });
    root.addEventListener('input', event => {
      const input = event.target as HTMLInputElement;
      const key = input.dataset.setting as keyof Settings | undefined;
      if (!key || root.inert) return;
      const value = input.type === 'range' ? Number(input.value) / 100 : input.type === 'checkbox' ? input.checked : input.value;
      onSettings({ [key]: value });
    }, { signal });
  }
  ready(): void { this.root.querySelector('.boot')!.remove(); }
  update(state: Readonly<SessionState>): void {
    const { screen, settings, busy, suspended } = state;
    const renderKey = JSON.stringify(state);
    if (renderKey === this.lastRender) return;
    this.lastRender = renderKey;
    this.root.inert = busy || suspended; this.root.dataset.screen = screen;
    this.root.setAttribute('aria-busy', String(busy));
    for (const element of this.root.querySelectorAll<HTMLElement>('[data-screen]')) {
      element.hidden = element.dataset.screen !== screen;
      element.inert = settings;
    }
    this.root.querySelector<HTMLElement>('#settings')!.hidden = !settings;
    this.root.querySelector<HTMLElement>('.hud')!.hidden = screen !== 'playing';
    this.root.querySelector<HTMLElement>('.game-placeholder')!.hidden = screen !== 'playing';
    this.canvas.inert = screen !== 'playing' || settings;
    const focusKey = `${screen}:${settings}`;
    if (!busy && !suspended && (this.lastScreen !== focusKey || this.wasBusy)) {
      if (settings) this.focused = document.activeElement as HTMLElement;
      const scope = settings ? this.root.querySelector('#settings') : this.root.querySelector(`[data-screen="${screen}"]`);
      if (!settings && this.lastScreen?.endsWith(':true') && this.focused?.getClientRects().length) this.focused.focus({ preventScroll: true });
      else (scope?.querySelector<HTMLElement>('.primary') ?? scope?.querySelector<HTMLElement>('button') ?? this.canvas).focus({ preventScroll: true });
      this.lastScreen = focusKey;
    }
    this.wasBusy = busy || suspended;
  }
  settings(settings: Settings, touch: boolean): void {
    this.root.dataset.ui = touch ? 'touch' : 'desktop';
    this.root.dataset.motion = settings.reducedMotion ? 'reduced' : 'full';
    for (const input of this.root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-setting]')) {
      const key = input.dataset.setting as keyof Settings;
      const value = settings[key];
      if (input instanceof HTMLInputElement && input.type === 'checkbox') input.checked = value === true;
      else input.value = typeof value === 'number' ? String(Math.round(value * 100)) : String(value);
      const output = this.root.querySelector(`[data-output="${key}"]`);
      if (output) output.textContent = `${Math.round(Number(value) * 100)}%`;
    }
  }
  orientation(blocked: boolean): void { this.root.querySelector<HTMLElement>('.orientation')!.hidden = !blocked; }
  trapFocus(event: KeyboardEvent, screen: Screen, settings: boolean): void {
    if (event.key !== 'Tab' || screen === 'playing' && !settings) return;
    const scope = settings ? this.root.querySelector('#settings') : this.root.querySelector(`[data-screen="${screen}"]`);
    const controls = [...scope?.querySelectorAll<HTMLElement>('button, input, select') ?? []].filter(el => !el.matches(':disabled') && el.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  destroy(): void { this.abort.abort(); this.root.inert = false; }
}
