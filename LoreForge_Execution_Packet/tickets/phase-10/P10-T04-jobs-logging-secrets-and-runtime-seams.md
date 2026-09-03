# P10-T04 — Jobs, structured logging, secrets, and runtime seams

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 10  
**Commit prefix:** `P10-T04:`

## Objective
Add minimum production-shaped operational plumbing needed by later notifications/correspondence without choosing providers prematurely.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-10/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P10-T03

## Frozen context for this ticket
- Correspondence delayed delivery will need a real job runner later.
- SL integration will be a separate process/service later.
- Do not build microservices for ordinary app functions.
- Provider-specific email/storage/deployment remains owner gate.

## Required work
1. Configure Payload job queue/worker entry point with a trivial health/test job; worker runs separately from request handling in production-shaped local setup.
2. Add structured server logging with request/correlation IDs and actor/resource IDs where safe; no document bodies/secrets in logs.
3. Centralize environment validation for DB, auth secret, base URL and future provider keys; commit `.env.example` only.
4. Add health/readiness endpoints covering app+DB and separate worker health strategy.
5. Document process topology: web, worker, Postgres, media/storage; reserve separate SL bridge boundary without implementing it.

## Likely code touchpoints
- src/jobs/**
- src/lib/logging/**
- src/lib/env.ts
- docs/operations/runtime.md

## Automated acceptance
- Queued test job executes in worker and not inline request.
- Missing required production secret prevents boot.
- Logs omit canonical Document body fixture secret marker.
- Health fails when DB unavailable.

## Manual acceptance
- Run web and worker separately locally; enqueue test job; stop worker and show web remains responsive while job waits.

## Guardrails / non-goals
- `Do not implement correspondence jobs yet.`
- `Do not add Redis unless Payload/current load requires it demonstrably; Postgres-backed/default queue first.`
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
- `execution-notes/P10-T04.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
