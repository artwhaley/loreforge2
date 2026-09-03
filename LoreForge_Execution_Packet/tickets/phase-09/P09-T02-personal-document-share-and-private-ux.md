# P09-T02 — Personal Document sharing and private archive UX

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 9  
**Commit prefix:** `P09-T02:`

## Objective
Support exceptional per-Document collaboration while keeping Personal Domains genuinely private.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-09/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P09-T01

## Frozen context for this ticket
- Personal owner may share individual Document read or edit with another User/Character.
- Recipient does not gain folder visibility or any broader Personal Domain membership.
- Shared edit uses same canonical Document and lifecycle/version/provenance rules.

## Required work
1. Reuse PermissionRule/Share flow with personal-policy constraints.
2. Add `Shared with me` entry surface outside the owner's private folder tree for recipients.
3. Prevent recipient from discovering sibling documents/folder names via navigation/query.
4. Expose revoke and provenance to owner.
5. Perform focused private-archive UI tuning.

## Likely code touchpoints
- src/app/**/shared-with-me/**
- src/lib/authz/**

## Automated acceptance
- Recipient can direct-open shared Document and edit only when share+state permit.
- Recipient cannot list parent Personal folder or infer sibling count/names.
- Revocation terminates future access.
- Owner remains full authority.

## Manual acceptance
- Share one private note read-only and one editable; verify recipient sees exactly two shared items and no archive tree.

## Guardrails / non-goals
- `Do not promote recipient to Personal Domain member.`
- `Do not permit folder share via hidden API.`
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
- `execution-notes/P09-T02.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
