# Web Game Creator

A Codex plugin for taking a browser game from its first playable idea through production and polish.

## Get started

Install the plugin once:

```sh
codex plugin marketplace add kt3v/web-game-creator
codex plugin add web-game-creator@web-game-creator
```

Open a new, empty folder as a Codex project, start a chat, and say:

> Initialize a new game here with `$game-init`.

Codex brings in the bundled PlayCanvas, TypeScript, and Vite template, gives the project a name, installs dependencies, and runs a quick check. You do not need to clone or copy the template yourself. The template needs Node.js 22.12 or newer.

## What the plugin helps with

### Start a game — [`game-init`](plugins/web-game-creator/skills/game-init/SKILL.md)

Turns an empty folder into a working game project. It keeps the starter lightweight, so you can begin with the actual game instead of setting up the build and platform code.

### Build at the right pace — [`game-pipeline`](plugins/web-game-creator/skills/game-pipeline/SKILL.md)

Keeps a proof of concept focused on the core mechanic and quick, minimal checks, then shifts toward a complete mobile-friendly game and finally visual polish. If the current stage is unclear, Codex can ask before taking the work too far.

### Keep the idea clear — [`game-project-notes`](plugins/web-game-creator/skills/game-project-notes/SKILL.md)

Turns an idea into a short, living description of what the player does and why it is fun. The note can live in Levelry or in the game's repository. Codex checks it after development tasks and can record brief Poki playtest results alongside the tested build.

### Work with your Levelry board — [`levelry-mcp`](plugins/web-game-creator/skills/levelry-mcp/SKILL.md)

Start from an idea already on a Levelry board or save a new one there. The plugin includes the Levelry connection, and Codex remembers the board and idea note so you do not have to name them every time.

### Find a direction for cover art — [`poki-art-reference`](plugins/web-game-creator/skills/poki-art-reference/SKILL.md)

When a game needs a thumbnail, cover, or icon, Codex looks at a fresh screenshot of Poki's current game grid. It uses the broader visual patterns as a reference while keeping your game's artwork original and recognizable.

### Prepare the Poki build — [`poki-sdk`](plugins/web-game-creator/skills/poki-sdk/SKILL.md)

Takes care of Poki's loading and gameplay signals, ad breaks, and the Poki build. It also helps keep the game playable when the SDK is unavailable.
