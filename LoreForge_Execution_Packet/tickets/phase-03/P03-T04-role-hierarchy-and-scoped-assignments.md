# P03-T04 — Role hierarchy and scoped assignments

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 3  
**Commit prefix:** `P03-T04:`

## Objective
Create institutional Roles and scoped Captains without building the full ACL engine yet.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-03/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P03-T03

## Frozen context for this ticket
- Role parent = immediate superior.
- Hierarchy acyclic.
- Character can hold multiple Roles.
- Assignment can scope to Folder branch.

## Required work
1. Add Roles/RoleAssignments per contract.
2. Validate Domain/Subdomain ownership and acyclic hierarchy.
3. Build customer role hierarchy/assignment UI through `authorizeInterimOperation`; only Community Domain ownerUser/operational DomainAdmins may manage Roles or assignments before P07, and every change is audited.
4. Display scopeFolder clearly; use same Captain Role for both platoons.
5. Seed Scribe/Warrior/Magistrate trees and multi-role Aren.

## Likely code touchpoints
- `src/collections/Roles.ts`
- `src/collections/RoleAssignments.ts`

## Automated acceptance
- Cycle rejected.
- Scoped folder valid for Role context.
- Multi-role assignment valid.
- Ordinary Domain member and forged API request cannot create/assign a Role through the interim path.

## Manual acceptance
- Assign Rarius/Tarl same Captain Role to different platoon branches and inspect UI.

## Guardrails / non-goals
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P03-T04.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
