# P04-T06 — Department, People, and Record-entry workflow shells

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 4  
**Commit prefix:** `P04-T06:`

> **Historical/superseded model:** This completed ticket records the first People shell. `CC-2026-09-03-03` and mandatory P05-T00 replace its Department-membership and scoped-Role controls with Role-derived Department participation and separate Role/Folder trees. Do not preserve the obsolete controls.

## Objective
Reorganize existing Phase 3 machinery into Department- and Character-centered customer workflows and establish the full-page Document creation entry that later phases hydrate.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `06_CHANGE_CONTROL.md` section `CC-2026-09-02-01`
- `tickets/phase-04/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P04-T05

## Frozen context for this ticket
- Ordinary users navigate Departments; they do not start from membership tables.
- Customer administration starts with People/Characters. The controlling User is visible but separate from Character membership, Roles, and access.
- Roles defines hierarchy/defaults; the People detail page is the primary one-person assignment workflow.
- Real effective permission editing/explanations arrive in P07. This ticket may show Phase 3 membership/Role/folder-scope facts and an explicit future-access placeholder, but must not pretend those facts equal final effective access.
- Records contains one New document action. Title belongs on the full creation/editor screen, not an inline Records form.

## Required work
1. Rebuild `/domain/:slug/departments` as a customer directory of real Departments with description, head, active Character membership where applicable, and navigation to canonical Department landing pages. Remove raw-table language from the ordinary view.
2. Build each Department landing from real Phase 3 data with overview, accessible/known Folder branch, current members, and clearly labeled placeholders for Templates/Forms/recent activity until their phases hydrate them. Add contextual Manage Department action only for authorized actors.
3. Add a separate Department management view for authorized Domain/Department managers with create/edit/archive ordering and coherent member/Folder/Role navigation. Retain existing invariant that Department participation requires active Domain membership.
4. Build `/domain/:slug/manage/people` as a searchable Character directory using global name, local alias, controlling User display name, Department, Role, claimed state, and Domain membership. Rows link to one Character workspace.
5. Build the Character workspace with Overview, Departments, Roles, Access, Recent Work, and History sections/tabs. Hydrate Domain/Department membership and multiple independent Role/Folder-scope assignment controls from Phase 3; preserve cascade warnings and never restore narrower grants on re-add.
6. Show a Folder tree under Access with factual Phase 3 Role-scope indicators and an explicit `Effective access editing arrives with the authorization phase` state. Do not calculate or label incomplete Phase 3 data as final `Can view/edit/manage` authority.
7. Refocus Roles page on Role hierarchy/definition and assigned counts, linking to filtered People results. Retain bulk assignment only as a secondary workflow.
8. Remove inline title/create form from Records. Add one `New document` action to `/domain/:slug/records/new`; the new page owns destination, title, active-Character Prepared by display, editor body, Save/Create behavior supported by the current spike, validation, Cancel, and dirty-state protection. P04-T01 adds Type/lifecycle, P05 adds typed links/Tags, and P06 adds searchable Templates/Forms without moving the route again.

## Likely code touchpoints
- `src/app/(frontend)/domain/[slug]/departments/**`
- `src/app/(frontend)/domain/[slug]/manage/people/**`
- `src/app/(frontend)/domain/[slug]/manage/roles/**`
- `src/app/(frontend)/domain/[slug]/records/**`
- `src/app/(frontend)/domain/[slug]/records/new/**`
- `src/lib/domains/queries.ts`
- `src/lib/roles/**`

## Automated acceptance
- Ordinary Departments view contains navigation cards/links and no management table or mutation controls for an unauthorized member.
- People search returns Characters by local alias/Role/Department without conflating or exposing private User fields.
- One Character may display multiple Role assignments and independent Folder scopes; removing one does not remove another.
- Removing Domain membership through the Character workspace deactivates Department memberships/Role assignments, and re-add leaves them inactive.
- Access section never asserts final effective permissions before P07.
- Records contains no inline title/create form; New document reaches a full page whose current create path requires the active controlled member Character and preserves dirty-state protection.

## Manual acceptance
- As Head Scribe, start at People, open Sera, add/remove a Department membership and two independently scoped Role assignments, inspect her Folder-scope tree, and return to the directory without visiting raw collection tables.
- As an ordinary member, browse Departments and Records, then create a current Plain Text record from the full new-document page with title entered on that page.

## Guardrails / non-goals
- `Do not claim to show effective ACL results before the P07 evaluator exists.`
- `Do not make the controlling User the principal for Character membership or Role assignment.`
- `Do not implement Templates, Forms, Tags, Concerns, or final lifecycle ahead of their named tickets.`
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
- `execution-notes/P04-T06.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to P04-T01.
