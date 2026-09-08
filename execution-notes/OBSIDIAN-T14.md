# OBSIDIAN-T14 — Lore model

Status: complete.

Added `LoreEntrySummary` and a tenant-scoped, published Pages query rendered through the canonical Markdown renderer. The current schema has no page-type field, so the explicit convention is exact reserved slugs `home` and `about`; every other published Domain page is a Lore entry. Optional group/summary/revision metadata remains nullable and is not synthesized from body text. Civic, Ledger, and Obsidian tolerate empty/optional metadata.

Verification: `npx tsc --noEmit`, `npm run test:design`.

Security note: the Lore builder uses the normal Payload query path with Domain and `published` predicates and does not use `overrideAccess`.
