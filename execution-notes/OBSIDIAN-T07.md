# OBSIDIAN-T07 — Contract Departments, Invitations, and Work

**Status:** Complete

## What was done

1. **`src/lib/departments/buildDepartmentsManagementPageModel.ts`** — Departments management builder. Admission from the decision engine (P08-GATE-01: `session.authority != null || decideOne('manage_subdomain')`), never `role === 'admin'`. Row-level `canArchive`/`canRestore` from the `publicListing` flag; platform vocabulary (subdomain/role nouns) carried in the model so Designs never hard-code civic nouns.

2. **`src/lib/departments/departmentStatus.ts`** — pure `departmentStatusDescriptor` (error → message map), extracted without Payload imports so it runs in the plain `npm test` suite.

3. **`src/lib/invitations/buildInvitationsManagementPageModel.ts`** — Invitations builder. Authority from `canManageDomainInvitations`; rows from authorized `listInvitations` views; pending join **and** claim requests; claim targets = active, un-controlled Characters with an active membership (same set the route computed). Status descriptor recognizes `created/error/decided/revoked` query params.

4. **`src/lib/work/buildWorkPageModel.ts`** — Work model adapting `projectDomainWork()` directly; authorization filtering stays in the projection; `domainAdmin` comes from the projection (character kind + administrative Domain), never role labels.

5. **`src/lib/actions/workflowBridges.ts`** — action bridge exposing `approveWorkItem`/`rejectWorkItem` so Designs render forms without importing the canonical workflow action module; the server action still re-authorizes every submission.

6. **Thin routes** — `manage/departments`, `manage/invitations`, `work` pages now render model data through the design-aware TenantShell; copy/functionality preserved exactly.

7. **Tests** — `departmentManagement.test.ts` + `invitationManagement.test.ts` (pure status/error presentation inputs), wired into `npm test`.

## Verification

- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors (6 pre-existing warnings)
- New pure tests — 4/4 pass via `npm test` path
- `test:p07x-t09` (invitation workflows) — 6/6 pass
- `test:p07x-t10` (work projection) — 5/5 pass
- Design suite — 155/155 pass

## Notes

- Work entries remain filtered by the existing `approve_document` authorization inside `projectDomainWork`; nothing was broadened.
- Invitation claim/join data scope unchanged; only its projection location moved into the builder.
- Current mutations (`/api/departments`, `/api/invitations/*`) still re-authorize server-side and are untouched.