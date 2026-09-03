# P02-T04 — Character claims, public profiles, and local alias correction

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 2  
**Commit prefix:** `P02-T04:`

## Objective
Complete initial Character identity workflows without Domain-level global destructive merge.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-02/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P02-T03

## Frozen context for this ticket
- Unclaimed Character can be claimed with local approval.
- Profiles public by default.
- Local alias != global merge.

## Required work
1. Add CharacterClaimRequests state machine and request/approve/reject UI through the Architecture Contract's single interim-authorization boundary. In P02, only the legacy Tenant admin for that Domain may decide; every decision is audited, and P03/P07 replace this branch as specified.
2. Approval sets controlledBy only if still unclaimed and records audit history.
3. Build public Character profile basics and expose the controller only through the safe public User projection (display name only; no User ID/email/SL/admin/account fields).
4. Add Domain-local alias/correction UI using domain-character-contexts.
5. Add `character-merge-requests` in the exact final schema from Architecture Contract §6. P02 may create a `pending` request only; target survivor may be selected later, and all decision/mutation paths remain unavailable until P11.

## Likely code touchpoints
- `src/collections/CharacterClaimRequests.ts`
- `src/collections/Characters.ts`
- `src/app/(frontend)/*characters*`

## Automated acceptance
- Concurrent approvals cannot attach Character to two Users.
- Reject leaves unclaimed.
- Local alias does not mutate global name.
- Ordinary member cannot approve/reject a claim or mutate a merge request; public profile serialization contains none of the forbidden User fields.

## Manual acceptance
- Request and approve a claim; add local alias; verify global/other-Domain display unaffected.

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
- `execution-notes/P02-T04.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
