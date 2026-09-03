# P15-T02 — One-to-one Second Life identity verification

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 15  
**Commit prefix:** `P15-T02:`

## Objective
Link one LoreForge User to at most one verified SL avatar using the owner-approved bridge mechanism.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-15/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P15-T01

## Frozen context for this ticket
- Exactly 0..1 SL identity per LoreForge User and 0..1 LoreForge User per SL avatar UUID.
- No alt linkage, discovery, proof, shared-owner metadata, or UI.
- Verified SL avatar is not automatically a Character.

## Required work
1. Implement approved verification challenge/flow through core and bridge.
2. Persist only the contracted User fields `slAvatarUUID`, `slAvatarName`, `slVerificationState`, and `slVerifiedAt` with database uniqueness. Do not add a parallel identity record unless the approved protocol explicitly requires it and the owner gate names that schema change.
3. Reject linking an avatar already bound to another LoreForge User and reject adding second avatar to User; offer unlink/reverify policy per approved protocol.
4. Audit link/unlink/reverify actions.
5. Offer optional `Create Character from this avatar name` convenience only as explicit user action, not automatic.

## Likely code touchpoints
- src/lib/sl/identity/**
- bridge/**
- src/app/**/settings/second-life/**

## Automated acceptance
- One-to-one uniqueness enforced server/database.
- Failed/expired challenge cannot bind.
- Second avatar attempt rejected without revealing unrelated account details beyond necessary `already linked` message.
- Verification creates no Character automatically.

## Manual acceptance
- Verify fixture avatar through approved test grid/mock path, attempt duplicate link from second account.

## Guardrails / non-goals
- `Do not expose/ask whether two avatars are alts.`
- `Do not infer common owner.`
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
- `execution-notes/P15-T02.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
