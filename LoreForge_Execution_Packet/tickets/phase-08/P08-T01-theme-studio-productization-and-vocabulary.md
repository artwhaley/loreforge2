# P08-T01 — Theme Studio productization

**Mode:** IMPLEMENTATION TICKET (corrected 2026-09-05 by owner decision)  
**Phase:** 8  
**Commit prefix:** `P08-T01:`

## Owner correction (2026-09-05)
- **Vocabulary customization is REMOVED.** The phase-7 corrective stack already rescinded Domain vocabulary; the earlier P08-T01 text that reintroduced a vocabulary editor, JSON field, and slot sanitizer was stale packet text and is superseded by this correction. Customer-facing nouns are fixed platform constants (`src/lib/theme/nouns.ts`). The `vocabulary` column is dropped by `src/scripts/migrateP08ThemeTokens.ts`.
- **Theme system upgraded to a first-class system:** three distinct top-level design templates (`civic` / `ledger` / `poster`), each fully themeable (colors, typography, content width, images, reading style) and each offering three genuinely different header/navigation layouts (`centered` masthead, `left-aligned` compact bar, `banner-forward` hero with a designed no-image fallback).
- **Theme Studio reorganized into tabs** (Design / Colors / Typography / Images / Reading) with a sticky live preview that renders the full Domain home, and Reading-style specimens so the document style settings are visible before choosing.
- **Second owner correction (same day): the templates must be materially different compositions, not one layout with trim.** Template-specific page composition, grids, navigation presentation, content placement, spacing, and responsive layout are explicitly authorized. Implemented:
  - **CIVIC — institutional portal.** Desktop: solid masthead band, horizontal nav beneath, two-column home (editorial welcome left / destination directory right), recent records as a three-column bordered grid, documents on an official sheet. Mobile: masthead stacks, records to 2→1 columns.
  - **LEDGER — editorial archive.** Desktop: whole domain is an asymmetric spread — persistent index rail (numbered column nav, identity masthead, subordinate management block) with content in a right column; double-rule and hairline structure; documents get a marginalia rail (metadata column, concerns/tags in the margin). Mobile: rail becomes a top masthead with 3-column nav grid.
  - **POSTER — bold publication.** Desktop: open masthead (no solid band) over a hairline, nav clustered right, 106px display titles, full-width asymmetric welcome grid, checkerboard destination tiles, off-grid document body. Mobile: masthead stacks, tiles go single column.
  - Home/Records/document/About/Lore/Departments all receive intentional treatment; other surfaces inherit coherent type/spacing/controls. Authorization/fetching stay in TenantShell + `loadDomainHome`; presentation lives in shared `DomainFrame`/`DomainHome`/`DocumentPaper` used by both the domain and the Studio preview.

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
1. Finalize Theme token schema from Architecture Contract: design template, preset, primary/secondary/accent/background colors, derived accessible text/surface colors, heading/body font preset, logo, banner, optional background image/treatment, header layout, content width, document style. Do not expose independent text-color tokens.
2. Build polished live-preview Theme Studio using constrained controls, curated font choices/presets, validation/contrast warnings, reset-to-preset.
3. ~~Create controlled Vocabulary configuration~~ **Removed by owner correction (2026-09-05).** Customer nouns are fixed platform constants; no editor, no per-Domain storage, no slot sanitizer.
4. Refactor rendering to consume semantic theme tokens rather than tenant-specific CSS branches.
5. Apply UI tuning to the existing LoreForge platform home/dashboard, persistent global header, stable Domain primary bar, conditional management bar, typography, spacing, and document reading view using two visually contrasting fixture Domains. Domain theme begins below the Loreforge global header.

## Likely code touchpoints
- src/components/theme/**
- src/lib/theme/**
- src/lib/vocabulary/**
- src/app/**

## Automated acceptance
- Theme JSON validates and unknown token values fall back safely.
- One theme change updates homepage/member shell/document presentation without changing content Markdown.
- ~~Vocabulary missing entry falls back to platform default.~~ **Removed by owner correction (2026-09-05):** nouns are code constants; there is no stored vocabulary to fall back from.
- Background treatment and every layout token save/round-trip; unknown values are rejected rather than silently becoming UI strings.
- No tenant-specific `if Gorean`/genre conditional exists.
- The three design templates and three header layouts render distinct presentations from the same token set; every control visibly changes the preview.

## Manual acceptance
- Transform Ar from default to distinctive civic/archive appearance, switch Bayview to the Ledger (Loreforge print) template and a third Domain to Poster, and confirm each template remains fully legible with its own colors, fonts, and header layout choices.
- Have nontechnical tester change template, header layout, colors, and fonts without touching CSS or code.
- Confirm all templates retain LoreForge global identity, one Domain selector, stable Home/About/Departments/Records navigation, and the subordinate management bar.
- Confirm the Reading tab's specimens make the document style choice visible before saving.

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
