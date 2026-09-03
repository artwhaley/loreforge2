# P11-T03 — Platform-admin global Character merge queue

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 11  
**Commit prefix:** `P11-T03:`

## Objective
Resolve true global duplicates safely while preserving Domain-local correction capability and history.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-11/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P11-T02

## Frozen context for this ticket
- Domain actors may make local alias/association corrections but permanent global merge is Platform Admin only.
- Merge can affect many Domains; it must be queued/reviewed and auditable.
- Claimed/control relationships must not be silently reassigned if conflicting.

## Required work
1. Consume the `character-merge-requests` collection created in P02 using its exact contracted fields/statuses; do not add a second queue/model.
2. Build impact preview: linked Documents, Domain contexts, claims/control, Personal Domain, correspondence future placeholders.
3. Implement one transactional merge matrix: re-point and exact-dedupe DomainCharacterContexts (source aliases retained; conflicting local fields block for manual resolution), Domain/Subdomain memberships, RoleAssignments, and DocumentCharacterLinks; transfer a sole Personal Domain and sole controlling User to survivor; retain historical audit/provenance actor IDs unchanged; mark source `merged` with `mergedInto` so old IDs resolve/redirect. Future Character-bearing collections must register an explicit merge adapter before release.
4. Block automatic merge when both Characters have conflicting controlling Users or separate Personal Domains; require explicit owner resolution/change-control.
5. Provide Platform Admin approve/reject with reason.

## Likely code touchpoints
- src/lib/characters/merge.ts
- src/app/platform-admin/character-merges/**

## Automated acceptance
- Merge preserves all Document links and old Character URL resolves to survivor/tombstone.
- Conflicting claimed identities block merge.
- Domain admin cannot call global merge endpoint.
- Audit identifies requester, platform approver, source, survivor.
- Same-controller/unclaimed safe cases merge as specified; context-field conflict, different controllers, or two Personal Domains aborts the whole transaction with no partial re-pointing.

## Manual acceptance
- Create Marcus/Markus duplicates across two Domains, request merge, preview impact, approve safe case; verify all links now resolve without lost history.

## Guardrails / non-goals
- `Do not silently combine Personal Domains.`
- `Do not delete source row without tombstone/history.`
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
- `execution-notes/P11-T03.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
