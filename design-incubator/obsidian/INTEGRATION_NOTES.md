# Obsidian integration handoff

Baseline: `6de87a6` (`P08D-T05 shared Site Studio host with Design-owned editors`). Separate clone and branch: `design/obsidian-incubation`. Original working checkout was not modified. All work is under `design-incubator/obsidian/`.

## READY TO COPY

The visual composition, scoped CSS, generated asset, icons, and most React markup:

- `ObsidianShell`: standalone Shell DOM with one required `operatingContext` slot, primary navigation, Work, management access, account/dashboard route, and children.
- `ObsidianHome`: semantic welcome, destinations, recent records, edit affordance, and empty state.
- `ObsidianAbout`, `ObsidianLore`, and `ObsidianDepartments`: public information surfaces. Lore consumes a flat entry collection with a group field, allowing a core adapter to support three or fifty entries without encoding the index layout.
- `ObsidianRecords`: card and dense ordered-list workspace driven by `RecordsPageModel` plus a controlled `RecordsViewState` presentation adapter. No live search implementation inside the component. Cards place type and lifecycle together; the index supports date/title ordering and mode-specific page sizes.
- `ObsidianDocument`: server-renderable content composition with `ReadingSurface` as a client tab island; actions are supplied as a React slot.
- `ObsidianManagement`: a thin, generic management presentation driven by capability-filtered rows and supplied actions. It does not model authorization locally.
- `ObsidianFolderManager`: an Arborist-powered hierarchy adapter for the existing Folder-management route. Search, sort, selection, drag/drop, rename, and action descriptors must bind to the existing authorized server actions.
- `ObsidianDocumentTypes`: an Arborist-powered Department/type-folder/Document-Type tree with the selected Type inspector. The P08X core already exposes this exact semantic distinction; bind its resolved tree and inspector descriptors instead of rematerializing it in the Design.
- `ObsidianDepartmentDetail`: department tabs plus a lazy Syncfusion organization chart. The chart needs a supplied organization relationship model; it must not infer reports-to edges from membership.
- Radix controls and CSS Modules. No shared `ShellFrame`, route stylesheet, Civic/Ledger/Poster imports, or Payload/auth imports.

“Ready to copy” means reusable visual source, not that the current entrypoint signatures are final. Copy the presentation into `src/designs/obsidian/`; do not merge the entire preview harness into production routes.

## TEMPORARY INCUBATION ADAPTER

Discard or replace:

1. `src/preview/main.tsx`: Vite bootstrap, history interception, fake operating context, fixture-state selection, page entrance wrapper and action demonstrations. Real navigation must use canonical LoreForge routes. Do not install this global click listener in LoreForge.
2. `src/preview/useMockWorkspace.ts`: minimal local-array search/filter/slicing solely to make fixtures explorable. Its descendant mapping and pagination are intentionally fixture-specific. Replace wholesale; never evolve into another application state machine.
3. `src/preview/fixtures.ts`: fictional models and explicit example action descriptors. These are not permission evaluation. The visitor scenario only demonstrates supplied-action absence, not authorization.
4. `src/contracts/`: Page Model snapshots. Replace with current type-only imports; no runtime core imports are necessary for pure views.
5. `src/preview/reset.css`: preview-host-only global reset. Do not merge into shared shell CSS.
6. Vite/package/index/tsconfig: independent preview tooling. Root LoreForge manifest and lockfile remain unchanged.
7. Asset URL and caption: the local PNG path is a bundled fixture, not a valid persisted Design media reference.

## REQUIRES FINAL P08D API

### Shell / config

Bind final `DesignShellProps<ObsidianConfig>` and page config props after P08D. Mount the real core `OperatingContext` exactly once in the Shell slot. Keep all supplied nav entries. Exercise one real shared management page inside the content region.

Expand the current developer defaults into the final Design config object only after visual approval: `version`, `defaults`, strict `validate`, `migrate`, `resolveTheme`. Provide the ten required `--tenant-*` base tokens alongside Obsidian tokens. Colors must be supported strict formats, dimensions finite/bounded, object shapes exact, and persisted media `/media/...` only. No raw CSS or arbitrary remote URLs. No need for legacy adaptation for a new Design.

P08D-T05 already provides the shared `SiteStudio` host, per-Design validated config banks, Design-owned editor slot, live preview, save/revert/reset flow, and asset-upload bridge. The isolated Vite preview cannot use that machinery faithfully because it has no Design registry, resolver, server actions, or persistence. Register Obsidian after visual approval and supply its own Studio editor then. About and Lore body editing are core content concerns, not Design config; retain or add their content-editor routes separately rather than storing community text in the Design bank.

The current typography uses self-hosted Fontsource assets. Register those fonts through the completed catalog/utilities or retain a Design-scoped font dependency; do not silently reinterpret an existing font key.

### Records

Map the actual `useRecordsWorkspace(model)` output to `RecordsViewState`: search, selection, expanded folders, subfolder scope, type exposure, results, pagination/loading, view, ordering, and page size. Seed view/page-size state from the validated Obsidian config. Use final shared record/folder/New/Import descriptors and server action bridges. Match disabled-versus-absent semantics to the final descriptors.

The first-pass mock has no asynchronous loading/error state. Add those displays when connecting real hook behavior, including fetch failure and page transitions. Decide with P08D whether the final core route uses cursor batches or page navigation; keep the selected size as the requested/display batch and avoid a competing client pagination system. Verify initial and searched records expose identical permitted operations. Preserve authorized supersession trees/links and type-exposure folder count semantics. Do not infer permissions from lifecycle strings in Obsidian.

### Document

Replace fixture `documentActions` with shared Document descriptors. Supply actual link actions and server-action forms through the actions slot. Never pass arbitrary browser callbacks across a Next server/client boundary. Preserve status/errors, prepared-by, canonical safe HTML, optional source, lineage, tags, concerns and all supplied actions.

The long fixture body intentionally repeats across record examples; it is not production document content. Integration must pass each real canonical body unchanged.

### Registration and remaining product work

After the look is accepted and P08D passes its gate: bind the public information and generic management surfaces to their final adapters, then implement a bespoke Studio editor, validated branding configuration, thumbnail and conformance coverage. Register through the documented catalog/registry hooks only. Validate in Next with a production build, then perform required P08D conformance/security and saved-bank switching checks at integration time. No production Design registration is part of this incubation pass.

## Focused verification performed

- TypeScript check and Vite production build.
- Desktop Home/Records/Document and mobile Home/Records/Document visual inspection.
- Search returns matching Northwatch fixtures; type menu restricts results to Accord.
- Card and dense-list page sizes reset the fixture pager and expose a bounded results page.
- Empty Records renders its empty state; the visitor fixture omits New and management controls.
- Radix Document/source tabs work with click and keyboard arrow navigation.
- Mobile navigation contains all primary, Work and supplied management entries.
- Mobile folder dialog selects the nested Earlier agreements folder and returns three matching fixtures.
- Delete menu opens a non-destructive confirmation; confirming produces a status message and preserves the archive.
- Action and folder controls are preview-only; no network/data writes.
- Reduced motion implemented in CSS and Motion; preference handling inspected in source.

Actual screenshot evidence is in `screenshots/`. This is visual-incubation validation, not final accessibility certification or application integration testing.
