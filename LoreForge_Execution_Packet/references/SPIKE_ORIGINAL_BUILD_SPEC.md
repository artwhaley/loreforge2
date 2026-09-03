# SL Civic Archive - MVP Build Specification

## 1. Purpose

Build a local proof of concept for a web-based civic records/archive system used by people roleplaying city administration inside Second Life.

The existing pain is not fundamentally data storage. Records currently live as Second Life notecards spread across personal inventories and in-world objects, making them difficult to organize, share, find, reuse, and present professionally.

The MVP exists to answer this product question:

> Can a non-technical Second Life roleplayer make a city archive feel distinct and professional, then create, edit, file, retrieve, and reuse records more easily than they can with Second Life notecards?

This is a UX validation build. Do not turn it into a production infrastructure exercise.

---

## 2. Product principles

### 2.1 Incremental and intentional

Implement short vertical slices. Stop at specified review gates. Do not continue into later tickets if an earlier UX choice is rejected.

### 2.2 Professional by default

Users should personalize a good-looking system, not design a website from scratch.

The core customization target is MySpace-level identity, not Wix/Squarespace-level arbitrary layout:

- city name;
- seal/logo;
- banner image;
- colors;
- curated font choices;
- visual preset;
- a few safe display options.

Do not add a general page builder to the MVP.

### 2.3 Markdown is the canonical prose format

Documents and ordinary informational pages store Markdown as their canonical editable text.

This is a domain decision, not merely a developer preference: Markdown can remain readable inside a plain Second Life notecard while also rendering as a professionally styled web document.

The MVP Markdown dialect should remain modest:

- headings;
- paragraphs;
- bold;
- italic;
- bulleted lists;
- numbered lists;
- links;
- blockquotes;
- horizontal rules;
- tables if the selected editor supports them cleanly.

Do not support arbitrary HTML or MDX components in user content.

### 2.4 Presentation belongs to the tenant, not the document

A police report should not contain city colors, logos, fonts, CSS, or layout markup.

The same Markdown document rendered in two tenants should visibly become two differently branded documents.

### 2.5 Authoring paths converge on the same archive document

An archive document may originate from:

1. the WYSIWYG editor;
2. Markdown/source editing;
3. a structured form template;
4. simulated Second Life notecard import.

All four paths must create the same underlying `Document` type.

### 2.6 Do not prematurely solve permissions

Authorization is intentionally simple in this MVP. The long-term system will require tenant membership, delegated roles, folder/resource permissions, and inheritance, but proving that model is not the purpose of this build.

Do not build OpenFGA, hierarchical ACL engines, nested-role systems, or speculative permission abstractions.

---

## 3. Technical stack

### Required

- TypeScript
- Next.js + React
- Payload CMS integrated into the Next.js application
- Payload official SQLite adapter (`@payloadcms/db-sqlite`)
- One local SQLite database file
- Local filesystem media/uploads for the proof of concept
- MDXEditor as the first document editor candidate
- Payload Form Builder plugin as the first form-template candidate
- Plain CSS/CSS Modules/Tailwind if already natural to the chosen starter; no separate design-system project

### Why SQLite is the correct MVP choice

Payload officially supports SQLite and Postgres through database adapters. The application should use normal Payload collections and APIs rather than introducing a temporary custom persistence service.

For the MVP:

- SQLite is local and zero-provider;
- no cloud database account is required;
- no deployment setup is required;
- normal Payload models remain the application boundary;
- later Postgres work can replace the database adapter and perform a deliberate data migration without rewriting UI code around a homegrown temporary repository layer.

### Explicitly prohibited infrastructure for this MVP

Do not configure or require:

- Vercel;
- Supabase;
- Neon;
- AWS;
- S3-compatible object storage;
- Redis;
- Docker orchestration;
- Kubernetes;
- external authentication providers;
- external email providers;
- Elasticsearch;
- OpenFGA;
- analytics platforms;
- billing providers.

The app must run locally after ordinary package installation and local configuration.

---

## 4. Architectural seams: keep vs temporary

### 4.1 Keep this shape

These concepts should be treated as real application architecture and should not be thrown away after the proof of concept:

- `Tenant` / city as an explicit application entity;
- global `User` with tenant memberships;
- tenant-owned folders, documents, pages, themes, and form templates;
- Markdown as canonical prose storage;
- theme settings stored as semantic data rather than CSS blobs;
- form definitions separate from generated archive documents;
- one archive `Document` model regardless of authoring path;
- hostname/domain routing kept conceptually separate from tenant identity even though the MVP uses a tenant switcher;
- application UI consuming Payload-backed domain operations rather than querying SQLite directly.

### 4.2 Temporary by design

These implementations are permitted to be deliberately simple and replaceable:

- SQLite database file;
- local uploads directory;
- seed/test users and local login flow;
- manual tenant switcher instead of hostname resolution;
- coarse MVP roles;
- simulated Second Life import/export textbox;
- basic search;
- form-builder administration UX if Payload's stock interface is only good enough for evaluation.

### 4.3 Do not build fake future-proofing

Do not add interfaces such as `IDocumentRepository`, `IStorageProvider`, `IPermissionEngine`, `ITenantResolver`, or generic event buses solely because a future implementation may differ.

A clean module/function boundary is enough when there is an actual caller boundary.

---

## 5. MVP user model

The MVP needs enough identity to experience tenancy and authoring, not enough to prove final authorization.

### User

Fields:

- id
- display name
- email or local username as required by Payload auth

### TenantMembership

Fields:

- user
- tenant
- role: `admin | member`

Meaning:

- `admin`: can manage the tenant theme, pages, folders, documents, form templates, and memberships for the MVP.
- `member`: can browse allowed tenant content and create/edit documents in the simplified MVP rules.

If folder-level restriction is added, keep it deliberately narrow and do not generalize beyond the one test case.

---

## 6. Core content model

Names below describe the intended concepts. Exact Payload collection naming may follow repository conventions.

### 6.1 Tenant

Required fields:

- id
- name
- slug
- theme relation or embedded theme settings
- active/inactive if trivial

Seed two tenants for all acceptance testing.

### 6.2 TenantTheme

Store semantic settings, not arbitrary CSS.

Required MVP fields:

- preset key
- primary color
- secondary color
- accent color
- page/background color
- heading font key
- body font key
- logo/seal media
- banner media
- optional motto
- header alignment/presentation choice if implemented

Font values must come from a curated allowlist. Do not permit arbitrary font URLs.

### 6.3 Folder

Required fields:

- id
- tenant
- name
- parent folder, nullable
- sort/order value if needed

The folder tree only needs ordinary nesting and navigation.

Prevent obvious parent cycles if Payload does not already make them impossible.

### 6.4 Document

Required fields:

- id
- tenant
- folder
- title
- slug or stable URL identifier
- canonical Markdown body
- author/created-by if easily available
- created timestamp
- updated timestamp
- origin enum: `web-editor | markdown-import | form`
- optional source form-template relation

The canonical body must remain Markdown. Do not store HTML as the source of truth.

### 6.5 Page

For MVP informational website pages only.

Required fields:

- id
- tenant
- title
- slug
- canonical Markdown body
- published flag if trivial

No arbitrary block layout builder.

The homepage can be a fixed application page with editable welcome Markdown plus fixed modules.

### 6.6 FormTemplate

A form template describes structured document creation.

Required conceptual fields:

- id
- tenant
- name
- destination folder
- form definition/schema
- output document title template
- output Markdown template
- enabled/disabled

The initial implementation may use Payload Form Builder's native form data where expedient. However, document generation logic must be isolated in a small domain module so replacing the form-authoring tool does not require rewriting document creation.

### 6.7 Form submissions

Payload Form Builder may retain its normal submission records for the MVP.

The important application behavior is:

> successful archive-form submission -> create one normal archive Document

Do not create a parallel special `PoliceReport` document type.

---

## 7. UX surfaces

### 7.1 Application shell

Provide a simple branded shell with:

- current city identity;
- tenant switcher for the seeded test user;
- Home;
- Records;
- Departments or equivalent lightweight directory page;
- Admin/Customize entry for admins.

Avoid admin-dashboard aesthetics on public-facing tenant pages.

### 7.2 Theme Studio

This is a primary MVP feature.

The screen must let an admin edit theme values and immediately preview the result.

Required controls:

- city name display context;
- logo/seal upload/select;
- banner upload/select;
- preset selector;
- primary color;
- secondary color;
- accent color;
- heading font preset;
- body font preset.

Required preview targets on the same screen or immediately switchable:

1. representative city homepage;
2. representative archive document.

The preview must demonstrate that branding affects shared application chrome and document presentation without modifying document Markdown.

Do not add arbitrary CSS editing.

### 7.3 Document viewer

A viewed document should feel like a civic record, not a raw CMS entry.

Required:

- tenant identity/header treatment;
- document title;
- rendered Markdown;
- readable typography;
- created/updated metadata if available;
- edit action for authorized test users;
- source/export Markdown action.

### 7.4 Document editor

Start with MDXEditor.

Required editing modes:

- normal WYSIWYG editing;
- source Markdown editing or a source view/edit mode exposed by the editor integration.

Toolbar should be intentionally small. Include only the supported Archive Markdown features.

The editor must load existing Markdown and save Markdown.

Do not silently convert the canonical document to editor JSON or HTML.

### 7.5 Archive browser

Required:

- folder tree or understandable folder navigation;
- current-folder document list;
- create folder;
- create document;
- edit document;
- move document between folders;
- delete document/folder with reasonable guardrails;
- basic search across title and Markdown body.

Search does not need ranking sophistication. A simple case-insensitive/database-supported MVP search is enough.

### 7.6 Informational pages

Provide at minimum:

- Home;
- Departments;
- About or another arbitrary prose page;
- Records.

Ordinary prose pages use the same Markdown editor concept as documents.

The homepage layout is application-owned. Optional modules may be toggled/reordered only if it is nearly trivial; otherwise leave layout fixed for the MVP.

### 7.7 Structured form authoring

Use Payload Form Builder first.

Limit exposed field types for the spike to:

- short text;
- long text;
- date;
- select/dropdown;
- checkbox.

Do not expose payment, email automation, country/state widgets, multi-step lead generation, or irrelevant plugin capabilities.

The template author must also define how answers become a document.

For MVP, the Markdown output template may use a small placeholder syntax such as:

```md
# {{incident_type}} Report

**Date:** {{incident_date}}
**Officer:** {{officer_name}}
**Location:** {{location}}

## Narrative

{{narrative}}
```

Do not build a generalized templating language. Support field substitution only, plus whatever minimal escaping is necessary to avoid corrupt output.

If the Payload Form Builder authoring UI fails the usability review, stop at the review gate. Do not automatically replace it in the same ticket. The next decision may be to spike SurveyJS or build a small purpose-fit form designer.

### 7.8 Form filling

A member chooses a form template such as `Incident Report`, fills the form, and submits.

Submission must:

1. validate required inputs;
2. render the output title;
3. render the Markdown body;
4. create a normal archive Document in the configured destination folder;
5. identify origin as `form`;
6. redirect to or visibly link to the resulting archive document.

### 7.9 Simulated Second Life import/export

Do not integrate with Second Life yet.

Provide a development/MVP surface that allows a user to:

- paste plain Markdown text as though it came from an SL notecard;
- choose tenant/folder/title as necessary;
- import it as a normal archive Document with origin `markdown-import`;
- view/copy the canonical Markdown for any document as the text that could later be transported back to SL.

No invented LSL protocols, object contracts, HTTP-in architecture, capability flows, or viewer integrations belong in this MVP.

---

## 8. Tenant behavior

The seed user must belong to both test tenants.

Tenant selection for the MVP may be a simple application switcher.

Every tenant-owned query and mutation must use the active tenant context. Do not rely solely on UI filtering; include tenant scope in server-side data access.

This is not meant as production-grade hostile-tenant security, but accidental cross-city mixing must not occur.

A future hostname/custom-domain resolver must be able to determine the active tenant without changing the underlying content model.

---

## 9. Styling model

Use a small, centralized theme token mapping.

Example conceptual tokens:

```css
--tenant-primary
--tenant-secondary
--tenant-accent
--tenant-page-bg
--tenant-surface-bg
--tenant-heading-font
--tenant-body-font
```

Components use semantic tokens rather than reading arbitrary theme properties directly throughout the tree.

Theme presets are just known bundles of these values plus safe presentation choices.

Seed at least two dramatically different presets so theme success is visually obvious.

Do not make every visual property customizable.

---

## 10. Project structure guidance

Keep file count and architectural ceremony low.

A reasonable shape is:

```text
src/
  app/
    ...routes...
  collections/
    Users.ts
    Tenants.ts
    Memberships.ts
    Folders.ts
    Documents.ts
    Pages.ts
    Media.ts
    FormTemplates.ts   # if custom collection is needed around plugin forms
  components/
    archive/
    editor/
    theme/
    forms/
  lib/
    tenant/
    markdown/
    document-generation/
    theme/
  seed/
    ...
```

Do not create folders/modules merely to match this example. Prefer the smallest coherent structure compatible with the generated Payload project.

The important seams are:

- active-tenant resolution;
- Markdown rendering/editing;
- form-submission -> document generation;
- theme token resolution.

---

## 11. Local development requirements

The MVP must be operable locally without third-party service configuration.

Required outcome:

1. clone repository;
2. install dependencies;
3. copy/example environment configuration;
4. run seed/setup command if required;
5. start development server;
6. log in with documented local test credentials;
7. exercise both seeded cities.

Use a repository-local or clearly documented local path for SQLite and media.

Database/media files that should not be committed must be in `.gitignore`.

Provide a deterministic reset/reseed command or documented procedure.

---

## 12. Seed scenario

Use the fixtures in `02_TEST_FIXTURES.md` rather than inventing new demo content during implementation.

The two tenants must look intentionally different.

At least one user must be able to switch between both tenants.

At least one form-generated incident report and one simulated imported Markdown report must exist by the final acceptance run.

---

## 13. Logging and error behavior

This is a development proof of concept. Favor visible failures over graceful silence.

- Log failed collection operations and form-to-document generation errors.
- Surface useful error messages in the UI.
- Do not catch errors merely to replace them with generic `Something went wrong` messages during development.
- Do not add telemetry or external error-reporting services.

---

## 14. Testing expectation

Automated tests should target logic that is cheap and important:

- tenant scope helper if one exists;
- form placeholder rendering;
- document generation from form answers;
- theme token resolution if nontrivial.

Use browser/manual acceptance testing for the subjective editor/theme/form-builder UX.

Do not create a giant test harness for this spike.

---

## 15. Final MVP acceptance scenario

The MVP is complete only when the following scenario can be performed from a clean local setup.

### Administrator pass

1. Log in as the seeded multi-city admin.
2. Open Ravenhurst.
3. Change Ravenhurst's seal/banner/colors/font choices.
4. Verify the homepage preview and archive-document preview both change immediately and remain readable.
5. Edit the About page through WYSIWYG mode.
6. Switch to Markdown/source mode, make a small change, return to WYSIWYG, and save.
7. Navigate the archive and create a nested `Police / Reports` folder structure if it is not already seeded.
8. Create a normal document through the WYSIWYG editor.
9. View its canonical Markdown.
10. Create or edit the `Incident Report` form template with the required fixture fields.

### Member/officer pass

11. Use the officer/member test user or equivalent role simulation.
12. Choose `New -> Incident Report`.
13. Fill and submit the fixture incident report.
14. Verify a normal archive Document appears in `Police / Reports`.
15. Open the generated document and verify tenant branding and readable formatting.
16. Edit the generated document normally.
17. Find it through archive search.

### Simulated SL pass

18. Open the simulated notecard-import surface.
19. Paste the fixture Markdown report.
20. Import it into `Police / Reports`.
21. Verify it appears beside the form-created and web-created records as the same document type.
22. Open its WYSIWYG editor and make a change.
23. Copy/export the resulting canonical Markdown.

### Tenant separation pass

24. Switch to Port Victoria.
25. Confirm its branding is dramatically different.
26. Confirm Ravenhurst records do not appear in Port Victoria's archive/search.
27. Open an equivalent Port Victoria document and confirm the same rendering components adopt Port Victoria styling.

### Product review question

After the scenario, stop and review before adding scope:

> Is creating, styling, filing, finding, and reusing these records already materially better than managing Second Life notecards?

Do not continue into production infrastructure until that answer is yes and the rejected UX choices have been corrected.

---

## 16. Explicitly deferred

These are not hidden requirements. They are consciously deferred until after MVP review:

- real Second Life transport/integration;
- final role/delegation/ACL model;
- custom tenant domains/subdomains;
- PostgreSQL deployment;
- cloud media/object storage;
- email invitations/recovery;
- billing/subscriptions;
- mobile/desktop Flutter client;
- offline sync;
- arbitrary page builder;
- arbitrary tenant CSS;
- real-time collaboration;
- approval workflows;
- document signing;
- PDF/print-production subsystem;
- AI search/summarization;
- Elasticsearch or other external search;
- audit/compliance hardening;
- public API contracts beyond what naturally falls out of Payload.

---

## 17. Stop conditions

Stop and request product review instead of working around these issues if:

- MDXEditor cannot provide a comfortable Markdown-first WYSIWYG workflow;
- normal source/WYSIWYG round trips materially damage common documents;
- Payload Form Builder cannot be made understandable enough for a normal roleplayer without essentially rebuilding its authoring UI;
- tenant styling requires per-page custom hacks instead of centralized theme tokens;
- the executor discovers that a requested feature would force premature production infrastructure.

The purpose of a spike is to discover these facts early, not conceal them behind extra engineering.
