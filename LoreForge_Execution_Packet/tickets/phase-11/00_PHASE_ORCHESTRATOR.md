# Phase 11 Orchestrator — Platform Administration and Domain Lifecycle

**Status:** blocked until P10-GATE owner-approved state is explicitly approved.

## Phase outcome
Build the platform-owner operational dashboard, single-owner Domain lifecycle controls, global Character merge queue, and operational/commercial seams.

## Authority for this phase
Before implementation, read the packet root documents `00_START_HERE.md` through `06_CHANGE_CONTROL.md`, this phase orchestrator, and each ticket immediately before executing it. The ticket is the bounded unit of work; this file controls order and stop behavior.

Do not reinterpret the full roadmap while executing this phase. If current source conflicts with a frozen decision, use Change Control and stop rather than inventing a compromise.

## Branch
`phase-11-platform-admin-lifecycle`

Create it only from the owner-approved previous state.

## Ordered ticket sequence

### P11-T01 — Platform Admin authority and operational dashboard
- File: `P11-T01-platform-admin-dashboard.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P10-GATE approved
- Outcome: Build the separate superuser surface the platform owner needs to see and manage all Domains with useful visualization.

### P11-T02 — Single-owner transfer and Community Domain lifecycle states
- File: `P11-T02-ownership-transfer-and-domain-lifecycle.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P11-T01
- Outcome: Implement final authority and non-destructive subscription/closure states without prematurely choosing billing economics.

### P11-T03 — Platform-admin global Character merge queue
- File: `P11-T03-global-character-merge-queue.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P11-T02
- Outcome: Resolve true global duplicates safely while preserving Domain-local correction capability and history.

### P11-T04 — Operator jobs/errors and commercial entitlement seams
- File: `P11-T04-operator-jobs-errors-and-commercial-seams.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P11-T03
- Outcome: Finish platform operations and define billing/entitlement boundary without letting an executor invent pricing or payment provider.

### P11-GATE — Review Gate 11 — platform operations and commercial boundary
- File: `P11-GATE-review-gate-11.md`
- Mode: REVIEW GATE — NO SELF-APPROVAL
- Depends on:
  - P11-T01
  - P11-T02
  - P11-T03
  - P11-T04
- Outcome: Validate owner authority, platform administration, non-destructive lifecycle, and provider-neutral entitlement seam.

## Owner-only decision gates
- Billing is not selected or implemented here. `owner-gates/P11_BILLING_DECISIONS.md` remains owner-only and is used only if/when billing work is separately authorized.

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
Execute `P11-GATE` last. It is a **human review gate, not an executor approval step**.

After the gate report is produced:
- STOP;
- return the report, screenshots/evidence, test results, and unresolved defects to the owner;
- do not create Phase 12 work;
- proceed only after explicit owner approval or owner-issued patch instructions.
