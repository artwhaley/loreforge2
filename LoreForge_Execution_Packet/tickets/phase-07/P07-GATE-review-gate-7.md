# P07-GATE — Review Gate 7 — authorization and delegated administration

**Mode:** REVIEW GATE — NO SELF-APPROVAL  
**Phase:** 7  
**Commit prefix:** `P07-GATE:`

## Objective
Hard security/behavior gate before public surfaces and starter packs multiply configuration.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-07/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P07-T01
- P07-T02
- P07-T03
- P07-T04
- P07-T05

## Frozen context for this ticket
- The goal is understandable RP administration, not bank-grade complexity, but no known privilege-escalation or tenant leak is acceptable.

## Required work
1. Run exhaustive permission matrix and integration/API tests.
2. Execute golden scenarios for Commander/Captains/Warrior, cross-hierarchy grant, explicit deny, multi-role Character, and delegation chain.
3. Produce permission explanation outputs for each fixture actor and compare the People Access tree with the equivalent Folder-centered permissions view.
4. Have reviewer attempt direct URL/API bypass and scope escalation.

## Likely code touchpoints
- Inspect current adjacent files; do not broaden scope.

## Automated acceptance

- Full permission matrix and direct REST/local API/server-action suite passes for precedence, scope, deny, delegation, `manage_claims`, and lifecycle gates.
- No legacy User Membership, interim helper, or temporary Share adapter remains capable of granting access.


## Manual acceptance
- All authorization tests green.
- No tenant leak.
- No lower actor can grant more authority/scope than possessed.
- Direct Document share and explicit deny follow frozen precedence.
- A head can select one Character in People, manage Departments/Roles/scoped access, and understand Can view/edit/manage without navigating separate collection tables.
- Management navigation is capability-driven while the primary Domain navigation remains stable; no Administration mode returns.

## Guardrails / non-goals
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.
- Owner/reviewer approves permission-management UX and confirms hierarchy remains convenient rather than mandatory for exceptions.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P07-GATE.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- STOP and return the review-gate report to the owner. Do not begin the next phase.
