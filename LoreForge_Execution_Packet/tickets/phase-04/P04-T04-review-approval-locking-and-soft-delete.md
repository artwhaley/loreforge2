# P04-T04 — Review, approval/rejection, locking, and soft delete

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 4  
**Commit prefix:** `P04-T04:`

## Objective
Complete the first usable archive lifecycle without conflating approval, locking, and deletion.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-04/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P04-T03

## Frozen context for this ticket
- Creator, filer, approver, and locker may be different actors and provenance must preserve that.
- Pending Review is a real frozen state; approval -> Filed; rejection -> Draft with review note.
- Locking is optional and explicit after filing. Unlock is explicit and audited.
- Deletion is soft-delete/restore. Permanent destructive deletion is not ordinary Domain behavior.

## Required work
1. Add review submission action and review queue through `authorizeInterimOperation`; before P07 only ownerUser/operational DomainAdmins may review/approve/reject/lock/unlock/restore. P07 replaces the helper without changing workflow APIs; all interim actions are audited.
2. Implement approve and reject-to-Draft with optional reviewer note stored in provenance/context, not injected into Markdown body.
3. Implement Filed->Locked and explicit unlock with confirmation.
4. Add softDeletedAt/softDeletedBy (or equivalent) to Documents; hide soft-deleted records from ordinary listings/search; add restore path.
5. Show standardized created/filed/approved/locked/deleted metadata from provenance-derived/current fields without duplicating contradictory truth.

## Likely code touchpoints
- src/lib/documents/workflow.ts
- src/app/**/review/**
- src/collections/Documents.ts

## Automated acceptance
- State tests cover Draft->Pending->Filed, Draft->Pending->Draft rejection, Filed->Locked->Filed unlock.
- Pending document body mutation remains blocked.
- Soft delete removes from normal list but retains versions/provenance and restore returns same Document ID.
- Reviewer note survives in history.
- Ordinary member and forged API cannot perform an interim privileged transition; no legacy User Membership path grants it.

## Manual acceptance
- Run a clerk creates -> supervisor approves scenario with different actors.
- Reject a second document and confirm clerk can edit/resubmit it.
- Soft-delete and restore a versioned locked document without losing history.

## Guardrails / non-goals
- `Do not create a generic workflow engine.`
- `Do not invent arbitrary custom lifecycle states; exact four states are frozen for this build.`
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
- `execution-notes/P04-T04.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
