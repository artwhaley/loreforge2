# P03-T02 — Subdomains, membership, and landing pages

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 3  
**Commit prefix:** `P03-T02:`

## Objective
Represent Scribes/Warriors/Magistrates as delegated organizational boundaries, not nested tenants.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-03/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P03-T01

## Frozen context for this ticket
- Subdomains share Domain identity.
- Membership is Character-level.
- Heads/admins are Characters.
- Until P07's evaluator is authoritative, Domain Owner and operational DomainAdmins are the only interim actors who may edit Domain or Subdomain memberships. This is an interim authorization seam, not a product Role.

## Required work
1. Add Subdomains and SubdomainMemberships plus Character head/admin assignments.
2. Build app-owned Subdomain landing page with folder/template placeholders, recent placeholder, admin actions.
3. Build an app-owned Domain member dashboard/roster that makes the relationship explicit: list Characters as members, show Domain-local alias separately from global Character name, show the controlling User as a separate account field, and keep Role/RoleAssignment data in a separate column/section.
4. Add clear add/remove membership actions for the interim actors above (use the contracted active/inactive state for DomainMemberships and the contracted row lifecycle for SubdomainMemberships). Every mutation must use `authorizeInterimOperation`, be server-validated, audited, and leave Subdomain membership independent from Domain membership and Role assignment.
5. Add Subdomain navigation to member dashboard.
6. Seed Ar Scribes/Warriors/Magistrates and memberships.
7. Do not add Subdomain theme/DNS/billing/recursive parent.

## Likely code touchpoints
- `src/collections/Subdomains.ts`
- `src/collections/SubdomainMemberships.ts`
- `src/app/(frontend)/domain/[slug]/subdomains/*`

## Automated acceptance
- Membership unique.
- No recursive Subdomain.
- Subdomain stays in one Domain.
- Domain member roster and membership mutations distinguish Character, controlling User, local alias, Subdomain membership, and Role assignment; ordinary members and forged requests cannot edit memberships.

## Manual acceptance
- Act as Head Scribe, Commander, Magistrate, Warrior and compare Subdomain navigation.
- As the Domain Owner, add and remove a Character's Domain/Subdomain membership and verify the context bar and roster update without creating, removing, or changing a Role.

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
- `execution-notes/P03-T02.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
