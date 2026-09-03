# P15-GATE — Review Gate 15 — Second Life integration

**Mode:** REVIEW GATE — NO SELF-APPROVAL  
**Phase:** 15  
**Commit prefix:** `P15-GATE:`

## Objective
Final human/domain-expert gate for the separate bridge, one-to-one avatar identity, location semantics, and notecard provenance.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-15/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P15-T00
- P15-T01
- P15-T02
- P15-T03
- P15-T04
- P15-T05

## Frozen context for this ticket
- Owner's Second Life domain knowledge is authoritative for protocol capability; implementation must match approved P15 gate.

## Required work
1. Run bridge/core automated and failure/idempotency tests.
2. Execute identity, location action-start, notecard round-trip, and filing-cabinet delivery scenarios.
3. Disconnect/reconnect bridge during operations.
4. Audit provenance and permission checks.
5. Confirm core web server has no LibreMetaverse/runtime dependency.

## Likely code touchpoints
- Inspect current adjacent files; do not broaden scope.

## Automated acceptance

- Approved protocol artifact commit/hash matches the owner gate, and all core/bridge contract, identity uniqueness, location precedence/session, transfer idempotency, and failure tests pass.
- Dependency scan proves the core web server has no LibreMetaverse/runtime dependency and the bridge performs no direct production-database writes or independent permission decisions.


## Manual acceptance
- One LoreForge User <-> at most one SL avatar.
- No alt model.
- Local permissions always enforced.
- Location checked at action start only as specified.
- Notecard provenance survives round-trip.
- Bridge failure does not corrupt core state.
- Owner/domain expert performs identity, real approved-region/parcel location, notecard round-trip, and in-world object delivery acceptance against the approved SL environment; a mock-only run cannot approve this final gate.

## Guardrails / non-goals
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.
- Owner performs SL-specific acceptance and approves integration behavior.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P15-GATE.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- STOP and return the review-gate report to the owner. Do not begin the next phase.
