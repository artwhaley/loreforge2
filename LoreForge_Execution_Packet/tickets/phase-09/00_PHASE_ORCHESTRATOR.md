# Phase 9 Orchestrator — Personal Domains

**Status:** blocked until P08-GATE owner-approved state is explicitly approved.

## Phase outcome
Add Character-rooted private Personal Domains as a deliberately constrained subset of Community Domain infrastructure.

## Authority for this phase
Before implementation, read the packet root documents `00_START_HERE.md` through `06_CHANGE_CONTROL.md`, this phase orchestrator, and each ticket immediately before executing it. The ticket is the bounded unit of work; this file controls order and stop behavior.

Do not reinterpret the full roadmap while executing this phase. If current source conflicts with a frozen decision, use Change Control and stop rather than inventing a compromise.

## Branch
`phase-09-personal-domains`

Create it only from the owner-approved previous state.

## Ordered ticket sequence

### P09-T01 — Character-owned Personal Domain policy
- File: `P09-T01-character-owned-personal-domain-policy.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P08-GATE approved
- Outcome: Implement Personal Domains as a constrained profile of the same Domain/archive infrastructure, rooted in Character identity.

### P09-T02 — Personal Document sharing and private archive UX
- File: `P09-T02-personal-document-share-and-private-ux.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P09-T01
- Outcome: Support exceptional per-Document collaboration while keeping Personal Domains genuinely private.

### P09-T03 — File to Community Domain and keep independent Personal copy
- File: `P09-T03-file-there-and-keep-personal-copy.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P09-T02
- Outcome: Implement the attorney/scribe workflow where a Character files a Community record and optionally keeps an independent archival copy.

### P09-GATE — Review Gate 9 — Personal Domains
- File: `P09-GATE-review-gate-9.md`
- Mode: REVIEW GATE — NO SELF-APPROVAL
- Depends on:
  - P09-T01
  - P09-T02
  - P09-T03
- Outcome: Validate Character-rooted private archives and copy/share boundaries before replacing temporary infrastructure.

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
Execute `P09-GATE` last. It is a **human review gate, not an executor approval step**.

After the gate report is produced:
- STOP;
- return the report, screenshots/evidence, test results, and unresolved defects to the owner;
- do not create Phase 10 work;
- proceed only after explicit owner approval or owner-issued patch instructions.
