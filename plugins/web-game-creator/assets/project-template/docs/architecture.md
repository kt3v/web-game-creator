# Architecture

`Application` connects the services directly:

- `Session` is the sole owner of menu / playing / paused / results screens and settings / hidden / busy flags.
- `Platform` handles only the portal and SDK, without economy or saves.
- `GameModule` defines the game scene contract. `game.ts` initializes an empty **PlayCanvas** scene through AppBase with a camera and required systems/resource handlers.
- `Shell` provides neutral DOM placeholders and menu actions.
- `GameLoop` / `InputService` provide fixed-step updates and input through one active gate.
- `SaveStore` provides versioned data and in-memory fallback when browser storage fails.
- `AudioService` loads and plays assets supplied by the game; no content is bundled.

```text
active = screen === playing && !settings && !hidden && !busy && !suspended
```

Closing settings or returning to a tab preserves pause. Resume requires a player action. An ad transaction blocks the game root and audio until the SDK promise settles; completion in a hidden tab remains paused.

In Yoola, only `ytgame.system.onPause/onResume` controls host suspension; Page Visibility and blur do not. `suspended` preserves the current screen and manual pause. SDK resume restores the previous mode without an ad. Host pause also stops RAF and rendering, and blocks input and audio. A pending continuation after an ad waits for SDK resume. Poki retains Page Visibility handling and manual Resume.

A new attempt sends start and at most one complete/fail. Resume does not start a new attempt. Leaving or restarting an unfinished attempt sends fail; tab close does not fabricate a result.

Saves use `${config.id}:slot` and `{ version: 1, data }`. Each slot needs a validator. The template saves only settings; the new game defines progress.

Inside Playables, `Platform.cloudData` provides only SDK transport. `SaveStore` loads the `{ version: 1, slots }` cloud container before game readiness, validates values on read, and sends serialized snapshots. Playables does not use localStorage. A failed read forbids cloud writes so existing progress is not overwritten. Outside Playables, local storage with in-memory fallback is available.

Audio files load explicitly through `load`; `play` returns a stop callback. Loops can serve music. In the background or during ads, AudioContext is suspended, short effects end, and loops are preserved; player volume settings do not change.

PlayCanvas uses the existing `GameLoop`. The `SceneApplication` subclass disables its own RAF scheduling: `app.start()` runs initialize/postInitialize, `app.update(dt)` runs only while active, and `app.render()` runs from the shell render path, including a static paused scene. Render/prerender handlers must not mutate game state. PlayCanvas input is not separately enabled so it cannot bypass `InputService`.

Resize applies pixelRatio to graphicsDevice and sizes the canvas to its container. Destroy releases AppBase and GPU resources; asynchronous initialization that finishes after destroy immediately releases its device.
