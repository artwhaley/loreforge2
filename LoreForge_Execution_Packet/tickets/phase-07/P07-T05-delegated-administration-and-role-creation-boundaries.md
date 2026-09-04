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
- Domain Owner/operational Domain admins may create Roles in any Department in their Domain.
- A Character with explicit `manage_roles` authority may create/configure Roles only in the Department covered by that authority.
- Folder managers may manage access beneath their scope if granted, but cannot create Roles; Role creation is not generally delegatable.
- A Role with `assign_subordinates` allows its holder to assign only descendant Roles beneath a Role they hold in the same Department. It does not allow assigning that Role itself, peers, ancestors, or Roles in another Department.

## Required work
1. Implement delegation validator used by every grant/deny/revoke UI/API: grant requires `manage_access` plus possession of the granted capability and scope; deny/revoke requires `manage_access` and scope. Revoke never restores or expands authority.
2. Implement Domain and Department Role-creation authorization exactly as frozen. Keep `manage_roles` (definition/configuration), `assign_roles` (broad assignment), and `assign_subordinates` (strict descendant assignment) as distinct decisions.
3. Implement scope checks for nested folder manager delegating to deeper branch.
4. Implement `assign_subordinates` against the Role ancestry graph. Require the target Role to be a strict descendant of a Role the actor actively holds in the same Department; reject forged peer, self, ancestor, cross-Department, inactive-Role, and cyclic targets.
5. Hydrate the approved People workspace and Department/Role management surfaces so `Roles I can assign` and enabled checkboxes come from the same server decision; Folder controls remain governed separately by `manage_access` and resource authority.
6. Drive the subordinate unlabeled management bar from actual capabilities. Keep primary Home/About/Departments/Records navigation stable, omit redundant `Manage <Domain>` copy, and never add an Administration mode or second Domain selector.

## Likely code touchpoints
- src/lib/authz/delegation.ts
- src/app/**/permissions/**

## Automated acceptance
- Property Records manager can delegate Deeds branch authority but not Historical Records.
- Manager lacking edit cannot grant edit even with manage_access.
- Folder manager cannot create a new Role.
- A Department `manage_roles` holder cannot create a Role in another Department.
- Holding any ordinary Department Role, or merely holding `assign_subordinates`, does not permit Role creation.
- Head Scribe with `assign_subordinates` can assign Assistant Head Scribe or Records Clerk beneath it; Records Clerk with the capability can assign Deputy Clerk only when Deputy Clerk is its descendant.
- The same actors cannot assign themselves another Head Scribe Role, a peer/ancestor, or any Role from another Department.
- Forged API requests fail identically to hidden UI.
- Management-bar destinations and People actions match the evaluator for Domain admin, Department head, scoped Folder manager, ordinary member, and no-active-Character Domain owner fixtures.

## Manual acceptance
- Run Head Scribe -> Property Archivist -> Deeds clerk delegation chain and inspect explanations.
- Attempt every known escalation path from fixture lower-level actor.
- From People, manage Sera's permitted Role checkboxes and separate Folder controls in one workspace; confirm the same actor cannot see or forge Role assignments outside allowed descendants or Folder grants outside separately managed resource scope.

## Guardrails / non-goals
- `Do not interpret 'higher Role' as unlimited Domain authority; Role ancestry governs subordinate assignment and Role defaults, while Folder delegation is evaluated separately.`
- `Do not infer assign_subordinates from manage_access or infer Folder authority from assign_subordinates.`
- `Do not infer manage_roles from rank, Department participation, or assign_subordinates.`
- `Do not allow delegation based on UI visibility alone.`
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- All final authorization/role/folder/delegation mutations must write through the durable audit seam established in P05R-T05. Do not invent a second audit system.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P07-T05.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
