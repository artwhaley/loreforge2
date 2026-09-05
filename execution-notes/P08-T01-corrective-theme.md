# P08-T01 — Theme Studio productization (corrective stack, 2026-09-05)

## Completion pass (2026-09-05, later) — compositional redesign
The first corrective pass was decorative (same composition, different trim). This pass, continued from an interrupted agent run, ships the three templates as genuinely different designs:

- **Shared presentation components.** `DomainFrame` (shell composition: header/nav/management/footer regions), `DomainHome` (home content), `DocumentPaper` (reading surface), `loadDomainHome` (single data loader). The domain pages and the Studio preview render the SAME components; the old separately-maintained preview approximation is gone (`PreviewViewport` renders the real components inside an iframe at desktop/mobile widths).
- **CIVIC — institutional portal.** Solid masthead band, horizontal nav, two-column home (welcome left, destination directory right), recent records as a 3-column grid, bordered sheet for documents.
- **LEDGER — editorial archive.** The whole domain is an asymmetric spread: a persistent index rail owns navigation (column nav at x≈145, numbered), main content shifts right (x≈385), double-rule separators, marginal metadata, documents get a marginalia rail (concerns/tags in the margin).
- **POSTER — bold publication.** No solid band: open masthead over a bordered hairline, nav as a right-clustered row, oversized display type (h1 106px vs civic 56px), welcome as a full-width asymmetric grid with 8px-rule, destinations as checkerboard tiles, documents open flat with an off-grid body column.
- Header layouts remain meaningful inside every template (rail masthead variants in ledger; grid/space-between variants in poster).

## Bugs found and fixed during visual acceptance
1. **Theme saves silently failed** (`saveThemeAction`/`uploadThemeAssetAction` called `isAllowed` with `{userId}` only; P07X identity-driven authority needs the acting Character). Both now resolve the acting identity from selector cookies via `resolveActingIdentity`, matching the guarded routes. This was found because every template screenshot rendered identically.
2. **Studio preview iframe never mounted** (srcDoc `onLoad` fires before hydration; `frameDocument` never set). `PreviewViewport` now adopts an already-complete document on mount; drafts preview live and do not save implicitly (verified: DB stays civic while the poster draft renders 106.4px type).
3. **Header-layout cards were unclickable** at desktop width (fixed-width thumb spans pushed the third card under the sticky preview column; fixed with `minmax(0,1fr)` + shrinkable thumbs, verified by geometry: card right edge 343 < preview 388).
4. Removed interrupted-pass leftovers: duplicated/dead SCSS blocks in TenantShell/ThemeStudio/document modules, stray `scripts-tmp-inspect/`, `theme-test-output.txt`.

## Browser verification (system Chrome via Playwright; screenshots in `lf2-review/theme-shots/`)
- 46 screenshots: home/about/departments/records × 3 templates × 3 header layouts, document reading (classic/modern), 6 mobile shots, studio, empty-domain.
- DOM measurements (`layout-measurements.json`): nav direction (row vs column), nav first-link position, h1 size (56/44.8/106.4px), main column x/width (120/1200 vs 385/934), page heights — three distinct silhouettes at desktop AND mobile; zero horizontal overflow everywhere.
- Ink-band profiles (grayscale density per 60px row): civic = heavy header band rows 1–4; ledger = flat even spread; poster = massive display-type block rows 8–13 — distinct even without color.
- Empty-state domain (P7 Outside): "No records" renders, no overflow.
- Keyboard focus walk: platform chrome → Domain/Character selects → account → nav → management nav, in sensible order; `:focus-visible` outlines styled on the frame root.
- Reading styles measured: classic (Georgia 32px title, 26.4px body line) vs modern (Verdana, 29.4px line, 16.8px body) — visibly different on the same record.
- Persistence: save → reload → navigate all pages → template/header/style persisted (DB + rendered DOM agree); fixture restored to civic/centered/classic afterward.

## Original corrective pass notes (vocabulary removal etc.) follow.

## Owner decision driving this pass
- Vocabulary customization is **removed**. The phase-7 corrective stack had already rescinded Domain vocabulary; the P08-T01 ticket text that reintroduced it (editor, JSON field, slot sanitizer, tests) was stale packet text. Owner instruction wins; the ticket, Architecture Contract §12, and Frozen Decisions are updated so the next execution pass cannot recreate the feature.
- The theme system becomes a **first-class system**: three distinct top-level design templates, three genuinely distinct header layouts per template, tabbed Theme Studio with sticky full-home preview, visible reading-style specimens, richer palettes/fonts, image-free background treatments.

## Files changed
- `src/lib/theme/nouns.ts` (new) — fixed platform nouns (Domain/Department/Archive/Record/Folder/Role/Member).
- `src/lib/theme/vocabulary.ts` + `vocabulary.test.ts` — **deleted**.
- `src/lib/theme/fonts.ts` — added `DESIGN_TEMPLATES` (civic/ledger/poster), `--tenant-template` var, Newsreader/Lato font stacks, Ink/Gallery/Verdant/Nocturne palettes, `washes` background treatment, `HeaderLayoutKey` semantics refresh.
- `src/lib/theme/input.ts` + `input.test.ts` — `designTemplate` in the boundary contract; vocabulary handling removed.
- `src/lib/actions/saveTheme.ts` — persists designTemplate; vocabulary writes removed.
- `src/collections/Domains.ts`, `src/collections/Tenants.ts` — `designTemplate` select added; `vocabulary` JSON field removed; preset options extended to six; treatment options relabeled.
- `src/scripts/migrateP08ThemeTokens.ts` — adds `design_template` (default `civic`), drops `vocabulary` columns (idempotent). Run on dev DB.
- `src/components/theme/TenantShell.tsx` + `TenantShell.module.scss` — rewritten around `[data-template] x [data-header]`: civic (solid band), ledger (ruled print: paper grain, ink rules, hatch rails, monospace microtype, boxed seals), poster (aurora washes, pill nav with lift movement, soft radii, gradient seal). Banner-hero gets a designed no-image fallback; compact bar becomes a ruled table row in ledger.
- `src/components/theme/ThemeStudio.tsx` + `ThemeStudio.module.scss` — full rewrite: tabs (Design/Colors/Typography/Images/Reading), template wireframe cards, header layout cards, palette picker + 4 color inputs, type specimen, image uploads, reading-style specimen cards, sticky preview rendering the complete home (header, welcome, module row, record, footer) in the selected template.
- `src/app/(frontend)/domain/[slug]/customize/page.tsx` — passes designTemplate; vocabulary props removed.
- `home.module.scss`, `about/about.module.scss`, `departments/departments.module.scss`, `lore/lore.module.scss`, `documents/[id]/document.module.scss` — per-template presentation (ruled cards vs floating cards; pronounced classic/modern reading styles with live specimens).
- Vocabulary consumers switched to fixed nouns: `page.tsx`, `records/page.tsx`, `departments/page.tsx` (+ detail), `manage/departments/page.tsx`, `members/page.tsx`, `documents/[id]/page.tsx`, `TenantShell.tsx`, RecordsExplorer (via records page props).
- `LoreForge_Execution_Packet/tickets/phase-08/P08-T01...md`, `03_ARCHITECTURE_CONTRACT.md` §12, `02_FROZEN_PRODUCT_DECISIONS.md` — owner-decision corrections recorded.

## Tests
- `npx tsc --noEmit` clean; eslint clean on touched files.
- `npm run test` (full suite) — theme tests updated for designTemplate + removed vocabulary; shell invariants still pin one Domain selector and frozen nav segments.
- `node --import tsx src/scripts/migrateP08ThemeTokens.ts` applied to dev DB.

## Manual result
- Automated browser verification covered the visual acceptance checklist (screenshots + DOM geometry + ink profiles above); the owner's walkthrough of `/domain/ar/customize` remains the aesthetic sign-off.

## Deferred
- Starter-pack theme manifests may later seed `designTemplate`; P08-T03/T04 pack work unchanged otherwise.