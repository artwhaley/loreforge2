# P14-GATE — Review Gate 14 — correspondence

**Mode:** REVIEW GATE — NO SELF-APPROVAL  
**Phase:** 14  
**Commit prefix:** `P14-GATE:`

## Objective
Human roleplay-behavior gate for immediate and GM-mediated correspondence before Second Life integration.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-14/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P14-T01
- P14-T02
- P14-T03
- P14-T04
- P14-T05

## Frozen context for this ticket
- This feature intentionally models game-world delivery; correctness includes who can see what and when.

## Required work
1. Run Phase 14 tests with fake clock.
2. Execute immediate, held, delayed-from-original-time, garbled, intercepted, reply, and filed-to-archive scenarios.
3. Inspect sender/recipient/moderator/API views for leaks.
4. Review queue UX with old held messages.

## Likely code touchpoints
- Inspect current adjacent files; do not broaden scope.

## Automated acceptance

- Full state-transition/fake-clock suite passes for immediate, moderated, original/modified delayed delivery, retry idempotency, and immutable original body.
- API projection tests prove held/original moderator-only content never leaks and filing/notification output reflects only the actor's authorized view.


## Manual acceptance
- Original never lost.
- Recipient never sees held/original-garbled secret.
- No auto-send before GM decision.
- Delayed timing uses original sentAt.
- Correspondence remains distinct from Documents.

## Guardrails / non-goals
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.
- Owner approves roleplay semantics/UX.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P14-GATE.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- STOP and return the review-gate report to the owner. Do not begin the next phase.
