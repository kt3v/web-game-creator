import type { Settings } from '../core/settings';
import type { AudioService } from '../audio/audio';
export interface Viewport { width: number; height: number; pixelRatio: number; touch: boolean; reducedMotion: boolean }
export interface GameServices {
  audio: Pick<AudioService, 'load' | 'play'>;
  finish(outcome: 'complete' | 'fail'): void;
}
/** Engine boundary. Menus, storage and portal SDK stay in the shell. */
export interface GameModule {
  load(): Promise<void>;
  start(): void;
  update(dt: number): void;
  render(alpha: number): void;
  resize(viewport: Viewport): void;
  settingsChanged(settings: Readonly<Settings>): void;
  setActive(active: boolean): void;
  pointer(x: number, y: number): void;
  key(code: string, down: boolean): void;
  clearInput(): void;
  destroy(): void;
}
