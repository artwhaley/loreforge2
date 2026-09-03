# P08-GATE — Review Gate 8 — product identity, public/member UX, starter packs

**Mode:** REVIEW GATE — NO SELF-APPROVAL  
**Phase:** 8  
**Commit prefix:** `P08-GATE:`

## Objective
Human product/UX gate proving LoreForge feels like a branded RP archive rather than a generic CMS.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-08/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P08-T01
- P08-T02
- P08-T03
- P08-T04

## Frozen context for this ticket
- This is a deliberate UI taste pass. Visual roughness acceptable in earlier phases is no longer acceptable for core navigation/theme/editor/read views.

## Required work
1. Run Phase 8 tests.
2. Create fresh Gorean and Modern Domains from starter packs.
3. Walk LoreForge public home/login, User dashboard, anonymous/member Domain Home, Department, People, template, and document flows in both.
4. Review Theme Studio with nontechnical-user lens and record any confusing controls.
5. Run accessibility/responsive smoke.

## Likely code touchpoints
- Inspect current adjacent files; do not broaden scope.

## Automated acceptance

- Full Phase 8 suite passes for theme/vocabulary schema, safe media, public-read predicate, starter-pack idempotency, and public Character/User projections.
- Anonymous count/search/profile tests prove private resource existence is not disclosed.
- Bayview installs from the Modern pack and GS-09 cross-Domain scenarios pass against it.


## Manual acceptance
- No genre-specific runtime branching.
- No private-record leakage on public pages.
- Starter packs copy-on-install.
- Core UI has no known P1 usability blocker.
- The P04 user-first information architecture remains intact: one Domain selector, optional acting Character, stable primary navigation, capability-driven management bar, and no Administration mode.

## Guardrails / non-goals
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.
- Owner approves visual direction and starter-pack concept before Personal Domains/production infrastructure.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P08-GATE.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- STOP and return the review-gate report to the owner. Do not begin the next phase.
