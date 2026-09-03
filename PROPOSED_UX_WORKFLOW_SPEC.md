# LoreForge user-first navigation and workflow specification

**Status:** Approved by owner on 2026-09-02; incorporated as execution-packet change `CC-2026-09-02-01` and amended by `CC-2026-09-03-03`
**Date:** 2026-09-02  
**Scope:** Product navigation, public/authenticated home surfaces, Domain navigation, customer administration, and document-creation entry flow. The authoritative implementation requirements now live in the amended execution packet; this document remains the readable design rationale.

## 1. Product organizing principles

1. **Organize around what a person is trying to do, not around database collections.** Collections such as Subdomains, RoleAssignments, PermissionRules, and Folders remain implementation details.
2. **Keep account identity, Character identity, and Domain context visibly distinct.** A User signs in. A User acts as a Character. A Character participates in a Domain. Permissions attach through explicit Domain relationships.
3. **Administration is capability, not a mode.** Selecting a Domain establishes the Domain being viewed. Authorized management links appear for that Domain; no second Domain selector, Enter Administration, or Exit Administration control exists.
4. **Primary navigation is stable.** Ordinary Domain navigation never grows or shrinks based on administrative permissions. Management links live in a visually separate, subordinate bar.
5. **Hide unavailable actions without relying on hiding for security.** The server independently authorizes every route and mutation. Where discovering an unavailable capability is useful, show a disabled control with a plain-language explanation instead of a dead end.
6. **Use Character-first customer language.** Membership, Department participation, Roles, document credits, and effective access are managed for a Character. The controlling User account is displayed separately and is never accidentally treated as the roleplay identity.
7. **Give every page an obvious way home and upward.** Persistent navigation and breadcrumbs replace one-off “back” links and browser-history assumptions.
8. **Progressive disclosure.** Common actions are prominent; lifecycle, provenance, and exceptional permission controls remain available in clearly named secondary panels.
9. **LoreForge and Domain branding have different jobs.** LoreForge branding owns the marketing site, login, account dashboard, and global controls. A Domain's theme owns its Domain pages and rendered records without obscuring the LoreForge controls.
10. **Responsive and accessible by construction.** Keyboard access, focus states, readable contrast, mobile navigation, error summaries, and non-drag alternatives are part of acceptance, not later polish.

## 2. Terminology

- **User / Account:** the authenticated LoreForge account. Account settings, password, subscription, and linked Characters belong here.
- **Character:** the roleplay identity through which ordinary Domain participation and document authorship occur.
- **Domain:** a community or personal archive selected in the global context header.
- **Department:** the customer-facing default name for the existing internal `Subdomain` model. Internal neutral schema names may remain `subdomain`; customer routes and copy use `department(s)`. Legacy `/subdomains` routes redirect to canonical `/departments` routes.
- **People:** the recommended navigation label for the Domain's Character-centered membership manager. It avoids calling a Character a User and is friendlier than “principals” or “assignments.”
- **Role:** a Department-owned job/rank in a reusable hierarchy, with default authority. The Role manager defines Roles; a Character's People page is the primary place to assign them.
- **Document Type:** classification and lifecycle defaults, such as Plain Text or Deed.
- **Template:** reusable starting content/presentation for one Document Type.
- **Form:** a guided data-entry experience that generates an ordinary Document through a form Template.

## 3. Surface and route map

```text
LoreForge
├── Public platform site
│   ├── /                         Marketing home + embedded login
│   ├── /about                    About LoreForge
│   ├── /subscriptions            Plans/subscriptions
│   ├── /create-account           Account creation
│   ├── /forgot-password          Password recovery
│   └── /domain/:domain           Public Domain site when enabled
│
├── Authenticated platform
│   ├── /                         User dashboard
│   ├── /account                  Profile & security
│   ├── /account/characters       Character management
│   ├── /account/connections      Second Life/account connections
│   ├── /account/notifications    Notification preferences (later)
│   ├── /account/subscription     Personal billing/subscription (later)
│   └── /platform                 Platform Console, Platform Admin only
│
└── Selected Domain: /domain/:domain
    ├── Home                      /domain/:domain
    ├── About                     /domain/:domain/about
    ├── Departments               /domain/:domain/departments
    │   └── Department            /domain/:domain/departments/:department
    ├── Records                   /domain/:domain/records
    │   ├── New document          /domain/:domain/records/new
    │   └── Document              /domain/:domain/documents/:document
    │       ├── Edit              .../edit
    │       └── History           .../history
    └── Conditional management bar
        ├── People                /domain/:domain/manage/people
        │   └── Character         /domain/:domain/manage/people/:character
        ├── Roles                 /domain/:domain/manage/roles
        ├── Templates & Forms     /domain/:domain/manage/templates
        │   ├── Document Types    .../types
        │   ├── Templates         .../templates
        │   └── Forms             .../forms
        └── Customize             /domain/:domain/manage/customize
```

The LoreForge logo always returns to the authenticated User dashboard (or public platform home when signed out). The Domain navigation item **Home** always returns to the selected Domain's home. These are deliberately different destinations.

## 4. Header and navigation system

### Global LoreForge header

The global header is present on every authenticated customer page:

```text
[LoreForge]   [Domain: Ar ▾]                         [Acting as: Elara ▾] [Account ▾]
```

- LoreForge logo: `/`.
- Domain selector: all Domains available through at least one controlled Character membership, plus administratively available Domains. Groups may be labeled **Participating** and **Managed** inside the same selector; there is still only one selector.
- Selecting a Domain never silently changes the active Character.
- Character selector: active controlled Characters with active membership in the selected Domain.
- An administrative User with no member Character may select and manage a Domain with **No participating Character** displayed. User-level authority permits management; it never fabricates Character identity.
- Account menu: Dashboard, Account, Characters, Notifications when implemented, and Log out.
- Platform Admin receives **Platform Console** in the account menu and dashboard—not in ordinary Domain navigation.

### Domain identity and primary navigation

The selected Domain supplies its logo, name, motto, colors, typography, and optional banner beneath the LoreForge header.

Primary navigation is always:

```text
Home    About    Departments    Records
```

It remains stable for anonymous visitors and ordinary members, subject to public/read access. It does not gain Roles, Forms, or Customize links when permissions change.

### Conditional management bar

If the current User or active Character has at least one management capability in the selected Domain, show a smaller, visually distinct bar:

```text
People    Roles    Templates & Forms    Customize
```

- Show the bar only when at least one destination is authorized.
- Show only authorized destinations within it.
- A scoped Department head may see People, Roles, or Templates & Forms limited to that Department without gaining Domain-wide management.
- There is no “Administration” selector, Enter button, mode, or Exit button.
- Direct navigation remains server-authorized even when a link is absent.

**Why People is added to the requested admin list:** without it, the head-of-caste workflow still begins from Roles, Departments, or raw memberships and repeats the database-first problem. Roles remains the definition surface; People is the assignment and effective-access surface.

## 5. Public LoreForge homepage at `/`

### Visual direction

LoreForge should feel like a crafted institutional archive rather than a SaaS admin template or a genre-specific Gorean site.

- Deep ink/charcoal foundation, warm parchment surfaces, and a restrained ember/copper accent.
- A distinctive editorial serif for display headings paired with a highly readable sans-serif for interface copy.
- Brand motif: forged seal + folio/archive, suggesting durable records and living worlds without using anvils everywhere.
- Subtle paper grain, rule lines, seal impressions, and warm light are acceptable; faux-medieval clutter, low-contrast brown text, and generic purple-gradient startup styling are not.
- Domain themes may be highly distinct after entry. The platform home remains recognizably LoreForge.

### Signed-out layout

1. Header: LoreForge mark; About; Subscriptions; Sign in; Create account.
2. Hero, left: clear product promise such as **“Build the living archive behind your roleplay world.”** Supporting copy describes characters, departments, records, permissions, and provenance in human terms.
3. Hero, right: embedded login card with Email, Password, Show password, Remember me, Sign in, Forgot password, and Create account. Errors remain inline. Ordinary users never need `/admin/login`.
4. Credibility/product section: four concise examples—organize institutions, create records, delegate access, preserve history.
5. “How it works” section: Join or create a Domain → act as a Character → create and discover records.
6. Subscription preview with a link to the full Subscriptions page. Exact prices may remain “Coming soon” until commercial decisions are approved.
7. Footer: About, subscriptions, privacy, terms, contact/help, and status when those destinations exist.

`/about`, `/subscriptions`, and `/create-account` must render intentional LoreForge-branded pages immediately even when their deeper behavior or pricing is placeholder content. Placeholders say what is coming; they do not expose diagnostics or test credentials.

The Payload back-office login remains a separate internal/operator surface. It is not linked as the ordinary customer login.

## 6. Authenticated User dashboard at `/`

After login, `/` renders the LoreForge dashboard rather than redirecting into a Domain or Payload admin.

### Dashboard hierarchy

1. Global header with Domain and Character selectors.
2. Welcome/identity strip showing the User and current acting Character, with a clear empty state if none is active.
3. **Your Domains** cards showing Character memberships and administrative relationship without conflating them.
4. **For you** feed:
   - Domain administrator notices;
   - watched Document/Folder activity;
   - direct notifications such as review results, shares, claims, Roles, or grants;
   - permission-filtered at read time.
5. **Continue working**: drafts, pending review items, recently opened/edited records, and available create shortcuts when real machinery exists.
6. Conditional administrator summary cards:
   - selected-Domain review queue and pending claims for Domain admins;
   - urgent Domain state/actions for owners;
   - Platform Console summary for Platform Admin.

Until activity/watch machinery exists, the feed is a polished empty/preview state describing what will appear there. Phase 4 provenance supplies authoritative events; Phase 13 projects them into feeds/watches/notifications. Domain administrator-authored notices are not currently represented in the ticket stack and require an explicit future Announcement/Domain Notice ticket.

## 7. Domain Home, About, and Departments

### Domain Home

Domain Home is the selected community's landing/dashboard, not the LoreForge account dashboard. It may show:

- Domain welcome and current notice;
- Department cards relevant to the active Character;
- recent accessible records;
- available create Templates;
- Domain activity placeholder, later real;
- scoped management summary cards for authorized actors.

Anonymous and authenticated Domain Home are related but permission-filtered presentations, not two unrelated templates.

### About

About is Domain-authored informational Markdown in fixed application chrome. Additional informational pages may be linked from About later without introducing a page builder.

### Departments directory

Ordinary view:

- card/list navigation to visible Departments;
- description, leadership Roles, the active Character's Role-derived participation status, and recent accessible activity where permitted;
- no raw membership table.

Authorized management affordance:

- a **Manage Departments** button/tab appears on this page;
- management view supports create, edit, archive, order, Role configuration, Role-derived participant counts, folder root, Templates, and Forms;
- selecting a Department opens one coherent Department workspace rather than separate collection pages.

Department landing:

- Overview;
- accessible folders;
- available create Templates/Forms;
- recent accessible records/activity;
- member directory where policy permits;
- a contextual **Manage Department** action for authorized actors.

## 8. People: Character-centered membership and access management

The primary administration workflow starts with a person/Character, because that matches the real conversation: “I am meeting with this scribe; what can they do?”

### People directory

- Begin with a modern FTS-style quick-search box. Results populate directly beneath it as the administrator types; results are ranked, keyboard navigable, and server-filtered. Search global Character name, Domain alias, controlling account display name, Department, or Role.
- Filters: active/inactive membership, Department, Role, claimed/unclaimed, access issue.
- Each row/card shows Character, local alias, controlling User separately, Departments, key Roles, and membership state.
- Selecting a result opens the Character's Domain management workspace.

### Character management workspace

Header:

- Character portrait/name and Domain-local alias;
- controlling User account as secondary information;
- Domain membership state;
- clearly scoped actions.

Panels/tabs:

1. **Overview** — identity, Domain membership summary, Role-derived Departments, Roles, recent work, and warnings.
2. **Roles** — one searchable hierarchical tree grouped by Department, with inline checkboxes to add/remove Roles. Filters switch between **Held roles** and **Roles I can assign**. A Role assignment contains no Folder scope. Department participation appears automatically when the Character holds a Role there and disappears when the last Role is removed.
3. **Folder access** — a separate searchable interactive Folder tree. Each Folder has independent **Read** and **Write** controls plus effective-state/source display. Direct per-Character overrides are edited here; Role defaults may be shown as a source but are never edited by changing the Character's Role assignment.
4. **Recent work** — accessible recent Documents prepared, edited, submitted, reviewed, filed, or otherwise meaningfully acted upon by the Character.
5. **History** — audited membership, Role, and permission changes affecting this Character in the Domain.

Removing Domain membership transactionally removes all Role assignments and direct Folder overrides in that Domain while preserving audit history. Re-adding the Character starts clean and never revives old Department participation, Roles, or Folder access.

Changes that would cascade or remove access require a specific consequence summary. Multi-control edits may be staged and saved together, but authorization is checked again for each mutation on the server.

### Boundary preserved

This surface is Character-centered even if administrators colloquially search for a “user.” One User may control several Characters with different Domain memberships and authority. The UI makes the User association visible but never assigns a Character Role to the User account.

## 9. Roles, Templates & Forms, and Customize

### Roles

Roles is where authorized people define the Role hierarchy and its default authority:

- hierarchy/tree and Role descriptions;
- required Department ownership;
- inherited/default capabilities, including any default Folder permission rules;
- assigned Character count, linking into filtered People results;
- create/duplicate/deactivate within delegation limits.

Role assignment is available here as a secondary bulk workflow, but the normal one-person workflow lives on the Character's People page.

### Templates & Forms

One management destination groups three concepts without conflating them:

- **Document Types:** classification and lifecycle policy.
- **Templates:** reusable starting content, header/footer/base composition, destination availability, and Document Type.
- **Template filing:** each Template declares its normal destination Folder and whether authorized filers may override it.
- **Forms:** guided field builders whose output becomes a Document through a form Template.

The landing page explains the relationship visually and lists actionable items. Customer copy never exposes Payload collections, JSON schema, or token syntax unless the User deliberately opens an advanced source view.

### Customize

Customize contains the existing Theme Studio, organized into Identity, Colors, Typography, Layout/Document Style, Vocabulary, and Preview. It controls the selected Domain only.

## 10. Records and new-document workflow

### Records browser

- Folder tree, search, filters, list/grid preference, breadcrumbs, and selected-folder context.
- **New document** is the primary action when the active Character is authorized to create in at least one destination.
- Creating inside a selected Folder may prefilter/highlight Templates whose normal destination is that Folder. It does not override a Template's filing rule. Plain Text or an override-enabled Template may preselect the current Folder when the actor may create there.
- Folder creation/rename/delete and permission management are contextual management actions, not always-visible forms in the browsing surface.

### `/domain/:domain/records/new`

Opening **New document** immediately loads a full creation page. There is no title prompt on the Records page.

Creation header:

- searchable **Template** combobox, grouped by Document Type; choosing a Template selects its normal destination Folder;
- **Plain Text** is the ordinary blank option;
- destination Folder breadcrumb/control, read-only unless the chosen Template explicitly permits an authorized override;
- changing Template after entering content warns before replacing generated starting content.

Document fields:

- **Title** — required, editable on the creation/editor page. A Template may suggest a title but does not hide the field.
- **Prepared by** — required multi-Character credit. The active Character is inserted first and cannot be removed during creation; authorized additional Characters can be added. This visible credit is distinct from immutable provenance recording the authenticated User and active Character who performed the operation.
- **Concerns** — zero-or-many Character links selected by searchable name/autocomplete; unclaimed Character creation/selection follows the authorized Character-link workflow.
- **Tags** — Domain vocabulary autocomplete with permission-gated ad-hoc creation.
- **Body/Form**:
  - document Template or Plain Text loads the WYSIWYG editor with source mode available;
  - form Template loads the guided form and a useful preview/summary;
  - submission produces an ordinary Document whose rendered body, metadata, history, and lifecycle are handled identically thereafter.
- **More details** — lifecycle destination/policy explanation and other uncommon metadata; never a dumping ground for raw collection fields.

Actions:

- Save Draft;
- Submit for Review or File, determined by effective lifecycle policy and permissions;
- Cancel, with dirty-state protection;
- clear inline validation and a page-level error summary.

### Required model/ticket clarification

The existing Phase 5 “Character links” ticket is too generic for this screen. The approved ticket must distinguish visible **Prepared by** credits from **Concerns** links and from provenance actor fields. A recommended shape is a typed Document–Character relationship (`prepared_by`, `concerns`) with invariants, while immutable create/edit actor identity stays in provenance. Exact storage may differ, but those semantics may not be collapsed.

## 11. Permission-smart behavior

- Every page asks “what may this User/Character do here?” rather than “are they in admin mode?”
- User-level Domain owner/admin authority permits the appropriate selected-Domain management pages even with no acting Character.
- Character-scoped delegated authority can expose only the relevant People/Role/Template/Folder controls within its Department or Folder branch.
- Platform Admin may view/manage a selected Domain through the same Domain UI where possible, with exceptional platform actions confined to Platform Console and audited.
- Ordinary authoring that represents a roleplay identity requires an active eligible Character. Platform or Domain authority does not silently author as that Character.
- Primary Domain navigation remains stable. Conditional management navigation may vary, but never changes the meaning or order of the primary links.

## 12. Execution-packet impact and recommended sequence

Owner approval of this proposal requires formal Change Control because it changes the frozen “Administration context/mode” decision and the default customer vocabulary.

### Before Phase 4

Add a bounded UX foundation patch:

1. Replace `/` diagnostics with the branded signed-out home/login and signed-in dashboard shell.
2. Add branded placeholder About, Subscriptions, Create account, Account, and Characters destinations.
3. Replace ordinary `/admin/login` entry with a customer login endpoint/form; retain Payload admin only as an internal back office.
4. Remove the separate Administration selector/mode/Exit control.
5. Make the one Domain selector include participating and managed Domains; support a selected administrative Domain with no active Character.
6. Establish the stable Domain primary nav and conditional management bar.
7. Change customer-facing Subdomain language/routes to Department(s), retaining internal neutral schema compatibility.
8. Introduce the People directory/Character workspace shell using existing Phase 3 data; mark effective permission editing as unavailable until Phase 7 rather than faking it.

### Phase 4

- Build lifecycle/history/review inside the new Document view/editor shell.
- Add the full new-document page with Plain Text and Type selection available at that phase.
- Do not add a title-entry form back to Records.

### Phase 5

- First execute P05-T00 to remove Folder scope from RoleAssignments, remove direct Department membership, make Roles Department-owned, and establish the separate Role and Folder trees in People.
- Add typed Prepared by and Concerns Character relationships, tags, related/superseding records, and Copy/Move/Share in the same document action system.

### Phase 6

- Hydrate the searchable Template chooser and switch between WYSIWYG and form-based creation.
- Make Template choice select the Template's normal destination; expose an alternative Folder only for Templates that explicitly permit override.
- Build Templates & Forms as one customer management area with Types/Templates/Forms subnavigation.

### Phase 7

- Hydrate People → Folder access with authoritative effective sources, direct Read/Write grants/denies, and delegation limits, without changing Role assignments.
- Enforce `assign_subordinates` against the Department Role tree and populate `Roles I can assign` from the same server decision.
- Drive management-bar visibility from real capabilities.

### Phase 8

- Complete visual/product polish, Domain public/member variants, responsive tuning, vocabulary configuration, and starter-pack content.
- Phase 8 is a refinement of this approved information architecture, not permission to invent a different shell.

### Later phases

- Phase 11 hydrates Platform Console and operator dashboard.
- Phase 13 hydrates activity projections, watches, notifications, preferences, and feed behavior.
- Add an explicit Domain Notice/Announcement ticket because administrator-authored dashboard notices are not currently covered by Phase 13.
- Commercial subscription behavior remains gated by real pricing/provider decisions; the public Subscriptions surface can exist before checkout is enabled.

## 13. Acceptance criteria for the UX foundation

1. Signed-out `/` looks and reads like LoreForge, contains the login form, and exposes About, Subscriptions, and Create account destinations.
2. Signed-in `/` is a LoreForge dashboard with Domain and Character context, account access, Domain cards, and deliberate empty feed/admin placeholders.
3. No ordinary customer flow links to `/admin/login` or requires Payload admin UI.
4. Exactly one Domain selector exists in the customer shell.
5. No Administration mode or Exit Administration control exists.
6. Primary Domain navigation is exactly Home, About, Departments, Records and does not swell with permissions.
7. Authorized management appears in a distinct bar and is scoped to the selected Domain.
8. All customer-visible Subdomain copy says Department(s); legacy URLs redirect without data migration.
9. A Domain administrator can search and select a Character in People, edit Department-owned Roles in one checkbox tree, edit direct Read/Write access in a separate Folder tree, and see recent work without visiting raw collection pages.
10. Roles remains the Role-definition surface, while one-person assignment occurs naturally from People.
11. Records has one New document action that opens a full editor/creation page; it never asks for title inline on the Records browser.
12. The new-document specification preserves Title, required active-Character Prepared by credit, additional preparers, Concerns, tags, destination, Template/Form choice, body, lifecycle actions, provenance, and validation.
13. Logged-out, zero-Character, ordinary member, Department manager, Domain admin, Domain owner, and Platform Admin fixtures each see a coherent shell without relying on hidden UI for authorization.

## 14. Recommended decisions

Unless the owner changes them, the implementation proposal assumes:

- the Character-centered manager is labeled **People** rather than Users or Members;
- People is added to the management bar because it is the entry point for the head-of-caste workflow;
- Templates & Forms is one destination with Types, Templates, and Forms inside it;
- Domain administrator notices are a future first-class Announcement/Domain Notice concept, not fake provenance events;
- internal schema may retain `subdomain` while every customer-facing default says Department;
- the signed-in root dashboard aggregates “For you” items across Domains, while the selected Domain still controls shortcuts and administrative summary; Domain Home shows only that Domain.
