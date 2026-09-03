# SL Civic Archive - MVP Execution Stack

## Execution protocol

Execute tickets in order. Each ticket should end in a runnable application state.

**Do not batch across a REVIEW GATE.** Commit the ticket, report what works, list any deviations, and stop for review.

If a library proves unsuitable, do not quietly replace it with a new architecture unless the ticket explicitly authorizes that fallback.

For every ticket:

- keep changes scoped;
- do not add speculative abstractions;
- update the README/setup notes when setup changes;
- run relevant tests/typecheck/lint;
- manually exercise the acceptance criteria;
- commit with a ticket-specific message.

---

# Ticket 00 - Bootstrap the local Payload/SQLite application

## Goal

Produce the smallest real application foundation that can run entirely locally and will not need to be thrown away merely because production later uses Postgres.

## Required work

1. Create a TypeScript Next.js + Payload application using current supported versions.
2. Configure Payload's official SQLite adapter.
3. Configure one local SQLite database URL/path through environment configuration.
4. Configure local media/uploads if Payload media is needed.
5. Add `.env.example` with only required local values.
6. Add `.gitignore` entries for local DB/media/secrets as appropriate.
7. Add a minimal authenticated `Users` collection.
8. Add a health/home route proving both Next.js and Payload run in the same local application.
9. Add deterministic local seed/reset instructions or command placeholder sufficient for later tickets.

## Guardrails

- No Postgres instance.
- No cloud provider.
- No Docker requirement unless the framework itself absolutely requires it; SQLite means it should not.
- No repository/data-access abstraction around Payload.
- No production auth provider.
- Do not style the product yet beyond basic readability.

## Acceptance criteria

- Fresh install can start from documented commands.
- Payload admin loads.
- A local user can authenticate.
- SQLite database is created locally.
- Restart preserves database state.
- No external services are required.
- Typecheck/build path is healthy.

## Commit

`MVP-00 bootstrap local Payload SQLite app`

---

# Ticket 01 - Tenant, theme, and document vertical slice

## Goal

Prove the core architectural relationship before building archive mechanics:

> one Markdown document + one tenant theme -> professional branded record

## Required work

1. Add `Tenants`.
2. Add minimal `Memberships` connecting users to tenants with `admin | member`.
3. Add `Documents` with tenant, title, canonical Markdown body, timestamps, and origin.
4. Seed the two fixture tenants and the multi-city admin from `02_TEST_FIXTURES.md`.
5. Create an active-tenant selector for the MVP.
6. Implement centralized theme token resolution.
7. Render one seeded fixture document in a tenant-branded document viewer.
8. Ensure all document retrieval is scoped by active tenant server-side.

## Theme fields for this ticket

At minimum:

- preset;
- primary;
- secondary;
- accent;
- background;
- heading font key;
- body font key.

Logo/banner may wait until Ticket 03 if media setup would distract from the vertical slice.

## Guardrails

- Tenant switcher substitutes for domains. Do not build hostname/custom-domain routing.
- Do not implement complex permissions.
- Do not put tenant styling into Markdown.
- Do not query SQLite directly from application components.

## Acceptance criteria

- Admin can switch between Ravenhurst and Port Victoria.
- The same fixture Markdown can be viewed through both theme configurations and looks clearly different.
- A Ravenhurst query cannot accidentally show Port Victoria documents through the normal application path.
- Theme application uses centralized semantic tokens rather than scattered tenant-specific conditionals.

## REVIEW GATE A - architecture/visual foundation

Stop after the commit.

Review:

- Does the application feel like a branded tenant site rather than a Payload admin demo?
- Does the document read like a civic record?
- Is tenant/theme separation clean?
- Is the code still small enough to change aggressively?

Do not proceed until accepted.

## Commit

`MVP-01 prove tenant themed document slice`

---

# Ticket 02 - Markdown-first WYSIWYG editor spike

## Goal

Determine whether MDXEditor is good enough to become the MVP authoring surface.

## Required work

1. Integrate MDXEditor for archive Documents.
2. Configure only the supported Archive Markdown features.
3. Provide an intentionally small toolbar.
4. Expose normal WYSIWYG editing.
5. Expose Markdown source editing/viewing using the cleanest MDXEditor-supported approach.
6. Load and save canonical Markdown strings directly.
7. Exercise the fixture stress document.
8. Confirm documents can move WYSIWYG -> source -> WYSIWYG -> save without unacceptable semantic damage.

## Guardrails

- Do not introduce HTML as canonical storage.
- Do not introduce MDX runtime/component execution.
- Do not add arbitrary text colors/fonts inside documents; tenant theme owns that presentation.
- Do not implement Milkdown in parallel.

## Acceptance criteria

- Non-technical path: click document, click Edit, type/edit naturally, save.
- Power-user path: inspect/edit Markdown source, save, return to WYSIWYG.
- Headings, bold, italic, lists, links, blockquotes, and fixture content round-trip acceptably.
- Saved database value remains Markdown text.
- Editor toolbar does not look like a developer demo.

## REVIEW GATE B - editor decision

Stop after the commit and demonstrate the editor.

Decision outcomes:

- **PASS:** keep MDXEditor and continue.
- **FAIL:** document concrete UX/round-trip failures. Do not continue building archive UI around it. Next work should be a focused alternative-editor spike, most likely Milkdown, under a separately approved patch ticket.

## Commit

`MVP-02 spike Markdown WYSIWYG editor`

---

# Ticket 03 - Theme Studio and tenant identity

## Goal

Prove the primary personalization experience: a normal user can make a city feel distinct without designing webpages.

## Required work

1. Add logo/seal and banner media fields/storage.
2. Build a tenant-admin Theme Studio outside the raw Payload field-editing experience.
3. Provide controls for:
   - preset;
   - logo/seal;
   - banner;
   - primary color;
   - secondary color;
   - accent color;
   - heading font from curated choices;
   - body font from curated choices.
4. Provide live preview of:
   - representative homepage/site chrome;
   - representative archive document.
5. Seed clearly different Ravenhurst and Port Victoria identities.
6. Persist changes to tenant theme settings.

## Guardrails

- No Puck.
- No GrapesJS.
- No arbitrary layout canvas.
- No arbitrary CSS textarea.
- No arbitrary remote font URL.
- Do not expose every CSS token just because it exists.

## Acceptance criteria

- A tester can materially change the city's visual identity without understanding HTML/CSS.
- Changes are visible immediately in preview.
- Saved changes affect the actual homepage/document viewer.
- Documents require no content changes when theme changes.
- Both fixtures remain readable under their seeded themes.

## REVIEW GATE C - personalization decision

Stop after the commit.

Perform the `75-year-old roleplayer` test:

- Can someone recognize what to change?
- Can they make a distinctive site without breaking it?
- Does the result look professional by default?

Only add more theme controls if review identifies a real expressive gap.

## Commit

`MVP-03 add tenant Theme Studio`

---

# Ticket 04 - Minimal tenant website and Markdown pages

## Goal

Turn the themed shell into a small believable city website without building a page builder.

## Required work

1. Add `Pages` with tenant, title, slug, Markdown body.
2. Seed fixture About pages.
3. Build tenant-facing routes for:
   - Home;
   - About;
   - Departments;
   - Records.
4. Use the same Markdown authoring/editor approach for prose pages.
5. Make Home an application-owned layout with editable welcome content and fixed useful modules.
6. Render tenant logo/banner/theme consistently across pages.
7. Include a simple department directory sufficient to make the site feel coherent. Hardcoded/seeded department records are acceptable for MVP if clearly isolated as fixture content.

## Guardrails

- No arbitrary page layout builder.
- Do not turn Departments into an HR/org-chart subsystem.
- Do not build navigation management unless required for the four MVP routes.

## Acceptance criteria

- Both tenants have convincing but distinct small websites.
- Admin can edit About/welcome prose without HTML.
- Tenant switch changes content and branding together.
- Page authoring continues to store Markdown.

## Commit

`MVP-04 add minimal tenant website pages`

---

# Ticket 05 - Archive folders, CRUD, and basic search

## Goal

Make the records system usable enough to compare against Second Life inventory/notecards.

## Required work

1. Add tenant-owned `Folders` with nullable parent.
2. Build understandable folder navigation/tree.
3. Build document listing for current folder.
4. Add create/edit/delete document flows.
5. Add create/delete folder flows with sane handling of non-empty folders.
6. Add document move between folders.
7. Add basic tenant-scoped search over document title and Markdown body.
8. Seed `Police / Reports` and other fixture folders.
9. Ensure ordinary archive operations use the active tenant context.

## Optional only if extremely cheap

A single narrow folder restriction demonstration may be added, e.g. a `restricted` flag or tiny allowlist, solely to prove the UI can hide one folder from the member user. Do not generalize it.

## Guardrails

- No ACL framework.
- No inheritance engine.
- No Elasticsearch.
- No tagging ontology unless required by a fixture.
- No version-history UI unless Payload gives it essentially for free and it does not distract from archive UX.

## Acceptance criteria

- User can create `Police / Reports` and navigate it easily.
- User can create, edit, move, and delete records.
- Search finds fixture phrases from both title and body.
- Search never crosses the active tenant.
- Folder navigation remains understandable with at least two nesting levels.

## REVIEW GATE D - archive usability

Stop after the commit and use the archive as though doing actual clerk/police work.

Review whether navigation/search/editing is already preferable to inventory/notecards before continuing to forms.

## Commit

`MVP-05 build archive folders CRUD and search`

---

# Ticket 06 - Simulated Second Life Markdown import/export

## Goal

Prove the content-format contract with Second Life without inventing transport integration.

## Required work

1. Add an MVP/development import surface.
2. Accept:
   - title;
   - destination folder;
   - pasted Markdown body.
3. Create a normal Document with origin `markdown-import`.
4. Add a Copy/View Markdown action to ordinary documents.
5. Import the fixed fixture notecard from `02_TEST_FIXTURES.md`.
6. Open the imported document through normal viewer/editor/search paths.

## Guardrails

- No LSL.
- No HTTP-in/HTTP-out design.
- No Second Life object protocol.
- No viewer integration.
- No UUID assumptions.
- No attempt to reproduce exact notecard asset transport.

## Acceptance criteria

- Pasted fixture Markdown becomes a normal document.
- It is searchable and editable just like a web-authored document.
- Export/copy returns canonical Markdown.
- No SL-specific transport assumptions exist in the data model.

## Commit

`MVP-06 prove simulated SL Markdown round trip`

---

# Ticket 07 - Structured report form spike

## Goal

Determine whether Payload Form Builder can provide a sufficiently approachable Google-Forms-like template-authoring experience for this niche.

## Required work

1. Install/configure Payload Form Builder.
2. Restrict enabled field types to:
   - short text;
   - long text;
   - date;
   - select;
   - checkbox.
3. Create the fixture `Incident Report` form.
4. Associate archive form metadata with:
   - tenant;
   - destination folder;
   - output document title template;
   - output Markdown template.
5. Implement a small document-generation module that accepts:
   - form template;
   - submitted answers;
   - authenticated user/tenant context;
   and returns/creates a normal archive Document.
6. Implement minimal placeholder substitution.
7. Provide the officer/member form-filling experience in the tenant UI, not only in Payload admin.
8. On success, navigate to the resulting document.

## Important design seam

The form builder may remain Payload-specific for MVP, but **form-to-Document generation must not be embedded throughout Payload plugin callbacks/UI code**.

Keep one small, explicit application function/module responsible for generating the archive document. This is the seam that survives if the form-authoring tool changes later.

## Guardrails

- Do not build a generalized template language.
- Do not build conditional logic unless it falls out free and is required for evaluation.
- Do not build notifications/emails.
- Do not build form analytics.
- Do not add SurveyJS in this ticket.
- Do not make form submissions a separate archive record type.

## Acceptance criteria

- Admin can create/edit the fixture form without code.
- Member can fill the form from the tenant UI.
- Required validation works.
- Submission produces the expected Markdown.
- Submission produces a normal Document in `Police / Reports`.
- Generated record can subsequently be edited through MDXEditor, found in search, moved, and exported as Markdown.

## REVIEW GATE E - form-builder decision

Stop after the commit.

Evaluate the authoring UX, not merely technical functionality.

Decision outcomes:

- **PASS:** Payload Form Builder is sufficient for MVP.
- **MARGINAL:** list exact UX pain points and decide whether a thin custom admin surface can hide them.
- **FAIL:** stop. Next approved work should compare SurveyJS Creator or a purpose-built small form designer. Do not automatically build either.

## Commit

`MVP-07 spike structured report forms`

---

# Ticket 08 - MVP integration cleanup and acceptance run

## Goal

Make the existing vertical slice coherent enough for a real product decision. Fix integration/UX problems; do not add new product systems.

## Required work

1. Ensure seed/reset produces the full fixture state.
2. Ensure both test users/tenants work from clean setup.
3. Run the complete acceptance scenario from the build spec.
4. Fix broken navigation, confusing labels, obvious styling problems, and cross-feature inconsistencies discovered during the run.
5. Ensure origin types display sensibly if surfaced at all.
6. Ensure tenant switching cannot leave stale content from the previous tenant visible.
7. Ensure source/WYSIWYG/form/import-created documents all use the same viewer/search/archive paths.
8. Clean development-only dead code from rejected experiments.
9. Update root README with exact local start/reset/test credentials and the MVP limitations.
10. Record remaining product questions in a short `MVP_REVIEW.md`, grouped as:
   - editor;
   - theme/personalization;
   - archive UX;
   - forms;
   - permissions later;
   - Second Life integration later;
   - production infrastructure later.

## Guardrails

This is not permission sprint, Postgres sprint, deployment sprint, or SL integration sprint.

If acceptance uncovers a missing feature, record it unless it prevents the defined MVP scenario.

## Acceptance criteria

- Complete build-spec acceptance scenario passes from a clean local reset.
- No external provider is necessary.
- All four document origins converge on normal archive documents.
- Two tenant identities are unmistakably different.
- Tenant data does not leak through normal UI/search paths.
- The repository contains no abandoned alternate-editor/page-builder architecture.
- `MVP_REVIEW.md` clearly identifies what should be changed before any production-hardening work.

## REVIEW GATE F - MVP product decision

Stop development.

Answer only after using the software:

> Is this already materially better for the target roleplayer than storing and managing Second Life notecards?

Production architecture work starts only after the answer is yes.

## Commit

`MVP-08 complete integrated MVP acceptance pass`

---

# Post-MVP work - explicitly NOT part of this stack

Do not execute these as follow-ons without a new specification:

- richer tenant roles/delegation;
- folder/document ACL inheritance;
- PostgreSQL migration;
- hosted deployment;
- custom domains;
- real Second Life integration;
- media/object-storage migration;
- Flutter client;
- stronger audit/revision features;
- print/PDF;
- public sharing;
- notifications;
- workflow/approval;
- alternate form builder if current one passed;
- page builder.
