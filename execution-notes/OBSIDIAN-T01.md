# OBSIDIAN-T01 — Define operational Page Models and Design slots

## Files changed

- Added `src/lib/page-models/management/` — `common.ts` (route facts + status descriptor), `folders.ts`, `roles.ts`, `documentTypes.ts`, `people.ts` (People + Person), `departments.ts`, `invitations.ts`, `work.ts`
- Added `src/lib/page-models/members.ts` (new `pages.members` slot per patched packet)
- `src/lib/design/types.ts` — optional `pages.work`, `pages.members`, `pages.management.{departments,folders,roles,documentTypes,people,person,invitations}`
- `DESIGN_AUTHORING.md` §1/§19 — management is Design-owned presentation over shared models/workspaces; requiredness ladder documented
- Added `src/lib/design/operationalSlots.design.test.ts` — declared-slot baseline fixture (all empty at T01)

## Tests run

- `npx tsc --noEmit` clean
- `npm run test:design` 150/150 (was 147; +3 new fixture tests)

## Deviations

- Slots declared **optional** per the patched §5.1 requiredness ladder; no stub bodies added to Civic/Ledger/Poster.
- Person model uses the current route's projection shapes (RoleDepartment/FolderTreeNode/TypeStateMap imported as pure types from their component modules).
- `pages.review` intentionally not added — review queue stays a shared editor (patched packet classification).

## Contract pressure

- `FolderTreeNode`/`RoleDepartment`/`TypeStateMap` live in `src/components/people/*`; if first-class isolation lint later bans component imports into page-models, these move to a type-only module. Not an issue today (lint restriction set only covers `src/designs/**`).