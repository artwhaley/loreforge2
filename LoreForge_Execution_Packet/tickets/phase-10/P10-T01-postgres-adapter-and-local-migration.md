# P10-T01 — PostgreSQL adapter and deterministic local migration

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 10  
**Commit prefix:** `P10-T01:`

## Objective
Move the now-stable product model from intentional SQLite proof infrastructure to PostgreSQL without inventing an abstraction layer.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-10/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P09-GATE approved

## Frozen context for this ticket
- SQLite was deliberately temporary through Phase 9.
- Payload supports database adapters; migration must use framework seam, not Repository/DAO wrappers.
- Production vendor is not chosen in this ticket. Use local/container PostgreSQL.
- Data migration must preserve IDs/history/provenance/Markdown.

## Required work
1. Add @payloadcms/db-postgres version matched to locked Payload release; configure database adapter by environment for migration tooling while production runtime target becomes Postgres.
2. Create local PostgreSQL development/test setup (e.g. Docker Compose) with documented commands; no SaaS account.
3. Generate/normalize Payload migrations for current full schema.
4. Write a restartable one-shot SQLite->Postgres migration/import tool with stable ID mapping and a reconciliation manifest. Validate every collection plus Payload version rows, provenance/audit/history, relationships, memberships/roles/rules, public/personal policy fields, jobs, and media references; compare per-table counts, canonical body hashes, relationship endpoints, and sampled full-record hashes. Unknown/orphaned rows fail the migration report rather than being silently dropped.
5. Switch automated integration test default to PostgreSQL and retain a targeted SQLite migration fixture only.

## Likely code touchpoints
- src/payload.config.ts
- docker-compose*.yml
- src/migrations/**
- scripts/migrate-sqlite-to-postgres.*

## Automated acceptance
- Fresh PostgreSQL database migrates from zero and passes all tests.
- Representative SQLite fixture migrates with equal Domain/Document/version/provenance counts and canonical body hashes.
- Full fixture reconciliation accounts for every source row and foreign-key edge; interrupted rerun is idempotent and creates no duplicates.
- Application boots/works with Postgres only after migration.
- No custom repository layer introduced.

## Manual acceptance
- Migrate a copy of current local data and walk core golden scenario on Postgres.

## Guardrails / non-goals
- `Do not choose hosted provider.`
- `Do not delete original SQLite file in migration tooling; preserve backup.`
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
- `execution-notes/P10-T01.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
