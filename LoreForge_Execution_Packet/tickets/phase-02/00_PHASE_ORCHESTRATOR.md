# Phase 2 Orchestrator — User, Character, and Active Context

**Status:** blocked until P01-GATE owner-approved state is explicitly approved.

## Phase outcome
Introduce the global Character model, active Character context, claims, and Domain-local identity context without Second Life verification. Establish the paired top-level `Domain` / `Acting as` context bar without conflating membership, Roles, or User-level administration.

## Authority for this phase
Before implementation, read the packet root documents `00_START_HERE.md` through `06_CHANGE_CONTROL.md`, this phase orchestrator, and each ticket immediately before executing it. The ticket is the bounded unit of work; this file controls order and stop behavior.

Do not reinterpret the full roadmap while executing this phase. If current source conflicts with a frozen decision, use Change Control and stop rather than inventing a compromise.

## Branch
`phase-02-character-context`

Create it only from the owner-approved previous state.

## Ordered ticket sequence

### P02-T01 — User SL placeholder and global Character model
- File: `P02-T01-user-sl-placeholder-and-character-model.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P01-GATE approved
- Outcome: Introduce the real User/Character distinction without implementing SL verification.

### P02-T02 — Active Character and Domain operating context
- File: `P02-T02-active-character-domain-context.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P02-T01
- Outcome: Make acting identity explicit so later authorization cannot accidentally use User as RP principal.

### P02-T03 — Character Domain membership and local context
- File: `P02-T03-character-domain-membership-and-local-context.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P02-T02
- Outcome: Move participation from spike User Memberships to explicit Character memberships.

### P02-T04 — Character claims, public profiles, and local alias correction
- File: `P02-T04-character-claims-public-profiles-and-local-aliasing.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P02-T03
- Outcome: Complete initial Character identity workflows without Domain-level global destructive merge.

### P02-GATE — Review Gate 2 — Character-centric identity
- File: `P02-GATE-review-gate-2.md`
- Mode: REVIEW GATE — NO SELF-APPROVAL
- Depends on:
  - P02-T01
  - P02-T02
  - P02-T03
  - P02-T04
- Outcome: Verify acting as Characters feels natural rather than like User memberships with RP labels.

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
Execute `P02-GATE` last. It is a **human review gate, not an executor approval step**.

After the gate report is produced:
- STOP;
- return the report, screenshots/evidence, test results, and unresolved defects to the owner;
- do not create Phase 3 work;
- proceed only after explicit owner approval or owner-issued patch instructions.
