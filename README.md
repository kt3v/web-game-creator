# Web Game Creator

A Codex plugin starter for building browser games. This repository currently bundles a PlayCanvas + TypeScript + Vite game template, the `game-pipeline`, `game-project-notes`, `poki-art-reference`, `poki-sdk`, and `levelry-mcp` skills, and a Levelry MCP connection. More design, asset, and UI guidance can be added later.

## Install in Codex

```sh
codex plugin marketplace add kt3v/web-game-creator
codex plugin add web-game-creator@web-game-creator
```

The GitHub repository is public; clients do not need repository-specific GitHub access.

The marketplace can also be opened from the Codex plugin directory after adding this repository as a source. Refresh the marketplace after future updates with `codex plugin marketplace upgrade web-game-creator`.

The Levelry MCP endpoint is declared in the plugin's `mcp.json`. The connection does not include credentials; complete any authentication requested by your Codex client. Installing the plugin does not create or change a Levelry project.

## Start a game from the template

Copy `plugins/web-game-creator/assets/project-template/` to a new project directory, then follow its `README.md`. Keep the copied `AGENTS.md` with the new game so Codex can use the template's architecture and verification rules. The template is a standalone project with separate local, Poki, and Yoola builds.

The pipeline skill distinguishes proof of concept, full game production, and polish so work stays appropriate to the game's current stage. The plugin does not automatically create game projects or publish games to a portal.

`game-project-notes` keeps a concise game idea and optional playtest results in Levelry or in the copied project's `game-notes/` directory. When Levelry is chosen, the board and idea document names are saved in project memory so later tasks can return to them.

When marketplace artwork is needed, `poki-art-reference` directs Codex to capture the current Poki homepage grid for that game and use it to shape an original thumbnail, cover, or icon. No marketplace screenshots are bundled with the plugin.

## Repository layout

```text
.agents/plugins/marketplace.json       Codex marketplace entry
plugins/web-game-creator/plugin.json   Plugin identity and display metadata
plugins/web-game-creator/mcp.json      Levelry MCP endpoint
plugins/web-game-creator/skills/       Pipeline, notes, art, Poki SDK, and Levelry guidance
plugins/web-game-creator/assets/       Copyable game template
references/                             Future reference material
data/                                   Future project data
```

The source game template is maintained separately at [poki-template](https://github.com/kt3v/poki-template). This repository contains a snapshot so installation does not depend on a local path or a Git submodule.
