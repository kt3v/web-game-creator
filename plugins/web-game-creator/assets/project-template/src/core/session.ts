import type { Platform } from '../platform/platform';
export type Screen = 'menu' | 'playing' | 'paused' | 'results';
export interface SessionState { screen: Screen; settings: boolean; hidden: boolean; busy: boolean; suspended: boolean }

/** One authority for gameplay eligibility. UI and platform cannot start the engine themselves. */
export class Session {
  private value: SessionState = { screen: 'menu', settings: false, hidden: false, busy: false, suspended: false };
  private listeners = new Set<() => void>();
  private attempt?: string;
  private played = false;
  private disposed = false;
  private resumeWaiters = new Set<() => void>();
  private platform: Platform;
  constructor(platform: Platform) { this.platform = platform; }
  get state(): Readonly<SessionState> { return this.value; }
  get hostOwnsVisibility(): boolean { return this.platform.ownsVisibility === true; }
  get active(): boolean {
    return this.value.screen === 'playing' && !this.value.settings && !this.value.hidden && !this.value.busy && !this.value.suspended && !this.disposed;
  }
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private update(patch: Partial<SessionState>): void {
    this.value = { ...this.value, ...patch };
    this.platform.gameplay(this.active);
    this.listeners.forEach(listener => listener());
  }
  pause(): void {
    if (this.value.screen === 'playing' && !this.value.busy && !this.value.suspended) this.update({ screen: 'paused' });
  }
  settings(open: boolean): void {
    if (this.value.busy || this.value.suspended) return;
    if (open && this.value.screen === 'playing') this.pause();
    this.update({ settings: open });
  }
  visibility(hidden: boolean): void {
    // Returning never dismisses a manual pause or triggers an ad.
    this.update({ hidden, ...(hidden && this.value.screen === 'playing' ? { screen: 'paused' as const } : {}) });
  }
  menu(): void {
    if (this.value.busy || this.value.suspended) return;
    this.endAttempt('fail');
    this.update({ screen: 'menu', settings: false });
  }
  /** Host pause is independent of manual pause and resumes without an advertisement. */
  suspend(suspended: boolean): void {
    if (this.disposed || suspended === this.value.suspended) return;
    this.update({ suspended });
    if (!suspended) this.releaseWaiters();
  }
  private whenResumed(): Promise<void> {
    return this.value.suspended && !this.disposed ? new Promise(resolve => this.resumeWaiters.add(resolve)) : Promise.resolve();
  }
  private releaseWaiters(): void { this.resumeWaiters.forEach(resolve => resolve()); this.resumeWaiters.clear(); }
  finish(outcome: 'complete' | 'fail'): boolean {
    if (!this.active) return false;
    this.endAttempt(outcome);
    this.update({ screen: 'results' });
    return true;
  }
  private endAttempt(outcome: 'complete' | 'fail'): void {
    if (!this.attempt) return;
    this.platform.measure('level', this.attempt, outcome);
    this.attempt = undefined;
  }
  /** Lock before calling the SDK, even when no playback callback occurs. */
  async enter(kind: 'new' | 'resume', start: () => void, level = '1'): Promise<boolean> {
    if (this.disposed || this.value.busy || this.value.hidden || this.value.settings || this.value.suspended) return false;
    const screen = this.value.screen;
    if (kind === 'resume' ? screen !== 'paused' : !['menu', 'paused', 'results'].includes(screen)) return false;
    // Stop before setting busy, otherwise the platform would suppress the stop event.
    this.platform.gameplay(false);
    this.update({ busy: true });
    try {
      if (this.played) await this.platform.commercialBreak(kind === 'resume' || screen === 'paused' ? 'resume' : 'transition');
      while (this.value.suspended && !this.disposed) await this.whenResumed();
      if (this.disposed) return false;
      if (kind === 'new') {
        this.endAttempt('fail');
        start();
        this.attempt = level;
        this.platform.measure('level', level, 'start');
      }
      this.played = true;
      this.update({ screen: this.value.hidden ? 'paused' : 'playing' });
      return true;
    } finally { if (!this.disposed) this.update({ busy: false }); }
  }
  /** Optional extension point. Call only from an explicit video offer, without a second commercial. */
  async reward(grant: () => void, rewardId?: string): Promise<boolean> {
    if (this.disposed || this.value.busy || this.value.hidden || this.value.suspended || this.active) return false;
    this.platform.gameplay(false);
    this.update({ busy: true });
    try {
      const success = await this.platform.rewardedBreak(rewardId);
      while (this.value.suspended && !this.disposed) await this.whenResumed();
      if (!success || this.disposed) return false;
      grant(); return true;
    } finally { if (!this.disposed) this.update({ busy: false }); }
  }
  destroy(): void { this.disposed = true; this.releaseWaiters(); this.platform.gameplay(false); this.listeners.clear(); }
}
