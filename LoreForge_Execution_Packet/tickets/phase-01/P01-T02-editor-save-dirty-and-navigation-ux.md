# P01-T02 — Editor save, dirty-state, and navigation UX

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 1  
**Commit prefix:** `P01-T02:`

## Objective
Make explicit Save trustworthy before lifecycle/versioning complexity.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-01/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P01-T01

## Frozen context for this ticket
- MDXEditor stays for Phase 1.
- Explicit Save stays; no autosave.
- WYSIWYG remains default; Source is advanced mode.
- A save acknowledges only the title/body snapshot sent by that request. Edits made while it is pending remain dirty after success.

## Required work
1. Track dirty state across title, WYSIWYG, and Source edits.
2. Show clear Unsaved/Saving/Saved/Error states and only advance the clean baseline after server success for the exact dispatched snapshot.
3. Permit only one save request at a time. Disable duplicate submission, but continue accepting local edits; when the request resolves, compare current content to the acknowledged snapshot and remain Unsaved when they differ.
4. Protect both browser unload/back/refresh and in-app Next.js Link/router navigation that would discard dirty work. Confirmed navigation proceeds once; cancelled navigation leaves editor state untouched.
5. After successful save, update the clean baseline without requiring reload.
6. Make save errors retryable without losing local content.
7. Extract the save/dirty transition logic into a pure testable state module and include its `node:test` file in the existing test script; do not introduce a second test runner solely for this ticket.

## Likely code touchpoints
- `src/components/editor/DocumentEditor.tsx`
- `src/lib/actions/saveDocument.ts`
- `src/lib/actions/savePage.ts`
- `src/components/editor/DocumentEditor.module.scss`

## Automated acceptance
- Dirty transitions correctly for title/body/source edits.
- Save failure leaves dirty content intact.
- Edits made while save is pending are not falsely marked saved.
- Stale or duplicate responses cannot overwrite a newer acknowledged baseline.
- Pure-state tests cover edit->save->edit-during-save->success, failure->retry, and duplicate-click suppression; manual acceptance covers real browser/internal navigation interception.

## Manual acceptance
- Edit and attempt to navigate away; verify protection.
- Simulate save failure; verify content survives.
- Save successfully; navigation no longer warns.

## Guardrails / non-goals
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
- `execution-notes/P01-T02.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
