# LoreForge Design Bible
## Technical Contract for Creating a First-Class LoreForge Design

**Status:** Current design-authoring contract for the compile-time Design-folder architecture and production-symmetric Design Lab
**Audience:** visual/design agents, frontend implementers, and reviewers building a new first-class LoreForge Design
**Intended repository location:** repository root as `DESIGN_BIBLE.md` (and ultimately as the authority replacing or superseding the older `DESIGN_AUTHORING.md`)
**Core rule:** **LoreForge core decides what the viewer may know and do. A Design decides how that authorized information and those supplied capabilities look and feel.**

---

# 1. Purpose of this document

This document is the complete technical handoff for designing and implementing a new LoreForge presentation system.

A design agent should be able to receive:

1. this document;
2. an artistic brief;
3. the current repository;

and then build the visual Design without reverse-engineering LoreForge authorization, Payload collections, workflow rules, or route behavior.

The design agent is expected to make **artistic and interaction-presentation decisions**. It is **not** expected to rediscover or reimplement product semantics.

This document defines:

- what a LoreForge Design is;
- the complete first-class Design registration contract;
- the Shell contract;
- every required Design-owned page surface;
- the shared workspace/controller seams used by interactive pages;
- the Domain-local routes that remain shared functional/editor surfaces;
- the Design configuration and Site Studio contract;
- allowed and forbidden dependencies/imports;
- media, fonts, CSS, motion, and accessibility rules;
- preview requirements;
- registration steps;
- test and conformance requirements;
- the protocol for requesting a missing semantic fact;
- the exact deliverables expected from a design-authoring agent.

This is deliberately a **technical bible**, not an art-direction document.

---

# 2. Authority and transition note

LoreForge already contains earlier design-authoring material created while the first design seam was being established.

That document remains useful background, but one rule from the earlier architecture is obsolete:

> Management bodies are not merely shared generic pages that a Design wraps.

The target architecture treats recurring Domain-local management/operational surfaces as part of the first-class Design presentation contract while keeping their data, authorization, mutations, and reusable interaction machinery in LoreForge core.

The management-contract and compile-time portability patches are now the frozen implementation baseline. Therefore:

- this document defines the **current authoring contract**;
- the exact TypeScript names in the production checkout remain authoritative if spelling differs;
- semantic ownership described here is not optional merely because a branch temporarily has transitional adapters;
- a design agent must not work around a missing final seam by importing Payload, route code, or another Design.

If the repository and this document disagree materially, treat that as contract drift and resolve it before adding another Design.

## 2.1 Current compile-time and Lab baseline

The production checkout is the contract oracle. A first-class Design is trusted
application source compiled into the normal production build; it is not a
runtime plugin and it is not a Lab-specific implementation.

Every installable Design folder contains:

```text
src/designs/<key>/
├─ design.manifest.json
├─ index.ts                 # default export is the portable entrypoint
├─ config.ts
├─ assets/                  # bundled defaults, including thumbnail.svg
└─ ...                      # Design-owned presentation source
```

The manifest is pure data and uses `manifestVersion: 1`,
`designContractVersion: 1`, a folder-matching lowercase key, an optional
bounded `sortOrder`, `entry: './index.ts'`, and a thumbnail path inside
`assets/`. Production discovery validates each
manifest and generates the static key set, catalog, registry, and materialized
asset namespace under `src/lib/design/generated/` and
`public/design-assets/<key>/`. Adding or removing a Design requires no hand
edit to a key union, registry, catalog, validator list, or Site Studio selector.
There is no arbitrary runtime code loader.

The Design Lab is a second host for the same folder. The reusable Design
folder is copied unchanged between:

```text
design-lab/src/designs/<key>/
sl-civic-archive/src/designs/<key>/
```

Lab-only fixtures, in-memory workspaces, API/form interception, Next
navigation shims, and visible host fallbacks live outside that folder. The Lab
mirrors the production import paths and observable host contracts; it does not
replace them with a second author-facing Design API. Production remains the
oracle when a concept conflicts.

The frozen Obsidian baseline has 16 Class A slots, three parity viewports, and
no singular `pages.member` slot. The approved parity packet records 48
production-oracle/Lab comparisons with zero pixel, authored-DOM, asset, or
semantic-input mismatches. The evidence is retained under
`design-lab/docs/parity/parity-review/`; the machine-readable result is
`manifest.json`.

---

# 3. The mental model

A LoreForge Design is a **complete presentation layer over authorized semantic application models and shared behavior contracts**.

The normal request path is:

```text
Request
  |
  v
Domain / User / Acting Character resolution
  |
  v
Authorization
  |
  v
Server Page Model
  |
  v
resolveDomainDesign()
  |
  +-- selected Design
  +-- validated per-Design config
  +-- resolved Design theme/runtime
  |
  v
Selected Design Shell
  |
  v
Selected Design page renderer
```

Interactive surfaces add a shared behavior layer:

```text
Authorized Page Model
  |
  v
Shared workspace/controller/action bridge
  |
  +-- selection/state
  +-- authorized operation descriptors
  +-- mutation/fetch behavior
  +-- loading/error state
  |
  v
Selected Design presentation
```

Examples:

```text
RecordsPageModel
  -> useRecordsWorkspace()
  -> MyDesignRecords

FolderManagementPageModel
  -> useFolderManagementWorkspace()
  -> MyDesignFolderManager

RoleManagementPageModel
  -> useRoleManagementWorkspace()
  -> MyDesignRoles
```

The Design may radically change layout and interaction presentation.

The Design may **not** reach backward around those seams.

---

# 4. What the Design owns

A first-class Design owns the presentation of the Domain experience.

It owns:

- Shell DOM and overall visual architecture;
- navigation composition;
- page geometry;
- responsive behavior;
- typography;
- color and surface treatment;
- visual hierarchy;
- iconography;
- motion and atmosphere;
- loading, empty, and error presentation;
- Home composition;
- Records composition;
- Document reading composition;
- Departments directory;
- Department detail;
- About;
- Lore;
- Members directory;
- Members-directory presentation (`pages.members`); the current contract has no separate `pages.member` slot;
- Domain Work presentation;
- Department-management presentation;
- Folder-management presentation;
- Role-management presentation;
- Document-Type-management presentation;
- People-search presentation;
- person/member-management workspace presentation;
- Invitation-management presentation;
- Design-specific configuration vocabulary;
- config defaults;
- config validation and migration;
- theme/runtime resolution;
- Design-specific Site Studio editor;
- Design preview thumbnail;
- Design-scoped styles and visual dependencies.

---

# 5. What LoreForge core owns

The Design does **not** own:

- authentication;
- User identity;
- Acting Character resolution;
- Character-kind rules;
- Domain membership rules;
- authorization policy;
- role-permission semantics;
- Folder visibility;
- Document visibility;
- hidden counts;
- document lifecycle semantics;
- workflow transitions;
- supersession semantics;
- canonical routes;
- tenant/domain scoping;
- Payload queries;
- database access;
- search authorization;
- invitation semantics;
- role assignment semantics;
- mutation authorization;
- server-side sanitization;
- shared search/fetch endpoints;
- shared editor engines;
- persistence of the Domain-level design envelope;
- global account/platform administration.

A Design never becomes a security boundary.

Client capability flags are presentation information only. Every server mutation still re-authorizes.

---

# 6. First-class Design folder

Create:

```text
src/designs/<design-key>/
```

A substantial Design will normally look roughly like:

```text
src/designs/<design-key>/
├─ design.manifest.json
├─ index.ts                         # default export is the portable entrypoint
├─ config.ts
├─ <Design>Shell.tsx
├─ <Design>Shell.module.scss
├─ assets/
│  ├─ thumbnail.svg
│  └─ ...                            # bundled Design defaults
│
├─ public/
│  ├─ <Design>Home.tsx
│  ├─ <Design>Records.tsx
│  ├─ <Design>Document.tsx
│  ├─ <Design>Departments.tsx
│  ├─ <Design>Department.tsx
│  ├─ <Design>About.tsx
│  ├─ <Design>Lore.tsx
│  ├─ <Design>Members.tsx
│  └─ <Design>Member.tsx
│
├─ operational/
│  ├─ <Design>Work.tsx
│  ├─ <Design>ManageDepartments.tsx
│  ├─ <Design>FolderManager.tsx
│  ├─ <Design>Roles.tsx
│  ├─ <Design>DocumentTypes.tsx
│  ├─ <Design>People.tsx
│  ├─ <Design>Person.tsx
│  └─ <Design>Invitations.tsx
│
├─ studio/
│  ├─ <Design>Studio.tsx
│  └─ <Design>Studio.module.scss
│
├─ shared/
│  └─ Design-owned presentational helpers only
│
└─ <design-key>.design.test.tsx
```

This is an organizational example, not a file-count mandate.

Small pages may be combined. Do not create empty files merely for symmetry.

All Design-specific presentation CSS belongs under the Design folder unless a documented library requires a narrowly scoped global import.

---

# 7. Target `DesignDefinition` contract

The final repository types are authoritative, but a first-class Design should conceptually satisfy this complete contract:

```ts
type DesignView<TModel, TConfig> = ComponentType<
  TModel & DesignVariantProps & DesignConfigProps<TConfig>
>

export type DesignDefinition<TConfig extends object> = {
  key: DesignKey
  status: 'first-class'
  name: string
  description: string

  preview: {
    thumbnail: string
  }

  config: DesignConfigContract<TConfig>

  studio: {
    Editor: ComponentType<DesignStudioEditorProps<TConfig>>
  }

  Shell: ComponentType<DesignShellProps<TConfig>>

  pages: {
    home: DesignView<HomePageModel, TConfig>
    records: ComponentType<RecordsDesignViewProps & DesignConfigProps<TConfig>>
    document: ComponentType<DocumentDesignViewProps & DesignVariantProps & DesignConfigProps<TConfig>>
    departments: DesignView<DepartmentsPageModel, TConfig>
    department: DesignView<DepartmentPageModel, TConfig>
    about: DesignView<AboutPageModel, TConfig>
    lore: DesignView<LorePageModel, TConfig>
    members: DesignView<MembersPageModel, TConfig>
    work: ComponentType<WorkDesignViewProps & DesignVariantProps & DesignConfigProps<TConfig>>

    management: {
      departments: DesignView<DepartmentsManagementPageModel, TConfig>
      folders: DesignView<FolderManagementPageModel, TConfig>
      roles: DesignView<RoleManagementPageModel, TConfig>
      documentTypes: DesignView<DocumentTypesManagementPageModel, TConfig>
      people: DesignView<PeopleManagementPageModel, TConfig>
      person: DesignView<PersonManagementPageModel, TConfig>
      invitations: DesignView<InvitationsManagementPageModel, TConfig>
    }
  }
}
```

The current implementation passes `designConfig` to Shell/page renderers and
passes the resolved `theme` to the Shell. Interactive surfaces receive the
production action/workspace bridges through their production-shaped props.
The Lab may use an internal runtime object to assemble those props, but
`DesignRuntime`, Lab workspace props, and a Lab-only `member` slot are not
portable Design API requirements.

`DesignVariantProps` (`headerLayout` and `documentStyle`) remains a narrow
legacy transition projection in the current production type; new Designs own
their real visual vocabulary in `config` and must not add new universal axes.

The invariant is:

> Every Design renderer receives its authorized semantic model plus the validated runtime/config information intended for that Design. It must not reconstruct either one itself.

The new operational slots should be **required** once the management-contract patch is complete. Do not make omission of an operational surface a permanent supported state for a first-class Design.

---

# 8. Design runtime/config passed to renderers

A Design must have access to its **validated** config at render time. The
current production boundary is deliberately simple:

```ts
type DesignConfigProps<TConfig> = {
  designConfig: TConfig
}

type DesignShellProps<TConfig> = {
  model: DomainShellModel
  theme: {
    tokens: Record<string, string>
    headerLayout: string
    documentStyle: string
  }
  designConfig: TConfig
  children: React.ReactNode
}

// Transitional production compatibility projection; do not expand it for a
// new Design. New visual vocabulary belongs in TConfig.
type DesignVariantProps = {
  headerLayout: string
  documentStyle: string
}
```

The resolver validates/migrates persisted config and resolves the theme before
these props cross into a Design. A Lab host may assemble the props through an
internal runtime helper, but that helper is not part of the portable Design
contract. A renderer must never receive raw persisted config, reconstruct the
model, or query the database.

The Design must never:

- parse raw persisted config inside a renderer;
- read the Domain's persistence envelope directly;
- fall back to legacy global appearance scalars as its authority;
- reach into another Design's config;
- infer its active state from DOM attributes.

The resolver owns:

```text
saved bank
  -> migration
  -> validation
  -> defaults/fallback
  -> theme resolution
  -> renderer runtime
```

---

# 9. Per-Design saved banks

LoreForge stores Design choice and configuration separately per Design.

Conceptually:

```text
activeDesign
settingsByDesign
  civic: ...
  ledger: ...
  obsidian: ...
  myDesign: ...
```

A Design owns only:

```text
settingsByDesign[myDesign]
```

Required behavior:

1. customize Design A;
2. save;
3. switch to Design B;
4. customize B;
5. save;
6. switch back to A;
7. A's prior settings return unchanged;
8. browser reload preserves them.

A Design must never write its configuration into another Design's bank or into transitional legacy theme fields.

---

# 10. Config contract

Every Design defines its own configuration vocabulary.

Example:

```ts
export type MyDesignConfigV1 = {
  atmosphere: 'quiet' | 'cinematic'
  navigation: {
    treatment: 'floating' | 'rail'
  }
  records: {
    defaultView: 'cards' | 'list'
    cardPageSize: 6 | 12 | 24
    listPageSize: 25 | 50 | 100
  }
  document: {
    treatment: 'sheet' | 'dossier'
  }
  accent: string
  backgroundImage: DesignAssetRef | null
}
```

These settings should describe concepts that make sense for **this Design's art direction**.

Do not manufacture global generic axes merely because older Designs had them.

Avoid fake universal concepts such as:

```text
headerLayout
contentWidth
documentStyle
```

unless those terms truly belong to the new Design.

---

# 11. Config version, defaults, validation, migration

Every Design provides:

```text
config.version
config.defaults
config.validate(raw)
config.migrate(fromVersion, raw)
config.resolveTheme(config)
```

## 11.1 Version

Start a new Design at version `1`.

If persisted shape changes later:

1. increment the Design's version;
2. migrate older versions deliberately;
3. validate the migrated result;
4. add tests for prior stored config;
5. never silently change the meaning of an old field.

## 11.2 Defaults

Defaults are art direction.

A first-time selection must immediately look intentional.

Do not ship neutral placeholder defaults merely because the user can customize them later.

## 11.3 Validation

Validate every persisted field.

Requirements include:

- explicit enum allowlists;
- finite bounded numbers;
- bounded strings;
- strict supported color formats;
- exact object shapes;
- local persisted Design media references only;
- no functions;
- no HTML/CSS/JS expressions;
- no arbitrary remote script or font URLs.

Config is data, not executable styling code.

## 11.4 Migration

Migration returns a valid current-version config or a controlled validation failure.

The renderer never mutates persistence.

---

# 12. Theme resolution

Every Design resolves validated config into the universal tokens needed by shared LoreForge functional surfaces plus unlimited Design-owned tokens.

Required shared semantic base tokens are expected to cover at least:

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

Use the exact current repository token contract if names evolve.

Design-owned tokens should be namespaced:

```text
--my-design-glow
--my-design-rail-width
--my-design-panel-opacity
--my-design-rule-weight
```

Do not add global semantic variables because one Design wants a local visual effect.

---

# 13. Shell contract

The Shell is the visual root of every Domain-local surface that participates in Domain Design selection, including shared functional/editor routes.

It receives:

- authorized `DomainShellModel`;
- validated Design runtime/config;
- `children`.

It must render all required application access supplied by the model.

Required:

1. `OperatingContext` exactly once;
2. Domain identity;
3. global Domain logo/seal when supplied and appropriate to the art direction;
4. every supplied primary-navigation item;
5. Work access;
6. every supplied management-navigation item;
7. children/content region;
8. route back to LoreForge dashboard/account surface;
9. responsive navigation;
10. usable keyboard focus and navigation;
11. no authorization inference.

For the current production shell model, `primaryNavigation` contains these
items in this order:

```text
Home
About
Lore
Departments
Records
```

Work is supplied separately as `model.routes.workUrl`; the current Obsidian
Shell adds that route exactly once to its primary navigation. A Design must
not add Members to primary navigation merely because it owns the Members
directory. `managementNavigation` is a separately authorized list. When a
management item is supplied, it must be reachable through the Design's chosen
management presentation; when it is absent, it must not be invented.

In the current Obsidian presentation, management links are exposed through
the footer `Manage domain` menu and the mobile navigation drawer, with a
screen-reader management navigation landmark retained for semantic reachability.
This placement is an Obsidian implementation detail; the invariant is one
reachable presentation of every supplied item and no unauthorized item.

The Shell may use any composition:

```text
floating navigation
persistent rail
command bar
masthead
full-height workspace frame
editorial index
minimal icon navigation
```

If a management link is present in the model, render it somewhere usable.

If it is absent, do not invent it.

`TenantShell` may remain as a design-aware compatibility wrapper for shared Domain routes. Do not interpret its existence as bypassing Design selection. The important distinction is whether the **page body** is Design-owned or a deliberate shared functional surface.

---

# 14. Surface classes

Every Domain-local route belongs to one of three classes.

## Class A — required Design-owned page surface

The route resolves an authorized semantic Page Model and dispatches the body to a required `DesignDefinition.pages.*` slot.

The Design owns composition.

## Class B — shared functional/editor surface inside selected Shell

The route remains a shared LoreForge editor/tool because its central value is a complex reusable editing engine rather than a presentation composition.

The selected Design still owns the Shell around it and its base theme tokens must keep the shared tool usable.

The Design does **not** fork the editor engine.

## Class C — global LoreForge surface

The route is outside a Domain's selected visual identity and does not dispatch through the Domain Design.

Examples include account, platform administration, authentication, and Payload administration.

---

# 15. Complete route/surface map

The route inventory in the repository should be checked whenever a Design is added. The following is the current classification.

| Domain route / route family | Class | Design hook |
|---|---|---|
| `/domain/[slug]` | A | `pages.home` |
| `/domain/[slug]/records` | A | `pages.records` |
| `/domain/[slug]/documents/[id]` | A | `pages.document` |
| `/domain/[slug]/departments` | A | `pages.departments` |
| `/domain/[slug]/departments/[departmentSlug]` | A | `pages.department` |
| `/domain/[slug]/about` | A | `pages.about` |
| `/domain/[slug]/lore` | A | `pages.lore` |
| `/domain/[slug]/members` | A | `pages.members` |
| `/domain/[slug]/work` | A | `pages.work` |
| `/domain/[slug]/review` | compatibility | resolve/delegate to Work semantics, no separate visual contract |
| `/domain/[slug]/manage/departments` | A | `pages.management.departments` |
| `/domain/[slug]/manage/folders` | A | `pages.management.folders` |
| `/domain/[slug]/roles` | A | `pages.management.roles` |
| `/domain/[slug]/document-types` | A | `pages.management.documentTypes` |
| `/domain/[slug]/manage/people` | A | `pages.management.people` |
| Domain person workspace under `manage/people/...` | A | `pages.management.person` |
| `/domain/[slug]/manage/invitations` | A | `pages.management.invitations` |
| `/domain/[slug]/forms` + form builder/fill routes | B | selected Shell + shared form engine |
| `/domain/[slug]/templates` + template edit/new routes | B | selected Shell + shared template engine |
| `/domain/[slug]/import` | B | selected Shell + shared import functional surface |
| `/domain/[slug]/documents/[id]/edit` | B | selected Shell + shared document editor |
| `/domain/[slug]/documents/[id]/history` | B unless/until separately contracted | selected Shell + shared history surface |
| `/domain/[slug]/pages/[pageSlug]/edit` | B | selected Shell + shared informational-page editor |
| `/domain/[slug]/customize` | B by architecture | selected Shell / Site Studio host, Design supplies its Studio editor |
| `/domain/[slug]/subdomains` | compatibility redirect | redirects to Departments; no slot |

Any newly added Domain-local route must be classified deliberately. It must not silently become an unthemed fourth category.

The current Class A catalog has no `pages.member` slot. A Domain character
profile/deep-link route is not a portable Design slot in this baseline, and a
new Design must not invent a canonical member-detail route or assume that a
global Character-management route is the public Domain profile. If that route
becomes a first-class Design surface later, add it to the contract, route
catalog, fixtures, and parity matrix together; do not document it as present
before then.

---

# 16. Page Model rules

A Page Model is semantic, authorized, and presentation-neutral.

Good Page Model facts:

```text
record.title
department.description
member.roleLabels
folder.systemManaged
documentType.lifecycleStages
record.documentTypeLabel
action descriptor: edit available
```

Bad Page Model facts:

```text
leftColumnCards
heroWidth
railPosition
useGlassPanel
primaryButtonIcon
selectedModalTab
```

Page Models may contain:

- safe display data;
- stable IDs needed by shared workspaces;
- canonical routes;
- capability/action descriptors;
- empty-state facts;
- server-derived counts that the viewer is allowed to know;
- safe pre-rendered HTML where appropriate.

Page Models must not contain:

- private rows filtered later by the Design;
- raw Payload documents merely for convenience;
- CSS concepts;
- Design-specific layout vocabulary;
- browser callbacks crossing a server/client boundary;
- authorization evaluators.

---

# 17. Missing semantic fact protocol

A visual Design is allowed to expose a genuine deficiency in a Page Model.

It is **not** allowed to solve that deficiency by querying the database itself.

When the art direction needs a missing fact, create a pressure note with:

```text
Page:
Missing fact:
Why the visual concept needs it:
Why this is semantic rather than layout:
Authorization/visibility implications:
Suggested neutral Page Model field:
Fallback if core does not add it:
```

Then core decides whether to extend the contract.

Example of a valid request:

```text
Department detail needs an optional reports-to relationship to draw an organization chart.
```

Invalid workaround:

```text
Infer reporting relationships from Department membership.
```

If the semantic relationship does not exist, the Design must provide a truthful fallback, such as a member directory.

---

# 18. Home page contract

**Slot:** `pages.home`

The Home renderer must represent, when supplied:

- Domain identity/context;
- welcome/home content;
- edit affordance;
- semantic destination links;
- recent Records;
- empty state.

The Design may render these as:

```text
hero + cards
dashboard modules
editorial page
ticker
command center
timeline
magazine front page
```

Do not invent featured content, popularity, unread counts, or analytics unless the Page Model supplies them.

Do not omit required destinations because the composition has no obvious place for them.

---

# 19. Records page contract

**Slot:** `pages.records`

Records is an interactive shared-workspace surface.

The Design consumes the authorized `RecordsPageModel` and the shared Records workspace/controller.

It must **not** implement another search engine or independently query records.

Required capabilities when supplied include:

- Folder navigation;
- nested Folder expansion or equivalent traversal;
- selection;
- search;
- include-subfolders/search-subfolders behavior;
- Document-Type filtering/exposure;
- ordering supported by the shared query contract;
- requested/display batch or page size supported by the shared query contract;
- pagination or load-more behavior;
- loading state;
- fetch failure state;
- New Document;
- Import;
- View;
- Edit;
- Supersede;
- Delete;
- Create Folder;
- Create Subfolder;
- Rename Folder;
- Delete Folder;
- authorized supersession representation;
- empty state.

The Design may present these using:

```text
cards
rows
dense ledger
gallery
split-pane explorer
context menu
command palette
drawer
inline actions
```

All supported actions must remain reachable.

## Records query rule

Sort and batch/page-size behavior must be implemented by the shared Records query/workspace contract, not by slicing or reordering an arbitrary client subset.

A Design config may choose a default view, ordering, or supported page size, but that preference is passed into the shared authorized query behavior.

Do not create a competing client-only pagination system.

## Records security rule

Never infer:

- whether a Character can see a Folder;
- whether a Character can edit a Record;
- whether a hidden superseded title exists;
- whether a Folder has invisible descendants;
- whether a lifecycle state implies an action.

Use supplied safe data and action descriptors only.

---

# 20. Document page contract

**Slot:** `pages.document`

The Design owns the reading experience.

Represent, when supplied:

- title;
- canonical safe body HTML;
- optional raw/source text;
- metadata;
- prepared-by identity;
- tags;
- concerns;
- lifecycle state;
- status or error notice;
- predecessor/supersedes link;
- successor/superseded-by link;
- other supplied lineage information.

Required actions when supplied may include:

- Edit;
- History;
- Submit;
- File;
- Approve;
- Return to Draft;
- Deprecate;
- Restore;
- Lock;
- Unlock;
- Supersede;
- Delete.

Use shared Document action descriptors/bridges.

Do not pass arbitrary browser callbacks across a server/client boundary.

Do not re-sanitize canonical supplied body HTML in the Design.

The Design may use client islands for tabs/source views while keeping the main content server-renderable where practical.

---

# 21. Departments directory contract

**Slot:** `pages.departments`

Represent:

- configured Departments visible to the viewer;
- name;
- description;
- member count when supplied;
- canonical Department route;
- management link when supplied;
- empty state.

The Design may use:

```text
cards
map metaphor
index
org directory
columns
visual nodes
```

Do not query extra members or folders from the Design.

---

# 22. Department detail contract

**Slot:** `pages.department`

Represent, when supplied:

- Department name;
- description;
- visible Folder names/links;
- members;
- member/profile links;
- management link;
- other semantic destinations;
- optional organization-relationship data if the core eventually supplies it.

An organization chart is allowed only from an explicit neutral relationship model.

Never infer reports-to edges from Department membership or role coincidence.

Fallback when relationship data is absent: render the member directory or another truthful non-hierarchical composition.

---

# 23. About page contract

**Slot:** `pages.about`

Render:

- canonical safe `bodyHtml`;
- edit affordance if supplied;
- semantic destinations where useful.

About body content is Domain content, not Design config.

Do not store About copy inside the Design bank.

Do not query or sanitize the body inside the Design.

---

# 24. Lore page contract

**Slot:** `pages.lore`

The target Lore Page Model is a visibility-safe informational index rather than an empty decorative page.

Represent:

- Lore page identity;
- supplied visible Lore entries;
- stable entry route/slug;
- title;
- group/category label if supplied;
- concise supplied summary if available;
- optional revision label;
- canonical safe body/reading target as defined by the final model;
- destinations;
- empty state.

The Design may group, index, card, or editorialize the **layout**, but it must not generate semantic summaries from the body on the fly.

Core is responsible for Domain/Tenant scoping and publication visibility.

Where the current content system has no page-kind discriminator, the core builder may use a pinned reserved-slug convention such as excluding `home` and `about`; the Design does not implement that rule.

---

# 25. Members directory contract

**Slot:** `pages.members`

The public/Domain-facing member directory is a first-class Design surface.

Represent the viewer-safe membership facts supplied by core, such as:

- display name / Character identity;
- role labels;
- Department participation;
- profile/member destination only when core supplies one;
- safe status or descriptor fields;
- actions only when explicitly supplied;
- empty state.

The Design must not run its own Character search merely to populate the directory.

Do not expose management-only identity facts in a public member composition.

---

# 26. Member-detail boundary in the current contract

There is no `pages.member` slot in the current production
`DesignDefinition`, and the Class A route catalog does not include a separate
portable member-detail surface. The `pages.members` slot owns the Domain
Members directory. A Design may contain presentational helpers for a supplied
member/person projection when the host explicitly embeds them, but that does
not create a new route or a new required slot.

Do **not** skin the global Character claims/merge-management page and call it a
public member profile. Do not invent a member-detail route, infer sensitive or
global account data from Domain membership, or add a singular member slot to
the Design definition. A future member-detail surface requires a deliberate
core contract and route-catalog change first.

---

# 27. Work contract

**Slot:** `pages.work`

Work is the Domain-local operational queue/surface produced by core authorization-aware projection.

Represent supplied work items and supplied operations.

Possible categories may include submitted records or other workflow work as the product evolves.

The Design may provide:

- queue views;
- tabs;
- grouped cards;
- dense operational lists;
- review panels;
- status summaries.

It must not:

- duplicate workflow authorization;
- list raw submitted documents solely because lifecycle says `submitted`;
- invent approve/return actions;
- bypass the shared Work projection.

`/domain/[slug]/review` is a compatibility surface and should delegate/redirect/project into the Work semantics rather than becoming a second Design contract.

---

# 28. Department management contract

**Slot:** `pages.management.departments`

Represent the authorized Department-management model, including as supplied:

- Department rows;
- names/descriptions;
- active/archived state;
- edit/manage destinations;
- create capability;
- archive/restore capability;
- status/error information;
- empty state.

Mutations remain shared/server-authorized.

The Design decides whether this is a table, cards, inspector, directory, or another operational composition.

---

# 29. Folder management contract

**Slot:** `pages.management.folders`

Folder management is a complex shared-workspace surface.

The Design consumes the Folder-management Page Model and shared workspace/controller.

The shared layer owns behavior such as:

- canonical tree data;
- system-managed state;
- selection;
- multi-selection where supported;
- search/filter state;
- expansion state;
- sort state;
- create;
- rename;
- move/drag-drop semantics;
- delete;
- mutation pending/error handling;
- constraints such as impossible/self-descendant moves;
- authorization re-checks.

The Design owns:

- tree/list/column presentation;
- selection appearance;
- inspector layout;
- dialogs/menus presentation;
- drag affordances;
- command placement;
- empty/loading/error presentation.

The Design must not call `/api/folders` directly if the shared workspace owns that behavior.

Never duplicate Folder authorization or tree mutation rules.

---

# 30. Roles management contract

**Slot:** `pages.management.roles`

Roles is a complex shared-workspace surface.

The supplied model/workspace may include:

- role definitions;
- role selection;
- holder/member assignments;
- Character search results/state;
- Folder permissions;
- Document-Type permissions;
- hierarchy/relationship semantics that core actually supports;
- create/edit/delete role capabilities;
- assignment mutations;
- loading/error/pending state.

The Design owns composition and visual interaction.

It must not:

- implement its own role-permission evaluator;
- query Characters directly;
- duplicate debounce/search endpoint logic;
- invent permission categories;
- infer management capability from labels such as "Admin".

---

# 31. Document Types management contract

**Slot:** `pages.management.documentTypes`

Represent the resolved semantic structure supplied by core.

Depending on the final model this may include:

- Department roots;
- manual type folders;
- Document Types;
- virtual Unassigned grouping under the core-defined rule;
- selected Type;
- Type metadata;
- template choice/link;
- form/template mode;
- lifecycle-stage descriptors;
- role/folder permission context;
- create/edit/archive/duplicate capability descriptors;
- inspector data;
- empty state.

The Design may use trees, split panes, tables, cards, drawers, or inspectors.

Do not rematerialize a second Document-Type tree from raw collections.

Do not reinterpret the virtual Unassigned rule locally.

---

# 32. People management/search contract

**Slot:** `pages.management.people`

Represent the shared authorized people-search/member-discovery workspace.

The shared layer owns:

- query state;
- debouncing/search behavior;
- authorized Character/member result projection;
- pagination/bounds where relevant;
- loading/error state;
- canonical person-workspace destinations;
- permitted add/manage operations.

The Design owns:

- search-field composition;
- result cards/rows;
- filters exposed by the model/workspace;
- result selection;
- empty/loading/error presentation.

Do not create a second Character-search implementation.

---

# 33. Person management workspace contract

**Slot:** `pages.management.person`

This is the Domain-management view of one person/Character/member relationship.

Represent only supplied operational facts and actions, potentially including:

- Domain membership state;
- Department membership;
- role assignments;
- available assignment/removal operations;
- profile identity;
- management status/errors.

The shared workspace/core owns mutations and authorization.

This surface is distinct from the public `pages.members` directory and is the
current contract's person-level management workspace.

---

# 34. Invitations management contract

**Slot:** `pages.management.invitations`

Represent the authorized invitation-management model, including when supplied:

- pending invitations;
- join/claim requests;
- target identities;
- invitation status;
- create/resend/revoke/approve/deny or equivalent supported operations;
- validation/status errors;
- empty state.

Do not broaden invitation visibility or infer claim ownership.

Use supplied guarded mutation bridges.

---

# 35. Shared functional/editor surfaces

Not every Domain route must become a bespoke Design slot.

Some routes are deliberately shared because their core value is a complex editor or workflow engine.

Current examples include:

- Forms listing/builder/fill flows;
- Markdown template authoring;
- document create/edit authoring;
- document history if not separately contracted;
- Markdown import;
- informational-page editor;
- Site Studio host itself.

For these routes:

1. the selected Design Shell remains active;
2. the shared tool must receive/use the universal theme tokens;
3. the content region must be usable at desktop and mobile sizes;
4. the Design must not style it through brittle global descendant selectors;
5. the Design must not fork the editor solely for visual consistency;
6. if the shared tool's presentation is genuinely inadequate across Designs, improve the shared functional component or establish a new formal Design contract rather than monkey-patching one Design.

A Design author's job on Class B surfaces is therefore mostly:

- Shell compatibility;
- token compatibility;
- spacing/background/content-region compatibility;
- accessible contrast;
- ensuring dialogs/portals are not visually broken by the Shell.

---

# 36. Site Studio contract

Every first-class Design supplies its own Studio editor.

Conceptually:

```tsx
function MyDesignStudio({
  value,
  onChange,
  domain,
  uploadAsset,
}: DesignStudioEditorProps<MyDesignConfigV1>) {
  // Design-specific controls and layout
}
```

The Design's Studio editor receives:

- current draft config;
- `onChange`;
- Domain identity context;
- authorized Design-media upload helper.

It does **not** own:

- global Design picker;
- global Save;
- global Revert;
- restore-defaults host behavior;
- dirty state;
- global persistence;
- Domain authorization;
- direct Payload writes;
- database queries.

The shared Site Studio host owns those concerns.

Never add:

```ts
if (activeDesign === 'my-design') { ... }
```

to Site Studio.

The host dispatches the registered Design's editor.

---

# 37. Studio editor design freedom

The editor is part of the Design.

It may be highly bespoke.

The Design may expose curated concepts such as:

```text
Atmosphere
Density
Navigation treatment
Card treatment
Reading mode
Accent strategy
Background image
Motion level
```

rather than generic technical controls.

Use shared accessible Studio input primitives where convenient, but those primitives do not dictate the Design's configuration vocabulary or layout.

The preview must use the **current draft config**, not merely the last saved value.

---

# 38. Design media

Use the shared authorized Design-media upload helper.

Persist only valid local media references such as:

```text
/media/...
```

Examples of Design-owned media:

- atmosphere/background image;
- masthead art;
- paper texture;
- ornament;
- decorative illustration;
- Design-specific hero art.

Global Domain logo/seal remains Domain identity data supplied by core.

Do not:

- fetch arbitrary third-party images from saved config;
- store base64 blobs in config;
- treat fixture asset paths as production persistence;
- turn Domain content into Design config.

---

# 39. Fonts

Prefer shared LoreForge font catalog/utilities.

A Design may add a scoped font dependency when justified by the art direction and repository policy.

Do not load arbitrary remote font URLs from persisted config.

A Design may expose curated typography modes rather than raw font pickers.

Example:

```text
Technical
Editorial
Monumental
Humanist
```

and internally map them to approved font families/weights.

---

# 40. Styling ownership

All Design-specific presentation styling should live under:

```text
src/designs/<design-key>/
```

CSS Modules are the default.

Do not add Design-specific global selectors such as:

```scss
[data-template='my-design'] .sharedThing { ... }
```

Do not make a shared Shell DOM bend into the new Design.

If the new Design needs a different structure, write a different Shell.

Do not import another Design's CSS or presentation components.

---

# 41. Visual dependencies

A Design may add a visual dependency when it materially improves the experience.

Before adding one:

1. confirm compatibility with the repository's React/Next versions;
2. keep use Design-scoped where practical;
3. avoid global CSS side effects;
4. verify server/client boundaries;
5. respect reduced motion;
6. verify production build;
7. document non-obvious reasons for the dependency.

Do not add a broad UI framework to core LoreForge merely because one Design wants it.

Do not add a heavy library for a visual that can be expressed cleanly with existing primitives unless the gain is meaningful.

---

# 42. Motion and effects

A rich first-party Design may use:

- CSS animation;
- Motion libraries;
- parallax;
- shader/WebGL atmosphere;
- reveal transitions;
- glass effects;
- dynamic backgrounds;
- subtle responsive interaction.

Requirements:

- respect `prefers-reduced-motion`;
- functionality must not depend on animation;
- required controls cannot be hover-only;
- heavy browser-only effects should be Design-scoped/dynamically loaded where appropriate;
- another Design should not pay unnecessary client-bundle cost for this Design's effect;
- effects must not interfere with text selection, forms, dialogs, or keyboard focus.

---

# 43. Accessibility contract

Art direction does not override basic usability.

Required:

- semantic landmarks/headings;
- visible keyboard focus;
- keyboard-operable navigation and menus;
- sufficient contrast for core text/actions;
- labels for icon-only controls;
- reduced-motion handling;
- usable mobile navigation;
- no essential hover-only interaction;
- dialogs correctly trap/restore focus when required by the shared primitive;
- responsive layouts that do not hide required operations.

A design can be unusual. It cannot make core capabilities inaccessible.

---

# 44. Server and client boundaries

Keep data-pure visual components server-renderable where practical.

Use client boundaries only where interaction requires them.

Typical expectations:

```text
Shell                    server-capable unless effects require a client island
Home                     server
About                    server
Lore                     server
Departments              server
Department               server
Members                  server where practical
Member                    server where practical
Records                   client/shared workspace
Folders management        client/shared workspace
Roles management          client/shared workspace
Document Types            client/shared workspace/inspector as required
People search             client/shared workspace
Studio editor             client
Document reading          server + optional client islands
```

Never pull server-only auth/data modules into a client Design component.

Never serialize arbitrary server callbacks into a client component.

Use repository-defined action descriptors, links, forms, or bridges.

---

# 45. Allowed imports

A first-class Design may import shared **semantic/behavioral/low-level** modules intended for the Design seam.

Examples:

- Page Model types;
- Design runtime/config types;
- `OperatingContext`;
- Records workspace;
- Folder-management workspace;
- Role-management workspace;
- Document-Type workspace;
- People workspace;
- shared action semantics/bridges;
- Record actions provider;
- accessible dialog/menu primitives;
- Site Studio field primitives;
- font catalog;
- safe color/media utilities.

Use current repository-approved import paths.

---

# 46. Forbidden imports

A first-class Design must not import another Design's presentation.

Do not import presentation from:

```text
@/app/**
@/designs/<other-design>/**
legacy ShellFrame
legacy thin views
route-local *.module.scss
```

Do not import data/security layers from:

```text
Payload config/client
collection definitions
authz evaluators
tenant query helpers
database adapters
server-only mutation internals
```

Do not import a shared legacy page body just to satisfy a first-class page slot. Use the proper semantic model/workspace and provide the Design's own presentation.

---

# 47. Preview contract

Site Studio preview uses deterministic fixtures shaped like real Page Models.

The Design must render correctly without database queries.

Preview should cover enough representative surfaces to reveal the visual system, at minimum the repository-supported preview set and ideally:

- Home;
- Records;
- Document;
- Departments;
- one operational/management surface.

Links/forms are inert or safely intercepted in preview.

Preview must exercise:

- normal data;
- empty state;
- long names/titles;
- missing logo;
- limited-capability viewer;
- mobile width;
- current draft config.

Fixture behavior is not authorization.

Do not evolve preview fixtures into a parallel application state machine.

---

# 48. Thumbnail contract

Add a real thumbnail under:

```text
src/designs/<design-key>/assets/thumbnail.svg
```

Reference it from the folder manifest as `preview.thumbnail` using a relative
path inside `assets/`. Build-time discovery materializes the bundled bytes at
the generated public URL:

```text
/design-assets/<design-key>/thumbnail.svg
```

The Design definition's `preview.thumbnail` must use that generated URL. The
folder asset is authoritative; `public/design-assets/` is generated output and
must not be hand-authored. Other bundled Design defaults use the same
`/design-assets/<design-key>/<relative-path>` namespace. Uploaded Studio
overrides use the validated `/media/...` DesignAssetRef shape and never replace
the bundled source file.

The thumbnail should clearly communicate the Design's actual visual language.

Do not use a generic wireframe placeholder for a first-class Design.

---

# 49. Compile-time discovery and registration footprint

A healthy new Design should be self-contained in its folder. The only
author-authored registration data outside the presentation source is the
folder's `design.manifest.json`; build-time discovery derives the key set,
catalog, registry, and materialized assets from the manifests.

The normal workflow is:

1. scaffold `src/designs/<key>/` with `design.manifest.json`, `index.ts`, and
   bundled assets;
2. run the discovery/check command;
3. let the generator update `src/lib/design/generated/*` and
   `public/design-assets/<key>/`;
4. run typecheck, conformance, and build checks.

Generated files are build artifacts, not a second authoring surface. A stale
generated file is a failed check, not a reason to hand-edit the registry.

The exact current scripts and filenames are authoritative. A normal new Design
does **not** require edits to a key union, central registry, catalog,
validator-list, Site Studio selector list, authorization, Payload collections,
Page Model builders, workflow semantics, shared Records rules, Folder
mutation behavior, Site Studio host branches, or another Design.

A normal new Design should **not** require edits to:

- authorization;
- Payload collections;
- Page Model builders;
- workflow semantics;
- shared Records search rules;
- Folder mutation behavior;
- Site Studio host branches;
- another Design.

If merely adding a Design requires one of those, stop and identify whether the contract is missing a genuine generic seam.

---

# 50. Minimal complete definition example

The TypeScript entrypoint for a new Design should conceptually resemble:

```ts
export const myDesign: DesignDefinition<MyDesignConfigV1> = {
  key: 'my-design',
  status: 'first-class',
  name: 'My Design',
  description: 'Concise visual identity description.',

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
    members: MyDesignMembers,
    work: MyDesignWork,

    management: {
      departments: MyDesignManageDepartments,
      folders: MyDesignFolderManager,
      roles: MyDesignRoles,
      documentTypes: MyDesignDocumentTypes,
      people: MyDesignPeople,
      person: MyDesignPerson,
      invitations: MyDesignInvitations,
    },
  },
}
```

Do not add dummy components to make the object compile. A first-class Design is complete only when the required surfaces are real.

---

# 51. Design-agent workflow

This is the recommended workflow for an artistic/design agent.

## Phase A — establish the visual system

1. Read this bible.
2. Inspect current Page Model TypeScript definitions, not route query code.
3. Choose Design key/name/visual thesis.
4. Define typography, palette, spacing, navigation, surfaces, interaction language, and responsive strategy.
5. Define a small Design-specific config vocabulary.
6. Decide which visual dependencies, if any, are justified.

## Phase B — build isolated presentation

Build the Design views against deterministic fixtures matching the Page Models.

Do **not**:

- add real Payload calls;
- add fake authorization;
- copy production mutation code;
- implement real search;
- create an alternate router;
- copy another Design's components.

Mock only enough state to demonstrate visual states.

## Phase C — cover the full required surface set

Design and implement:

- Shell;
- every Class A public page;
- Work;
- every management slot;
- Studio editor;
- mobile navigation;
- empty/loading/error states.

Also visually verify at least representative Class B shared editor content inside the Shell.

## Phase D — record contract pressure

For every desired fact not in a supplied model, write a pressure note.

Do not hack around it.

## Phase E — compile-time installation and parity

In the Design Lab, author the actual production Design folder:

1. scaffold the manifest, default entrypoint, config, Studio, Class A slots,
   and bundled assets;
2. use the production-shaped import paths and host seams; do not create a
   Lab-only Design wrapper or parallel page-model API;
3. run Lab unit/e2e/conformance checks and discovery checks;
4. run production contract/source/asset parity checks;
5. run the cross-host DOM/pixel evidence matrix against the production oracle;
6. copy the unchanged folder to `sl-civic-archive/src/designs/<key>/` only as
   the portability proof requires;
7. run production discovery and build, then remove the temporary probe;
8. run security, production build, and Design-switching checks.

The Lab host infrastructure, fixtures, fake workspaces, and navigation/API
emulation remain outside the portable folder. There is no separate production
porting rewrite for a folder that has passed parity.

---

# 52. What the Design Lab may contain outside a portable Design folder

Allowed temporary incubation infrastructure:

- Vite or Storybook-like preview host;
- deterministic fixtures;
- fake navigation interception;
- local adapter state for showing visual states;
- screenshots;
- pressure notes;
- isolated package manifest if truly separate from production.

These are host infrastructure, not Design source. They may remain in the Lab
repository but are disposable with respect to production installation.

They must be clearly separated from reusable visual components.

The portable folder must not contain or production must not install:

- fake authorization;
- fixture databases;
- mock search engines;
- mock mutation state machines;
- preview router/history listeners;
- global reset CSS;
- copied Page Model definitions that can drift from core;
- Lab-only runtime wrappers, workspace props, or route adapters.

---

# 53. Shared-workspace rule

The defining anti-duplication rule for LoreForge Designs is:

> If two Designs need the same product behavior, that behavior belongs in a shared semantic/workspace/action seam, not in two Design components.

Examples:

```text
BAD
CivicFolderManager calls /api/folders
ObsidianFolderManager calls /api/folders
ModernDesignFolderManager calls /api/folders

GOOD
useFolderManagementWorkspace()
  -> CivicFolderManager presentation
  -> ObsidianFolderManager presentation
  -> ModernDesignFolderManager presentation
```

Likewise:

```text
BAD
three implementations of search pagination/supersession visibility

GOOD
useRecordsWorkspace()
  -> three presentations
```

A new Design is specifically a test of whether the seam is healthy.

If the new Design needs to duplicate core behavior to function, that is a seam defect to fix—not a reason to duplicate the code.

---

# 54. Capability rendering rules

Use supplied capabilities/action descriptors exactly.

Distinguish when the shared contract distinguishes:

- absent: user should not be offered this capability;
- disabled: capability is visible but currently unavailable, with supplied reason/state;
- available: render a usable action.

Do not convert absent into disabled merely to make a toolbar visually symmetric.

Do not make disabled actions available based on client state alone.

Do not hide a supplied required operation because the visual composition has no space for it; redesign the action presentation instead.

---

# 55. Canonical-route rules

Core owns routes.

Designs consume canonical URLs/descriptors supplied by models or documented route helpers.

Do not:

- create Design-specific route families;
- branch navigation based on Design key in route code;
- rewrite `/records` as `/archive` only for one Design;
- invent a member-detail route in production;
- use the global Character management route as a Domain public profile shortcut.

A Design may label a route differently in navigation if the product allows presentation copy changes, but the destination remains canonical.

---

# 56. Security invariants to preserve visually

The following must remain true regardless of Design:

- hidden Records do not appear;
- hidden Folder names do not appear;
- hidden child counts do not leak;
- inaccessible supersession titles do not leak;
- cross-Domain data does not appear;
- actions absent for the viewer are not invented;
- lifecycle state does not become authorization;
- management navigation absent from the Shell model is not invented;
- member/profile presentation does not expose global/private account facts;
- invitation data is not broadened;
- Lore content is tenant/domain scoped and publication-filtered by core.

If a Design appears to require unsafe raw data to render its concept, change the concept or request a safe semantic projection.

---

# 57. Design switching acceptance test

This test is mandatory for every new first-class Design.

Use one populated Domain and at least two Designs.

1. Select new Design.
2. Customize multiple Design-specific settings.
3. Save.
4. Navigate across public and operational pages.
5. Confirm the same authorized Domain data is present.
6. Switch to another Design.
7. Customize/save it.
8. Navigate the same Domain routes.
9. Switch back to the new Design.
10. Confirm its previous config bank is restored exactly.
11. Reload browser.
12. Confirm it remains restored.
13. Verify no other Design picked up the new Design's settings.
14. Verify Class B shared editor routes still use the selected Shell and remain usable.

If settings leak or switching changes authorized data/available operations, stop. Do not patch the individual Design around it.

---

# 58. Automated conformance expectations

A first-class Design should have Design-specific tests plus shared registry/conformance tests.

Minimum coverage:

## Config

- defaults validate;
- invalid enum rejected;
- invalid color rejected;
- invalid media ref rejected;
- bounded numeric validation;
- migration behavior;
- theme resolution produces required base tokens.

## Shell

- Domain identity;
- all supplied primary navigation;
- Work;
- all supplied management navigation;
- OperatingContext exactly once;
- children/content;
- account/dashboard escape route;
- limited-management model does not invent links.

## Public pages

- Home normal + empty;
- Records core interactions/actions;
- Document metadata/lineage/actions;
- Departments normal + empty;
- Department normal + no-org-chart fallback;
- About;
- Lore normal + empty;
- Members normal + empty;
- supplied member destinations remain safe and canonical; no invented detail slot.

## Operational pages

- Work normal + empty;
- Departments management;
- Folders workspace state/actions;
- Roles workspace state/actions;
- Document Types tree/inspector;
- People search;
- Person workspace;
- Invitations.

## Studio

- current config renders;
- changes emit valid next config;
- defaults render;
- draft config drives preview.

## Security regression

Run the repository's security suites. A new Design must not require weakening them.

---

# 59. Manual test matrix

Test at least:

### Viewer roles

- anonymous visitor where supported;
- ordinary member;
- delegated manager;
- Domain Admin;
- Platform Admin entering the Domain through the intended acting/context flow.

### Data states

- empty Domain;
- populated Domain;
- many Folders;
- many Records;
- long Record title;
- long Domain name;
- missing logo;
- large logo;
- supersession chain;
- submitted Work items;
- no management permissions;
- partial management permissions;
- full management permissions;
- empty invitations/people searches;
- archived/inactive operational entities where supported.

### Device/interaction

- desktop;
- narrow mobile;
- keyboard-only;
- reduced motion;
- dialogs/menus;
- loading/failure states;
- Design switch and reload.

---

# 60. Failure smells

Stop and inspect the architecture if the Design implementation does any of the following:

```text
adds if (design === 'my-design') to Site Studio
adds if (design === 'my-design') to route authorization/data code
copies useRecordsWorkspace
copies Folder mutation logic
copies role search/permission logic
queries Payload inside a Design component
imports another Design's SCSS/components
imports route-local SCSS
adds [data-template='my-design'] rules to shared CSS
stores arbitrary CSS/HTML/JS in Design config
client-slices a server result to fake the configured page size
client-sorts only the fetched page while claiming global ordering
infers permissions from lifecycle/status labels
infers reporting relationships from membership
creates a Design-specific canonical route
hides a required supplied capability because the toolbar is full
implements fake management authorization in preview and then ports it
```

These are contract violations, not expedient shortcuts.

---

# 61. What the design agent has free rein over

Be ambitious inside the seam.

The Design agent may radically change:

- Shell DOM;
- navigation location and form;
- visual density;
- typography;
- color system;
- card/list geometry;
- record visualization;
- reading experience;
- Department visualization;
- member presentation;
- management workbench layout;
- tree presentation;
- inspector placement;
- action placement;
- mobile strategy;
- motion/effects;
- empty states;
- loading states;
- Studio editor layout;
- Design config vocabulary;
- use of approved visual libraries.

The goal is not "the same app with different colors."

A first-class Design should be capable of feeling like a materially different product presentation while exposing the same underlying LoreForge truth and capabilities.

---

# 62. What the design agent does not have free rein over

Do not change these merely to make the visual concept easier:

- authorization semantics;
- Character kinds;
- Domain membership semantics;
- role permissions;
- Folder visibility;
- Document lifecycle;
- workflow transitions;
- supersession semantics;
- canonical routes;
- server search rules;
- Records security filtering;
- management capability logic;
- Page Model tenant boundaries;
- shared mutation authorization;
- invitation semantics;
- content sanitization;
- persistence envelope semantics.

Those are LoreForge core.

---

# 63. Deliverables from a design-authoring agent

Before handing a visual Design to an integration/execution agent, provide:

1. **Design thesis** — one paragraph describing the visual identity and intended audience/feel.
2. **Design key/name** — proposed production key and label.
3. **Config vocabulary** — exact proposed Design-owned settings and defaults.
4. **Shell** — desktop and mobile implementation.
5. **Every required Class A surface** — implemented against contract-shaped fixtures.
6. **Representative Class B embedding** — show at least one shared editor surface inside the Shell so content-region compatibility is proven.
7. **Studio editor mock/implementation** — controls for the proposed config.
8. **Thumbnail** — real picker image.
9. **Responsive states** — at minimum desktop + mobile.
10. **Empty/loading/error states** for interactive surfaces.
11. **Reduced-motion behavior**.
12. **Dependency manifest** — any packages required and why.
13. **`PAGE_MODEL_PRESSURE.md`** — every missing semantic fact request, even if there are none.
14. **`INTEGRATION_NOTES.md`** — clearly separate reusable source from disposable preview infrastructure.
15. **Screenshots** — representative public + operational pages for visual review.

The integration agent should not have to guess which preview files are production-worthy.

---

# 64. Recommended `INTEGRATION_NOTES.md` structure

Use:

```markdown
# <Design> integration handoff

## Baseline
- source branch/commit
- core contract baseline used

## Ready to copy
- Shell
- page components
- CSS modules
- Design-owned assets
- Studio editor

## Disposable preview infrastructure
- preview router
- fixtures
- fake workspace adapters
- reset CSS
- standalone package/Vite host

## Shared workspaces to bind
- Records
- Folders
- Roles
- Document Types
- People
- etc.

## Page Model pressure
- link to PAGE_MODEL_PRESSURE.md

## Dependencies
- package
- purpose
- production requirement

## Verification performed
- build
- screenshots
- keyboard
- mobile
- reduced motion
```

---

# 65. Recommended `PAGE_MODEL_PRESSURE.md` structure

```markdown
# Page Model pressure

## <Surface>

### Missing fact
...

### Why the design needs it
...

### Why this is semantic rather than layout
...

### Authorization implications
...

### Proposed neutral model addition
...

### Safe fallback if rejected/deferred
...
```

A blank/"none" pressure document is preferable to silent assumptions.

---

# 66. Design review questions

Before approving an artistic incubation branch, reviewers should ask:

1. Does the Shell make all supplied navigation reachable?
2. Does the Design look materially different rather than recoloring an existing Design?
3. Are all required public surfaces represented?
4. Are operational/management surfaces treated as first-class product experiences?
5. Does Records rely on shared workspace semantics rather than fixture logic?
6. Are all visible Document actions supplied by the core contract?
7. Do management screens use shared behavior instead of reimplementing it?
8. Are any facts invented for visual convenience?
9. Does every invented-looking fact have a pressure note?
10. Does mobile preserve essential functionality?
11. Does reduced motion preserve functionality?
12. Is the Design config small, meaningful, safe, and Design-specific?
13. Does the Studio editor feel like part of the Design?
14. Are dependencies justified and isolated?
15. Can reusable components be separated cleanly from the preview harness?
16. Does a shared editor route look usable inside the Shell?
17. Would adding this Design require changing authorization/data code? If yes, why?
18. Could another Design coexist without inheriting this Design's CSS/client cost?

---

# 67. Definition of a finished first-class Design

A Design is finished when:

> It can be selected for a real Domain, receives the same authorized semantic data and operation capabilities as every other first-class Design, renders every required public and operational surface through its own presentation, hosts shared editor surfaces safely inside its Shell, can be customized through its own Studio editor, saves into its own config bank, can be switched away from and restored exactly, and passes conformance/security/build tests without modifying LoreForge authorization or duplicating shared application behavior.

The ideal footprint is still:

```text
mostly src/designs/<design-key>/
+ documented registry/catalog/key hooks
+ thumbnail
+ tests
```

If adding the second radically different modern Design is easy under this contract, the seam is working.

If it requires copying query/mutation/business logic, the seam needs correction before adding more Designs.

---

# Appendix A — Fast checklist for a design agent

A design agent should be able to check every box below.

## Core package

- [ ] Design key and name chosen
- [ ] visual thesis written
- [ ] Design-specific config vocabulary defined
- [ ] defaults defined
- [ ] Shell designed desktop/mobile
- [ ] OperatingContext location planned
- [ ] primary nav presentation planned
- [ ] Work and management access planned
- [ ] account/dashboard escape route planned

## Public/Domain pages

- [ ] Home
- [ ] Records
- [ ] Document
- [ ] Departments
- [ ] Department detail
- [ ] About
- [ ] Lore
- [ ] Members

## Operational pages

- [ ] Work
- [ ] Manage Departments
- [ ] Manage Folders
- [ ] Roles
- [ ] Document Types
- [ ] People search
- [ ] Person workspace
- [ ] Invitations

## Shared editor compatibility

- [ ] Forms/template/editor surface tested inside Shell
- [ ] import/editor content region usable
- [ ] dialogs/portals usable
- [ ] shared tokens have acceptable contrast

## States

- [ ] empty
- [ ] loading
- [ ] error
- [ ] limited capabilities
- [ ] long content
- [ ] mobile
- [ ] keyboard
- [ ] reduced motion

## Handoff

- [ ] Studio editor
- [ ] thumbnail
- [ ] dependency list
- [ ] `INTEGRATION_NOTES.md`
- [ ] `PAGE_MODEL_PRESSURE.md`
- [ ] representative screenshots
- [ ] reusable vs disposable files clearly separated

---

# Appendix B — Fast checklist for an integration agent

- [ ] Confirm management-contract patch is complete
- [ ] Confirm all required `DesignDefinition` slots are type-required
- [ ] Confirm validated `designConfig` and resolved theme reach Shell/page renderers
- [ ] Add and validate `design.manifest.json`
- [ ] Keep the portable folder byte-identical between Lab and production
- [ ] Use production-shaped imports; keep Lab fixtures/workspaces outside the folder
- [ ] Bind Records to shared Records workspace/query contract
- [ ] Bind Folders to shared Folder workspace
- [ ] Bind Roles to shared Role workspace
- [ ] Bind Document Types to shared type workspace
- [ ] Bind People/Person to shared people workspace
- [ ] Bind Work/Invitations/Departments to shared action bridges
- [ ] Do not create second `/review` implementation
- [ ] Do not invent a `pages.member` slot or member-detail route
- [ ] Implement real config validation/migration/theme
- [ ] Implement Design Studio editor
- [ ] Register key/catalog/registry/migration/lint hooks
- [ ] Add thumbnail
- [ ] Run Design tests
- [ ] Run security tests
- [ ] Run TypeScript
- [ ] Run lint
- [ ] Run production build
- [ ] Test switching A -> B -> A with saved config banks
- [ ] Test representative shared editor routes under selected Shell

---

# Appendix C — One-sentence rule set

When in doubt, apply these rules:

1. **Core owns truth.**
2. **Core owns authorization.**
3. **Core owns reusable behavior.**
4. **The Design owns presentation.**
5. **A first-class Design presents the whole recurring Domain experience, not just the public façade.**
6. **Shared complex editors may remain shared, but they always live correctly inside the selected Shell.**
7. **If a Design needs a missing fact, extend the neutral contract—never query around it.**
8. **If multiple Designs need the same behavior, extract it once.**
9. **If a capability is supplied, make it reachable. If it is absent, do not invent it.**
10. **If switching Designs changes what the user is allowed to know or do, the architecture is broken.**
