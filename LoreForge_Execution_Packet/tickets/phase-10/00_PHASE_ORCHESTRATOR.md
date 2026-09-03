# Phase 10 Orchestrator — Production Data and Runtime Foundation

**Status:** blocked until P09-GATE owner-approved state is explicitly approved.

## Phase outcome
Move the settled model to production-grade Postgres/runtime/backup/job seams in one deliberate infrastructure phase, then configure only owner-approved providers.

## Authority for this phase
Before implementation, read the packet root documents `00_START_HERE.md` through `06_CHANGE_CONTROL.md`, this phase orchestrator, and each ticket immediately before executing it. The ticket is the bounded unit of work; this file controls order and stop behavior.

Do not reinterpret the full roadmap while executing this phase. If current source conflicts with a frozen decision, use Change Control and stop rather than inventing a compromise.

## Branch
`phase-10-production-runtime`

Create it only from the owner-approved previous state.

## Ordered ticket sequence

### P10-T01 — PostgreSQL adapter and deterministic local migration
- File: `P10-T01-postgres-adapter-and-local-migration.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P09-GATE approved
- Outcome: Move the now-stable product model from intentional SQLite proof infrastructure to PostgreSQL without inventing an abstraction layer.

### P10-T02 — Production migrations, persistent volumes, and database enforcement
- File: `P10-T02-production-migrations-volumes-and-db-enforcement.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P10-T01
- Outcome: Make database/schema operations repeatable and close gaps that should be enforced below application UI.

### P10-T03 — Operational backup and restore baseline
- File: `P10-T03-backup-restore-and-export-integrity.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P10-T02
- Outcome: Prove LoreForge can recover its database/media before hosting real community history.

### P10-T04 — Jobs, structured logging, secrets, and runtime seams
- File: `P10-T04-jobs-logging-secrets-and-runtime-seams.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P10-T03
- Outcome: Add minimum production-shaped operational plumbing needed by later notifications/correspondence without choosing providers prematurely.

### P10-T05 — Production provider configuration
- **OWNER GATE:** `owner-gates/P10_DEPLOYMENT_DECISIONS.md` must be completed and approved before this ticket begins. STOP after P10-T04 if it is not approved.
- File: `P10-T05-production-provider-configuration.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P10-T04
  - OWNER GATE P10 approved
- Outcome: Apply owner-selected hosting/media/email/deployment choices as one bounded production configuration step.

### P10-GATE — Review Gate 10 — production foundation
- File: `P10-GATE-review-gate-10.md`
- Mode: REVIEW GATE — NO SELF-APPROVAL
- Depends on:
  - P10-T01
  - P10-T02
  - P10-T03
  - P10-T04
  - P10-T05
- Outcome: Verify the product has moved cleanly from deliberate local proof infrastructure to recoverable Postgres-based staging without semantic regressions.

## Owner-only decision gates
- P10-T05 is blocked until `owner-gates/P10_DEPLOYMENT_DECISIONS.md` is completed and explicitly approved.

## Per-ticket execution rule
For every implementation ticket:
1. confirm dependencies and current branch;
2. read the entire ticket and cited frozen context;
3. implement only the required work;
4. add/update the named automated tests;
5. run targeted tests, full suite, and supported build/typecheck/lint;
6. perform and record manual acceptance;
7. write `execution-notes/<ticket-id>.md`;
8. commit separately with the ticket's exact commit prefix.

If the ticket fails, repair only within its scope. Do not skip forward hoping a later ticket will fix it.

## Phase exit rule
Execute `P10-GATE` last. It is a **human review gate, not an executor approval step**.

After the gate report is produced:
- STOP;
- return the report, screenshots/evidence, test results, and unresolved defects to the owner;
- do not create Phase 11 work;
- proceed only after explicit owner approval or owner-issued patch instructions.
