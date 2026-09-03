# Phase 6 Orchestrator — Templates and Form Studio

**Status:** blocked until P05-GATE owner-approved state is explicitly approved.

## Phase outcome
Replace the spike form-authoring dependency as the business model with LoreForge Templates, neutral form schema, Form Studio, and Markdown generation.

## Authority for this phase
Before implementation, read the packet root documents `00_START_HERE.md` through `06_CHANGE_CONTROL.md`, this phase orchestrator, and each ticket immediately before executing it. The ticket is the bounded unit of work; this file controls order and stop behavior.

Do not reinterpret the full roadmap while executing this phase. If current source conflicts with a frozen decision, use Change Control and stop rather than inventing a compromise.

## Branch
`phase-06-template-form-studio`

Create it only from the owner-approved previous state.

## Ordered ticket sequence

### P06-T01 — Template model, inheritance scope, and base composition
- File: `P06-T01-template-model-scope-and-composition.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P05-GATE approved
- Outcome: Create a reusable template system that supports Domain/Subdomain/folder availability and letterhead-style composition without a page-builder.

### P06-T02 — Neutral form schema and Payload Form Builder migration seam
- File: `P06-T02-neutral-form-schema-and-payload-migration.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P06-T01
- Outcome: Replace plugin-specific form definitions as business data with LoreForge's frozen neutral form schema while preserving the spike's proven form-to-Markdown path.

### P06-T03 — Customer-facing Form Studio
- File: `P06-T03-customer-form-studio.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P06-T02
- Outcome: Build the Head-Scribe-friendly form-template authoring surface instead of exposing Payload's CMS-oriented Form Builder admin UI.

### P06-T04 — Form-driven Document creation
- File: `P06-T04-form-document-creation.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P06-T03
- Outcome: Complete form-first authoring so a filer fills a friendly form and receives an ordinary canonical Markdown Document with structural Character links.

### P06-GATE — Review Gate 6 — templates and forms
- File: `P06-GATE-review-gate-6.md`
- Mode: REVIEW GATE — NO SELF-APPROVAL
- Depends on:
  - P06-T01
  - P06-T02
  - P06-T03
  - P06-T04
- Outcome: Human UX gate for the authoring shortcut most likely to determine whether nontechnical roleplayers can use LoreForge.

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
Execute `P06-GATE` last. It is a **human review gate, not an executor approval step**.

After the gate report is produced:
- STOP;
- return the report, screenshots/evidence, test results, and unresolved defects to the owner;
- do not create Phase 7 work;
- proceed only after explicit owner approval or owner-issued patch instructions.
