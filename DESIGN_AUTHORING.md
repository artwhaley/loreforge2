# DESIGN_AUTHORING.md
## How to Create a New LoreForge Site Design

**Audience:** advanced code/design agents and human frontend developers.  
**Authority:** this is the repository-root contract for first-party LoreForge site Designs. Read `AGENTS.md` first.

---

# 1. What a LoreForge Design Is

A LoreForge Design is a **complete presentation layer** over LoreForge’s authorized semantic Page Models.

It owns:

- site Shell structure;
- Home composition;
- Records composition;
- Document reading composition;
- Departments composition;
- Department composition;
- About composition;
- Lore composition;
- Members directory composition (OBSIDIAN-T01);
- Work composition (OBSIDIAN-T01);
- Domain-local operational/management surfaces: Department management, Folder management, Role management, Document Type management, People search, the individual person/Character workspace, and Invitations (OBSIDIAN-T01);
- its visual styles;
- its configuration schema;
- defaults;
- config validation/migration;
- its Site Studio editor;
- its preview thumbnail.

Operational surfaces are presentation-owned: LoreForge core owns the authorized
semantic Page Models, capability derivation, mutation endpoints/server actions,
and reusable interaction workspaces. A Design arranges those surfaces visually;
it never queries Payload, reproduces permission evaluators, or builds a second
state machine. (The operational slots are declared optionally at T01 and become
required for first-class status at conformance — see §19.)

It does **not** own:

- authentication;
- authorization;
- Payload queries;
- record visibility;
- Folder visibility;
- hidden counts;
- workflow semantics;
- canonical routes;
- search authorization;
- acting Character logic.

The core rule is:

> **LoreForge decides what the viewer may know and do. A Design decides how that safe information and those allowed capabilities look.**

---

# 2. First-Class Design Mental Model

The runtime is:

```text
Request
  │
  ▼
Domain / User / Acting Character resolution
  │
  ▼
Authorization
  │
  ▼
Server Page Model
  │
  ▼
resolveDomainDesign()
  │
  ├─ active Design
  ├─ validated saved config
  └─ Design runtime CSS variables
  │
  ▼
Design Shell + Design Page
```

Interactive Records adds one layer:

```text
RecordsPageModel
  │
  ▼
useRecordsWorkspace()
  │
  ▼
shared Records action semantics
  │
  ▼
YOUR Records composition
```

A Design never reaches backward around this seam.

---

# 3. Required Folder

Create:

```text
src/designs/<key>/
```

A normal first-class Design should look roughly like:

```text
src/designs/my-design/
├─ index.ts
├─ config.ts
├─ MyDesignShell.tsx
├─ MyDesignShell.module.scss
├─ MyDesignHome.tsx
├─ MyDesignHome.module.scss
├─ MyDesignRecords.tsx
├─ MyDesignRecords.module.scss
├─ MyDesignDocument.tsx
├─ MyDesignDocument.module.scss
├─ MyDesignDepartments.tsx
├─ MyDesignDepartment.tsx
├─ MyDesignAbout.tsx
├─ MyDesignLore.tsx
├─ MyDesignThin.module.scss
├─ studio/
│  ├─ MyDesignStudio.tsx
│  └─ MyDesignStudio.module.scss
└─ my-design.design.test.tsx
```

Combine small thin-page files if that is clearer. Do not create empty files only for symmetry.

Your presentation CSS belongs in this folder.

---

# 4. Portable Package Contract and Registration

The current compile-time contract is folder-driven. A Design package must
contain a manifest and its complete bundled defaults:

```text
src/designs/<key>/
├─ design.manifest.json
├─ index.ts
├─ assets/
│  └─ ...
└─ presentation/config/studio files
```

The manifest is pure data and must contain:

```json
{
  "manifestVersion": 1,
  "designContractVersion": 1,
  "key": "my-design",
  "name": "My Design",
  "status": "first-class",
  "description": "...",
  "entry": "./index.ts",
  "preview": { "thumbnail": "assets/thumbnail.svg" }
}
```

`src/designs/<key>/assets/**` is authoritative. Discovery materializes it to
`public/design-assets/<key>/**`; do not hand-edit that generated tree. Bundled
references use `/design-assets/<key>/...`. Site Studio uploads remain
`/media/...` overrides and never modify the package.

Discovery generates the key set, pure catalog, and static registry. Do not add
keys to `src/lib/design/catalog.ts`, `registry.ts`, `types.ts`, legacy theme
maps, Payload collections, or route dispatch code. A new package must compile
without a core key-list edit. The historical V2 migration adapter only knows
the designs present when that migration was authored; a later package resolves
its own defaults when read.

Run the package checks from the repository root:

```bash
npm run design:discover
npm run design:audit
npm run test:design-dropin
```

The boundary audit permits generic host imports and reports them for Lab
emulation, but fails cross-Design imports, source-folder escapes, unsanctioned
asset references, and manifest/entry mismatches. A Design cannot add an npm
dependency merely by containing a `package.json`; dependencies remain root
application dependencies and require the normal install/review path.

The exact install workflow is:

```text
copy folder -> src/designs/<key>/
npm install (only if root package dependencies changed)
npm run build
select the Design in Site Studio
```

For a normal new Design, no registration files outside its folder should need
editing. Generated files and the checked-in host-dependency report change when
discovery/audit runs.

You should **not** need to modify:

```text
SiteStudio.tsx
authorization code
Page Model builders
TenantShell shared CSS
records search behavior
document lifecycle behavior
Payload collections
```

merely to add a Design.

If you do, determine why before proceeding.

---

# 5. First-Class Status

New Designs MUST register as:

```ts
status: 'first-class'
```

`compatibility` status exists only for historical LoreForge Designs that predate the completed Design contract.

Do not use compatibility status to bypass requirements.

---

# 6. Design Config Contract

Every Design owns its settings type.

Example:

```ts
export type MyDesignConfigV1 = {
  atmosphere: 'quiet' | 'dramatic'
  accent: string

  navigation: {
    mode: 'floating' | 'rail'
  }

  cards: {
    radius: 'square' | 'soft'
    motion: 'off' | 'subtle'
  }

  document: {
    treatment: 'sheet' | 'dossier'
  }

  heroImage: DesignAssetRef | null
}
```

This type should describe concepts that make sense for **your Design**.

Do not create fake universal axes such as:

```text
headerLayout
documentStyle
contentWidth
```

unless those words truly make sense in your visual system.

---

# 7. Config Version

Every Design declares:

```ts
config.version
```

Start a new Design at:

```ts
1
```

The version belongs to that Design, not to the Domain-level persistence envelope.

When you later change the persisted shape:

1. increment the Design config version;
2. implement migration from older versions;
3. test old saved config;
4. never silently reinterpret an old field to mean something different.

---

# 8. Defaults

Every Design must provide a complete valid defaults object:

```ts
config.defaults
```

A customer selecting the Design for the first time sees these defaults.

Therefore defaults are part of the art direction.

Do not make defaults a neutral gray placeholder just because customization exists.

A first-time Design selection should immediately look intentional.

---

# 9. Validation

Every Design implements:

```ts
config.validate(raw)
```

Return:

```ts
{ ok: true, value }
```

or:

```ts
{ ok: false, errors }
```

Validate every persisted field.

Requirements:

- color strings: strict supported format;
- enum values: explicit allowlist;
- numbers: finite and bounded;
- strings: bounded length;
- media refs: local `/media/...` only;
- nested objects: exact expected shape.

Never accept:

- CSS text;
- HTML;
- JavaScript;
- arbitrary URLs for scripts/fonts;
- functions;
- executable expressions.

The Design config is data.

---

# 10. Migration

Implement:

```ts
config.migrate(fromVersion, raw)
```

A brand-new version-1 Design may reject all versions other than 1.

When version 2 exists later:

```text
stored v1
   ↓
migrate
   ↓
validate v2
   ↓
render
```

Do not write database data from the renderer.

Persistence migration is handled by the application save/migration layer.

---

# 11. Theme Resolution

Your Design provides a function through its config contract that resolves visual tokens from validated config.

It must produce the universal base theme required by shared LoreForge functional components:

```text
--tenant-primary
--tenant-secondary
--tenant-accent
--tenant-page-bg
--tenant-surface-bg
--tenant-surface-border
--tenant-text-on-primary
--tenant-heading-font
--tenant-body-font
--tenant-muted-text
```

You may add unlimited Design-owned variables.

Prefix them:

```text
--my-design-...
```

Examples:

```text
--obsidian-glow
--obsidian-panel-opacity
--gazette-rule-width
--arcology-rail-width
```

Do not add a new global semantic token merely because one Design wants it.

---

# 12. Fonts

Use the shared LoreForge font catalog/utilities unless a separate approved dependency is deliberately added.

A Design may expose:

```text
Technical
Editorial
Monumental
```

as curated typography choices and internally map those to several fonts/weights.

You do not have to expose generic Heading Font / Body Font controls.

That is the point of Design-owned customization.

---

# 13. Site Studio Editor

Every Design exports a real React editor component.

Conceptually:

```tsx
export function MyDesignStudio({
  value,
  onChange,
  domain,
  uploadAsset,
}: DesignStudioEditorProps<MyDesignConfigV1>) {
  // Design-specific UI
}
```

The editor receives:

- the current draft config;
- `onChange`;
- Domain identity data;
- authorized Design-media upload helper.

It does **not**:

- save to Payload directly;
- query the database;
- implement its own permissions;
- own the global Save button;
- own the Design picker.

---

# 14. What Site Studio Owns

The shared Site Studio host owns:

```text
Design picker
Save
Revert
Restore this Design's defaults
dirty state
validation errors
desktop/mobile preview
preview surface selector
global Domain logo identity control
Design-media upload plumbing
```

Do not add Design-specific branches to the host.

Wrong:

```ts
if (activeDesign === 'obsidian') {
  return <GlowSlider />
}
```

Right:

```tsx
const Editor = design.studio.Editor

<Editor
  value={draft}
  onChange={setDraft}
  ...
/>
```

---

# 15. Shared Studio Primitives

You may use reusable accessible inputs under:

```text
src/designs/shared/studio/fields.tsx
```

Typical examples:

```text
ColorField
FontField
ChoiceCards
RangeField
ToggleField
DesignAssetField
```

These are implementation conveniences.

They do not define the settings your Design must have.

A bespoke editor layout is expected.

---

# 16. Per-Design Saved Banks

LoreForge persists separate banks:

```text
activeDesign
settingsByDesign
```

Your Design only owns:

```text
settingsByDesign[my-design]
```

A customer may:

```text
customize MyDesign
switch to another Design
customize that
switch back
```

and expect MyDesign to restore exactly.

Do not store your Design settings in global legacy theme scalar fields.

---

# 17. Design Media

Use the shared authorized Design upload helper.

It returns:

```ts
{
  url: '/media/...'
}
```

Store the returned `DesignAssetRef` in your config.

Examples of Design-specific media roles:

```text
hero image
paper texture
background atmosphere
masthead image
ornament image
```

Global Domain logo/seal remains shared Domain identity and is already supplied in the Shell model.

Do not fetch third-party image URLs at runtime from config.

---

# 18. Shell Contract

Your Shell receives:

- authorized `DomainShellModel`;
- validated Design runtime/config;
- `children`.

It must render all required application access.

Required:

1. `OperatingContext` exactly once;
2. Domain identity;
3. global logo/seal if present, if your art direction uses it;
4. every `primaryNavigation` item;
5. Work route;
6. every supplied `managementNavigation` item;
7. `children`;
8. a route back to the LoreForge dashboard/account surface;
9. responsive navigation;
10. usable keyboard focus.

You may render these in any composition.

Examples:

```text
floating top navigation
persistent left rail
full-screen masthead
newspaper index
minimal icon rail
```

Do not independently calculate which management links are allowed.

If the model supplied the link, render it.

If the model did not supply it, do not invent it.

---

# 19. Management Pages

Domain-local operational/management pages are **Design-owned presentation** over
shared authorization-safe Page Models and workspaces (OBSIDIAN-T01, supersedes
the old rule that they were shared generic surfaces).

A first-class Design owns a body for each of:

```text
Work
Members directory
Department management
Folder management
Role management
Document Type management
People search
person/Character workspace
Invitations
```

Core owns semantics and behavior for all of these:

- authorization-safe Page Model builders;
- capability derivation (manage/assign/archive/restore flags);
- guarded mutation endpoints and server actions;
- shared interactive workspaces (`useFolderManagementWorkspace`,
  `useRoleManagementWorkspace`, `useDocumentTypesManagementWorkspace`,
  `usePeopleManagementWorkspace`), so two Designs never implement a second
  search/selection/mutation state machine.

Requiredness ladder (authoritative as of OBSIDIAN-T08/T09): the operational
slots are **required in the type** — every `DesignDefinition` must declare
`work`, `members`, and all seven `management.*` bodies to compile — and the
**conformance gate enforces** the full declared set for first-class status
(`operationalSlots.design.test.ts` + `managementGate.design.test.tsx`). Poster
satisfies them through explicitly marked compatibility renderers
(`poster/operational.tsx`, `status: 'compatibility'`) without lowering the
first-class standard. The ladder is closed: optional-declaration machinery from
T01 has been removed.

Genuinely shared editors remain shared: Templates, Forms, document
create/edit/import flows, page editors, the review queue, and Site Studio render
inside the selected Design's Shell via the design-aware `TenantShell`
compatibility wrapper and stay usable under every Design.

Do not reach into shared editor internals with fragile global selectors.

---

# 20. Home Contract

`HomePageModel` is semantic.

Your Home renderer must represent:

- Domain identity/context as appropriate;
- welcome content;
- edit affordance if supplied;
- destination links;
- recent Records;
- empty state.

You may render these as:

```text
hero
ticker
cards
editorial columns
dashboard modules
timeline
```

Do not omit required navigation because it does not fit the art direction.

---

# 21. Records Contract

Records is interactive.

Your Records component is normally a client component and uses:

```ts
useRecordsWorkspace(model)
```

plus shared Records presentation/action semantics.

Do not implement a second search engine.

Required capabilities when supplied:

```text
Folder navigation
nested Folder expansion or equivalent traversal
search
search-subfolders
Document Type filtering/exposure
pagination/load-more
New Document
Import
View
Edit
Supersede
Delete
Create Folder
Create Subfolder
Rename Folder
Delete Folder
supersession representation
empty state
```

A Design may use:

```text
row menu
card menu
command palette
marginal controls
drawer
context menu
```

The capability must remain reachable.

---

# 22. Records Security

Client capability flags are UI information, not authorization.

The server endpoint enforces access again.

Never use the Design to decide:

```text
Can this Character edit?
Can this Character see this hidden Folder?
Can this Character discover this superseded title?
```

The Page Model/search endpoint answers those questions.

---

# 23. Document Contract

Your Document renderer must represent, when supplied:

```text
title
body HTML
raw/source text
metadata
prepared-by
tags
concerns
lifecycle state
status/error notice
predecessor (supersedes)
successor (supersededBy)
```

Required actions when supplied:

```text
Edit
History
Submit
File
Approve
Deprecate
Restore
Lock
Unlock
Supersede
Delete
```

Use shared Document action descriptors/bridges.

You own composition and styling.

---

# 24. Departments Contract

Departments page must represent:

- configured Departments;
- name;
- description;
- member count;
- manage link if supplied;
- empty state.

Department detail must represent:

- name;
- description;
- visible Folder names;
- members;
- management link if supplied;
- destinations.

You may turn these into maps/cards/indexes/etc.

Do not query extra member/folder data from the Design.

---

# 25. About Contract

Render:

- safe `bodyHtml`;
- Edit affordance if supplied;
- semantic destinations where your layout uses them.

Do not sanitize Markdown in the Design. The server-side content pipeline already owns that.

---

# 26. Lore Contract

Lore is currently a thin semantic surface.

Render at least:

- Lore page identity;
- destinations supplied by the model.

Do not invent DB queries simply to make Lore richer.

If a future product phase adds semantic Lore content, the Page Model will grow.

---

# 27. Shared Presentation: What Is Allowed

A first-class Design may import shared **behavioral / low-level** pieces.

Examples:

```text
OperatingContext
Records workspace
Records action semantics
Document action semantics
RecordActionsProvider
accessible dialog primitives
Site Studio input primitives
font catalog
color utilities
Page Model types
```

A first-class Design must not import another Design's presentation.

---

# 28. Forbidden Imports

For a first-class Design, do not import presentation from:

```text
@/app/**
@/components/theme/**
@/designs/<other-design>/**
legacy ShellFrame
legacy thin views
route-local *.module.scss
```

Do not import data/security from:

```text
Payload client/config
collection definitions
authz evaluators
tenant query helpers
database adapters
```

The tooling enforces much of this.

---

# 29. Styling Ownership

All site presentation CSS for your Design belongs under:

```text
src/designs/<key>/
```

Do not add:

```scss
[data-template='my-design'] ...
```

to shared stylesheets.

Do not make a shared Shell DOM contort itself into your Design.

If your Design needs a different structure, write a different Shell.

---

# 30. Global CSS

Avoid global selectors.

Do not style generic LoreForge management pages through global descendant selectors.

CSS Modules are the default.

If a visual library requires global CSS, scope it carefully and verify it does not alter other Designs or Payload/LoreForge management surfaces.

---

# 31. React Server / Client Rules

Read `AGENTS.md` and the installed Next.js docs before editing.

General rule:

- data-pure pages should remain server-renderable when practical;
- Records is interactive and normally uses `'use client'`;
- Studio Editor is client-side;
- browser effects need a client boundary;
- do not pull server-only auth/data modules into client components.

`npm run build` is a mandatory test.

---

# 32. Motion / Effects

Rich first-party Designs may use:

```text
Motion
CSS animation
parallax
WebGL
shader backgrounds
scroll reveal
glass effects
```

Requirements:

- respect `prefers-reduced-motion`;
- required functionality cannot depend on animation;
- do not hide controls behind hover-only behavior;
- heavy browser-only dependencies should be Design-scoped and dynamically loaded where appropriate;
- another Design should not pay unnecessary client bundle cost for your effect.

---

# 33. Adding a Visual Dependency

You may add a dependency when it materially improves the Design.

Before adding it:

1. confirm it is appropriate for React/Next version in this repo;
2. scope use to your Design;
3. avoid global side effects;
4. verify build;
5. verify reduced-motion behavior;
6. document it in your Design code/comments if non-obvious.

Do not add a generic visual framework to core LoreForge merely for one Design.

---

# 34. Thumbnail

Add a real Design thumbnail inside the package:

```text
src/designs/<key>/assets/thumbnail.svg
```

The manifest points to it with:

```ts
preview: { thumbnail: 'assets/thumbnail.svg' }
```

The generated catalog/registry expose the public URL under
`/design-assets/<key>/thumbnail.svg`.

The image should show the actual visual language.

Do not use the generic wireframe placeholder.

---

# 35. Preview

Site Studio can preview real:

```text
Home
Records
Document
Departments
```

using deterministic Page Model fixtures.

Your components must render correctly with those fixtures.

Preview must not query the DB.

Links/forms are inert in the preview.

---

# 36. Config Defaults and Preview

The Studio preview uses the current **draft config**, not only the saved config.

If a customer adjusts:

```text
glow
paper color
rail width
document treatment
```

the preview should update immediately without Save.

---

# 37. Registration Procedure

After your folder is complete:

### Step 1

Add `design.manifest.json`, `index.ts`, the full Design contract, and all
Design-owned defaults under `src/designs/<key>/`.

### Step 2

Run `npm run design:discover` and `npm run design:audit`. Discovery owns the
generated keys/catalog/registry; the audit owns the host dependency report.

### Step 3

Run `npm run test:design-dropin`, then the full checks in §41. Select the Design
through Site Studio after the build completes.

Do not add your key to global header/document/theme maps. Those are legacy concepts.

---

# 38. Minimal `index.ts` Example

The exact final types in the repository are authoritative, but a new Design should conceptually resemble:

```ts
import type { DesignDefinition } from '@/lib/design/types'

import {
  myDesignConfig,
  type MyDesignConfigV1,
} from './config'

import { MyDesignStudio } from './studio/MyDesignStudio'
import { MyDesignShell } from './MyDesignShell'
import { MyDesignHome } from './MyDesignHome'
import { MyDesignRecords } from './MyDesignRecords'
import { MyDesignDocument } from './MyDesignDocument'
import { MyDesignDepartments } from './MyDesignDepartments'
import { MyDesignDepartment } from './MyDesignDepartment'
import { MyDesignAbout } from './MyDesignAbout'
import { MyDesignLore } from './MyDesignLore'

export const myDesign: DesignDefinition<MyDesignConfigV1> = {
  key: 'my-design',
  status: 'first-class',
  name: 'My Design',
  description: 'A concise description of its visual identity.',

  preview: {
    thumbnail: '/design-assets/my-design/thumbnail.svg',
  },

  config: myDesignConfig,

  studio: {
    Editor: MyDesignStudio,
  },

  Shell: MyDesignShell,

  pages: {
    home: MyDesignHome,
    records: MyDesignRecords,
    document: MyDesignDocument,
    departments: MyDesignDepartments,
    department: MyDesignDepartment,
    about: MyDesignAbout,
    lore: MyDesignLore,
  },
}
```

---

# 39. Minimal Config Example

```ts
export const MY_DESIGN_DEFAULTS: MyDesignConfigV1 = {
  atmosphere: 'quiet',
  accent: '#66D9EF',
  navigation: {
    mode: 'floating',
  },
  cards: {
    radius: 'soft',
    motion: 'subtle',
  },
  document: {
    treatment: 'sheet',
  },
  heroImage: null,
}

export const myDesignConfig = {
  version: 1,

  defaults: MY_DESIGN_DEFAULTS,

  validate(raw: unknown) {
    // exact shape + allowlists + bounds
  },

  migrate(fromVersion: number, raw: unknown) {
    if (fromVersion !== 1) {
      return {
        ok: false,
        errors: [`Unsupported My Design config v${fromVersion}`],
      }
    }

    return this.validate(raw)
  },

  resolveTheme(config: MyDesignConfigV1) {
    return {
      base: {
        primary: ...,
        secondary: ...,
        accent: ...,
        pageBg: ...,
        surfaceBg: ...,
        surfaceBorder: ...,
        textOnPrimary: ...,
        headingFont: ...,
        bodyFont: ...,
        mutedText: ...,
      },

      vars: {
        '--my-design-atmosphere': config.atmosphere,
      },
    }
  },
}
```

Do not copy another Design's config fields unless they genuinely match your art direction.

---

# 40. Testing Your Design

At minimum create:

```text
src/designs/<key>/<key>.design.test.tsx
```

Use shared conformance helpers.

Required automated coverage:

### Config

- defaults validate;
- invalid enum rejected;
- invalid color rejected;
- invalid media URL rejected;
- migration behavior.

### Shell

- Domain identity;
- all primary nav;
- Work;
- management links;
- children;
- account/operating context.

### Home

- welcome;
- destinations;
- recent Records;
- edit link;
- empty state.

### Records

- search;
- Folder navigation;
- type filter;
- pagination;
- New;
- Import;
- View;
- Edit;
- Supersede;
- Delete;
- Folder CRUD;
- supersession.

### Document

- source;
- predecessor/successor;
- lifecycle actions;
- tags/concerns;
- status;
- Design-specific treatment.

### Thin pages

- Departments;
- Department;
- About;
- Lore.

### Studio

- editor renders current config;
- change emits a valid next config;
- defaults render;
- preview can consume draft.

---

# 41. Commands Before Completion

Run:

```bash
npm test
npm run test:security
npm run test:p07x-t11
npm run test:design
npm run design:audit:check
npm run test:design-dropin
npx tsc --noEmit
npm run lint
npm run build
```

Do not call a Design complete if only `npm run dev` works.

---

# 42. Manual Test Matrix

Test your Design with:

```text
anonymous visitor where supported
ordinary member
delegated manager
Domain Admin
Platform Admin entering the Domain appropriately
```

Test:

```text
desktop
mobile
keyboard
reduced motion
empty Domain
populated Domain
long Domain name
missing logo
large logo
long Record title
many Folders
supersession
no management permissions
full management permissions
```

---

# 43. Design Switching Test

This is mandatory.

1. Customize your Design.
2. Save.
3. Switch to another Design.
4. Save/customize the other Design.
5. Switch back.
6. Confirm your Design bank is restored exactly.
7. Reload browser.
8. Confirm it is still restored.

If settings leak between Designs, stop. Do not patch the individual Design around it.

---

# 44. Security Test

A Design is presentation, not a security boundary.

Still verify:

- hidden Records do not appear;
- hidden Folder names/counts do not appear;
- inaccessible supersession titles do not appear;
- unavailable actions do not render;
- management entries absent from Shell model are not invented.

If you discover missing data, do not query the DB from the Design.

---

# 45. Extending a Page Model

Sometimes the Design brief may reveal genuinely useful semantic data missing from a Page Model.

Allowed process:

1. identify the semantic fact;
2. confirm it is not a layout concept;
3. add it to the Page Model type;
4. assemble it server-side;
5. authorize/filter it server-side;
6. add security regression coverage;
7. let all Designs ignore it if they do not need it.

Good:

```text
featuredRecentRecord
department.description
record.documentTypeLabel
```

Bad:

```text
leftRailItems
heroColumnWidth
gazetteTopStorySlot
```

Do not make Page Models specific to one Design's grid.

---

# 46. Things a Design Agent Has Free Rein Over

Within the contract, be ambitious.

You may radically change:

```text
Shell DOM
navigation composition
hero
typography
surface treatments
page geometry
Records visualization
Document reading
animations
responsive strategy
department presentation
empty states
Studio UI
Design config concepts
```

This is intentionally a large creative sandbox.

---

# 47. Things a Design Agent Does NOT Have Free Rein Over

Do not change these merely to make the visual design easier:

```text
authorization semantics
Character kinds
role permissions
Folder visibility
Document lifecycle
supersession semantics
canonical routes
server search rules
Domain ownership
management capability logic
Page Model security boundaries
```

Those are LoreForge core.

---

# 48. Failure Smells

Stop and inspect the architecture if you find yourself doing any of these:

```text
adding [data-template='my-design'] to shared CSS
adding if (design === 'my-design') to SiteStudio
copying useRecordsWorkspace
querying Payload inside MyDesignRecords
importing another Design's SCSS
importing route-level SCSS
adding your layout enum to a global HEADER_LAYOUTS map
hiding a required capability because the layout has no place for it
storing arbitrary CSS in config
```

These are seam violations.

---

# 49. Reference Designs

Use the completed first-class Designs as examples for **contract**, not as templates for art direction:

```text
src/designs/civic
src/designs/ledger
src/designs/obsidian
```

Civic demonstrates an institutional masthead/portal.

Ledger demonstrates a structurally different editorial rail/register.

Obsidian demonstrates an atmospheric night-harbour treatment while consuming
the same authorized Page Models, operational contracts, and shared mutation
workspaces.

A new Design should not become “Civic with different colors” merely because Civic is easy to copy.

---

# 50. Definition of a Finished New Design

A new Design is complete when:

> It can be selected, customized through its own editor, saved, previewed, switched away from and restored, and can present every required LoreForge page/capability without modifying core authorization/workflow behavior or shared presentation CSS.

The ideal implementation footprint is:

```text
mostly src/designs/<key>/
+ one catalog hook
+ one registry hook
+ one thumbnail
+ tests
```

That is the seam this repository is designed to provide.
