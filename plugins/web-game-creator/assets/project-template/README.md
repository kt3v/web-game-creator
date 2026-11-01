# Browser game template

A minimal **PlayCanvas + TypeScript + Vite** starter. It contains no demo game, graphics, music, or sound files. The UI provides neutral placeholders for a menu, empty game area, pause, settings, and results.

```sh
npm ci
npm run dev
```

Requires Node.js 22.12+. Normal development does not load a portal SDK; `?poki=1` enables Poki for manual checks. For Yoola development, use `npm run dev -- --mode yoola`.

## Included foundation

- Empty PlayCanvas scene (WebGL 2) with a camera, resize and quality handling, and resource cleanup; no models or demo mechanics.
- Poki SDK startup fallback, lifecycle, commercial/rewarded API, and attempt events.
- Separate Yoola / YouTube Playables build with readiness, host pause/resume, platform mute, cloud saves, and ad API.
- Unified game state: pause, settings, hidden tabs, and ads stop simulation and input.
- Validated storage with in-memory fallback and saved settings.
- AudioService for loading game audio, volume channels, autoplay unlock, and ad/background mute. It loads and plays nothing by default.
- Auto / Desktop / Touch controls, orientation, safe areas, keyboard focus, and a fixed game step.

## Start a new game

Choose where the game's concise idea note will live: Levelry or `game-notes/idea.md` in this repository. If Levelry is chosen, keep a small `game-notes/source.md` pointer with the board and idea document names so future sessions can find them. The `game-notes/` directory is not included in game builds.

1. If you copied the template manually, change `config.id` and title in `src/app/config.ts`, the package name, and metadata in `index.html`. The `game-init` skill sets these when it initializes a project.
2. Add entities and mechanics in `src/game/game.ts`. PlayCanvas is initialized; the shell calls its update/render methods.
3. Add your HUD and visual design in `src/ui/shell.ts` and `style.css`. Remove the `Game area` label once a scene is present.
4. When an attempt ends, call `services.finish('complete')` or `services.finish('fail')`. The specific game defines scores, levels, progress, and tutorials.
5. Load local audio with `services.audio.load(id, url)` and play it with `services.audio.play(id, channel, loop)` when needed. The returned function stops playback.

Graphics controls the PlayCanvas pixel ratio; reduced motion is passed to the viewport for future effects. The camera currently renders only a neutral background. Input and audio use shared shell services.

`SceneApplication` disables the engine's internal RAF: `app.start()` initializes components, then `GameLoop` calls `app.update(dt)` only during play and `app.render()` to display the scene. Menus, pause, background state, and ads do not update simulation.

Engine documentation: [AppBase](https://api.playcanvas.com/engine/classes/AppBase.html).

```sh
npm test               # Critical state, SDK, and save invariants
npm run build          # Standalone build
npm run build:poki     # Poki build in dist/
npm run build:yoola    # Yoola / YouTube Playables build in dist/
npx playwright install chromium
npm run test:browser   # Poki build, mock SDK, and shell screenshots
npm run test:yoola     # Yoola build, mock SDK, and shell screenshots
```

Build commands share `dist/` and replace the previous build. For portal upload, archive the contents of the appropriate build with `index.html` at the archive root.

[Architecture](docs/architecture.md) · [Poki](docs/poki.md) · [Yoola](docs/yoola.md) · [Reference review](docs/reference-review.md) · [AGENTS.md](AGENTS.md)
