# P11-T01 — Platform Admin authority and operational dashboard

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 11  
**Commit prefix:** `P11-T01:`

## Objective
Build the separate superuser surface the platform owner needs to see and manage all Domains with useful visualization.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-11/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P10-GATE approved

## Frozen context for this ticket
- Platform Admin is not a Domain Role and can see/do everything.
- Platform Admin actions affecting tenant data are audited.
- Dashboard should be useful, with data visualization, but avoid vanity analytics that require invasive tracking.
- Platform Admin is expected to be a very small operator set.
- Platform Console is a global LoreForge account/operator destination, not a Domain Role, Administration mode, or item in the selected Domain's management bar.

## Required work
1. Activate and securely bootstrap the existing contracted User `isPlatformAdmin` flag (add it only if an earlier migration demonstrably omitted it); do not create a second Platform Admin field/role.
2. Build protected `/platform` dashboard and hydrate the existing Platform Console link/summary on the signed-in LoreForge User dashboard: Domain counts/lifecycle, user/Character counts, Document/storage/activity volumes, recent errors/jobs, growth charts from existing authoritative data.
3. Add Domain drilldown with owner/admins, size/counts, lifecycle, recent activity and support links.
4. Wrap superuser override actions with PlatformAuditEvent (or clearly separate platform audit collection) including actor/reason/target.
5. Add impersonation/support-view only if implemented with conspicuous banner + audit; otherwise provide read-as-admin without pretending to be tenant user.

## Likely code touchpoints
- src/collections/PlatformAuditEvents.ts
- src/app/platform-admin/**
- src/lib/platform-admin/**

## Automated acceptance
- Non-platform user cannot route/API access dashboard.
- Platform override writes audit event including reason.
- Dashboard aggregates do not expose document bodies in charts/logs.
- Counts work across Community and Personal Domains.
- Platform Console appears only in the Platform Admin account menu/dashboard and never creates a second selected-Domain or acting-Character context.

## Manual acceptance
- Inspect dashboard with fixture/staging data; perform one audited support action and locate it afterwards.

## Guardrails / non-goals
- `Do not make Domain Owner a Platform Admin.`
- `Do not implement covert unaudited impersonation.`
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
- `execution-notes/P11-T01.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
