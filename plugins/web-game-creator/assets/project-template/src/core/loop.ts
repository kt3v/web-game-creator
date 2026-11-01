/** Bounded fixed timestep; no catch-up simulation after pause/tab switches. */
export class GameLoop {
  private frame = 0;
  private previous = 0;
  private accumulator = 0;
  private running = false;
  constructor(private step: number, private maxSteps: number, private active: () => boolean,
    private update: (dt: number) => void, private render: (alpha: number) => void) {}
  reset(): void { this.previous = 0; this.accumulator = 0; }
  start(): void {
    if (this.running) return;
    this.running = true;
    const tick = (time: number) => {
      if (!this.running) return;
      const dt = this.previous ? Math.min((time - this.previous) / 1000, this.step * this.maxSteps) : 0;
      this.previous = time;
      if (this.active()) {
        this.accumulator += dt;
        let steps = 0;
        while (this.accumulator >= this.step && steps++ < this.maxSteps && this.active()) {
          this.accumulator -= this.step; this.update(this.step);
        }
      } else this.accumulator = 0;
      if (this.running) { this.render(this.accumulator / this.step); this.frame = requestAnimationFrame(tick); }
    };
    this.frame = requestAnimationFrame(tick);
  }
  stop(): void { this.running = false; cancelAnimationFrame(this.frame); this.frame = 0; this.reset(); }
  destroy(): void { this.stop(); }
}
