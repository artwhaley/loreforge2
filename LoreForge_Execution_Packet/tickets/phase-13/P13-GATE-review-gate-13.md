# P13-GATE — Review Gate 13 — activity and notifications

**Mode:** REVIEW GATE — NO SELF-APPROVAL  
**Phase:** 13  
**Commit prefix:** `P13-GATE:`

## Objective
Validate event projections, watches, and notification delivery without conflating audit, activity, notification, and correspondence.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-13/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P13-T00
- P13-T01
- P13-T02
- P13-T03
- P13-T04

## Frozen context for this ticket
- Four concepts must remain distinct: provenance/audit truth; activity projection; notification inbox; later correspondence.

## Required work
1. Run Phase 13 tests.
2. Publish/archive member and public Domain notices, then execute watch/share/review/claim notifications and permission revocation cases.
3. Inspect User dashboard, Domain, and Department feeds for filtering and duplicate suppression.
4. Inspect email/dev channel behavior.

## Likely code touchpoints
- Inspect current adjacent files; do not broaden scope.

## Automated acceptance

- Full Phase 13 suite passes for projection source identity, notification idempotency, Character-context watches, permission rechecks, and email preference/fail-closed behavior.
- Audit, activity, notification, and correspondence storage remain distinct; unsupported event types are silent by default.


## Manual acceptance
- No watch grants access.
- No duplicate notification from overlapping watches.
- Sensitive body omitted from email.
- Activity remains projection.
- Notices remain authored content with separate audit/projection identity and do not automatically become notification spam.

## Guardrails / non-goals
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.
- Owner approves noise level/UX; event set may be expanded later through explicit tickets.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P13-GATE.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- STOP and return the review-gate report to the owner. Do not begin the next phase.
