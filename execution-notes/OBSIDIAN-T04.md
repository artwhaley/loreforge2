# OBSIDIAN-T04 — Extract Role management model and workspace

## Files changed

- Added `src/lib/roles/buildRoleManagementPageModel.ts` — request-scoped builder porting the roles route's projection exactly: Department→Role tree, role records, holders by role, capability-decorated folder tree, Role×Folder + Role×Type states, manageable Department ids, assignable Role ids, initial role selection, admission (returns null → notFound).
- Added `src/lib/roles/roleManagement.ts` — pure helpers: `flattenRoleNodes`, `applyFolderStates`, `roleMenuActions` (capability shape: assign gated by `assignableRoleIds`, create/delete by manageable Department), `canCreateRootRole`.
- Added `src/components/functional/roles/useRoleManagementWorkspace.ts` — shared state machine: selection, context menu, dialogs, debounced people search (180ms, AbortController — P05R-T08 semantics preserved), assignment selection; hides `/api/roles` + `/api/role-assignments` transports; assign navigates back to `?roleId=` (original behavior).
- Refactored `src/components/roles/RoleManager.tsx` — presentation-only consumer of model + workspace; context menu via `roleMenuActions`; dialogs submit through workspace methods. `TypePermissionGrid` + `FolderTree` remain shared functional primitives (unchanged).
- Refactored `src/app/(frontend)/domain/[slug]/roles/page.tsx` — thin route via the builder.
- Added `src/lib/roles/roleManagement.test.ts` (node:test) — 6 tests: flatten, folder-state overlay (non-mutating), menu capability shape (assign disabled when role not assignable; create/delete disabled when Department not manageable), root-role gate.
- `package.json` — added the test to `npm test`.

## Tests run

- `npx tsc --noEmit` clean
- `npm test` 151/151 (was 145; +6)
- `npm run test:design` 151/151
- `npm run lint` 0 errors (6 pre-existing warnings)

## Deviations

- `roleMenuActions` mirrors the exact current disabled logic (assignableRoleIds gates assign; manageableDepartmentIds gates create/delete).
- Assign flow uses `router.push('/domain/{slug}/roles?roleId=...')` to preserve the original returnTo navigation.

## Contract pressure

- None. Civic Role presentation/behavior unchanged.