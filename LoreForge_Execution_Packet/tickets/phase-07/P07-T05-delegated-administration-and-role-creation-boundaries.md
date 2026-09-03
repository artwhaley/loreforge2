# P07-T05 — Delegated administration and Role-creation boundaries

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 7  
**Commit prefix:** `P07-T05:`

## Objective
Enforce 'cannot delegate more than you possess' and frozen authority to create Roles.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-07/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P07-T04

## Frozen context for this ticket
- Actor may grant action X only if actor has manage_access over target scope AND currently possesses X over that scope.
- Actor cannot delegate outside their own administrative/resource scope.
- Domain Owner/operational Domain admins may create Domain Roles.
- Subdomain heads and explicitly assigned Subdomain administrators may create Roles owned by their Subdomain.
- Folder managers may manage access beneath their scope if granted, but cannot create Roles; Role creation is not generally delegatable.

## Required work
1. Implement delegation validator used by every grant/deny/revoke UI/API: grant requires `manage_access` plus possession of the granted capability and scope; deny/revoke requires `manage_access` and scope. Revoke never restores or expands authority.
2. Implement Domain and Subdomain Role-creation authorization exactly as frozen.
3. Implement scope checks for nested folder manager delegating to deeper branch.
4. Prevent actor from granting access beyond their own RoleAssignment scope even when UI request is forged.
5. Hydrate the approved People workspace and Department/Role management surfaces so they offer only actions/principals/resources the actor may validly manage; server remains authoritative.
6. Drive the subordinate `Manage <Domain>` bar from actual capabilities. Keep primary Home/About/Departments/Records navigation stable and never add an Administration mode or second Domain selector.

## Likely code touchpoints
- src/lib/authz/delegation.ts
- src/app/**/permissions/**

## Automated acceptance
- Property Records manager can delegate Deeds branch authority but not Historical Records.
- Manager lacking edit cannot grant edit even with manage_access.
- Folder manager cannot create a new Role.
- Subdomain head cannot create Role in another Subdomain.
- Explicit Subdomain admin can create a Role only in that Subdomain; a mere Subdomain member cannot.
- Forged API requests fail identically to hidden UI.
- Management-bar destinations and People actions match the evaluator for Domain admin, Department head, scoped Folder manager, ordinary member, and no-active-Character Domain owner fixtures.

## Manual acceptance
- Run Head Scribe -> Property Archivist -> Deeds clerk delegation chain and inspect explanations.
- Attempt every known escalation path from fixture lower-level actor.
- From People, manage Sera's permitted Department/Role/Folder authority in one workflow and confirm the same actor cannot see or forge controls outside the Scribes branch.

## Guardrails / non-goals
- `Do not interpret 'higher Role' as unlimited Domain authority; resource scope still applies.`
- `Do not allow delegation based on UI visibility alone.`
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
- `execution-notes/P07-T05.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
