# P05-GATE — Review Gate 5 — supersedes/share

**Mode:** REVIEW GATE — NO SELF-APPROVAL  
**Phase:** 5  
**Commit prefix:** `P05-GATE:`

## Objective
Human validation that document identity, linear succession, and same-document sharing are unambiguous before template automation expands creation volume.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-05/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P05-T00
- P05-T01
- P05-T02
- P05-T03
- P05-T04

## Frozen context for this ticket
- This gate verifies the approved supersedes and Share semantics. Copy, Move, Grouped, and cross-Domain mapping are not application features.

## Required work
1. Run Phase 5 tests.
2. Demonstrate the corrected Role/Department/Folder model and Character workspace; demonstrate separate Prepared by credits, Concerns links, and provenance actors; then execute golden scenarios for deed supersession and marriage-license share.
3. Inspect provenance on the supersession chain and shared record.
4. Record screenshots/notes of the document view hierarchy and bottom Share control.

## Likely code touchpoints
- Inspect current adjacent files; do not broaden scope.

## Automated acceptance

- Full Phase 5 suite passes, including acyclic/linear Supersedes, locked superseded records, and temporary Share enforcement.
- Identity/provenance assertions prove supersession creates a new ID while Share keeps the same ID.


## Manual acceptance
- All Phase 5 tests green.
- No supersedes cycles.
- Superseding creates a new ID and locks the older record.
- No Copy, Move, or cross-Domain mapping controls appear.
- Prepared by credits, Concerns links, and provenance actors remain visibly and structurally distinct.
- RoleAssignments contain no Folder scope, Department participation is Role-derived, and direct Folder overrides are managed independently on the Character workspace.

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
