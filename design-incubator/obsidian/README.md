# Obsidian — first visual pass

A midnight archive for LoreForge. Mineral green light, a floating navigation capsule, quiet translucent surfaces, Manrope typography, and Instrument Serif reading accents. Aster Reach is fictional fixture content; the art direction is the reusable deliverable.

This is an isolated React prototype, **not a registered or production-ready LoreForge Design**. It now includes the public Shell, Home, About, Lore, Departments, Records, Document, Work, and management-page treatments, along with desktop/mobile, keyboard navigation, and reduced motion. Studio, saved customization controls, persistence, and final core adapters remain intentionally deferred.

## Preview

From this directory:

```sh
npm ci
npm run dev
```

The local server uses port **3066**, separate from LoreForge's 3055.

- Home: http://127.0.0.1:3066/domain/aster-reach
- Records: http://127.0.0.1:3066/domain/aster-reach/records
- Long Document: http://127.0.0.1:3066/domain/aster-reach/documents/1
- Earlier/superseded Document: http://127.0.0.1:3066/domain/aster-reach/documents/7
- About: http://127.0.0.1:3066/domain/aster-reach/about
- Lore index: http://127.0.0.1:3066/domain/aster-reach/lore
- Lore article: http://127.0.0.1:3066/domain/aster-reach/lore/northwatch
- Departments: http://127.0.0.1:3066/domain/aster-reach/departments
- Management: http://127.0.0.1:3066/domain/aster-reach/manage/people
- Empty Home: http://127.0.0.1:3066/domain/aster-reach?fixture=empty
- Empty Records: http://127.0.0.1:3066/domain/aster-reach/records?fixture=empty
- Visitor: http://127.0.0.1:3066/domain/aster-reach?fixture=visitor

Search, type filtering, nested folder selection, subfolder inclusion, pagination, menus, mobile navigation, and Document/source tabs operate on deterministic local fixtures. The archive has 72 rows, long titles, draft/submitted/filed/deprecated/locked examples, and one predecessor/successor pair. Document pages reuse a representative long body to exercise different presentation states.

Records can switch between an atmospheric card grid and a dense ordered index. The index supports newest/oldest and title A–Z/Z–A ordering, with Title, prepared-by, date, lifecycle, and the required action menu in each row. Footer controls expose 6/12/24 cards or 25/50/100 rows per page. The typed defaults currently select 6 cards and 50 rows; these values are ready for later Site Studio configuration.

New/Import/Edit/lifecycle/folder and management actions open clearly identified preview surfaces. Delete demonstrates confirmation without removing anything. About, Lore, Departments, Work, and management pages use deterministic fixture content only. There is no database or authenticated session.

## Structure

- `src/Obsidian*.tsx`, `Navigation.tsx`, `ReadingSurface.tsx`, `DocumentActions.tsx`, `controls.tsx`, `obsidian.module.css`: portable presentation.
- `src/config.ts`: typed developer-owned color/geometry/Records defaults; no user controls or persistence schema yet.
- `src/contracts/`: frozen, type-only Page Model snapshots from baseline `6de87a6`. Replace with final P08D imports.
- `src/preview/`: discardable host, fixture content, mock workspace, navigation interception, reset, fonts and animation bootstrap.
- `public/obsidian-coastline.png`: original generated hero artwork, created by one Luna asset subagent.
- `screenshots/`: actual browser captures, desktop 1440 × 1000 and mobile 390 × 844.

## Dependencies

Resolved versions are locked in `package-lock.json`. Package metadata checked locally:

| Dependency | Version | License | Purpose / later adoption |
|---|---:|---|---|
| React / React DOM | 19.2.4 | MIT | Matches LoreForge baseline |
| Radix UI | 1.6.7 | MIT | Accessible menus, dialogs, collapsibles, tabs; retain |
| Motion | 12.43.0 | MIT | Restrained preview page entrance; optional to retain when binding final route transitions |
| Lucide React | 0.577.0 | ISC | Consistent icons; retain |
| Manrope via Fontsource | 5.3.0 | OFL-1.1 | Self-hosted UI font; register via LoreForge font facilities on integration |
| Instrument Serif via Fontsource | 5.3.0 | OFL-1.1 | Self-hosted display/reading accent; same integration requirement |
| Vite / TypeScript | lockfile | MIT / Apache-2.0 | Incubator tooling only; do not add to LoreForge |

Radix, Motion and Lucide declare React 19 support. The isolated TypeScript/Vite production build succeeds with React 19.2.4; this is not a claim that final Next/RSC integration is tested. No Syncfusion dependency was needed for these surfaces.

Radix behavior reference: https://www.radix-ui.com/primitives/docs/components
Motion accessibility reference: https://motion.dev/docs/react-accessibility

## Validation scope

Ran the isolated production build (TypeScript plus Vite), and focused real-browser checks. No baseline LoreForge tests, database migrations, security suites, or core builds were run because core application code was untouched. See `INTEGRATION_NOTES.md` for the remaining production work.

The CSS honors reduced motion, and the Motion host uses both `MotionConfig reducedMotion="user"` and `useReducedMotion`. Reduced-motion handling was reviewed in code; OS-level preference emulation was not available in the browser controls used here.

Known first-pass limits: this is one fixed default composition; settings validation and branding controls are deliberately deferred. Many tonal colors remain in the Design stylesheet; the primary palette and geometry entry points are centralized for the subsequent branding pass. Hero copy and asset caption are fixture/design content, not new Page Model fields.
