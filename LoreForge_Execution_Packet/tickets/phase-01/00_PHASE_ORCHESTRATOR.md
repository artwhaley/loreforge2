# Phase 1 Orchestrator — Editor, Theme, and Safety Baseline

**Status:** blocked until approved MVP spike baseline is explicitly approved.

## Phase outcome
Accept the document editor and Theme Studio as a safe, pleasant foundation before deeper product modeling.

## Authority for this phase
Before implementation, read the packet root documents `00_START_HERE.md` through `06_CHANGE_CONTROL.md`, this phase orchestrator, and each ticket immediately before executing it. The ticket is the bounded unit of work; this file controls order and stop behavior.

Do not reinterpret the full roadmap while executing this phase. If current source conflicts with a frozen decision, use Change Control and stop rather than inventing a compromise.

## Branch
`phase-01-editor-theme-safety`

Create it only from the owner-approved previous state.

## Ordered ticket sequence

### P01-T01 — Markdown dialect and render safety
- File: `P01-T01-markdown-dialect-and-render-safety.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - Approved previous phase state / spike baseline.
- Outcome: Close the spike's known Markdown injection gap while preserving canonical Markdown as the stored format.

### P01-T02 — Editor save, dirty-state, and navigation UX
- File: `P01-T02-editor-save-dirty-and-navigation-ux.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P01-T01
- Outcome: Make explicit Save trustworthy before lifecycle/versioning complexity.

### P01-T03 — Editor toolbar, Source round-trip, and accessibility
- File: `P01-T03-editor-toolbar-source-roundtrip-and-accessibility.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P01-T02
- Outcome: Tune the actual editing experience while keeping the tested custom Source seam.

### P01-T04 — Theme Studio and Domain-language tuning
- File: `P01-T04-theme-studio-and-domain-language-tuning.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P01-T03
- Outcome: Give the rough spike its first taste/usability pass and remove customer-facing assumptions that every Domain is a modern city.

### P01-GATE — Review Gate 1 — editor/theme foundation
- File: `P01-GATE-review-gate-1.md`
- Mode: REVIEW GATE — NO SELF-APPROVAL
- Depends on:
  - P01-T01
  - P01-T02
  - P01-T03
  - P01-T04
- Outcome: Prove the tuned editor/theme/safety baseline is good enough to build the real product on.

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
Execute `P01-GATE` last. It is a **human review gate, not an executor approval step**.

After the gate report is produced:
- STOP;
- return the report, screenshots/evidence, test results, and unresolved defects to the owner;
- do not create Phase 2 work;
- proceed only after explicit owner approval or owner-issued patch instructions.
