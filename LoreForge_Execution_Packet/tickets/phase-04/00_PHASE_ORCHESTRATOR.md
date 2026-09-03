# Phase 4 Orchestrator — User-first Shell, Document Types, Lifecycle, Revisions, and Provenance

**Status:** eligible from the owner-approved P03-GATE state; execute the UX foundation sequence first.

## Phase outcome
Replace the diagnostic/database-shaped customer shell with the approved user-first LoreForge workflow, then make Documents typed, lifecycle-aware, fully versioned, provenance-bearing records with review/approval/locking semantics.

## Authority for this phase
Before implementation, read the packet root documents `00_START_HERE.md` through `06_CHANGE_CONTROL.md`, this phase orchestrator, and each ticket immediately before executing it. The ticket is the bounded unit of work; this file controls order and stop behavior.

Do not reinterpret the full roadmap while executing this phase. If current source conflicts with a frozen decision, use Change Control and stop rather than inventing a compromise.

## Branch
`phase-04-user-first-shell-document-lifecycle`

Create it only from the owner-approved previous state.

## Ordered ticket sequence

### P04-T00 — LoreForge home, customer login, and User dashboard
- File: `P04-T00-loreforge-home-login-and-user-dashboard.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P03-GATE approved
- Outcome: Replace the diagnostic root and Payload-admin customer entry with deliberate signed-out and signed-in LoreForge platform surfaces.

### P04-T05 — Single-Domain context and customer navigation
- File: `P04-T05-single-domain-context-and-customer-navigation.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P04-T00
- Outcome: Remove Administration mode and establish the one-Domain, optional-Character, stable primary/conditional-management navigation contract.

### P04-T06 — Department, People, and Record-entry workflow shells
- File: `P04-T06-department-people-and-record-entry-shells.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P04-T05
- Outcome: Reorganize Phase 3 machinery around Departments, Character-centered People management, and full-page Document creation.

### P04-T01 — Document Types, Plain Text baseline, and lifecycle policy
- File: `P04-T01-document-types-plain-text-and-lifecycle-policy.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P04-T06
- Outcome: Replace the spike's untyped document assumption with the required Type model and deterministic filing/review policy.

### P04-T02 — Payload Versions and lifecycle edit guards
- File: `P04-T02-payload-versions-and-edit-guards.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P04-T01
- Outcome: Turn document revision history into a durable invariant while enforcing editability from lifecycle state.

### P04-T03 — Document provenance events and unified history timeline
- File: `P04-T03-document-provenance-and-history-timeline.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P04-T02
- Outcome: Create the authoritative per-Document provenance record and user-facing timeline for meaningful state changes.

### P04-T04 — Review, approval/rejection, locking, and soft delete
- File: `P04-T04-review-approval-locking-and-soft-delete.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P04-T03
- Outcome: Complete the first usable archive lifecycle without conflating approval, locking, and deletion.

### P04-GATE — Review Gate 4 — user-first shell and durable document core
- File: `P04-GATE-review-gate-4.md`
- Mode: REVIEW GATE — NO SELF-APPROVAL
- Depends on:
  - P04-T00
  - P04-T05
  - P04-T06
  - P04-T01
  - P04-T02
  - P04-T03
  - P04-T04
- Outcome: Human review of the approved customer shell/workflows and durable Document/Type/lifecycle/version/provenance foundation before relationships and templates build on it.

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
Execute `P04-GATE` last. It is a **human review gate, not an executor approval step**.

After the gate report is produced:
- STOP;
- return the report, screenshots/evidence, test results, and unresolved defects to the owner;
- do not create Phase 5 work;
- proceed only after explicit owner approval or owner-issued patch instructions.
