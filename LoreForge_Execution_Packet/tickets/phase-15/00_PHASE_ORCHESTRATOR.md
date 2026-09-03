# Phase 15 Orchestrator — Second Life Bridge

**Status:** blocked until P14-GATE owner-approved state is explicitly approved.

## Phase outcome
Design and owner-approve the external Second Life bridge protocol first, then implement the isolated service and location/notecard/resource workflows.

## Authority for this phase
Before implementation, read the packet root documents `00_START_HERE.md` through `06_CHANGE_CONTROL.md`, this phase orchestrator, and each ticket immediately before executing it. The ticket is the bounded unit of work; this file controls order and stop behavior.

Do not reinterpret the full roadmap while executing this phase. If current source conflicts with a frozen decision, use Change Control and stop rather than inventing a compromise.

## Branch
`phase-15-second-life-bridge`

Create it only from the owner-approved previous state.

## Ordered ticket sequence

### P15-T00 — Second Life bridge protocol design packet
- File: `P15-T00-sl-bridge-protocol-design.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P14-GATE approved
- Outcome: Freeze the core<->bridge API and identity/location/notecard transfer contracts before any LibreMetaverse process is written.

### P15-T01 — Separate Second Life bridge service skeleton
- File: `P15-T01-sl-bridge-service-skeleton.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P15-T00
  - OWNER GATE P15 approved
- Outcome: Create the approved separately deployable bridge process with authentication, health, idempotent job handling, and no product authorization logic.

### P15-T02 — One-to-one Second Life identity verification
- File: `P15-T02-sl-identity-verification.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P15-T01
- Outcome: Link one LoreForge User to at most one verified SL avatar using the owner-approved bridge mechanism.

### P15-T03 — SL location restrictions with action-start semantics
- File: `P15-T03-sl-location-restrictions.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P15-T02
- Outcome: Apply optional Domain/Subdomain/Folder Second Life presence requirements without creating an annoying continuous policing system.

### P15-T04 — Second Life notecard import/export with provenance round-trip
- File: `P15-T04-sl-notecard-import-export-and-provenance.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P15-T03
- Outcome: Connect canonical Markdown Documents to SL notecards through the bridge while retaining chain-of-custody-style RP provenance.

### P15-T05 — In-world resource links and authorized bot delivery
- File: `P15-T05-inworld-resource-links-and-authorized-delivery.md`
- Mode: IMPLEMENTATION TICKET
- Depends on:
  - P15-T04
- Outcome: Support stable LoreForge references from SL objects such as filing cabinets while ensuring core authorization precedes any notecard delivery.

### P15-GATE — Review Gate 15 — Second Life integration
- File: `P15-GATE-review-gate-15.md`
- Mode: REVIEW GATE — NO SELF-APPROVAL
- Depends on:
  - P15-T00
  - P15-T01
  - P15-T02
  - P15-T03
  - P15-T04
  - P15-T05
- Outcome: Final human/domain-expert gate for the separate bridge, one-to-one avatar identity, location semantics, and notecard provenance.

## Owner-only decision gates
- P15-T00 is design-only. After it, stop for `owner-gates/P15_SL_PROTOCOL_APPROVAL.md`; P15-T01+ are forbidden before approval.

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
Execute `P15-GATE` last. It is a **human review gate, not an executor approval step**.

After the gate report is produced:
- STOP;
- return the report, screenshots/evidence, test results, and unresolved defects to the owner;
- do not create Phase post-release work;
- proceed only after explicit owner approval or owner-issued patch instructions.
