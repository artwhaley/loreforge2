# P04-T01 — Document Types, Plain Text baseline, and lifecycle policy

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 4  
**Commit prefix:** `P04-T01:`

## Objective
Replace the spike's untyped document assumption with the required Type model and deterministic filing/review policy.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-04/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P04-T06

## Frozen context for this ticket
- Every Document MUST have exactly one Document Type.
- Seed exactly one active Domain-level `Plain Text` Type (case-insensitive unique name per Domain). P06-T01 creates the blank inheritable Template after the Template model exists; do not create a one-off template table here.
- Lifecycle states are exactly Draft, Pending Review, Filed, Locked for this phase.
- Lifecycle policy precedence is frozen: Template > Folder > Document Type > Domain.
- Domain default is direct-file unless configured otherwise. Review-required policies route submission to Pending Review.

## Required work
1. Add DocumentType collection/model scoped to Domain, including name, description, active flag, and default lifecycle policy.
2. Add lifecycle policy fields exactly as follows: Domain `direct-file|review-required` default `direct-file`; Document Type `direct-file|review-required`; Folder `inherit|direct-file|review-required` default `inherit`; Template-compatible schema placeholder `inherit|direct-file|review-required` default `inherit`. Implement one resolver with precedence Template > Folder > Document Type > Domain.
3. Require `documentType` on Documents and migrate/seed spike records to `Plain Text` without losing Markdown.
4. Implement lifecycle transition service with explicit allowed transitions: Draft->Filed or Pending Review; Pending Review->Filed or Draft(reject/withdraw); Filed->Locked; Locked->Filed only through explicit unlock authority; no implicit transitions.
5. Hydrate the approved `/domain/:domain/records/new` surface with required Document Type selection and lifecycle behavior; add user-facing lifecycle badge/state display and preserve state across navigation. Keep title on the creation/editor page and do not reintroduce an inline Records create form.

## Likely code touchpoints
- src/collections/Documents.ts
- src/collections/DocumentTypes.ts
- src/collections/Domains.ts
- src/collections/Folders.ts
- src/lib/documents/lifecycle.ts
- src/lib/seed/

## Automated acceptance
- Unit tests cover effective-policy precedence.
- Unit tests reject a Document with no Type.
- Transition tests cover every allowed transition and reject all other direct transitions.
- Migration/seed test proves existing spike Markdown remains byte-equivalent after canonicalization.
- Two Domains receive independent Plain Text Type IDs; a second active case-insensitive `Plain Text` Type in one Domain is rejected.

## Manual acceptance
- From Records click New document, create a Plain Text document in a nested folder with its title on the editor page, and verify the default type is selectable and required.
- Switch a folder to review-required and verify new submission reaches Pending Review instead of Filed.

## Guardrails / non-goals
- `Do not add arbitrary custom metadata fields to Document Types.`
- `Do not implement approvals UI beyond minimum state controls; review workflow completion is P04-T04.`
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P04-T01.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
