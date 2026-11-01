import type { Settings } from '../core/settings';
type Channel = 'music' | 'effects' | 'ui';

/** Audio infrastructure only. New games explicitly load their own local assets. */
export class AudioService {
  private context?: AudioContext;
  private master?: GainNode;
  private gains = new Map<Channel, GainNode>();
  private buffers = new Map<string, AudioBuffer>();
  private voices = new Map<AudioBufferSourceNode, boolean>();
  private blocked = false;
  private disposed = false;
  private abort = new AbortController();
  constructor(private options: Settings) {}
  private initialize(): AudioContext | undefined {
    if (this.disposed) return;
    try {
      if (!this.context) {
        const context = this.context = new AudioContext();
        this.master = context.createGain(); this.master.connect(context.destination);
        for (const channel of ['music', 'effects', 'ui'] as const) {
          const gain = context.createGain(); gain.connect(this.master); this.gains.set(channel, gain);
        }
        this.apply();
      }
      return this.context;
    } catch { return; }
  }
  /** Call from a trusted pointer/key handler to satisfy autoplay restrictions. */
  unlock(): void {
    if (this.blocked) return;
    const context = this.initialize();
    void context?.resume().then(() => {
      if (this.blocked) void context.suspend().catch(() => {});
    }).catch(() => {});
  }
  async load(id: string, url: string): Promise<void> {
    const context = this.initialize();
    if (!context) return;
    try {
      const response = await fetch(url, { signal: this.abort.signal });
      if (!response.ok) return;
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      if (!this.disposed) this.buffers.set(id, buffer);
    } catch { /* Missing audio must not stop the game. */ }
  }
  play(id: string, channel: Channel = 'effects', loop = false): () => void {
    const context = this.context, buffer = this.buffers.get(id);
    if (this.blocked || this.disposed || !context || context.state !== 'running' || !buffer || this.voices.size >= 12) return () => {};
    const voice = context.createBufferSource(); voice.buffer = buffer; voice.loop = loop;
    voice.connect(this.gains.get(channel)!); this.voices.set(voice, loop);
    voice.onended = () => { this.voices.delete(voice); voice.disconnect(); };
    voice.start();
    return () => { if (this.voices.has(voice)) { voice.stop(); this.voices.delete(voice); } };
  }
  setSettings(options: Settings): void { this.options = options; this.apply(); }
  setBlocked(blocked: boolean): void {
    this.blocked = blocked; this.apply();
    if (blocked) {
      for (const [voice, loop] of this.voices) if (!loop) { voice.stop(); this.voices.delete(voice); }
      void this.context?.suspend().catch(() => {});
    } else if (this.context) void this.context.resume().catch(() => {});
  }
  private apply(): void {
    if (this.master) this.master.gain.value = this.blocked ? 0 : this.options.master;
    for (const [channel, gain] of this.gains) gain.gain.value = this.options[channel];
  }
  destroy(): void {
    this.disposed = true; this.abort.abort();
    for (const voice of this.voices.keys()) { voice.stop(); voice.disconnect(); }
    this.voices.clear(); this.buffers.clear();
    void this.context?.close().catch(() => {});
  }
}
