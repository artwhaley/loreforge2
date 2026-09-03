# P07-T03 — Role defaults, hierarchy, and scoped authority

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 7  
**Commit prefix:** `P07-T03:`

## Objective
Make rigid Role hierarchy useful for default access while preserving scoped assignments such as Captains controlling different platoons.

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
- A Character may hold multiple Roles across one or more Subdomains; effective access unions allowed paths subject to denies.
- Role parent is immediate superior; senior Role inherits subordinate Role permission grants.
- RoleAssignment may be scoped to a Folder/resource branch; same Role title can therefore govern different branches.
- Role hierarchy itself does not prohibit direct cross-hierarchy access grants.

## Required work
1. Build Role editor for Domain/Subdomain authorized heads with parent-role selection constrained to same scope and cycle prevention.
2. Build RoleAssignment UI assigning Character + Role + optional scopeFolder constrained to relevant Subdomain/Domain. Hydrate People -> Character -> Roles as the primary one-person assignment flow; keep Role-centered assignment as a secondary bulk/definition workflow.
3. Allow defining default PermissionRules on Roles through same rule model.
4. Show effective/scoped role labels in member roster and permission explanation.
5. Seed fixture Warrior hierarchy Commander > Captain > Warrior and Scribe hierarchy.

## Likely code touchpoints
- src/app/**/roles/**
- src/lib/authz/roles.ts

## Automated acceptance
- Role cycle rejected.
- Commander inherits Captain/Warrior Role grants; Captain assignment scoped First Platoon does not grant Second Platoon folder authority.
- Character with Warrior + Magistrate Role receives both independent allowed privileges.
- Removing RoleAssignment removes inherited Role rules but leaves direct grants intact.

## Manual acceptance
- Demonstrate two Captains with identical Role but different scopeFolder and visibly different folder authority.
- Give a Warrior a Magistrate Role and verify both role sets without switching accounts.

## Guardrails / non-goals
- `Do not make Role names globally unique; uniqueness is within owning scope as specified.`
- `Do not infer Subdomain membership solely from Role assignment.`
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
- `execution-notes/P07-T03.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
