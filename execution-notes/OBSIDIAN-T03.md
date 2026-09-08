# OBSIDIAN-T03 — Extract Folder management model and workspace

## Files changed

- Added `src/lib/archive/folderManagement.ts` — pure helpers: `sortFolderNodes`, `flattenFolderNodes`, `folderContains`, `findFolderNode`, `legalMoveTargets`, `manageableFolderIds`, `folderMenuActions` (denied-action shape).
- Added `src/lib/archive/buildFolderManagementPageModel.ts` — request-scoped builder: one cached authorization session, admission (Domain/folder `manage_folders`), per-node `canManage` + root capability, returns null → notFound.
- Added `src/components/functional/folders/useFolderManagementWorkspace.ts` — shared interactive state machine (search/sort/selection/menu/dialogs/move orchestration/rename) hiding the guarded `/api/folders` transport + `router.refresh()`.
- Refactored `src/components/folders/FolderManager.tsx` — presentation-only consumer of model + workspace; context menu driven by `folderMenuActions`; dialogs submit through workspace methods (native forms → controlled submit).
- Refactored `src/components/folders/ArboristFolderTree.tsx` — imports `FolderManagementNode` from the page model (was `AdminFolderNode` from FolderManager).
- Refactored `src/app/(frontend)/domain/[slug]/manage/folders/page.tsx` — thin: build model + render `FolderManager model={model}` inside the design-aware `TenantShell`.
- Added `src/lib/archive/folderManagement.test.ts` (node:test convention) — 11 tests: sort, tree helpers, legal move targets (self/descendant exclusion, canManage gating), manageable ids, denied menu actions.
- `package.json` — added the new test to the `npm test` file list.

## Tests run

- `npx tsc --noEmit` clean
- `npm test` 145/145 (was 134; +11)
- `npm run test:design` 151/151
- `npm run lint` 0 errors (6 pre-existing warnings)

## Deviations

- `legalMoveTargets` returns folder NODES only; the Domain-root option stays a presentation affordance gated by `canManageRoot` in the dialog (documented in the test).
- Dialogs switched from native `<form action="/api/folders">` posts to controlled submits through the workspace — same endpoint, same router.refresh behavior, `/api/folders` details now hidden from presentation.

## Contract pressure

- None. Civic Folder presentation/behavior unchanged (verified by manual diff of JSX structure).