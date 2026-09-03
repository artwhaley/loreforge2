# Phase 12 Orchestrator — Search, Bulk Import, Export, and Scale UX

**Status:** blocked until P11-GATE owner-approved state is explicitly approved.

## Phase outcome
Add Postgres-native permission-aware search, bulk historical import, whole-Domain export, and scale-focused archive UX.

## Authority for this phase
Before implementation, read the packet root documents `00_START_HERE.md` through `06_CHANGE_CONTROL.md`, this phase orchestrator, and each ticket immediately before executing it. The ticket is the bounded unit of work; this file controls order and stop behavior.

Do not reinterpret the full roadmap while executing this phase. If current source conflicts with a frozen decision, use Change Control and stop rather than inventing a compromise.

## Branch
`phase-12-search-import-export-scale`

Create it only from the owner-approved previous state.

## Ordered ticket sequence

### P12-T01 — PostgreSQL-native Domain search and filters
- File: `P12-T01-postgres-native-search-and-filters.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P11-GATE approved
- Outcome: Deliver scalable, permission-aware archive retrieval without adding an external search service.

### P12-T02 — Public search and permission-sensitive retrieval UX
- File: `P12-T02-public-and-permission-search-ux.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P12-T01
- Outcome: Expose public archive search cleanly and make restricted search behavior unsurprising without leaking hidden records.

### P12-T03 — Bulk Markdown/text legacy archive import
- File: `P12-T03-bulk-markdown-text-import.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P12-T02
- Outcome: Provide a controlled path for established RP communities to bring years of plain-text/notecard-derived records into LoreForge.

### P12-T04 — Whole-Domain owner export
- File: `P12-T04-whole-domain-export.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P12-T03
- Outcome: Give Community Domain Owner a portable archive of their data without pretending it is a raw database backup.

### P12-GATE — Review Gate 12 — retrieval, migration, and portability
- File: `P12-GATE-review-gate-12.md`
- Mode: REVIEW GATE — NO SELF-APPROVAL
- Depends on:
  - P12-T01
  - P12-T02
  - P12-T03
  - P12-T04
- Outcome: Validate that a real archive can be found, onboarded, and exported before communication features add more data.

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
Execute `P12-GATE` last. It is a **human review gate, not an executor approval step**.

After the gate report is produced:
- STOP;
- return the report, screenshots/evidence, test results, and unresolved defects to the owner;
- do not create Phase 13 work;
- proceed only after explicit owner approval or owner-issued patch instructions.
