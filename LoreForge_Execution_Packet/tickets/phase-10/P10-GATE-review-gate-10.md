# P10-GATE — Review Gate 10 — production foundation

**Mode:** REVIEW GATE — NO SELF-APPROVAL  
**Phase:** 10  
**Commit prefix:** `P10-GATE:`

## Objective
Verify the product has moved cleanly from deliberate local proof infrastructure to recoverable Postgres-based staging without semantic regressions.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-10/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P10-T01
- P10-T02
- P10-T03
- P10-T04
- P10-T05

## Frozen context for this ticket
- This gate requires owner-approved provider configuration; if production provider remains intentionally undecided, Phase 10 stops before T05 and later production-dependent phases do not proceed.

## Required work
1. Run full automated suite on Postgres.
2. Run migration/backup/restore test.
3. Run staging golden scenarios and worker health.
4. Review operational docs and provider cost assumptions recorded by owner.

## Likely code touchpoints
- Inspect current adjacent files; do not broaden scope.

## Automated acceptance

- Full suite passes on PostgreSQL from an empty migrated database.
- SQLite migration reconciliation, disposable restore, media checksum, worker restart/idempotency, and production-SQLite refusal tests pass.


## Manual acceptance
- No SQLite production path.
- Backup restore demonstrated.
- No product semantic regression.
- Staging survives redeploy and data persists.

## Guardrails / non-goals
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.
- Owner approves staging/operations posture.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P10-GATE.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- STOP and return the review-gate report to the owner. Do not begin the next phase.
