# P04-GATE — Review Gate 4 — user-first shell and durable document core

**Mode:** REVIEW GATE — NO SELF-APPROVAL  
**Phase:** 4  
**Commit prefix:** `P04-GATE:`

## Objective
Human review of the approved customer shell/workflows and durable Document/Type/lifecycle/version/provenance foundation before relationships and templates build on it.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-04/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P04-T00
- P04-T05
- P04-T06
- P04-T01
- P04-T02
- P04-T03
- P04-T04

## Frozen context for this ticket
- This gate validates GS document scenarios and schema shape, not visual perfection.
- No Phase 5 work may start without owner/reviewer approval.

## Required work
1. Run all Phase 4 automated tests and the relevant golden scenarios.
2. Produce a concise schema diff from the spike and list all migrations.
3. Demonstrate branded customer login/dashboard, one-Domain/no-admin-mode navigation, People-centered administration, full-page Plain Text creation, review-required document, revision restore, lock/unlock, soft-delete/restore, and timeline.
4. Record any discovered lifecycle ambiguity as BLOCKER rather than choosing a new policy.

## Likely code touchpoints
- Inspect current adjacent files; do not broaden scope.

## Automated acceptance

- Full Phase 4 suite passes, including lifecycle transition table, direct-API edit guards, unlimited revision retention/restore, and soft-delete history preservation.
- Schema/migration diff accounts for every changed collection/field with no destructive history loss.


## Manual acceptance
- All Phase 4 tests green.
- No unresolved P0/P1 defect.
- No Document can exist without Type.
- No ordinary mutation path bypasses lifecycle edit guards.
- Signed-out and signed-in `/` are deliberate LoreForge surfaces; ordinary customer login never requires Payload Admin.
- Customer shell has exactly one Domain selector, no Administration mode, stable Home/About/Departments/Records navigation, and a separate capability-driven management bar.

## Guardrails / non-goals
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.
- Owner/reviewer confirms lifecycle feels understandable to a clerk and timeline clearly distinguishes create/file/edit/lock actions.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P04-GATE.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- STOP and return the review-gate report to the owner. Do not begin the next phase.
