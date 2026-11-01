# Web Game Creator

A Codex plugin starter for building browser games. This repository currently bundles a PlayCanvas + TypeScript + Vite game template, the `poki-sdk` and `levelry-mcp` skills, and a Levelry MCP connection. Game design, asset, UI, and pipeline skills can be added later.

## Install in Codex

```sh
codex plugin marketplace add kt3v/web-game-creator
codex plugin add web-game-creator@web-game-creator
```

The marketplace can also be opened from the Codex plugin directory after adding this repository as a source. Refresh the marketplace after future updates with `codex plugin marketplace upgrade web-game-creator`.

The Levelry MCP endpoint is declared in the plugin's `mcp.json`. The connection does not include credentials; complete any authentication requested by your Codex client. Installing the plugin does not create or change a Levelry project.

## Start a game from the template

Copy `plugins/web-game-creator/assets/project-template/` to a new project directory, then follow its `README.md`. Keep the copied `AGENTS.md` with the new game so Codex can use the template's architecture and verification rules. The template is a standalone project with separate local, Poki, and Yoola builds.

The plugin currently includes only the two requested skills. It does not automatically create game projects or publish games to a portal.

## Repository layout

```text
.agents/plugins/marketplace.json       Codex marketplace entry
plugins/web-game-creator/plugin.json   Plugin identity and display metadata
plugins/web-game-creator/mcp.json      Levelry MCP endpoint
plugins/web-game-creator/skills/       Poki SDK and Levelry canvas guidance
plugins/web-game-creator/assets/       Copyable game template
references/                             Future reference material
data/                                   Future project data
```

The source game template is maintained separately at [poki-template](https://github.com/kt3v/poki-template). This repository contains a snapshot so installation does not depend on a local path or a Git submodule.
