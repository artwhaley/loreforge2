# P12-GATE — Review Gate 12 — retrieval, migration, and portability

**Mode:** REVIEW GATE — NO SELF-APPROVAL  
**Phase:** 12  
**Commit prefix:** `P12-GATE:`

## Objective
Validate that a real archive can be found, onboarded, and exported before communication features add more data.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-12/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P12-T01
- P12-T02
- P12-T03
- P12-T04

## Frozen context for this ticket
- Search quality and import ergonomics are core product value, not backend-only acceptance.

## Required work
1. Run search security/performance tests.
2. Import a realistic legacy fixture and use search to locate records.
3. Export resulting Domain and validate archive.
4. Review public/member search UX.

## Likely code touchpoints
- Inspect current adjacent files; do not broaden scope.

## Automated acceptance

- Search leakage/performance tests, hostile ZIP/import limit corpus, batch idempotency, and authorization tests pass.
- Whole-Domain export validates checksums/snapshot consistency, includes retained/deleted history, and excludes User secrets/cross-Domain bodies.


## Manual acceptance
- No private search leakage.
- 10k+ corpus smoke acceptable against target environment.
- Import preserves source provenance.
- Owner export complete and protected.

## Guardrails / non-goals
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.
- Owner/reviewer approves search usefulness and import/export concepts.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P12-GATE.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- STOP and return the review-gate report to the owner. Do not begin the next phase.
