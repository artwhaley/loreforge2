# Phase 14 Orchestrator — Correspondence

**Status:** blocked until P13-GATE owner-approved state is explicitly approved.

## Phase outcome
Add Character-to-Character correspondence, optional GM moderation, garbling/interception, delayed delivery, and filing into the archive.

## Authority for this phase
Before implementation, read the packet root documents `00_START_HERE.md` through `06_CHANGE_CONTROL.md`, this phase orchestrator, and each ticket immediately before executing it. The ticket is the bounded unit of work; this file controls order and stop behavior.

Do not reinterpret the full roadmap while executing this phase. If current source conflicts with a frozen decision, use Change Control and stop rather than inventing a compromise.

## Branch
`phase-14-correspondence`

Create it only from the owner-approved previous state.

## Ordered ticket sequence

### P14-T01 — Character-to-Character correspondence and immediate delivery
- File: `P14-T01-correspondence-model-and-immediate-delivery.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P13-GATE approved
- Outcome: Add formal RP correspondence as a first-class system separate from Documents and Notifications.

### P14-T02 — Optional moderated correspondence policy and GM queue
- File: `P14-T02-moderated-correspondence-policy-and-gm-queue.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P14-T01
- Outcome: Implement the politics-heavy RP mode where a GM decides whether/when/how a dispatched message arrives.

### P14-T03 — Modified delivery, interception/failure, and immutable correspondence history
- File: `P14-T03-garble-intercept-fail-and-history.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P14-T02
- Outcome: Support GM-mediated roleplay outcomes while retaining an authoritative original for administrators.

### P14-T04 — Delayed correspondence delivery timing
- File: `P14-T04-delayed-delivery-timing-and-worker.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P14-T03
- Outcome: Implement actual server-held delayed delivery using original send time semantics and the existing worker.

### P14-T05 — File correspondence into archive and integrate notifications
- File: `P14-T05-file-correspondence-into-archive.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P14-T04
- Outcome: Allow authorized roleplayers to intentionally preserve a correspondence record as a normal Document without collapsing the two systems.

### P14-GATE — Review Gate 14 — correspondence
- File: `P14-GATE-review-gate-14.md`
- Mode: REVIEW GATE — NO SELF-APPROVAL
- Depends on:
  - P14-T01
  - P14-T02
  - P14-T03
  - P14-T04
  - P14-T05
- Outcome: Human roleplay-behavior gate for immediate and GM-mediated correspondence before Second Life integration.

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
Execute `P14-GATE` last. It is a **human review gate, not an executor approval step**.

After the gate report is produced:
- STOP;
- return the report, screenshots/evidence, test results, and unresolved defects to the owner;
- do not create Phase 15 work;
- proceed only after explicit owner approval or owner-issued patch instructions.
