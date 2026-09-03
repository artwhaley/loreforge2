# P11-T04 — Operator jobs/errors and commercial entitlement seams

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 11  
**Commit prefix:** `P11-T04:`

## Objective
Finish platform operations and define billing/entitlement boundary without letting an executor invent pricing or payment provider.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-11/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P11-T03

## Frozen context for this ticket
- Subscription tiers conceptually include free User accounts, Community Domains, and Character-rooted Personal Domains.
- Exact pricing, storage quotas, image limits, and whether one subscription includes multiple Personal Domains are deliberately unresolved OWNER decisions.
- Billing must control entitlements/lifecycle, not own product data.

## Required work
1. Expand Platform dashboard for failed jobs, worker lag, recent application errors, backup status hooks and Domain usage metrics.
2. Define provider-neutral Entitlement/SubscriptionStatus interface/data model sufficient to gate Community Domain active service and Personal Domain provisioning without price constants.
3. Add development/manual entitlement adapter for tests/staging.
4. Document required owner decisions in P11 billing gate and ensure no hardcoded commercial assumptions leak elsewhere.
5. Add usage measurement hooks for storage/media counts without enforcing quotas yet.

## Likely code touchpoints
- src/lib/entitlements/**
- src/app/platform-admin/**

## Automated acceptance
- Tests can toggle entitlement state through dev adapter and observe lifecycle/provisioning gate without payment API.
- No price/quota constants in production code.
- Operational dashboard surfaces failed test job and usage data.

## Manual acceptance
- Simulate lapsed entitlement in staging and confirm it maps to chosen lifecycle state only after explicit policy mapping fixture.

## Guardrails / non-goals
- `Do not integrate Stripe/other provider until owner gate.`
- `Do not decide one-vs-many Personal Domains per paid account.`
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.

## Owner decision dependency

This ticket prepares, but does not consume, `owner-gates/P11_BILLING_DECISIONS.md`. If owner wants billing integration immediately after Phase 11, STOP at gate and obtain completed decisions first.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P11-T04.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
