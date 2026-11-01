import {
  AppBase, AppOptions, CameraComponentSystem, Color, ContainerHandler,
  createGraphicsDevice, DEVICETYPE_WEBGL2, Entity, FILLMODE_NONE,
  LightComponentSystem, RenderComponentSystem, RESOLUTION_AUTO,
  ScriptComponentSystem, ScriptHandler, TextureHandler,
} from 'playcanvas';
import type { GameModule, GameServices, Viewport } from './module';

/** Keep engine initialization, but let the shell own the only animation loop. */
class SceneApplication extends AppBase {
  override requestAnimationFrame(): void { /* Driven by GameLoop.update/render. */ }
}

/** Empty PlayCanvas scene. Add your entities and game mechanics here. */
export class Game implements GameModule {
  private app?: SceneApplication;
  private active = false;
  private disposed = false;
  private viewport?: Viewport;
  constructor(private canvas: HTMLCanvasElement, readonly services: GameServices) {}

  async load(): Promise<void> {
    const device = await createGraphicsDevice(this.canvas, {
      deviceTypes: [DEVICETYPE_WEBGL2], antialias: true, alpha: false,
    });
    if (this.disposed) { device.destroy(); return; }
    const options = new AppOptions();
    options.graphicsDevice = device;
    options.componentSystems = [CameraComponentSystem, RenderComponentSystem, LightComponentSystem, ScriptComponentSystem];
    options.resourceHandlers = [TextureHandler, ContainerHandler, ScriptHandler];
    options.devtools = false;
    const app = this.app = new SceneApplication(this.canvas);
    app.init(options);
    if (import.meta.env.VITE_GAME_PLATFORM === 'yoola') {
      // PlayCanvas 2.23 adds an unused engine-audio visibility hook in init().
      // Playables requires the SDK to be the only source of host pause/audio state.
      const handler = (app as unknown as { _visibilityChangeHandler: EventListener })._visibilityChangeHandler;
      document.removeEventListener('visibilitychange', handler);
    }
    app.setCanvasFillMode(FILLMODE_NONE);
    app.setCanvasResolution(RESOLUTION_AUTO);

    const camera = new Entity('Camera', app);
    camera.addComponent('camera', { clearColor: new Color(247 / 255, 247 / 255, 247 / 255) });
    camera.setPosition(0, 0, 5);
    app.root.addChild(camera);
    if (this.viewport) this.resize(this.viewport);
    app.start(); // Initializes components; SceneApplication schedules no frames.
  }
  start(): void { /* Reset entities and start a new attempt. */ }
  update(dt: number): void { if (this.active) this.app?.update(dt); }
  render(_alpha: number): void {
    if (this.app && !this.app.graphicsDevice.contextLost) this.app.render();
  }
  resize(viewport: Viewport): void {
    this.viewport = viewport;
    if (!this.app || viewport.width <= 0 || viewport.height <= 0) return;
    this.app.graphicsDevice.maxPixelRatio = viewport.pixelRatio;
    this.app.resizeCanvas(viewport.width, viewport.height);
  }
  settingsChanged(): void { /* Apply additional scene-specific settings here. */ }
  setActive(active: boolean): void { this.active = active; }
  pointer(_x: number, _y: number): void {}
  key(_code: string, _down: boolean): void {}
  clearInput(): void { /* Cancel held keys and gestures. */ }
  destroy(): void {
    this.disposed = true; this.active = false;
    this.app?.destroy(); this.app = undefined;
  }
}
