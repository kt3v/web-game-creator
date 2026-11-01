---
name: game-init
description: Initialize a new browser game in an empty Codex project directory from the template bundled with this plugin. Use when the user asks to start, scaffold, or initialize a new game project.
---

# Initialize a game project

The plugin carries the English game template at `../../assets/project-template/` relative to this skill's folder. Resolve that directory from the installed `SKILL.md` path. Perform initialization with the available terminal and file-editing tools; this skill has no helper script. The user does not need to know the template path or copy files manually.

1. Inspect the current project directory. Use it as the destination when the user asks to initialize the open project. Continue only if it is empty or contains only `.git` and `.DS_Store`. If the user points elsewhere, inspect that destination first. Do not merge into or overwrite an existing project.
2. Choose a short kebab-case slug from the supplied game name or directory name. Use the user's title if given; otherwise derive a readable title from the slug. Ask only if a usable name or destination cannot be inferred.
3. Inspect the bundled template and copy its **contents**, including `.gitignore` and `.env.*`, into the destination with the available file or terminal tools. Preserve an existing `.git`. A terminal copy can use `cp -R <template-directory>/. <destination>/` after the empty-directory check. If the bundled asset is unavailable, fetch the public `kt3v/web-game-creator` repository into a temporary directory and use its `plugins/web-game-creator/assets/project-template/` snapshot; report the fetched revision. Do not use the separate `poki-template` repository, which may differ from this plugin.
4. Update `package.json` and the root package entries in `package-lock.json` with the slug. Update `config.id` and `config.title` in `src/app/config.ts`, plus the HTML title and app label in `index.html`. Use file-editing tools and check the actual file contents before replacing text; escape the chosen title for TypeScript and HTML. Keep the game template's other architecture and platform settings intact.
5. Run `npm ci`, `npm run check`, and `npm test` in the new project. If dependency installation is unavailable, leave the copied project intact and report the exact remaining command. Do not run portal uploads or publish anything.
6. Tell the user where the project was created, the chosen name, which checks passed, and where gameplay work starts (`src/game/game.ts`). If they supplied a game idea, use `game-project-notes` to decide with them whether its short documentation belongs in Levelry or `game-notes/`.

Do not invent gameplay, assets, polished UI, or a full design document as part of a bare initialization request. The game's development stage and later work follow the user's direction and `game-pipeline`.
