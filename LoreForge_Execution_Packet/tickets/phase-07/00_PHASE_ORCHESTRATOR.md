# Phase 7 Orchestrator — Real Authorization and Delegated Administration

**Status:** Phase 7 implementation exists; owner acceptance remains pending.
The owner bypassed the Phase 6 gate. Phase 7 manual testing is paused before
the Head Scribe section for the requested performance remediation.

**Current addendum:** `references/P07P_DATABASE_ACCESS_PATCH.md`, P07P-01
through P07P-06. The implementation and automated verification are recorded in
`execution-notes/P07P-01.md` through `execution-notes/P07P-06.md` and
`execution-notes/P07-GATE.md`. Owner browser acceptance and warm release
measurements remain open; do not begin Phase 8.

## Phase outcome
Enforce the frozen hierarchy-plus-exceptions authorization model everywhere, including delegation and explicit deny behavior.

## Authority for this phase
Before implementation, read the packet root documents `00_START_HERE.md` through `06_CHANGE_CONTROL.md`, this phase orchestrator, and each ticket immediately before executing it. The ticket is the bounded unit of work; this file controls order and stop behavior.

Do not reinterpret the full roadmap while executing this phase. If current source conflicts with a frozen decision, use Change Control and stop rather than inventing a compromise.

## Branch
`phase-07-authorization-delegation`

Create it only from the owner-approved previous state.

## Ordered ticket sequence

### P07-T01 — Authorization rule model and deterministic evaluator
- File: `P07-T01-authorization-rule-model-and-evaluator.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P06-GATE approved
- Outcome: Implement the frozen hierarchical-plus-exception permission model in one testable service before wiring it across the application.

### P07-T02 — Server, Payload, and query authorization enforcement
- File: `P07-T02-server-and-payload-enforcement.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P07-T01
- Outcome: Make the evaluator authoritative across all read/write paths so UI hiding is never the security boundary.

### P07-T03 — Department Role defaults and hierarchy
- File: `P07-T03-role-defaults-hierarchy-and-scoped-authority.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P07-T02
- Outcome: Make Department-owned Role hierarchy useful for default access and subordinate assignment without putting Folder scope on RoleAssignments.

### P07-T04 — Folder inheritance, direct grants, and explicit denies
- File: `P07-T04-folder-inheritance-direct-grants-and-explicit-denies.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P07-T03
- Outcome: Complete practical folder/document permission administration including temporary lockout cases.

### P07-T05 — Delegated administration and Role-creation boundaries
- File: `P07-T05-delegated-administration-and-role-creation-boundaries.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P07-T04
- Outcome: Enforce 'cannot delegate more than you possess' and frozen authority to create Roles.

### P07-GATE — Review Gate 7 — authorization and delegated administration
- File: `P07-GATE-review-gate-7.md`
- Mode: REVIEW GATE — NO SELF-APPROVAL
- Depends on:
  - P07-T01
  - P07-T02
  - P07-T03
  - P07-T04
  - P07-T05
- Outcome: Hard security/behavior gate before public surfaces and starter packs multiply configuration.

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
Execute `P07-GATE` last. It is a **human review gate, not an executor approval step**.

After the gate report is produced:
- STOP;
- return the report, screenshots/evidence, test results, and unresolved defects to the owner;
- do not create Phase 8 work;
- proceed only after explicit owner approval or owner-issued patch instructions.
