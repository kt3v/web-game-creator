---
name: game-project-notes
description: Turn a game idea into a concise living note in Levelry or repository Markdown, keep it current during development, and track brief Poki playtest outcomes during testing.
---

# Game project notes

Keep one short, readable description of what the game is. It is a working idea note, not a full game design document or technical specification.

## Choose and remember the location

- If the user names a Levelry board or asks you to read an idea there, use that board as the source. Read the existing idea before planning or building the proof of concept. Follow the bundled `levelry-mcp` skill, including its RULES/MEMORY check and revision rules. Find actual project and document IDs through the tools; never guess them.
- If the user describes the idea in chat and has not chosen a documentation location, ask whether they want Levelry or Markdown in the game repository. Work through the idea while waiting for the answer, but do not write it to an unchosen destination. If they decline Levelry, use `game-notes/idea.md` in the game repository. This directory stays outside the game build.
- If Levelry is chosen, find the named board and idea document. If no suitable board exists, ask for a board name when necessary, then create the project or let the user create it according to their preference. Create the concise idea note yourself when the destination is clear; do not require the user to draft it first.
- Once the Levelry board and idea document are established, record their **board name and document name** in that board's Service MEMORY, preserving its other content and following the `levelry-mcp` rules. In a game repository, also keep a small `game-notes/source.md` pointer with those names and returned IDs if available; this is location memory, not a duplicate of the idea. At the start of later tasks, read the saved location and verify it against Levelry. Ask again only if it is missing, stale, or ambiguous.

## Shape the idea

Preserve the user's concept, intended player, and desired experience. Identify gaps or contradictions in the mechanics, player goal, progression, and game format. Resolve ordinary gaps with brief, labeled assumptions; ask only questions that block a key decision.

Write only the details needed to understand this particular game: its premise and player experience, core loop, essential mechanics and how they connect, goal or progression, distinguishing feature, and important constraints. Mention a character, abilities, illustrative numbers, or unusual screen structure when they matter. Mark sample numbers as examples, not balance targets. Omit button inventories, exhaustive UI flows, balance tables, implementation details, and generic promises. Use only headings that help this idea read clearly.

Before saving, check that the note describes one coherent game, its key choices do not conflict, and a reader can quickly understand what the player does and why it is interesting.

## Keep it current

After every development task, compare the note with the decisions and player-facing behavior that actually changed. Make a small update when the idea, core mechanics, progression, important scope, or current stage changed; otherwise leave the note alone. Keep technical change logs in Git, not in the idea note. For Levelry, update the existing note rather than creating a new one for each task; for repository mode, update `game-notes/idea.md`.

## Record test results when useful

During player testing, the user may provide results or ask you to record them. You may ask once whether they want a result noted, but do not make logging mandatory or demand a full form. Keep test results separate from the idea: a concise Levelry playtest note or `game-notes/playtests.md` in repository mode.

For each result, capture only available facts: Poki test type, date, tested build/version and matching Git commit, meaningful change from the previous build, participant or recording count, key metric or observation, and the next decision if known. A reported change such as "+20 seconds average playtime" is enough to record; do not invent missing baselines or metrics. Check the actual build-to-commit relationship before attributing a result. If it cannot be established, mark it unknown and ask only when the link matters.

Poki currently distinguishes [playtests with 10 recordings](https://developers.poki.com/guide/playtesting) from [player fit tests with 500 players](https://developers.poki.com/guide/player-fit-test). Verify current definitions when using the numbers. Do not start a Poki test or publish a build merely because a result was discussed.
