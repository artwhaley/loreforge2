# P03-T03 — Domain root, Subdomain folder branches, and navigation

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 3  
**Commit prefix:** `P03-T03:`

## Objective
Make every Document location explicit and prepare folder branches for later delegation.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-03/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P03-T02

## Frozen context for this ticket
- Every Domain has system root Folder.
- Every Document will require a Folder.
- Subdomain detail is folders, not recursive tenants.

## Required work
1. Create system-managed Domain root Folder hook/seed.
2. Migrate root-level Documents to root and then require Folder.
3. Associate Subdomain branches with their Subdomain while ancestry remains same Domain.
4. Reject folder cycles/cross-Domain parents.
5. Tune breadcrumbs/tree for arbitrary nesting.
6. Seed full fixture folder tree.

## Likely code touchpoints
- `src/collections/Folders.ts`
- `src/collections/Documents.ts`
- `src/lib/archive/folderTree.ts`

## Automated acceptance
- No null Document folder after migration.
- Root cannot be normal-deleted/moved.
- Folder cycles/cross-Domain parents rejected.

## Manual acceptance
- Browse Ar -> Warriors -> First Platoon -> Battle Plans and back.

## Guardrails / non-goals
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
- `execution-notes/P03-T03.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
