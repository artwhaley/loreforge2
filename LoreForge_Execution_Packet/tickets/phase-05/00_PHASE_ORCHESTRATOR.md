# Phase 5 Orchestrator — Archive Relationships, Tags, Character Links, Copy/Move/Share

**Status:** blocked until P04-GATE owner-approved state is explicitly approved.

## Phase outcome
Add structured Character links, tags, grouped/supersedes relationships, and rigorously distinct Copy, Move, and Share behavior.

## Authority for this phase
Before implementation, read the packet root documents `00_START_HERE.md` through `06_CHANGE_CONTROL.md`, this phase orchestrator, and each ticket immediately before executing it. The ticket is the bounded unit of work; this file controls order and stop behavior.

Do not reinterpret the full roadmap while executing this phase. If current source conflicts with a frozen decision, use Change Control and stop rather than inventing a compromise.

## Branch
`phase-05-document-relations-copy-share`

Create it only from the owner-approved previous state.

## Ordered ticket sequence

### P05-T01 — Prepared-by credits, Concerns links, and Domain tag vocabulary
- File: `P05-T01-character-links-and-domain-tags.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P04-GATE approved
- Outcome: Add typed visible preparation credits, Characters a record concerns, and Domain tags without conflating any of them with provenance actors.

### P05-T02 — Grouped and Supersedes document relationships
- File: `P05-T02-grouped-and-supersedes-relationships.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P05-T01
- Outcome: Implement exactly the two frozen semantic relationship classes with useful history behavior.

### P05-T03 — Document Copy and Move semantics
- File: `P05-T03-document-copy-and-move.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P05-T02
- Outcome: Implement independent copying and canonical moving exactly as frozen, including cross-Domain behavior and provenance.

### P05-T04 — Document sharing and document action UX
- File: `P05-T04-document-sharing-and-action-ux.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P05-T03
- Outcome: Add exceptional same-document sharing without conflating it with Copy, and make the three operations unmistakable in the UI.

### P05-GATE — Review Gate 5 — document graph, copy/move/share
- File: `P05-GATE-review-gate-5.md`
- Mode: REVIEW GATE — NO SELF-APPROVAL
- Depends on:
  - P05-T01
  - P05-T02
  - P05-T03
  - P05-T04
- Outcome: Human validation that document identity, succession, and cross-boundary operations are unambiguous before template automation expands creation volume.

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
Execute `P05-GATE` last. It is a **human review gate, not an executor approval step**.

After the gate report is produced:
- STOP;
- return the report, screenshots/evidence, test results, and unresolved defects to the owner;
- do not create Phase 6 work;
- proceed only after explicit owner approval or owner-issued patch instructions.
