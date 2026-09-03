# P15-T01 — Separate Second Life bridge service skeleton

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 15  
**Commit prefix:** `P15-T01:`

## Objective
Create the approved separately deployable bridge process with authentication, health, idempotent job handling, and no product authorization logic.

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
- OWNER GATE P15 approved

## Frozen context for this ticket
- Implement only the protocol approved in P15 owner gate.
- Bridge is transport/in-world executor; core LoreForge remains source of authorization/content truth.
- Likely LibreMetaverse is permitted only if approved; pin version and encapsulate adapter.
- Bridge credentials are service secrets, not tenant user credentials.

## Required work
1. Create separate project/process directory/repo boundary as approved, with config/env validation, structured logs, health endpoint/status.
2. Implement authenticated core API client and command/event envelope with a core-persisted request ID/idempotency record. Duplicate events return the prior outcome without a second mutation/provenance row; fake/expired service credentials fail. Bridge claims never authorize or directly create provenance—the core revalidates persisted request/action state.
3. Implement mocked SL transport adapter and optional real LibreMetaverse connection bootstrap only to approved extent.
4. Add reconnect/backoff and graceful shutdown; no action replay without idempotency check.
5. Add local integration harness connecting core staging/dev to mock bridge.

## Likely code touchpoints
- bridge/**
- docs/integrations/second-life/**

## Automated acceptance
- Bridge can start/health/connect mock, receive same command twice and execute once.
- Core rejects unauthenticated/fake bridge events.
- Bridge outage does not crash web app.
- Document bodies not logged.
- Replayed request ID executes once and emits at most one core event; forged provenance/action fields are ignored/rejected by core.

## Manual acceptance
- Run bridge separately, stop/restart, exercise mock command retry.

## Guardrails / non-goals
- `Do not duplicate LoreForge permission evaluator in bridge.`
- `Do not store long-term canonical Documents in bridge.`
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
- `execution-notes/P15-T01.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
