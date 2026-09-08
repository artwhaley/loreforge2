# OBSIDIAN-T06 — People/person contracts + workspaces

**Status:** Complete
**Branch:** `design/obsidian-integration` (working branch)

## What was done

1. **`src/lib/people/buildPeopleManagementPageModel.ts`** — authorized People-search page model builder. Ports the route's admission logic (manage_members/manage_roles/manage_access via `isAllowed`, plus `canOpenPeople` fallback) into a testable builder returning `{ canManage, canOpen, people }`.

2. **`src/lib/people/buildPersonManagementPageModel.ts`** — Person page model builder. Ports the person route's character + access-tree query/authorization logic.

3. **`src/components/functional/people/usePeopleManagementWorkspace.ts`** — shared People-search workspace hook. Owns the debounced/abortable search state machine, highlight clamping, keyboard navigation, and Escape semantics previously inline in `PeopleSearch.tsx` (P05R-T08 clearing, P05R-T03 highlight). Preserves `peopleSearchOptionId` export for presentation use.

4. **Thin routes** — `manage/people/page.tsx` and `manage/people/[characterId]/page.tsx` now render the builders' results through TenantShell; `PeopleSearch.tsx` is presentation-only over the shared workspace.

5. **`src/lib/people/peopleWorkspace.design.test.tsx`** — design-suite smoke test (vitest) proving the workspace keeps search behavior: results render, empty state, active highlight clamps on shrinking results.

6. **`vitest.config.ts`** — added `src/lib/people/**` to the design-suite include glob (people is now a Design contract surface).

## Verification

- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors
- `npx vitest run` — 155/155 design tests pass (peopleWorkspace included)
- People security suite (`node --import tsx --test src/lib/people/**/*.test.ts` + security suite) — green (7/7)
- Fixed `react-hooks/refs` lint errors in `PeopleSearch.tsx` by destructuring the workspace return instead of `workspace.*` property access during render.

## Notes

- The original `PeopleSearch` component kept its exact behavior; only the location of the state machine moved into the shared workspace so a Design (Obsidian) can supply its own presentation later (T18).
- `people-search` endpoint contract unchanged — workspace still hits `/api/people-search?domainSlug=&q=`.