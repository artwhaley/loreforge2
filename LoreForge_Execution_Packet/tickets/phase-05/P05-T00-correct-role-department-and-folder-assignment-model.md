# P05-T00 — Correct Role, Department, and Folder assignment model

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 5  
**Commit prefix:** `P05-T00:`

## Objective
Remove the rejected Folder-scoped RoleAssignment and direct Department-membership model before later permissions work builds on it, then provide the modern Character-first assignment workflow approved in CC-2026-09-03-03.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `06_CHANGE_CONTROL.md`
- `tickets/phase-05/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P04-GATE approved
- CC-2026-09-03-03

## Frozen context for this ticket
- Every Community-Domain Role belongs to exactly one Department.
- A RoleAssignment relates one Character to one Role and has no Folder/resource scope.
- Department participation is derived from active Department-owned Roles; there is no separate Character-to-Department membership.
- Direct Character Folder access is separate from Roles. Role definitions may later supply default PermissionRules, but a direct Folder override never mutates a RoleAssignment.
- Removing Domain membership deletes/revokes the Character's RoleAssignments and direct Folder overrides in that Domain. Audit history records what was removed, but re-adding Domain membership has no live assignment row to restore.

## Required work
1. Remove `scopeFolder` from RoleAssignments, validation, APIs, projections, fixtures, and customer UI. Migrate existing scoped fixture assignments into distinct Department-owned Roles with appropriate names; do not silently convert the Folder scope into a direct grant before the Phase-7 evaluator exists.
2. Make Department required on every Community-Domain Role and constrain parent Role to the same Department. Remove direct Character head/admin and SubdomainMembership assignment behavior from the customer model. Derive Department rosters/participation from active RoleAssignments.
3. Introduce the contracted subset of PermissionRules needed for direct Character Folder overrides, with separate Read and Write `inherit|grant|deny` controls. Read maps to `read`; Write atomically maps to `create_document` plus `edit_document`; inherit removes the direct rule(s). Until the final P07 evaluator is present, store/audit these records and label effective access as provisional rather than pretending to calculate final authority.
4. Replace People selection with a debounced, server-ranked, keyboard-navigable typeahead search whose result window updates beneath the input. Search Character name, Domain alias, controlling account display name, Department, and Role. Prefer SQLite FTS5 behind the existing Payload/SQLite seam when support is reliable; do not download the full roster for client filtering.
5. On the Character workspace, replace Department-membership and scoped-Role forms with a searchable Department/Role hierarchy using inline checkboxes. Provide filters exactly `Held roles` and `Roles I can assign`; before P07 the second filter may conservatively expose only ownerUser/operational-DomainAdmin choices through the interim authorization boundary.
6. Add a completely separate searchable Folder tree with independent Read and Write controls per Folder, clear effective/direct source labels, and inline/batched save. Changing Folder access must not create, remove, or update any RoleAssignment.
7. Make Domain-removal cascade behavior transactional and audited: delete/revoke all RoleAssignments and direct Folder PermissionRules for that Character in the Domain, recording immutable audit events before completion. Prove re-add starts clean. Delete obsolete SubdomainMembership rows and remove the collection from active configuration so they cannot reappear as participation.

## Likely code touchpoints
- `src/collections/Roles.ts`
- `src/collections/RoleAssignments.ts`
- `src/collections/SubdomainMemberships.ts`
- `src/collections/PermissionRules.ts`
- `src/app/(frontend)/domain/[slug]/manage/people/**`
- `src/lib/roles/**`
- `src/lib/departments.ts`

## Automated acceptance
- Schema and source searches find no active `scopeFolder` RoleAssignment field or Role-assignment Folder selector.
- A Community-Domain Role without a Department, or with a parent from another Department, is rejected server-side.
- Department roster membership appears after the first active Role in that Department and disappears after the last; no SubdomainMembership write is required.
- Adding/removing a direct Folder override leaves the Character's RoleAssignment rows byte-for-byte unchanged.
- Removing Domain membership deletes/revokes RoleAssignments and direct Folder overrides transactionally while preserving audit events; re-adding it restores neither.
- People search is server-ranked, Domain-scoped, keyboard operable, and does not return inaccessible Characters or leak hidden account data.
- Forged Role/Folder mutations fail through the same interim authorization boundary as the UI.

## Manual acceptance
- In People, type part of Sera's Character name, select her from the results beneath the search box, and reach her workspace without visiting a raw collection page.
- In the Role tree, switch between Held roles and Roles I can assign, add/remove a Scribe Role with a checkbox, and verify the displayed Department list updates automatically.
- In the separate Folder tree, search for Deeds, change Read and Write independently, save without leaving the page, and verify Sera's Roles do not change.
- Remove Sera from the Domain, re-add her, and verify no prior Department participation, Role, or direct Folder override returns.

## Guardrails / non-goals
- `Do not preserve the rejected model under a renamed scope, membership, or combined assignment abstraction.`
- `Do not implement the final Phase-7 evaluator or claim that provisional access summaries are authoritative.`
- `Do not make Role and Folder controls navigate into each other or share a mutation payload.`
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P05-T00.md` records migration decisions, commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to P05-T01.
