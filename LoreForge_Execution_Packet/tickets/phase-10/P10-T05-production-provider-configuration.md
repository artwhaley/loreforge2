# P10-T05 — Production provider configuration

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 10  
**Commit prefix:** `P10-T05:`

## Objective
Apply owner-selected hosting/media/email/deployment choices as one bounded production configuration step.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-10/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P10-T04
- OWNER GATE P10 approved

## Frozen context for this ticket
- Provider decisions are intentionally OWNER decisions because they affect cost/operations.
- This ticket may implement only the choices recorded in `owner-gates/P10_DEPLOYMENT_DECISIONS.md`.
- Architecture remains web + worker + Postgres + media storage; provider products may host these but must not redefine product data.

## Required work
1. Read completed P10 owner gate and record selected providers/regions/domains/storage/email/deployment topology.
2. Add provider configuration/IaC/deployment files only for approved choices.
3. Configure production media storage adapter and migration from local media as needed.
4. Configure secure secrets injection, TLS/base URLs, worker execution, backups per provider capability.
5. Deploy staging first and run full golden smoke; document production promotion/rollback.

## Likely code touchpoints
- deployment/**
- src/payload.config.ts
- docs/operations/deploy.md

## Automated acceptance
- Staging deploy migrates cleanly and passes golden smoke.
- Web+worker share authoritative DB/storage correctly.
- Backup/restore procedure updated for chosen provider.
- No secrets committed.

## Manual acceptance
- Owner opens staging from clean browser, performs create/edit/form/search flow and sees persistent media after redeploy.

## Guardrails / non-goals
- `Do not choose or substitute a provider if owner gate is incomplete.`
- `Do not mix billing implementation into deployment.`
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.

## Owner decision dependency

STOP before this ticket unless the owner has filled and approved `owner-gates/P10_DEPLOYMENT_DECISIONS.md`. A review/execution agent may summarize options but may not select providers.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P10-T05.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
