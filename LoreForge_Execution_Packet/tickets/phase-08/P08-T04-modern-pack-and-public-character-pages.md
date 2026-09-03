# P08-T04 — Contrasting Modern City pack and public Character pages

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 8  
**Commit prefix:** `P08-T04:`

## Objective
Prove genericity with a second first-party vocabulary/theme seed and complete public Character presentation/claim-safe visibility.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-08/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P08-T03

## Frozen context for this ticket
- Initial product targets Gorean RP but underlying product must not be Gorean-coded.
- Characters are global and public by default; public pages show only records caller may publicly read.
- Character->controlling User association is public by default once claimed.
- Domain-local aliases/context may differ without changing global Character identity.

## Required work
1. Author a small Modern Municipality starter pack using same manifest/schema with Police/Clerk/Courts vocabulary and contrasting theme; install it as the stable `Bayview` fixture Domain for cross-Domain scenarios.
2. Build public Character page with portrait/basic global profile, controlling User identity when present, Domain participation safe summary, and publicly readable linked Documents only.
3. Build unclaimed Character presentation and claim-request affordance for logged-in matching player workflow.
4. Ensure Domain-local alias display is contextual and does not overwrite global canonical name.

## Likely code touchpoints
- src/starter-packs/modern-city/**
- src/app/**/characters/**

## Automated acceptance
- Modern pack installs without code changes and contains no Gorean nouns except shared content intentionally named.
- Private Document linked to public Character never appears/counts/leaks on public page.
- Unclaimed Character shows no fabricated controlling User.
- Local alias rendering does not mutate global Character.
- Public controller serialization uses only the safe display-name projection; User IDs/email/SL/admin/account fields are absent.
- Re-run GS-09 P05 copy/move scenarios against Bayview after installation.

## Manual acceptance
- Install Gorean and Modern Domains side-by-side and compare vocabulary/theme while using same workflows.
- Open a Character with public+private linked records anonymously and confirm only public is visible.

## Guardrails / non-goals
- `Do not add full localization.`
- `Do not add community-authored packs.`
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
- `execution-notes/P08-T04.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
