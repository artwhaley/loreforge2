# P02-T02 — Active Character and Domain operating context

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 2  
**Commit prefix:** `P02-T02:`

## Objective
Make acting identity explicit so later authorization cannot accidentally use User as RP principal.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-02/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P02-T01

## Frozen context for this ticket
- Context is User -> active Character -> active Domain.
- Account may have no active Character.
- Active Character must be controlled by authenticated User.
- The customer shell's final context affordance is a top-level bar with `Domain` on the left and `Acting as` Character on the right. This ticket establishes the shell and account-level Character control; P02-T03 wires the final membership-filtered pair against `DomainMemberships`.

## Required work
1. Replace/extend active-tenant seam with central active context for Character+Domain.
2. Add the top-level context bar: a clearly labeled `Domain` control on the left, a clearly labeled `Acting as` Character control on the right, and no Role/permission language in either control. The Character control must show only Characters controlled by the authenticated User in this ticket; P02-T03 narrows it to Characters connected to the selected Domain.
3. Validate active Character server-side; never trust arbitrary cookie IDs.
4. Provide account-level mostly-empty state when no Character active.
5. When switching Character in this ticket, clear active Domain unconditionally; do not validate against soon-to-be-removed User Memberships. P02-T03 re-establishes/validates Domain from the new Character DomainMemberships in the same commit that introduces them.

## Likely code touchpoints
- `src/lib/tenant/activeTenant.ts`
- `src/lib/context/*`
- `src/components/theme/TenantShell.tsx`

## Automated acceptance
- Cannot activate another User's Character.
- Switching updates server context.
- No-active-Character state works.
- Character switch cannot retain a Domain selected only through the previous Character/User membership.
- Context controls are visibly distinct from account settings and Roles, and the bar never presents an unowned Character as available to act as.

## Manual acceptance
- Switch between two fixture Characters without logout, then clear active Character.

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
- `execution-notes/P02-T02.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
