# P02-T01 — User SL placeholder and global Character model

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 2  
**Commit prefix:** `P02-T01:`

## Objective
Introduce the real User/Character distinction without implementing SL verification.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-02/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P01-GATE approved

## Frozen context for this ticket
- One User maps to zero/one SL identity only.
- Character is global/unclaimed-capable.
- No alt-account groups.

## Required work
1. Add User SL placeholder fields exactly as Architecture Contract specifies; no verification UI/protocol.
2. Add Characters collection with control/status/aliases/profile basics.
3. Seed fixture cast including one User with two Characters and unclaimed `Unknown Traveler`.
4. Add domain-character-contexts for local alias/context without membership implication.
5. Enforce SL UUID uniqueness with a database unique index (application validation may improve errors but is not the race-safety boundary) and add Character control/status invariant tests.

## Likely code touchpoints
- `src/collections/Users.ts`
- `src/collections/Characters.ts`
- `src/collections/DomainCharacterContexts.ts`
- `src/seed/index.ts`

## Automated acceptance
- SL UUID unique across Users.
- Unclaimed Character valid.
- One User controls two Characters.

## Manual acceptance
- Inspect seed data; confirm UI/model never assumes SL avatar == Character.

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
- `execution-notes/P02-T01.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
