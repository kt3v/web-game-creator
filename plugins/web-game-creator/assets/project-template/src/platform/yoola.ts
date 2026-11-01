import type { HostState, Platform } from './platform';

/** Signatures used by the template, from Yoola's API reference; not a replacement for ytgame.d.ts. */
export interface YoolaSDK {
  IN_PLAYABLES_ENV: boolean;
  game: {
    firstFrameReady(): void;
    gameReady(): void;
    loadData(): Promise<string | null>;
    saveData(data: string): Promise<void>;
  };
  system: {
    isAudioEnabled(): boolean;
    onAudioEnabledChange(callback: (enabled: boolean) => void): () => void;
    onPause(callback: () => void): () => void;
    onResume(callback: () => void): () => void;
  };
  ads?: {
    requestInterstitialAd(): Promise<void>;
    requestRewardedAd(rewardId: string): Promise<boolean>;
  };
}
declare global { interface Window { ytgame?: YoolaSDK } }

/** SDK transport only. Session, audio and SaveStore own the corresponding game state. */
export class YoolaPlatform implements Platform {
  readonly ownsVisibility = true;
  private sdk?: YoolaSDK;
  private initialized = false;
  private disposed = false;
  private frameReady = false;
  private ready = false;
  private played = false;
  private state: HostState = { paused: false, audioEnabled: true };
  private listeners = new Set<() => void>();
  private cleanup: (() => void)[] = [];
  adPending = false;
  constructor(sdk?: YoolaSDK) { this.sdk = sdk; }
  get hostState(): HostState { return this.state; }
  get cloudData() {
    if (!this.sdk?.IN_PLAYABLES_ENV) return undefined;
    const game = this.sdk.game;
    return { loadData: () => game.loadData(), saveData: (data: string) => game.saveData(data) };
  }
  async init(): Promise<void> {
    if (this.initialized || this.disposed) return;
    this.initialized = true;
    this.sdk ??= window.ytgame; // Loaded synchronously by index.html before the game bundle.
    if (!this.sdk) return; // Local/blocked SDK fallback; never manufacture a window.ytgame.
    try { this.change({ audioEnabled: this.sdk.system.isAudioEnabled() }); } catch { /* Local fallback. */ }
    const listen = (subscribe: () => () => void) => {
      try { this.cleanup.push(subscribe()); } catch { /* A missing host cannot prevent local play. */ }
    };
    listen(() => this.sdk!.system.onAudioEnabledChange(audioEnabled => this.change({ audioEnabled })));
    listen(() => this.sdk!.system.onPause(() => this.change({ paused: true })));
    listen(() => this.sdk!.system.onResume(() => this.change({ paused: false })));
  }
  private change(patch: Partial<HostState>): void {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener); return () => this.listeners.delete(listener);
  }
  firstFrameReady(): void {
    if (this.frameReady || this.disposed || this.state.paused) return;
    this.frameReady = true;
    try { this.sdk?.game.firstFrameReady(); } catch { /* Host failure cannot stop local play. */ }
  }
  loadingFinished(): void {
    if (this.ready || this.disposed || this.state.paused) return;
    this.firstFrameReady(); this.ready = true;
    try { this.sdk?.game.gameReady(); } catch { /* Host failure cannot stop local play. */ }
  }
  gameplay(active: boolean): void { this.played ||= active; }
  measure(): void { /* Playables has no Poki measure API. */ }
  async commercialBreak(context?: 'resume' | 'transition'): Promise<void> {
    // Resuming the same content is not a Playables interstitial placement.
    if (context !== 'transition' || !this.played || this.state.paused || this.disposed || this.adPending || !this.sdk?.IN_PLAYABLES_ENV || !this.sdk.ads) return;
    this.adPending = true;
    try { await this.sdk.ads.requestInterstitialAd(); } catch { /* No fill permits continuation. */ }
    finally { this.adPending = false; }
  }
  async rewardedBreak(rewardId?: string): Promise<boolean> {
    if (!rewardId || !/^[a-zA-Z0-9_-]{1,128}$/.test(rewardId) || this.state.paused || this.disposed || this.adPending || !this.sdk?.IN_PLAYABLES_ENV || !this.sdk.ads) return false;
    this.adPending = true;
    try { return await this.sdk.ads.requestRewardedAd(rewardId) === true && !this.disposed; }
    catch { return false; }
    finally { this.adPending = false; }
  }
  destroy(): void {
    this.disposed = true;
    for (const unsubscribe of this.cleanup) { try { unsubscribe(); } catch { /* Release remaining listeners. */ } }
    this.cleanup = []; this.listeners.clear();
  }
}
