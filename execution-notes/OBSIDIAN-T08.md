# OBSIDIAN-T08 — Route operations through selected Designs

**Status:** Complete

## What was done

1. **Type-level flip** (`src/lib/design/types.ts`) — the operational slots (`work`, `members`, `management.{departments,folders,roles,documentTypes,people,person,invitations}`) are now **required** on every `DesignDefinition`. Added `WorkDesignViewProps` (WorkPageModel + `approveAction`/`rejectAction` server-action bridges) so the Work slot receives real actions as props and Designs never import the workflow module. Removed the T01 transitional optionality.

2. **Members model + builder** — enriched `MembersPageModel` (`MemberRow` with membershipId/characterId/localDisplayName/controllingUserName/membershipStatus + vocabulary) and created `src/lib/people/buildMembersPageModel.ts`, porting the old `/members` route's authorized projection (rows, Department participation, Role names, admin-only server-filtered search). `ManagementRouteFacts` gained `domainId` for action forms.

3. **Shared operational bodies** (`src/designs/shared/operational/bodies.tsx`) — the refactored current route JSX as presentational components consuming the Page Models (`FoldersBody`, `RolesBody`, `DocumentTypesBody`, `PeopleBody`, `PersonBody`, `InvitationsBody`, `DepartmentsBody`, `WorkBody`, `MembersBody`). `PeopleSearch` moved from the route tree to `src/components/functional/people/` (with its scss) so the bodies never import from `@/app/**`.

4. **Design-owned entrypoints** — Civic (`civic/operational.tsx`), Ledger (`ledger/operational.tsx`), and Poster compatibility renderers (`poster/operational.tsx`, explicitly marked NOT first-class) each declare the full required slot set via their indexes. Imports use relative `../shared/operational/bodies` to satisfy the isolation lint (no `@/designs/*` cross-imports).

5. **Routes** — all 9 contracted operational routes (folders, roles, document-types, people, person, invitations, departments, work, members) now call `resolveDomainRouteShell()` and dispatch through `route.design.pages.<slot>` with `headerLayout`/`documentStyle`/`designConfig` and (for work) the real `approveWorkItem`/`rejectWorkItem` bridges. **Zero per-Design branching in routes.** `TenantShell` remains only for the shared editors (Templates, Forms, edit, import, customize, review, records/new, history).

6. **Fixtures/tests** — `operationalSlots.design.test.ts` updated to the required full set (Poster keeps its `compatibility` status marker; Civic/Ledger are `first-class`). New `operationalDispatch.design.test.tsx` proves the same model renders through every Design slot and that Civic/Ledger register distinct owned renderers — no route branching. `vitest.setup.ts` now supplies env guards (DATABASE_URI/PAYLOAD_SECRET) and a ResizeObserver stub so the shared bodies' interactive components render under jsdom.

## Verification

- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors (6 pre-existing warnings)
- Design suite — 159/159 pass (operationalSlots + operationalDispatch included)
- `npm test` — 155/155 pass

## Acceptance mapping

- [x] No contracted operational route renders a non-Design page body; TenantShell serves only the shared editors
- [x] Routes do not branch on Design keys
- [x] Civic and Ledger own all required slots + members
- [x] Poster compatibility renderers remain functional (delegate to shared bodies, `status: 'compatibility'`)
- [x] Operational slots required in the type; fixture enforces them
- [x] Existing functionality preserved (bodies are the refactored current JSX)

## Notes

- The shared operational bodies are the current information architecture by design (ticket §2/§3 allowance: "initially track current information architecture"); T09 gates first-class conformance and can require per-Design divergence later.
- The interactive management surfaces (FolderManager/RoleManager/DocumentTypesBrowser/PersonAccessTrees/PeopleSearch) stay shared low-level functional primitives; each Design's slot entrypoint owns when/how they render.