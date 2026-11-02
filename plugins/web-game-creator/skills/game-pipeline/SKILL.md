---
name: game-pipeline
description: Scope browser game development by stage: proof of concept, full game production, or polish. Use when planning or implementing gameplay, art, UX, UI, or deciding what to build next.
---

# Game development pipeline

Use the project's stated stage to decide how much gameplay, content, art, and interface work belongs in the current task. Infer the stage from project notes and the user's request when possible. If uncertainty would change the work materially, ask the user which stage the game is in. Record the confirmed stage in project memory when that memory exists and its maintenance is authorized; follow the project's documentation rules for any write. Do not silently promote a project to the next stage.

## Testing discipline at every stage

Create an automated test only when it protects an important behavior that is likely to regress and would be costly to catch by ordinary play. State the failure it should detect before adding it. Prefer a few representative, observable checks for core state, input, saves, ads, SDK boundaries, and serious regressions. Reuse or adjust an existing test when it already covers the risk. Do not add tests for every function, UI action, content variant, or implementation detail; do not grow a suite just to increase its test count or coverage percentage.

Choose the smallest check that answers the task's actual question. A type check, one focused test, or a brief manual play check may be enough; a documentation or other low-risk change may need no runtime check. Run a relevant check once after the change, and rerun it only after a fix or a new finding. Do not run every unit, browser, and platform suite by habit. Reserve broad regression, browser matrices, and release checks for cross-cutting changes, meaningful milestones, concrete failures, or release preparation. When the user requests specific verification, follow that scope.

## 1. Proof of concept

Prove the core gameplay and resolve uncertainty about the mechanics as quickly as possible. A developer-only playable build is enough. Implement only the controls, feedback, and content needed to test the core loop. Do not spend time on a complete interface, tutorials, explanatory labels, finished content, or release presentation unless they are necessary to evaluate the mechanic.

Keep the implementation suitable for continued development: respect the existing architecture, make state and ownership clear, and avoid throwaway hacks that would block expansion. Do not build speculative production systems before the mechanic is validated.

Use low-cost visuals that still suggest the intended art direction. Simple 3D primitives and rough 2D sprites are appropriate; detailed asset production and UI styling are not priorities.

For a small mechanic, a quick developer play check is usually enough. Do not create a Playwright suite, capture a device screenshot matrix, or treat every microfeature as a release candidate. Use browser automation only when the affected behavior needs a browser to verify it.

## 2. Full game production

Once the prototype is confirmed, develop it into a complete, coherent game. Finish the needed content and flows, and give UX deliberate attention. Design for mobile players first: keep controls and information clear on small screens.

Keep UI restrained and stylish. Focus attention on important elements with hierarchy and contrast. Avoid dense panels and unnecessary instructional text. Give the UI a palette that contrasts with the game world, and choose fonts and text sizes for readability and character.

As player-facing flows become complete, verify the affected experience on the devices it targets. Keep routine checks focused; reserve broader regression and platform review for meaningful milestones and release preparation.

## 3. Polish

Improve the finished game's interface and graphics so they feel richer and more attractive. Refine color, contrast, visual feedback, and tasteful animations. Use more vivid accents and satisfying motion where they strengthen important actions. Preserve the clear focus, readability, and mobile usability established in production.

The user's current task and explicit preferences determine scope within each stage. A stage is a guide for priorities, not permission to expand a narrow request.
