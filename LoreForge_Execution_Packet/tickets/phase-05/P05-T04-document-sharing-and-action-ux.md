# P05-T04 — Document sharing and document action UX

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 5  
**Commit prefix:** `P05-T04:`

## Objective
Add exceptional same-document sharing while keeping the document view focused on the record and its supersession chain.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-05/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P05-T02

## Frozen context for this ticket
- Share grants another principal access to the SAME canonical Document and same revision stream.
- Share is a Document-specific permission exception; P07 will replace/complete the evaluator but the stored rule shape must already match `03_ARCHITECTURE_CONTRACT.md`.
- Personal Domain can later use Document share but never folder share.
- Before P07, Share is ownerUser/operational-DomainAdmin only through `authorizeInterimOperation`; final delegation is `manage_access` + `share_document` + possession of the granted capability, never edit permission alone.

## Required work
1. Introduce PermissionRule storage (it does not exist earlier), limited here to direct User/Character Document `read`/`edit_document` grants and revocation; match the frozen Domain/principal/resource/capability/effect/audit shape exactly so P07 extends it without migration.
2. Implement Share dialog to find eligible User/Character principal, choose read or edit, and revoke existing share.
3. Record share/revoke provenance without exposing hidden recipient data to unauthorized readers.
4. Place the Share control at the bottom of the document view. Do not add Copy, Move, or cross-Domain mapping controls.
5. Ensure shared edit honors lifecycle editability.
6. Wire an explicitly temporary server-side Document read/edit enforcement adapter into every Document view/action path. P07-T02 must replace/delete this adapter without changing rule storage or workflow APIs.

## Likely code touchpoints
- src/collections/PermissionRules.ts
- src/lib/authz/**
- src/app/**/documents/**/actions/**

## Automated acceptance
- Shared reader sees same Document ID/current version.
- Revoking share removes subsequent access but does not delete audit/provenance.
- Edit share cannot edit Locked/Pending document.
- Document share does not expose parent folder listing unless independently authorized.
- Ordinary member cannot create/revoke a pre-P07 Share; direct API and UI paths use the same temporary enforcement adapter.

## Manual acceptance
- Share a marriage license with another Character and verify same canonical record.
- Review the document view: the title/body hierarchy is primary and Share is at the bottom.

## Guardrails / non-goals
- `Do not implement folder grants yet except schema compatibility.`
- Do not add Copy, Move, or transfer controls from stale packet text.
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
- `execution-notes/P05-T04.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
