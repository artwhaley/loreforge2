# P01-GATE — Review Gate 1 — editor/theme foundation

**Mode:** REVIEW GATE — NO SELF-APPROVAL  
**Phase:** 1  
**Commit prefix:** `P01-GATE:`

## Objective
Prove the tuned editor/theme/safety baseline is good enough to build the real product on.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-01/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P01-T01
- P01-T02
- P01-T03
- P01-T04

## Frozen context for this ticket
- No Characters/ACL/Postgres/starter packs/Form Studio here.
- This is the first real hands-on UX judgment.

## Required work
1. Run targeted tests, full suite, typecheck, lint, and production build supported by the repository.
2. Run GS-01 and GS-02.
3. Run malicious Markdown corpus.
4. Review Form Builder observations.
5. Write `PHASE_01_REVIEW.md` with editor comfort, Source clarity, theme freedom, terminology, safety results, screenshots, defects.
6. State explicitly whether supported Markdown corruption was reproduced.
7. The gate inspects/reports only; it does not modify product source. Any defect produces a severity-ranked patch instruction and blocks approval until a separately committed fix passes the gate again.

## Likely code touchpoints
- Inspect current adjacent files; do not broaden scope.

## Automated acceptance
- All Phase 1 tests/build pass.
- No active XSS payload from regression corpus.

## Manual acceptance
- Owner uses editor and Theme Studio directly and answers whether foundation is acceptable.

## Guardrails / non-goals
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.

## Owner decision dependency

Human owner approval mandatory. If MDXEditor passes, it remains the editor. If the owner rejects it, the owner must issue a replacement-editor decision/new ticket; Phase 2 remains blocked and the executor cannot choose a replacement.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P01-GATE.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- STOP and return the review-gate report to the owner. Do not begin the next phase.
