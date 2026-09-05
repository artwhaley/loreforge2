# Phase 8 Orchestrator — Theme Productization, Public Surfaces, and Starter Packs

**Status:** blocked until P07-GATE owner-approved state is explicitly approved.

## Phase outcome
Productize branding/vocabulary, public/member surfaces, and first-party copy-on-install starter packs.

## Authority for this phase
Before implementation, read the packet root documents `00_START_HERE.md` through `06_CHANGE_CONTROL.md`, this phase orchestrator, and each ticket immediately before executing it. The ticket is the bounded unit of work; this file controls order and stop behavior.

Do not reinterpret the full roadmap while executing this phase. If current source conflicts with a frozen decision, use Change Control and stop rather than inventing a compromise.

## Branch
`phase-08-branding-public-starter-packs`

Create it only from the owner-approved previous state.

## Ordered ticket sequence

### P08-T01 — Theme Studio productization and controlled vocabulary
- File: `P08-T01-theme-studio-productization-and-vocabulary.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P07-GATE approved
- Outcome: Turn the spike Theme Studio into a deliberate, safe personalization feature and add vocabulary theming without building a general CMS/localization system.

### P08-T02 — Public Domain, member Domain Home, and Department surfaces
- File: `P08-T02-public-and-member-domain-surfaces.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P08-T01
- Outcome: Hydrate and polish the approved public/User/Domain/Department surfaces without replacing their user-first information architecture.

### P08-T03 — Starter Pack schema, copy-on-install installer, and Gorean City pack
- File: `P08-T03-starter-pack-schema-installer-and-gorean-pack.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P08-T02
- Outcome: Create first-party Domain seeding as ordinary copied configuration, with Gorean City as the initial real starter pack.

### P08-T04 — Contrasting Modern City pack and public Character pages
- File: `P08-T04-modern-pack-and-public-character-pages.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P08-T03
- Outcome: Prove genericity with a second first-party vocabulary/theme seed and complete public Character presentation/claim-safe visibility.

### P08-GATE — Review Gate 8 — product identity, public/member UX, starter packs
- File: `P08-GATE-review-gate-8.md`
- Mode: REVIEW GATE — NO SELF-APPROVAL
- Depends on:
  - P08-T01
  - P08-T02
  - P08-T03
  - P08-T04
- Outcome: Human product/UX gate proving LoreForge feels like a branded RP archive rather than a generic CMS.

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
Execute `P08-GATE` last. It is a **human review gate, not an executor approval step**.

After the gate report is produced:
- STOP;
- return the report, screenshots/evidence, test results, and unresolved defects to the owner;
- do not create Phase 9 work;
- proceed only after explicit owner approval or owner-issued patch instructions.
