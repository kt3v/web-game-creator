---
name: game-init
description: Initialize a new browser game in an empty Codex project directory from the template bundled with this plugin. Use when the user asks to start, scaffold, or initialize a new game project.
---

# Initialize a game project

The plugin already carries the current English game template at `../../assets/project-template/` relative to this skill's folder. Use the bundled copy; the user does not need to clone the template or know its path. Do not clone the separate `poki-template` repository, whose snapshot may differ from this plugin.

1. Inspect the current project directory. Use it as the destination when the user asks to initialize the open, empty project. The initializer accepts an empty directory or one containing only `.git` and `.DS_Store`; it refuses to merge with other files. If the user points to a different directory, verify that destination before running it. Do not overwrite an existing project.
2. Choose a short kebab-case game slug from the supplied game name or directory name. Use the user's title if given; otherwise derive a readable title from the slug. Ask only if a usable name cannot be inferred or the destination is unclear.
3. Run `python3 <this-skill-folder>/scripts/init_game.py --target <project-directory> --slug <slug> --title <title>`. Resolve the script from this installed skill's own path, not from the user's project. The script copies the bundled template and updates `package.json`, `package-lock.json`, `src/app/config.ts`, and `index.html`.
4. Run `npm ci`, `npm run check`, and `npm test` in the new project. If dependency installation is unavailable, leave the copied project intact and report the exact remaining command. Do not run portal uploads or publish anything.
5. Tell the user where the project was created, the chosen name, which checks passed, and where gameplay work starts (`src/game/game.ts`). If they supplied a game idea, use `game-project-notes` to decide with them whether its short documentation belongs in Levelry or `game-notes/`.

Do not invent gameplay, assets, polished UI, or a full design document as part of a bare initialization request. The game's development stage and later work follow the user's direction and `game-pipeline`.
