# P09-T01 — Character-owned Personal Domain policy

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 9  
**Commit prefix:** `P09-T01:`

## Objective
Implement Personal Domains as a constrained profile of the same Domain/archive infrastructure, rooted in Character identity.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-09/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P08-GATE approved

## Frozen context for this ticket
- Personal Domain belongs to exactly one Character, not User/player.
- Same Character may span multiple Community Domains and Personal Domain aggregates copies/shares intended for that Character.
- Subscription economics (one vs several included per paid user) is deferred; data model permits at most one Personal Domain row per Character, regardless of lifecycle state.
- Personal Domain: no public site, no Subdomains, no organizational Roles, no folder sharing.

## Required work
1. Activate personal-kind behavior on the existing P03 Domain `kind=community|personal` field and add `ownerCharacter` validation for personal kind, with a database-backed uniqueness invariant allowing at most one Personal Domain row per Character; soft-delete/lifecycle changes do not permit a replacement row. Do not add a second kind field.
2. Create Personal Domain provisioning action independent of billing for now: Platform Admin may provision; in non-production only, a User controlling the Character may self-provision when `DEV_PERSONAL_DOMAIN_PROVISIONING=true`. Production self-provisioning is denied until the P11 entitlement seam is configured. Every path is idempotent/audited.
3. Apply the policy in the shared evaluator/server hooks (not UI only): owner Character full archive actions subject lifecycle; hard-deny public policy, Subdomains, Roles/RoleAssignments, and every Folder PermissionRule/share for personal kind. Document-specific Share remains allowed under normal delegation.
4. Build compact Personal Archive dashboard and ordinary nested folders/Templates. Reuse P08's constrained theme schema/presets; hide public-site-only asset controls rather than inventing `theme-lite`.
5. Ensure active Character context switches Personal archive availability correctly.

## Likely code touchpoints
- src/collections/Domains.ts
- src/lib/domains/personalPolicy.ts
- src/app/**/personal/**

## Automated acceptance
- Personal Domain cannot exist without Character owner and cannot have Subdomains/Roles.
- Different Character on same User cannot access sibling Character Personal Domain absent a Document share.
- Folder share API denied for personal kind.
- Document share remains permitted.
- Duplicate provisioning remains rejected after archive/soft-delete; disabling the dev flag denies controlling-User self-provisioning without Platform Admin.

## Manual acceptance
- User controls Lucan and Elara; provision Lucan Personal Archive, switch to Elara and verify it is not treated as Elara's storage.
- Try prohibited public/Subdomain/folder-share paths.

## Guardrails / non-goals
- `Do not implement billing entitlement yet.`
- `Do not create separate PersonalDocument storage tables.`
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
- `execution-notes/P09-T01.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
