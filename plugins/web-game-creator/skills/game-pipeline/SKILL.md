---
name: game-pipeline
description: Scope browser game development by stage: proof of concept, full game production, or polish. Use when planning or implementing gameplay, art, UX, UI, or deciding what to build next.
---

# Game development pipeline

Use the project's stated stage to decide how much gameplay, content, art, and interface work belongs in the current task. Infer the stage from project notes and the user's request when possible. If uncertainty would change the work materially, ask the user which stage the game is in. Record the confirmed stage in project memory when that memory exists and its maintenance is authorized; follow the project's documentation rules for any write. Do not silently promote a project to the next stage.

## 1. Proof of concept

Prove the core gameplay and resolve uncertainty about the mechanics as quickly as possible. A developer-only playable build is enough. Implement only the controls, feedback, and content needed to test the core loop. Do not spend time on a complete interface, tutorials, explanatory labels, finished content, or release presentation unless they are necessary to evaluate the mechanic.

Keep the implementation suitable for continued development: respect the existing architecture, make state and ownership clear, and avoid throwaway hacks that would block expansion. Do not build speculative production systems before the mechanic is validated.

Use low-cost visuals that still suggest the intended art direction. Simple 3D primitives and rough 2D sprites are appropriate; detailed asset production and UI styling are not priorities.

## 2. Full game production

Once the prototype is confirmed, develop it into a complete, coherent game. Finish the needed content and flows, and give UX deliberate attention. Design for mobile players first: keep controls and information clear on small screens.

Keep UI restrained and stylish. Focus attention on important elements with hierarchy and contrast. Avoid dense panels and unnecessary instructional text. Give the UI a palette that contrasts with the game world, and choose fonts and text sizes for readability and character.

## 3. Polish

Improve the finished game's interface and graphics so they feel richer and more attractive. Refine color, contrast, visual feedback, and tasteful animations. Use more vivid accents and satisfying motion where they strengthen important actions. Preserve the clear focus, readability, and mobile usability established in production.

The user's current task and explicit preferences determine scope within each stage. A stage is a guide for priorities, not permission to expand a narrow request.
