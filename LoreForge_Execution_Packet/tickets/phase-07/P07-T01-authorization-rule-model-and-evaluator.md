# P07-T01 — Authorization rule model and deterministic evaluator

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 7  
**Commit prefix:** `P07-T01:`

## Objective
Implement the frozen hierarchical-plus-exception permission model in one testable service before wiring it across the application.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-07/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P06-GATE approved

## Frozen context for this ticket
- Roles are hierarchical conveniences/defaults; access is not limited to hierarchy.
- Direct User/Character grants and explicit denies are required.
- Frozen precedence from Architecture Contract is authoritative.
- Permission evaluation is Domain-bound; SL conditions are additive later, not part of this evaluator.
- Personal Domain policy is added P09 but evaluator must support resource/principal types without a second system.

## Required work
1. Implement PermissionRule exactly as frozen: Domain; principal type `User|Character|Role|DomainMembership|SubdomainMembership` plus principal ID; resource type `Domain|Subdomain|Folder|Document` plus resource ID; capability; effect `grant|deny`; actor/audit fields. Do not add a separate `delegatable` flag: delegation is computed from the actor's own `manage_access` plus possession of the capability and scope.
2. Ensure the contracted User `isPlatformAdmin` flag is present and evaluator-active for the audited step-1 bypass; secure operator bootstrap/dashboard waits P11.
3. Implement pure-ish evaluator that gathers applicable rules, Role ancestry, RoleAssignment scopeFolder, memberships and resource ancestry, then applies exact precedence.
4. Implement the complete Phase-7 capability vocabulary from the Architecture Contract: `read, create_document, edit_document, submit_document, file_document, approve_document, lock_document, unlock_document, delete_document, restore_document, move_document, copy_document, share_document, export_document, manage_folders, manage_templates, manage_types_tags, manage_access, manage_members, manage_claims, assign_roles, manage_subdomain, manage_domain_appearance, manage_notices`. Later phases may add new named capabilities such as correspondence moderation without changing evaluator semantics.
5. Implement senior Role inheritance of subordinate Role grants while keeping assignment scope constraints.
6. Create exhaustive table-driven tests including explicit deny and cross-hierarchy direct grant.

## Likely code touchpoints
- src/collections/PermissionRules.ts
- src/lib/authz/evaluate.ts
- src/lib/authz/resourceTree.ts
- src/lib/authz/roleTree.ts

## Automated acceptance
- GS permission matrix fixtures all resolve as specified.
- More-specific direct Character grant overrides broader direct Character deny; applicable direct Character/User deny cannot be overridden by Role grant.
- Document specificity outranks Folder/Subdomain/Domain at same principal tier; deepest folder wins.
- Deny wins ties.
- No matching grant -> deny.
- Same-resource User direct deny defeats active-Character direct grant; a more-specific direct rule on either principal wins over the broader peer rule before deny-on-tie.
- Platform Admin audited allow, Community owner/admin operational allow, and membership-default-last/no-match-deny tiers are table-tested. Personal owner policy integration is re-tested when P09 activates personal kind.
- `manage_claims` resolves at Domain scope and is not implied by ordinary Character membership.

## Manual acceptance
- Use a diagnostic permission inspector in dev/test to explain why Varro, Cassian, Aren can/cannot access fixture folders; explanations must match rules.

## Guardrails / non-goals
- `Do not invent new precedence during UI wiring; if a fixture seems undesirable, stop for owner change-control.`
- `Do not depend on client-supplied 'current role' to authorize; evaluate all active assignments in current Character/Domain context.`
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
- `execution-notes/P07-T01.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
