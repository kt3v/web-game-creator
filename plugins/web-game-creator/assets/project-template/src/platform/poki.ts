import type { Platform } from './platform';
export interface PokiSDK {
  init(): Promise<unknown>;
  gameLoadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  commercialBreak(): Promise<unknown>;
  rewardedBreak?(): Promise<boolean>;
  measure?(category: string, what: string, action: string): void;
  movePill?(top: number, offset: number): void;
}
declare global { interface Window { PokiSDK?: PokiSDK } }
const SDK_URL = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';
async function bounded<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('SDK startup timeout')), ms);
    })]);
  } finally { clearTimeout(timer); }
}
/** Owns all SDK calls; the application owns simulation, audio and input locks. */
export class PokiPlatform implements Platform {
  private sdk?: PokiSDK;
  private initialization?: Promise<void>;
  private loaded = false;
  private playing = false;
  private hasPlayed = false;
  adPending = false;
  private enabled: boolean;
  private timeout: number;
  constructor(enabled: boolean, timeout = 8000, sdk?: PokiSDK) { this.enabled = enabled; this.timeout = timeout; this.sdk = sdk; }
  init(): Promise<void> { return this.initialization ??= this.initialize(); }
  private async initialize(): Promise<void> {
    if (!this.enabled) return;
    try {
      if (!this.sdk && !window.PokiSDK) {
        const script = document.createElement('script');
        script.src = SDK_URL;
        script.async = true;
        try {
          await bounded(new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('SDK unavailable'));
            document.head.append(script);
          }), this.timeout);
        } catch (error) { script.remove(); throw error; }
        finally { script.onload = script.onerror = null; }
      }
      // Capture only during startup: a late script must not switch a live local session.
      this.sdk ??= window.PokiSDK;
      if (this.sdk) await bounded(Promise.resolve().then(() => this.sdk!.init()), this.timeout);
    } catch { /* Continue even if init rejects; retain the SDK for lifecycle events. */ }
    try { this.sdk?.movePill?.(0, 72); } catch { /* Optional API. */ }
  }
  private call(name: 'gameLoadingFinished' | 'gameplayStart' | 'gameplayStop'): void {
    try { this.sdk?.[name](); } catch { /* Portal failures cannot interrupt play. */ }
  }
  loadingFinished(): void {
    if (this.loaded || this.adPending) return;
    this.loaded = true; this.call('gameLoadingFinished');
  }
  gameplay(active: boolean): void {
    if (!this.loaded || this.adPending || active === this.playing) return;
    this.playing = active; this.hasPlayed ||= active;
    this.call(active ? 'gameplayStart' : 'gameplayStop');
  }
  measure(category: string, what: string, action: string): void {
    if (this.adPending || ![category, what, action].every(v => /^[a-zA-Z0-9_-]{1,64}$/.test(v))) return;
    try { this.sdk?.measure?.(category, what, action); } catch { /* Optional analytics. */ }
  }
  async commercialBreak(): Promise<void> {
    if (this.adPending || !this.hasPlayed || !this.sdk?.commercialBreak) return;
    this.gameplay(false); this.adPending = true;
    try { await this.sdk.commercialBreak(); } catch { /* A failed ad allows continuation. */ }
    finally { this.adPending = false; }
  }
  async rewardedBreak(): Promise<boolean> {
    if (this.adPending || !this.sdk?.rewardedBreak) return false;
    this.gameplay(false); this.adPending = true;
    try { return await this.sdk.rewardedBreak() === true; } catch { return false; }
    finally { this.adPending = false; }
  }
}
