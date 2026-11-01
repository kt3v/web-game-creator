---
name: levelry-mcp
description: Levelry canvas MCP — tools, placement rules, object types, layers, patch-first writes, revision retry. Use when reading or writing project documentation, notes, diagrams, or structured data on a Levelry canvas via MCP.
---

# Levelry Canvas MCP Skill

Tool schemas and `initialize.instructions` already state bounds, sizing, patch ops,
and connection rules — follow them. This skill covers what they don't.

## Workflow

1. **Inspect before write.** `searchDocuments` (cheap) or `listObjects`; use returned IDs only — never invent them.
2. **RULES / MEMORY.** They live on the **Service** layer (always last). Before any change, find objects named **RULES** and **MEMORY**, read them, and follow them. Never delete, rename, overwrite, or repurpose them; edit only when explicitly asked. Do not delete the Service layer. (Convention — the server does not enforce it.) Skill objects on that layer are ordinary documents and may be read or edited.
3. **Read narrowly.** Prefer `searchDocuments` / `searchDocumentOccurrences` / `readDocumentExcerpt` over full reads; `readDocuments` for several at once.
4. **Revision gate.** Read responses include `data.rev`; pass it as `expectedRevision` on `applyCanvasPatch`.
5. **Patch-first.** 2+ mutations → `applyCanvasPatch` (atomic); single simple change → a granular tool.

## REV_MISMATCH

Re-read (`listObjects` / `getCurrentProject`), take the fresh `data.rev` (or `data.currentRev`
from the error), rebuild if needed, retry **once**. Never blind-retry a write.

Other codes: `CONFLICT` re-read and fix ops · `VALIDATION_ERROR` fix args · `NOT_FOUND` re-list ·
`INSUFFICIENT_SCOPE` read-only token (write tools need `mcp:write` and are hidden from `tools/list`) ·
`SESSION_BUSY` the session already has an in-flight apply; let it finish, then retry ·
`CAPACITY_EXCEEDED` delete or split work.

## Canvas

- New objects land on the active layer unless `layerId` is given; prefer layer **names** over IDs. Move objects only via `moveObjectsToLayer`. Searches and unfiltered reads span all layers, including Service (RULES, MEMORY, and board skills).
- Visible prose goes in `content`; machine-readable facts in `metadata` — never a visible "Metadata" section. Prefer small **tags** (1–5) plus optional short **role** (and sparse **category**). Do not set `description` (prose belongs in the document) or `keywords` (use tags). `listObjects` returns slim meta (role/category/tags) by default; use `includeFullMetadata=true` only when needed. `updateCanvasDocument` is for project-level notes.
- Mixed patches (`updateObjects`, patch `object.update`): empty `content` and empty metadata keys (`tags: []`, `role: ""`, …) are omitted, not cleared. To clear a document, call `updateDocument` with empty content (or patch `document.update`). To clear metadata fields, call `updateObjectMetadata` with explicit empty values. `metadata: {}` is a no-op.
- A name subtitle renders only when the document has content: set `content` at creation when the label matters; skip it for repetitive objects.
- Default type is emoji (always square). Size via `scale`: whole steps 1–4, default 1; other values snap to the nearest step. Scale is absolute, not multiplied. textLabel uses `type="textLabel"` with `emoji="🔤"`; its size is automatic (no width/scale params).
- Center of the visible field is `(1500, 1250)`; keep objects ≥150px apart. Keep structures compact: siblings ~200–250px apart (center to center), not spread across the canvas. Use size to convey importance: key or category objects 1.5–2× scale. Out-of-range coordinates are clamped, not rejected.

## Levelry Composition

- Treat a layer as a readable map of focused documents. Give an overview (purpose, behavior, usage, rules), maintained records/data, and calculations/formulas/specification distinct documents whenever those parts are present, even if each supplied part is short. Keep repeated records in a table unless each needs its own document or relations.
- Split by reading purpose and independent maintenance, not by paragraph or a fixed number of levels. Branch where needed; reuse shared documents. A short note serving one reading purpose stays together; honor explicit single-document requests or templates. Do not restructure existing documents during narrow edits.
- Keep data authoritative in one place. Supporting documents contain enough context to stand alone; other documents link to them instead of duplicating tables or formulas. Domain specification sections can be distributed across the topic.
- Label overview-to-supporting-part edges by their actual relation (`data`, `formulas`, `specification`, `contains`); these are structural links. Overview-to-detail points toward the supporting part; `depends-on` points toward the prerequisite. Shared theme alone does not justify an edge.
- Choose a consistent reading direction; align peers in compact rows/columns and leave room for branches. Inspect occupied positions and existing edges before extending or moving a map. Do not move a shared dependency solely because it is connected.
- Find an entry object with search, then use `listConnections({ objectId })` for incoming and outgoing edges. Follow relevant endpoint IDs across layers and read only the documents needed. `fromObjectId` filters outgoing; `toObjectId` filters incoming; combined filters intersect. Page object/edge lists using `nextOffset` while `hasMore=true`. A compact context is not the full graph.
- Read a source before extracting parts. Prefer an atomic patch for source edits, new documents, and labeled edges; preserve information and existing links. Patch `tempId` values resolve operation references, not Markdown links: use returned real object IDs in links. Keep the project Canvas document as an entry point and preserve unrelated content when revising it.

## Links and connections

- Link to an existing object from document Markdown: `[Label](#object-<objectId>)`. New links to missing objects are rejected before writing. During creation, name supporting documents in plain text, then add links after returned IDs are known. Raw HTML is stripped.
- Arrows point from `fromObjectId` to `toObjectId`; `hasArrow=false` is an undirected link. Preserve edge IDs and labels when interpreting or editing a graph. Structural relations only; when unsure, inspect the documents. Check `listConnections` before creating duplicates.
