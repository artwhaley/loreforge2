# P08-T01 — Theme Studio productization and controlled vocabulary

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 8  
**Commit prefix:** `P08-T01:`

## Objective
Turn the spike Theme Studio into a deliberate, safe personalization feature and add vocabulary theming without building a general CMS/localization system.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-08/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P07-GATE approved

## Frozen context for this ticket
- Core use case is MySpace-level identity: make the Domain feel unique/professional via theme tokens, not arbitrary page layout.
- Raw CSS remains deferred/open future and is NOT exposed here.
- Vocabulary changes controlled product nouns/default labels only; this is not full interface localization.
- Theme applies consistently to public pages, member surfaces, and rendered Documents.
- P04 established the LoreForge global shell and Domain information architecture. This ticket polishes and tokenizes it; it does not replace the approved navigation or reintroduce an Administration mode.
- This ticket adds/finalizes the contracted P08 token schema, vocabulary, and public/member integration. It is not a deferred Phase-1 usability backlog: any Gate-1 defects in the original controls must already be closed before P02.

## Required work
1. Finalize Theme token schema from Architecture Contract: preset, primary/secondary/accent/background colors, derived accessible text/surface colors, heading/body font preset, logo, banner, optional background image/treatment, header layout, content width, document style. Do not expose independent text-color tokens.
2. Build polished live-preview Theme Studio using constrained controls, curated font choices/presets, validation/contrast warnings, reset-to-preset.
3. Create controlled Vocabulary configuration for singular/plural values of exactly `domain, subdomain, archive, document, folder, role, member`, with defaults and safe fallback; the `subdomain` slot defaults to `Department/Departments`. Do not expose action labels, permission names, arbitrary strings, or a translation-key editor.
4. Refactor rendering to consume semantic theme/vocabulary tokens rather than tenant-specific CSS branches.
5. Apply UI tuning to the existing LoreForge platform home/dashboard, persistent global header, stable Domain primary bar, conditional management bar, typography, spacing, and document reading view using two visually contrasting fixture Domains. Domain theme begins below the LoreForge global header.

## Likely code touchpoints
- src/components/theme/**
- src/lib/theme/**
- src/lib/vocabulary/**
- src/app/**

## Automated acceptance
- Theme JSON validates and unknown token values fall back safely.
- One theme change updates homepage/member shell/document presentation without changing content Markdown.
- Vocabulary missing entry falls back to platform default.
- Background treatment and every vocabulary slot save/round-trip; unknown vocabulary keys are rejected rather than silently becoming UI strings.
- No tenant-specific `if Gorean`/genre conditional exists.
- Vocabulary fallback renders Department/Departments for the internal `subdomain` slot, and changing the slot updates customer copy without changing schema or canonical route structure.

## Manual acceptance
- Transform Ar from default to distinctive Gorean civic/archive appearance, then switch to Bayview modern theme and confirm same functional layout remains legible.
- Have nontechnical tester change logo/colors/fonts without touching CSS or code.
- Confirm both themes retain LoreForge global identity, one Domain selector, stable Home/About/Departments/Records navigation, and the subordinate management bar.

## Guardrails / non-goals
- `Do not add Puck/GrapesJS/general page builder.`
- `Do not expose arbitrary custom CSS.`
- `Do not allow arbitrary font upload; use curated/approved web-safe/provider-managed fonts until later decision.`
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
- `execution-notes/P08-T01.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
