# P08-T03 — Starter Pack schema, copy-on-install installer, and Gorean City pack

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 8  
**Commit prefix:** `P08-T03:`

## Objective
Create first-party Domain seeding as ordinary copied configuration, with Gorean City as the initial real starter pack.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-08/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P08-T02

## Frozen context for this ticket
- Starter Packs are first-party only for now.
- Copy-on-install 100%: installed objects become ordinary Domain-owned records; no live dependency/version mutation.
- No `starterPack == gorean` runtime behavior.
- Starter Pack may seed theme/vocabulary/Subdomains/Roles/folders/Document Types/Templates/forms/tags/help content.

## Required work
1. Define versioned StarterPack manifest format using stable internal seed keys only during installation.
2. Implement transactional installer creating new Domain configuration with deterministic reference remapping and rollback on failure.
3. Author Gorean City pack with at least Scribes, Warriors, Magistrates; plausible Role/folder hierarchy; Plain Text plus several representative Templates including Incident Report/Deed/official correspondence-ready vocabulary; restrained theme defaults.
4. Record install provenance/pack version on Domain informational metadata for diagnostics only; runtime must not rely on it.
5. Add test proving modifying installed Template/theme does not modify pack asset and later pack changes do not mutate existing Domain.

## Likely code touchpoints
- src/starter-packs/**
- src/lib/starter-packs/install.ts

## Automated acceptance
- Fresh Gorean install passes schema/authorization reference validation.
- Install failure leaves no partial Domain.
- Runtime grep/test shows no genre-specific conditional in product code.
- Pack update fixture does not alter previously installed Domain.

## Manual acceptance
- Create a fresh Gorean Domain and walk owner through resulting Scribes/Warriors/Magistrates structure, default forms and vocabulary.
- Customize a seeded Deed Template and prove it is now Domain-owned.

## Guardrails / non-goals
- `Do not build starter-pack marketplace/importer.`
- `Do not promise automatic pack upgrades.`
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
- `execution-notes/P08-T03.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
