import type { CloudData } from '../core/storage';
export interface HostState { readonly paused: boolean; readonly audioEnabled: boolean }
export interface Platform {
  init(): Promise<void>;
  loadingFinished(): void;
  gameplay(active: boolean): void;
  measure(category: string, what: string, action: string): void;
  commercialBreak(context?: 'resume' | 'transition'): Promise<void>;
  rewardedBreak(rewardId?: string): Promise<boolean>;
  readonly adPending: boolean;
  readonly hostState?: HostState;
  readonly ownsVisibility?: boolean;
  readonly cloudData?: CloudData;
  firstFrameReady?(): void;
  subscribe?(listener: () => void): () => void;
  destroy?(): void;
}
