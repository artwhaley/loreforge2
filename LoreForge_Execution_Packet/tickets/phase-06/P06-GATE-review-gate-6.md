# P06-GATE — Review Gate 6 — templates and forms

**Mode:** REVIEW GATE — NO SELF-APPROVAL  
**Phase:** 6  
**Commit prefix:** `P06-GATE:`

## Objective
Human UX gate for the authoring shortcut most likely to determine whether nontechnical roleplayers can use LoreForge.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-06/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P06-T01
- P06-T02
- P06-T03
- P06-T04

## Frozen context for this ticket
- This is a UX gate, not merely a schema gate. A technically correct but CMS-like Form Studio fails.

## Required work
1. Run Phase 6 tests.
2. Execute clean-user template-authoring scenario from Fixture contract.
3. Create a form document, hand-authored document, and base-template-derived document; compare resulting ordinary Document behavior.
4. Collect specific UI friction notes and resolve P0/P1/P2 usability issues before approval.

## Likely code touchpoints
- Inspect current adjacent files; do not broaden scope.

## Automated acceptance

- Full Phase 6 suite passes, including exact-one `{{content}}`, form-schema validation, transactional rollback, no retained raw answers, and interim-authority API denials.
- Hand-authored, document-template, and form-template creation all produce ordinary canonical Documents governed by the same lifecycle rules.
- Records exposes one New document workflow whose searchable chooser switches between WYSIWYG and form authoring without changing the surrounding title/credit/tag/lifecycle flow.


## Manual acceptance
- All Phase 6 tests green.
- No raw form answers retained.
- No plugin-specific form JSON is required by core runtime.
- Base-template composition deterministic.
- Templates & Forms presents Types, Templates, and Forms as related but distinct customer concepts.

## Guardrails / non-goals
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.
- Owner/reviewer can create a usable Incident Report template without technical guidance; editor/form surfaces meet current taste threshold.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P06-GATE.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- STOP and return the review-gate report to the owner. Do not begin the next phase.
