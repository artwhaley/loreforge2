# P05-GATE — Review Gate 5 — document graph, copy/move/share

**Mode:** REVIEW GATE — NO SELF-APPROVAL  
**Phase:** 5  
**Commit prefix:** `P05-GATE:`

## Objective
Human validation that document identity, succession, and cross-boundary operations are unambiguous before template automation expands creation volume.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-05/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P05-T01
- P05-T02
- P05-T03
- P05-T04

## Frozen context for this ticket
- This gate specifically guards against semantic confusion among Share, Copy, Move, Grouped, and Supersedes.

## Required work
1. Run Phase 5 tests.
2. Demonstrate separate Prepared by credits, Concerns links, and provenance actors; then execute golden scenarios for deed supersession, marriage-license share, copy divergence, and cross-Domain move disabled/enabled.
3. Inspect provenance on both source and destination/copy.
4. Record screenshots/notes of Document Actions wording.

## Likely code touchpoints
- Inspect current adjacent files; do not broaden scope.

## Automated acceptance

- Full Phase 5 suite passes, including required grouped labels, acyclic/single-successor Supersedes, exact Copy/Move metadata and authorization matrices, and temporary Share enforcement.
- Identity/provenance assertions prove Share=same ID, Copy=new ID, and Move=same ID/history.


## Manual acceptance
- All Phase 5 tests green.
- No supersedes cycles.
- Copy and Share demonstrably differ by ID/version behavior.
- Cross-Domain move defaults disabled.
- Prepared by credits, Concerns links, and provenance actors remain visibly and structurally distinct.

## Guardrails / non-goals
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.
- Owner/reviewer approves terminology and provenance presentation.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P05-GATE.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- STOP and return the review-gate report to the owner. Do not begin the next phase.
