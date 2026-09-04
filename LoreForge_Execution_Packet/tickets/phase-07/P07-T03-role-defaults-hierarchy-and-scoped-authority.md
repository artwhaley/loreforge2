# P07-T03 — Department Role defaults and hierarchy

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 7  
**Commit prefix:** `P07-T03:`

## Objective
Make Department-owned Role hierarchy useful for default access and subordinate assignment without coupling an individual RoleAssignment to any Folder.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-07/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P07-T02

## Frozen context for this ticket
- Every Role belongs to one Department. A Character may hold multiple Roles across one or more Departments; those Roles derive Department participation and their effective access unions allowed paths subject to denies.
- Role parent is immediate superior; senior Role inherits subordinate Role permission grants.
- RoleAssignment is only Character + Role and has no Folder/resource scope.
- Role hierarchy itself does not prohibit direct cross-hierarchy access grants.

## Required work
1. Build Role editor for authorized Domain administrators and Department Role managers with Department required, parent-role selection constrained to the same Department, and cycle prevention.
2. Hydrate People -> Character -> Roles as the primary one-person assignment flow using the approved searchable Department/Role checkbox tree. Populate `Held roles` and `Roles I can assign` from server decisions; keep Role-centered assignment as a secondary bulk/definition workflow. No request or record may contain a Folder.
3. Allow defining default PermissionRules on Roles through same rule model.
4. Show Role-derived Department participation and effective Role defaults in member roster and permission explanations without presenting them as direct Folder grants.
5. Seed distinct Department Roles where jobs differ by responsibility: Warrior hierarchy includes Commander with First Captain and Second Captain branches rather than reusing one Folder-scoped Captain assignment; seed the Scribe hierarchy with named records roles.

## Likely code touchpoints
- src/app/**/roles/**
- src/lib/authz/roles.ts

## Automated acceptance
- Role cycle rejected.
- Commander inherits subordinate Role grants; First Captain and Second Captain receive only their Role definitions' respective default rules, with no assignment scope.
- Character with Warrior + Magistrate Role receives both independent allowed privileges.
- Removing RoleAssignment removes inherited Role rules but leaves direct grants intact.
- Removing a Character's last Role in a Department removes that Department from their derived participation; no Department membership row is written.

## Manual acceptance
- Assign and remove First Captain and Second Captain from the People Role tree and verify the Department and defaults follow the Roles without any Folder field on the assignment.
- Give a Warrior a Magistrate Role and verify both role sets without switching accounts.

## Guardrails / non-goals
- `Do not make Role names globally unique; uniqueness is within owning scope as specified.`
- `Do not create or consult a separate SubdomainMembership; Department participation is derived from active Roles.`
- `Do not put Folder controls, Folder IDs, or resource scope in the Role-assignment UI or mutation.`
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- All final authorization/role/folder/delegation mutations must write through the durable audit seam established in P05R-T05 (DEF-AUDIT-01). Do not invent a second audit system.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P07-T03.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
