# Design choices from reference games

The template's authors reviewed the bunker-lite and cdc-lite games, including their `AGENTS.md` files, platform/audio/UI/input/storage code, bootstrap/build paths, and game event placement. Those repositories informed this starter; their project rules are not automatically instructions for a new game. They are not dependencies of this template.

| Area | Reference patterns | Template decision |
| --- | --- | --- |
| SDK | Explicit Poki build, bounded startup wait, playable fallback | One Poki adapter behind `Platform`, explicit Poki mode, no hostname detection |
| Lifecycle | Deduplicated start/stop and ads before returning to play | All transitions pass through Session; UI does not call the SDK directly |
| Ads | Surface/input locks, mute, and hidden-state checks | One busy transaction from request through `finally`; only the app root becomes inert and input is cleared |
| Platform and data | A reference platform also owned best score, economy, tutorial, and CrazyGames Data | Separate portal adapter and SaveStore; each game defines its progress schema |
| Audio | Reference audio was tied to simulation entities or engines | Generic gain channels; game services trigger cues explicitly |
| UI | Menu/settings/pause/results in both games | Independent DOM shell, typed actions, CSS tokens, and no engine in menus |
| Settings | Separate volume controls and performance profiles | Audio channels, UI mode, viewport/quality settings; each game adds content and rendering |
| Input | Keyboard/pointer cancel/clear and focus pause | One input gate, clear on stop, tablet/touchscreen auto mode |
| Analytics | Attempts/tutorial and stable milestone names | Start/complete/fail with one attempt across pause/resume; no third-party services |
| Build | Vite, local runtime assets, `base: './'` | Compact TypeScript/Vite scaffold with relative paths and nested-path checks |

## How `AGENTS.md` was derived

Both references favored only necessary UI, no arbitrary labels or decoration, and a final browser review on desktop and mobile.

The template generalizes English UI and accessible names, portrait/landscape and small-screen support, orientation switching, and focused checks from bunker-lite. It supports both orientations by default; a specific game may choose one.

The template does not make bunker-lite's square Minecraft-like art, physics/trap rules, or cdc-lite's vehicle models, economy, tracks, sounds, and logos universal requirements. It contains only neutral UI placeholders without game assets. Early-stage restraint does not remove critical SDK/save invariant checks.

The adjacent [AGENTS.md](../AGENTS.md) combines relevant architectural, UI, verification, and Poki guidance for developing the next game.
