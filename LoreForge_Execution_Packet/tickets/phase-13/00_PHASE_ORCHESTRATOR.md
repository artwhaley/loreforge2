# Phase 13 Orchestrator — Activity, Notifications, and Watches

**Status:** blocked until P12-GATE owner-approved state is explicitly approved.

## Phase outcome
Add administrator-authored Domain notices, then project authoritative events into activity, notifications, folder/document watches, and optional email delivery.

## Authority for this phase
Before implementation, read the packet root documents `00_START_HERE.md` through `06_CHANGE_CONTROL.md`, this phase orchestrator, and each ticket immediately before executing it. The ticket is the bounded unit of work; this file controls order and stop behavior.

Do not reinterpret the full roadmap while executing this phase. If current source conflicts with a frozen decision, use Change Control and stop rather than inventing a compromise.

## Branch
`phase-13-notifications-watches`

Create it only from the owner-approved previous state.

## Ordered ticket sequence

### P13-T00 — Domain notices for member and public dashboards
- File: `P13-T00-domain-notices.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P12-GATE approved
- Outcome: Add administrator-authored Domain notices as a distinct dashboard/feed source without conflating them with audit, notifications, or correspondence.

### P13-T01 — Domain/Department activity feed projections
- File: `P13-T01-activity-feed-projections.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P13-T00
- Outcome: Create human-friendly Domain/Department activity views from authoritative provenance/audit events without turning feed entries into a second truth source.

### P13-T02 — In-app notifications and preference model
- File: `P13-T02-in-app-notifications-and-preferences.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P13-T00
  - P13-T01
- Outcome: Add durable user notification inbox with explicit event eligibility, separate from correspondence.

### P13-T03 — Document and Folder watches
- File: `P13-T03-document-and-folder-watches.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P13-T02
- Outcome: Implement the intentionally narrow subscription model for changes users explicitly care about.

### P13-T04 — Email notification delivery channel
- File: `P13-T04-email-notification-channel.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P13-T03
- Outcome: Add email as an optional transport for Notifications without coupling product semantics to a particular mail provider.

### P13-GATE — Review Gate 13 — activity and notifications
- File: `P13-GATE-review-gate-13.md`
- Mode: REVIEW GATE — NO SELF-APPROVAL
- Depends on:
  - P13-T00
  - P13-T01
  - P13-T02
  - P13-T03
  - P13-T04
- Outcome: Validate event projections, watches, and notification delivery without conflating audit, activity, notification, and correspondence.

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
Execute `P13-GATE` last. It is a **human review gate, not an executor approval step**.

After the gate report is produced:
- STOP;
- return the report, screenshots/evidence, test results, and unresolved defects to the owner;
- do not create Phase 14 work;
- proceed only after explicit owner approval or owner-issued patch instructions.
