# Phase 3 Orchestrator — Community Domain and Subdomain Structure

**Status:** blocked until P02-GATE owner-approved state is explicitly approved.

## Phase outcome
Replace spike tenant scaffolding with durable Community Domains, Subdomains, memberships, folders, hierarchical Roles, and scoped assignments.

## Authority for this phase
Before implementation, read the packet root documents `00_START_HERE.md` through `06_CHANGE_CONTROL.md`, this phase orchestrator, and each ticket immediately before executing it. The ticket is the bounded unit of work; this file controls order and stop behavior.

Do not reinterpret the full roadmap while executing this phase. If current source conflicts with a frozen decision, use Change Control and stop rather than inventing a compromise.

## Branch
`phase-03-domain-subdomain-structure`

Create it only from the owner-approved previous state.

## Ordered ticket sequence

### P03-T01 — Domain model, single Owner, and operational admins
- File: `P03-T01-domain-model-owner-and-admins.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P02-GATE approved
- Outcome: Replace spike tenant terminology/schema with durable Community Domain and User-level authority.

### P03-T02 — Subdomains, membership, and landing pages
- File: `P03-T02-subdomains-memberships-and-landing.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P03-T01
- Outcome: Represent Scribes/Warriors/Magistrates as delegated organizational boundaries, not nested tenants.

### P03-T03 — Domain root, Subdomain folder branches, and navigation
- File: `P03-T03-domain-root-subdomain-folders-and-navigation.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P03-T02
- Outcome: Make every Document location explicit and prepare folder branches for later delegation.

### P03-T04 — Role hierarchy and scoped assignments
- File: `P03-T04-role-hierarchy-and-scoped-assignments.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P03-T03
- Outcome: Create institutional Roles and scoped Captains without building the full ACL engine yet.

### P03-GATE — Review Gate 3 — institutional structure and navigation
- File: `P03-GATE-review-gate-3.md`
- Mode: REVIEW GATE — NO SELF-APPROVAL
- Depends on:
  - P03-T01
  - P03-T02
  - P03-T03
  - P03-T04
- Outcome: Ensure Domain -> Subdomain -> Folder -> Role feels like an RP institution, not a tree-management database.

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
Execute `P03-GATE` last. It is a **human review gate, not an executor approval step**.

After the gate report is produced:
- STOP;
- return the report, screenshots/evidence, test results, and unresolved defects to the owner;
- do not create Phase 4 work;
- proceed only after explicit owner approval or owner-issued patch instructions.
