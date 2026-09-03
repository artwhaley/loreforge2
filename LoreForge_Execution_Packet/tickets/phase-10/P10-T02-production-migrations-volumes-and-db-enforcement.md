# P10-T02 — Production migrations, persistent volumes, and database enforcement

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 10  
**Commit prefix:** `P10-T02:`

## Objective
Make database/schema operations repeatable and close gaps that should be enforced below application UI.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-10/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P10-T01

## Frozen context for this ticket
- Postgres is authoritative persistence from this point forward.
- Permissions remain application evaluator; DB constraints enforce structural invariants, not duplicate ACL logic.
- Media provider remains local development until owner picks production storage in P10-T05.

## Required work
1. Audit schema for FK/nullability/uniqueness/check constraints compatible with Payload and product decisions (single owner fields, personal owner uniqueness, relationship uniqueness/cycles still service-level where needed).
2. Document migration workflow: create, review, apply, rollback/restore procedure; never use ad hoc production schema sync.
3. Configure persistent local volumes for DB and media; exclude from git.
4. Add startup check preventing accidental production boot against SQLite.
5. Add schema/migration CI test from empty database.

## Likely code touchpoints
- src/migrations/**
- docs/operations/database.md
- docker-compose*.yml

## Automated acceptance
- Empty DB migration deterministic.
- Restart containers preserves DB/media.
- Production environment with SQLite URL/config fails loudly.
- Key structural invalid records rejected.

## Manual acceptance
- Stop/restart local stack and confirm data survives; recreate from backup/migrations.

## Guardrails / non-goals
- `Do not put authorization precedence in database RLS in this phase unless separately owner-approved; avoid two policy engines.`
- `Do not use `push` schema changes in production.`
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
- `execution-notes/P10-T02.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
