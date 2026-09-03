# P03-T01 — Domain model, single Owner, and operational admins

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 3  
**Commit prefix:** `P03-T01:`

## Objective
Replace spike tenant terminology/schema with durable Community Domain and User-level authority.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-03/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P02-GATE approved

## Frozen context for this ticket
- Product term is Domain.
- Exactly one Owner User.
- Domain admins are User-level; RP Roles remain Character-level.

## Required work
1. Create/migrate `domains` from Tenants with deterministic stable ID mapping. Fixture reset is forbidden. Preserve every Document and canonical body hash, Folder/Page/Form relation, Theme value, media reference, and membership/migration record; emit pre/post reconciliation counts/hashes and fail on any unaccounted row/reference.
2. Add `kind=community|personal`; only community UI enabled now.
3. Add single ownerUser invariant and User-level DomainAdmin assignments. Consume the explicit P02 legacy-admin migration records, reconcile every record, then delete both the records and legacy admin authorization branch.
4. Migrate theme/media/page relationships.
5. Make `/domain/[slug]` canonical route; old `/tenant` may redirect temporarily.
6. Retire dual tenant/domain app models after migration.

## Likely code touchpoints
- `src/collections/Tenants.ts`
- `src/collections/Domains.ts`
- `src/collections/DomainAdmins.ts`
- `src/lib/tenant/*`

## Automated acceptance
- Community Domain cannot have zero/multiple owners via normal writes.
- Spike data migrates and renders.
- Canonical Domain route works.
- Migration reconciliation proves equal Document/body-hash sets and accounts for every theme/media/folder/page/form/membership reference before Tenants are retired.

## Manual acceptance
- Open migrated fixture Domain; verify theme/docs survive and Owner authority is not tied to active Character.

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
- `execution-notes/P03-T01.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
