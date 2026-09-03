# P03-GATE — Review Gate 3 — institutional structure and navigation

**Mode:** REVIEW GATE — NO SELF-APPROVAL  
**Phase:** 3  
**Commit prefix:** `P03-GATE:`

## Objective
Ensure Domain membership -> Subdomain membership -> Folder -> Role feels like an RP institution, not a tree-management database, with each relationship visibly distinct.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-03/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P03-T01
- P03-T02
- P03-T03
- P03-T04

## Frozen context for this ticket
- Final grants/denies deliberately wait P07.

## Required work
1. Run suite/build.
2. Walk fixture cast through navigation/role assignments.
3. Write `PHASE_03_REVIEW.md` with migration/navigation/role clarity issues.

## Likely code touchpoints
- Inspect current adjacent files; do not broaden scope.

## Automated acceptance
- Hierarchy/root invariants pass.

## Manual acceptance
- Owner reviews organizational UI as Head Scribe/Commander/Captain fixtures.
- Owner inspects the member roster and edits a Character's Domain/Subdomain membership, confirming that local alias, controlling User, membership, and Role assignment remain separately visible and independently editable.

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
- `execution-notes/P03-GATE.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- STOP and return the review-gate report to the owner. Do not begin the next phase.
