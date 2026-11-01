export interface StorageBackend { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface CloudData { loadData(): Promise<string | null>; saveData(data: string): Promise<void> }

/** A failing browser backend becomes an in-memory session, including after a failed write. */
export class SaveStore {
  private memory = new Map<string, unknown>();
  private backend?: StorageBackend;
  private namespace: string;
  private cloud?: CloudData;
  private initialization?: Promise<void>;
  private cloudReady = false;
  private suspended = false;
  private disposed = false;
  private slots: Record<string, unknown> = Object.create(null);
  private pending?: string;
  private saving?: Promise<void>;
  constructor(namespace: string, getBackend: () => StorageBackend = () => localStorage, cloud?: CloudData) {
    this.namespace = namespace;
    this.cloud = cloud;
    if (!cloud) { try { this.backend = getBackend(); } catch { /* Blocked iframe or incognito. */ } }
  }
  initialize(timeout = 8000): Promise<void> { return this.initialization ??= this.loadCloud(timeout); }
  private async loadCloud(timeout: number): Promise<void> {
    if (!this.cloud) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const raw = await Promise.race([this.cloud.loadData(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Cloud startup timeout')), timeout);
      })]);
      if (this.disposed) return;
      if (raw !== null) {
        const data = JSON.parse(raw);
        // Unknown versions/malformed data must never be overwritten by defaults.
        if (data?.version !== 1 || !data.slots || typeof data.slots !== 'object' || Array.isArray(data.slots)) return;
        this.slots = Object.assign(Object.create(null), data.slots);
      }
      this.memory.clear(); this.cloudReady = true;
    } catch { /* Keep saves in memory; never write before a successful loadData. */ }
    finally { clearTimeout(timer); }
  }
  setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    if (!suspended) void this.flush();
  }
  /** Serialize writes so an older request can never finish after a newer save. */
  flush(): Promise<void> {
    if (this.saving) return this.saving;
    if (!this.cloudReady || this.suspended || this.disposed || !this.pending) return Promise.resolve();
    this.saving = (async () => {
      while (this.pending && !this.suspended && !this.disposed) {
        const snapshot = this.pending; this.pending = undefined;
        try { await this.cloud!.saveData(snapshot); }
        catch { this.pending ??= snapshot; break; }
      }
    })().finally(() => { this.saving = undefined; });
    return this.saving;
  }
  read<T>(slot: string, validate: (value: unknown) => T): T {
    if (this.memory.has(slot)) return validate(this.memory.get(slot));
    let value: unknown;
    try {
      const raw = this.cloud ? this.slots[slot] as { version?: number; data?: unknown } | undefined : JSON.parse(this.backend?.getItem(`${this.namespace}:${slot}`) ?? 'null');
      if (raw?.version === 1) value = raw.data;
    } catch { /* Recover malformed or inaccessible data. */ }
    const clean = validate(value);
    this.memory.set(slot, clean);
    return clean;
  }
  write<T>(slot: string, data: T): void {
    this.memory.set(slot, structuredClone(data));
    if (this.cloud) {
      this.slots[slot] = { version: 1, data: structuredClone(data) };
      const snapshot = JSON.stringify({ version: 1, slots: this.slots });
      if (new TextEncoder().encode(snapshot).byteLength < 3 * 1024 * 1024) {
        this.pending = snapshot; void this.flush();
      }
      return;
    }
    try { this.backend?.setItem(`${this.namespace}:${slot}`, JSON.stringify({ version: 1, data })); }
    catch { this.backend = undefined; }
  }
  destroy(): void { this.disposed = true; this.pending = undefined; }
}
