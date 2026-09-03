# P09-GATE — Review Gate 9 — Personal Domains

**Mode:** REVIEW GATE — NO SELF-APPROVAL  
**Phase:** 9  
**Commit prefix:** `P09-GATE:`

## Objective
Validate Character-rooted private archives and copy/share boundaries before replacing temporary infrastructure.

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
- P09-T02
- P09-T03

## Frozen context for this ticket
- Phase 10 is the first infrastructure-hardening phase; product semantics should be stable enough before that migration.

## Required work
1. Run Phase 9 tests.
2. Execute multi-Character same-User isolation, personal Document share, and keep-copy scenarios.
3. Audit no Personal folder/public/Subdomain exposure.
4. Review Personal Archive UI for clarity versus Community Domain.

## Likely code touchpoints
- Inspect current adjacent files; do not broaden scope.

## Automated acceptance

- Full Phase 9 suite passes for one-row-per-Character uniqueness, evaluator-level Personal policy denials, multi-Character isolation, and Document-only Share.
- Keep-copy is atomic/idempotent and proves independent IDs/version streams.


## Manual acceptance
- All isolation tests green.
- No folder share/public surface for Personal Domain.
- Keep-copy independent.
- Character—not User—is ownership root.

## Guardrails / non-goals
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.
- Owner approves Personal Domain semantics; unresolved pricing remains explicitly deferred to P11 owner gate.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P09-GATE.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- STOP and return the review-gate report to the owner. Do not begin the next phase.
