# OBSIDIAN-T05 — Extract Document Type management model and workspace

## Files changed

- Added `src/lib/documents/buildDocumentTypesManagementPageModel.ts` — wraps the existing P08X resolvers (`resolveTypeTree`, `resolveInspectorData`) + the `manage_types_tags` capability decision into the Page Model (admission = user presence, matching the route).
- Added `src/components/functional/document-types/useDocumentTypesManagementWorkspace.ts` — shared selection state (selected Type / create mode), flattened type-folder options (`flattenTypeFolders` pure export), and selection handlers. The TypeInspector stays a shared functional editor — it already drives the guarded server actions (`createTypeAction`/`updateTypeAction`/`duplicateTypeAction`/`scaffoldTypeTemplateAction`) and `router.refresh()`.
- Refactored `src/components/documentTypes/DocumentTypesBrowser.tsx` — presentation-only consumer of model + workspace.
- Refactored `src/app/(frontend)/domain/[slug]/document-types/page.tsx` — thin route via the builder.
- Added `src/lib/documents/documentTypesWorkspace.design.test.ts` — fixture-based: flatten returns only manual folder nodes with depth (never Department roots / Type nodes / the virtual Unassigned root), and Unassigned's folder children still surface.

## Tests run

- `npx tsc --noEmit` clean
- `npm run test:design` 153/153 (was 151; +2)
- `npm test` 151/151
- `npm run lint` 0 errors (6 pre-existing warnings)

## Deviations / bugfix

- `flattenTypeFolders` previously only collected folders at the TOP level of `roots`, which silently emptied the subfolder picker for every real tree (folders hang under Department roots). Fixed to recurse through all node kinds and collect every manual folder at its depth. This is a documented-intent fix (the picker semantic), not a presentation change; the P08X resolver semantics are untouched.

## Contract pressure

- None. Unassigned semantics, Department roots, manual folders, Types, Templates, and lifecycle stages remain exactly as `resolveTypeTree` produces them.