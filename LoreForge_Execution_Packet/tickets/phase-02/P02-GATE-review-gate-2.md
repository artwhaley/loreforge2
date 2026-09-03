# P02-GATE — Review Gate 2 — Character-centric identity

**Mode:** REVIEW GATE — NO SELF-APPROVAL  
**Phase:** 2  
**Commit prefix:** `P02-GATE:`

## Objective
Verify acting as Characters feels natural rather than like User memberships with RP labels.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-02/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P02-T01
- P02-T02
- P02-T03
- P02-T04

## Frozen context for this ticket
- Do not implement SL verification or real ACLs.

## Required work
1. Run suite/build and GS-03.
2. Exercise unclaimed creation/claim/local alias.
3. Write `PHASE_02_REVIEW.md` focusing on User-vs-Character clarity and switcher/account-empty state.

## Likely code touchpoints
- Inspect current adjacent files; do not broaden scope.

## Automated acceptance
- Membership/claim invariants pass.

## Manual acceptance
- Owner logs in as multi-Character fixture and judges acting identity flow.
- Owner verifies the top-level bar is visually obvious and unambiguous: `Domain` selector on the left, `Acting as` Character selector on the right, Character choices filtered to active membership in the selected Domain, explicit separate `Administration` mode for owner/admin-only work, and no silent acting-identity changes.

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
- `execution-notes/P02-GATE.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- STOP and return the review-gate report to the owner. Do not begin the next phase.
