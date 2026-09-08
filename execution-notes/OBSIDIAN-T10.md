# OBSIDIAN-T10 — Freeze and port Obsidian presentation source

**Status:** Complete (unregistered)

## Source freeze

- Source of truth: `origin/design/obsidian-incubation` @ `fc22e6c7db7da05b6166e2f126c5e6c9e6a20223` — unchanged since the T00 freeze (verified via fresh `git fetch` + `git rev-parse` before copying). Matches the HEAD recorded in `OBSIDIAN-T00.md`.

## What was ported

`src/designs/obsidian/` — presentation only, from `design-incubator/obsidian/src/`:

- `ObsidianShell.tsx`, `Navigation.tsx`, `controls.tsx` (ActionMenu/ChoiceMenu/Modal/Tooltip Radix primitives)
- `ObsidianHome.tsx`, `ObsidianRecords.tsx` (with its `RecordsViewState` presentation adapter), `ObsidianDocument.tsx` + `ReadingSurface.tsx` (Radix tabs client island)
- `ObsidianAbout.tsx`, `ObsidianLore.tsx`, `ObsidianDepartments.tsx`, `ObsidianDepartmentDetail.tsx`, `ObsidianCharacterProfile.tsx`
- `ObsidianManagement.tsx`, `ObsidianFolderManager.tsx`, `ObsidianDocumentTypes.tsx`, `DocumentActions.tsx`
- `obsidian.module.css` (3,712 lines, scoped CSS modules, `prefers-reduced-motion` block retained)
- `config.ts` (incubation vocabulary, unmodified shape)

**NOT ported** (per guardrails): `preview/**` (main.tsx Vite bootstrap, useMockWorkspace, fixtures.ts, reset.css), `contracts/**` (incubation Page Model snapshots), `index.html`/`vite.config.ts`/`tsconfig.json`/`package.json` (preview tooling), `screenshots/`.

## Production normalization

1. **Contract imports → production types.** All `./contracts/*` type-only imports replaced with `@/lib/page-models/{shell,home,records,document,info,departments,common}` — verified field-for-field identical to the incubation snapshots (diffed; only formatting differs).
2. **Local adapters** (`adapters.ts`) for the two components whose models don't exist in production yet: `LorePageModelAdapter` (entries/introduction — T14 expands the Lore model) and `ManagementPageModelAdapter` (generic capability-filtered rows — T18 binds). Nothing in the route tree or registry imports them.
3. **Syncfusion removed.** `ObsidianDepartmentDetail` rewritten as the member-directory fallback over production `DepartmentPageModel` (members/folders/vocabulary) with two new scoped CSS classes; `ObsidianCharacterProfile` adapted off the org-chart member type. Per T11 policy: no semantic org-relationship model exists in core, and the chart must never infer reports-to edges from membership.
4. **Preview asset neutralized.** `OBSIDIAN_DEFAULTS.atmosphereImage` is now `null` (CSS/gradient fallback); the bundled `/obsidian-coastline.png` fixture path is deliberately not carried into production config. `ObsidianHome` accepts `atmosphereImage: string | null` and renders nothing when null.
5. **Lint normalization.** The two `<a href="/">` platform links in `ObsidianShell` converted to `next/link` (`no-html-link-for-pages`).
6. **Label cleanup.** Two fixture-era "…preview" action labels renamed.

## Dependency audit (feeds T11)

Retained production code imports exactly: `lucide-react` (icons), `radix-ui` (menus/dialogs/tabs/toggle/collapsible), `react-arborist` (already in root). **Not imported by any retained file:** `motion` (only a `prefers-reduced-motion` CSS block), fontsource packages (no font imports), `@syncfusion/*` (removed above). Both pre-approved additions installed in root: `lucide-react@^1.42.0`, `radix-ui@^1.6.7`.

## Registration status

**Unregistered.** No changes to `src/lib/design/{types,config,registry,catalog}.ts`, the V2 migration map, eslint sets, or any route. No design key, no fixture wiring, no live route sees Obsidian. Thumbnail placeholder created at `public/designs/obsidian.svg` for T11's picker entry.

## Verification

- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors (8 warnings: 6 pre-existing `<img>` patterns + 2 same-pattern `<img>` in the ported Obsidian source)
- Design suite — 169/169; `npm test` — 155/155
- Forbidden-import audit: no `preview`, `contracts`, Vite, fixture, `useMockWorkspace`, reset.css, or `@syncfusion` references under `src/designs/obsidian/` (the word "preview" survives only in a comment explaining the excluded fixture path)
