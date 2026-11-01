import { config } from './config';
import { SaveStore } from '../core/storage';
import { defaults, pixelRatio, validateSettings } from '../core/settings';
import type { Settings } from '../core/settings';
import { Session } from '../core/session';
import { GameLoop } from '../core/loop';
import { InputService } from '../core/input';
import { AudioService } from '../audio/audio';
import { Shell } from '../ui/shell';
import type { Action } from '../ui/shell';
import type { GameModule, GameServices } from '../game/module';
import type { Platform } from '../platform/platform';

export class Application {
  private store: SaveStore;
  private settings = defaults;
  private session: Session;
  private audio = new AudioService(this.settings);
  private shell: Shell;
  private game: GameModule;
  private loop: GameLoop;
  private input: InputService;
  private observer: ResizeObserver;
  private abort = new AbortController();
  private unsubscribe: () => void;
  private disposed = false;
  private lastActive = false;
  private touch = false;
  private orientationBlocked = false;
  private unsubscribePlatform?: () => void;
  private loaded = false;
  private ready = false;
  constructor(private root: HTMLElement, private platform: Platform, createGame: (canvas: HTMLCanvasElement, services: GameServices) => GameModule) {
    this.store = new SaveStore(config.id, undefined, platform.cloudData);
    this.settings = this.store.read('settings', validateSettings);
    this.audio.setSettings(this.settings);
    this.session = new Session(platform);
    this.shell = new Shell(root, action => this.action(action), patch => this.changeSettings(patch));
    this.game = createGame(this.shell.canvas, {
      audio: this.audio,
      finish: outcome => { this.session.finish(outcome); },
    });
    this.game.settingsChanged(this.settings);
    this.loop = new GameLoop(config.step, config.maxSteps, () => this.session.active, dt => {
      this.game.update(dt);
    }, alpha => { if (!this.session.state.suspended) this.game.render(alpha); });
    this.input = new InputService(root, this.shell.canvas, this.game, this.session, this.shell, () => this.audio.unlock(), () => this.action('resume'));
    this.unsubscribe = this.session.subscribe(() => {
      const active = this.session.active;
      if (active !== this.lastActive) { this.loop.reset(); this.lastActive = active; }
      this.game.setActive(active);
      if (!active) this.game.clearInput();
      this.syncAudio();
      this.refresh();
    });
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(root);
    const { signal } = this.abort;
    if (!platform.ownsVisibility) document.addEventListener('visibilitychange', () => this.visibility(), { signal });
    window.addEventListener('resize', () => this.resize(), { signal });
    matchMedia('(pointer: coarse)').addEventListener('change', () => this.resize(), { signal });
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => this.resize(), { signal });
    this.unsubscribePlatform = platform.subscribe?.(() => this.hostChanged());
    this.hostChanged(); this.resize(); this.refresh();
  }
  async load(): Promise<void> {
    this.platform.firstFrameReady?.();
    await Promise.all([this.platform.init(), this.game.load(), this.store.initialize()]);
    if (this.disposed) return;
    this.settings = this.store.read('settings', validateSettings);
    this.audio.setSettings(this.settings); this.game.settingsChanged(this.settings);
    this.loaded = true; this.finishLoading();
  }
  private finishLoading(): void {
    if (!this.loaded || this.ready || this.session.state.suspended) return;
    this.ready = true;
    this.resize(); this.game.render(0); this.refresh(); this.shell.ready();
    this.platform.loadingFinished(); this.loop.start();
  }
  private syncAudio(): void {
    this.audio.setBlocked(this.session.state.busy || this.session.state.hidden || this.session.state.suspended || this.platform.hostState?.audioEnabled === false);
  }
  private hostChanged(): void {
    const paused = this.platform.hostState?.paused === true;
    this.store.setSuspended(paused);
    this.session.suspend(paused); this.syncAudio();
    if (paused) this.loop.stop();
    else {
      this.finishLoading();
      if (this.ready) { this.resize(); this.loop.start(); }
    }
  }
  private visibility(): void { this.session.visibility((!this.platform.ownsVisibility && document.hidden) || this.orientationBlocked); }
  private resize(): void {
    if (this.session.state.suspended) return;
    const { width, height } = this.root.getBoundingClientRect();
    this.touch = this.settings.uiMode === 'touch' || this.settings.uiMode === 'auto' && (navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches);
    this.orientationBlocked = config.orientation === 'landscape' && height > width || config.orientation === 'portrait' && width > height;
    this.shell.orientation(this.orientationBlocked);
    this.visibility();
    this.game.resize({ width, height, pixelRatio: pixelRatio(this.settings.quality, this.touch, window.devicePixelRatio || 1), touch: this.touch, reducedMotion: this.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches });
    this.shell.settings(this.settings, this.touch);
    this.game.render(0);
  }
  private changeSettings(patch: Partial<Settings>): void {
    if (!this.ready || this.session.state.busy || this.session.state.suspended) return;
    this.settings = validateSettings({ ...this.settings, ...patch });
    this.store.write('settings', this.settings); this.audio.setSettings(this.settings);
    this.game.settingsChanged(this.settings); this.resize();
  }
  private refresh(): void { this.shell.update(this.session.state); }
  private action(action: Action): void {
    if (!this.ready || this.session.state.busy || this.session.state.hidden || this.session.state.suspended) return;
    this.audio.unlock();
    switch (action) {
      case 'play': this.start(); break;
      case 'restart': this.start(); break;
      case 'pause': this.session.pause(); break;
      case 'resume': void this.session.enter('resume', () => {}).catch(() => this.session.pause()); break;
      case 'menu': this.session.menu(); break;
      case 'settings': this.session.settings(true); break;
      case 'close-settings': this.session.settings(false); break;
      case 'reset-settings': this.changeSettings({ ...defaults }); break;
    }
  }
  private start(): void {
    void this.session.enter('new', () => this.game.start()).catch(() => this.session.menu());
  }
  destroy(): void {
    this.disposed = true; this.abort.abort(); this.observer.disconnect(); this.unsubscribe(); this.unsubscribePlatform?.();
    this.session.destroy(); this.loop.destroy(); this.input.destroy(); this.audio.destroy(); this.game.destroy(); this.shell.destroy();
    this.store.destroy(); this.platform.destroy?.();
  }
}
