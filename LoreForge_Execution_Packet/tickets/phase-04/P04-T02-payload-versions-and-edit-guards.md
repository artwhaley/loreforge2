# P04-T02 — Payload Versions and lifecycle edit guards

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 4  
**Commit prefix:** `P04-T02:`

## Objective
Turn document revision history into a durable invariant while enforcing editability from lifecycle state.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-04/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P04-T01

## Frozen context for this ticket
- Markdown body remains canonical Document content.
- Full historical bodies must be retained; provenance events are separate from revisions.
- Draft and Filed documents may be edited if authorization allows. Pending Review is frozen. Locked is frozen until explicit unlock.
- Payload Versions is the preferred mechanism; do not invent a second version database unless a demonstrated blocker is documented and owner-reviewed.

## Required work
1. Enable Payload Versions for Documents with unlimited retention for this build. No count/age pruning is permitted until an owner-approved retention/export policy is added through change control.
2. Centralize `canEditDocumentBody(state)` and enforce it in server mutations/Payload hooks, not only disabled buttons.
3. Expose revision list/read-only preview only through the same server-side read boundary as the current Document (interim Domain scope before P07, shared evaluator after P07). A guessed revision ID never bypasses Document access.
4. Implement restore-to-new-current-version only for editable states; restoration itself creates a new revision rather than erasing history.
5. Record revision actor metadata needed to connect revisions to provenance in the next ticket.

## Likely code touchpoints
- src/collections/Documents.ts
- src/lib/documents/versions.ts
- src/app/**/documents/**

## Automated acceptance
- Automated tests prove body mutations fail in Pending Review and Locked states even via direct server action/API.
- Editing Draft/Filed creates a new Payload version.
- Restore produces another version and leaves the restored-from version intact.
- Revision retrieval is Domain-scoped.
- Direct revision API requires current Document read access and returns no title/body/count when denied; P07-T02 replaces the interim scope check with the shared evaluator.
- Creating more revisions than any Payload default limit retains and permits preview/restore of the earliest revision.

## Manual acceptance
- Edit a Filed document three times, inspect all prior bodies, restore the first, and confirm all four historical points remain inspectable.
- Open a Locked document and confirm neither WYSIWYG nor Source mode offers a writable path.

## Guardrails / non-goals
- `Do not use revision history as the provenance timeline.`
- `Do not allow administrators to bypass Locked/Pending guards through ordinary edit endpoints; unlock/reject is explicit workflow.`
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
- `execution-notes/P04-T02.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
