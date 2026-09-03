# LoreForge — Full Product Build Specification

**Status:** Post-MVP product specification and phased implementation plan  
**Date:** 2026-09-02  
**Basis:** Current product decisions + review of the completed `sl-civic-archive` MVP spike  
**Implementation philosophy:** Incremental, testable, intentionally scoped. Do not build future infrastructure halfway. Either build a subsystem close to its intended shape, or keep it deliberately simple behind a clean seam until its dedicated phase.

**Owner amendment CC-2026-09-02-01:** Before Phase 4, the owner approved the user-first customer-shell specification now frozen in packet documents `02_FROZEN_PRODUCT_DECISIONS.md` and `03_ARCHITECTURE_CONTRACT.md`. Those narrowed decisions supersede any implication below that Administration is a separate mode/context, that ordinary users log in through Payload Admin, that customer navigation defaults to the noun Subdomain rather than Department, or that Phase 8 may replace the approved information architecture. Phase 4 now begins with the branded platform home/login/dashboard, single-Domain context/navigation, People/Department workflows, and full-page Document entry tickets.

---

## 1. Product Definition

LoreForge is a multi-tenant archive and record-keeping platform for roleplay communities, initially aimed at Second Life communities and especially civic/governmental roleplay such as Gorean cities.

The product is **not** a generic CMS. Its core job is to make fictional institutional records dramatically easier to create, file, share, retrieve, preserve, and present than Second Life notecards and personal inventory folders.

A LoreForge Community Domain should feel like the records office, courthouse, archive, police/warrior records room, scribe hall, hospital records office, or similar institution belonging to the fictional community that uses it.

The same underlying product should support different roleplay genres through:

- visual theming;
- domain vocabulary;
- seeded organizational structures;
- document types;
- templates and forms;
- role names and default roles;
- starter content.

The first commercial/use-case focus may be **Gorean Roleplay Cities**, but no core code should require a Gorean city. A modern municipality, medieval kingdom, sci-fi colony, hospital, faction, or similar RP organization should be able to use the same feature set with different starter configuration and terminology.

### 1.1 The product promise

A new user should be able to:

1. enter the Domain for the city/community in which their Character participates;
2. see a branded interface that looks and speaks like that community;
3. navigate to the Subdomain/folders relevant to their role;
4. create a record either by editing a normal WYSIWYG document or filling a purpose-built form;
5. file or submit it through whatever review workflow that Domain uses;
6. later find it by search, folder, Character, type, tag, or related record;
7. see its provenance and revision history;
8. share it, copy it, move it, supersede it, or export it according to permissions;
9. eventually move records between the web archive and Second Life without losing provenance.

The system should be substantially easier for an ordinary roleplayer than manually managing collections of Second Life notecards.

---

## 2. Product Principles and Guardrails

These are architectural/product rules, not suggestions.

### 2.1 Build vertically and review often

Do not execute the full roadmap as one build.

Each phase below must end in:

- automated checks for the logic introduced in that phase;
- a concrete manual scenario;
- a user-facing usability pass when that phase changes UX;
- an explicit review gate before the next phase begins.

If a phase exposes a bad abstraction, fix it while the affected surface is still small.

### 2.2 Customer-facing UX is the product

The product risk is not whether rows can be permissioned in a database. The product risk is whether ordinary roleplayers can actually use the system comfortably.

Customer-facing administration should therefore live in purpose-built LoreForge UI wherever practical. Payload Admin may remain useful for developer/platform back-office work, but it is **not** the target long-term interface for a 75-year-old Head Scribe configuring forms, roles, or templates.

### 2.3 Markdown remains canonical document text

Documents and prose pages store canonical Markdown, not HTML and not editor-specific JSON.

Reasons:

- readable as plain text;
- suitable for Second Life notecard import/export;
- portable across web and future Flutter/native clients;
- independent of the WYSIWYG editor implementation;
- easy to preserve and export.

The WYSIWYG editor is a view/edit tool over Markdown, not the data model.

### 2.4 Do not make React-specific authoring formats part of the business model

The future backend must remain usable by other clients.

Persist:

- Markdown documents/pages;
- neutral theme tokens;
- neutral form/template schemas;
- ordinary business entities and relationships.

Do not persist UI implementation details merely because a React library uses them.

### 2.5 No general-purpose page builder in the core product

Puck/GrapesJS-style arbitrary layout editing is not required for the core use case.

Domain personalization is closer to “MySpace-level identity” than “build Wix.”

The initial/full product should favor:

- app-owned layouts;
- logo/seal;
- banner/background treatment;
- colors;
- fonts;
- theme presets;
- domain vocabulary;
- Markdown informational pages;
- perhaps simple ordering/toggle controls for known modules later.

Raw CSS remains a possible advanced future escape hatch, but is not a core requirement.

### 2.6 Do not over-generalize Second Life integration before designing it

The core product must leave clean seams for Second Life identity, location checks, notecard transfer, and external resource links.

Do **not** invent the LSL/LibreMetaverse/bot protocol as part of the web application specification.

The Second Life bridge will be a separate process/service when built.

### 2.7 Permissions may be sophisticated, but they are not the product centerpiece

Support the required hierarchy, delegation, direct grants, explicit denies, and folder/document sharing.

Do not introduce an external authorization platform unless the in-application model demonstrably becomes unmanageable.

### 2.8 A roleplay archive should not casually destroy history

Use revision history, provenance, event history, and soft deletion/trash semantics for normal operations.

Permanent destructive operations should be rare, privileged, and audited.

### 2.9 Domain history must not depend on one person remaining available

Community Domains are persistent organizational entities. The Domain has one designated Owner for final commercial/administrative authority, but Domain records must survive ordinary staff/user turnover.

---

## 3. Completed MVP Spike — Findings and Disposition

The completed spike successfully proved the core UX/technology direction. It should be preserved/tagged as a reference, but its schema is intentionally not the production schema.

### 3.1 What the spike proved successfully

The current source demonstrates:

- Next.js + React + Payload can support the application cleanly.
- Payload's SQLite adapter works for a self-contained local proof of concept.
- Canonical Markdown can be edited WYSIWYG and in source mode.
- The custom source textarea preserved Markdown structure better than the tested MDXEditor built-in diff/source path.
- Tenant theme tokens applied through CSS variables can transform both site chrome and rendered documents.
- A small Theme Studio with live preview is feasible.
- App-owned site layouts plus Markdown content pages are sufficient for the initial public/site concept.
- Folder navigation and tenant-scoped archive browsing are straightforward.
- Simulated notecard paste/import and Markdown export prove the SL-facing canonical text seam.
- Payload Form Builder can author a structured form whose answers are transformed through a small replaceable module into an ordinary Markdown Document.
- Form-generated documents can immediately become ordinary archive documents instead of a separate data silo.
- The full MVP acceptance scenario reportedly passed from a clean local reset.

### 3.2 Spike implementation pieces worth preserving conceptually

Keep or evolve these ideas:

- `canonicalizeMarkdown()`-style normalization at every Markdown input boundary;
- a single explicit `form answers -> generated document` application seam;
- theme tokens resolved centrally, then exposed as semantic CSS variables;
- customer-facing rendered document pages separated from editor internals;
- active Domain resolution through one central context seam;
- application-owned informational-page layout rather than a freeform page builder;
- fixture-driven acceptance tests;
- SQLite/local files during deliberately local phases.

### 3.3 Spike pieces that are temporary by design

Do **not** freeze these:

- `tenant` terminology in code; product terminology is **Domain**;
- user-level `Memberships` with only `admin/member` roles;
- current tiny `Documents` collection;
- nullable/primitive folder model as the complete authorization model;
- `origin` as a three-value badge instead of full provenance;
- simple application-query tenant filtering as the complete production authorization solution;
- hard document delete;
- LIKE search over title/body as the final search system;
- Payload Form Builder's stock Admin authoring surface as the final customer experience;
- the current two theme presets/few system fonts as the final theme catalog;
- local filesystem media as production storage;
- cookie-only active tenant context without active Character context.

### 3.4 Immediate technical correction discovered during review

The current Markdown renderer uses Marked and comments that raw HTML is escaped. That assumption is unsafe: Marked does not sanitize generated HTML.

Before any untrusted user content is accepted, the real application must:

- disallow unsupported raw HTML in the LoreForge Markdown dialect;
- configure the editor/parser accordingly where possible;
- sanitize rendered HTML before injecting it into the DOM;
- add regression tests for script/event-handler injection.

This is a Phase 1 requirement.

### 3.5 Editor finding

MDXEditor remains the provisional editor because it delivered a pleasant WYSIWYG experience and Markdown round-trip.

Do not commit to it forever merely because the spike used it.

The real product should initially keep:

- rich-text default mode;
- explicit Source mode for power users;
- the custom source editor approach that preserved canonical Markdown;
- a deliberately small toolbar matching the supported Markdown dialect.

Phase 1 will tune the UX and decide whether MDXEditor remains the long-term choice before much more application behavior grows around it.

### 3.6 Form-builder finding

The Payload Form Builder plugin proved the hard part: configurable forms can produce ordinary archive documents.

However, its stock Admin surface exposes irrelevant concepts such as email/confirmation behavior. The production plan therefore treats the plugin as a useful engine/schema source, not necessarily the final customer-facing authoring UX.

---

## 4. Core Terminology

### 4.1 Platform

The overall LoreForge service and platform-wide administration layer.

### 4.2 User

A LoreForge login representing one account holder.

A User may control multiple Characters.

A User may link **zero or one** verified Second Life account/avatar identity.

One Second Life account/avatar may link to **at most one** LoreForge User.

LoreForge deliberately does not model or verify that several Second Life accounts are controlled by the same human. If someone uses five SL accounts, they use five LoreForge accounts.

This keeps LoreForge out of alt-account disclosure, espionage, and moderation disputes.

### 4.3 Second Life Identity

The optional verified external identity associated one-to-one with a User.

The verification mechanism is deferred to the SL integration phase.

A verified SL identity is **not automatically a Character**.

### 4.4 Character

A global roleplay persona.

A Character:

- is not owned by a Domain;
- may participate in many Domains;
- may be controlled by a User;
- may exist unclaimed/domain-managed when created by a clerk/warrior/etc.;
- may have public profile information;
- may be linked structurally to Documents;
- may later be claimed by the player who controls it;
- may be merged with a duplicate through controlled workflows.

Character-to-User control is publicly visible by default.

### 4.5 Domain

The top-level tenant/community archive.

Use **Domain** consistently as the product term. Use DNS-specific terms such as hostname, DNS record, custom hostname, etc. when discussing actual internet DNS.

Two Domain modes exist conceptually:

- **Community Domain** — shared organizational archive;
- **Personal Domain** — private Character-rooted archive using a reduced subset of Community Domain capabilities.

### 4.6 Domain Owner

Each Community Domain has exactly one designated Owner **User account**. Domain ownership is a platform/commercial authority, not an RP Character role, so changing the Owner's active Character does not change who can ultimately manage the subscription or close/transfer the Domain.

The Owner has final authority for matters such as:

- subscription/billing relationship;
- Domain closure/sunset request;
- top-level administrative authority;
- transfer of ownership.

The one-owner rule intentionally keeps LoreForge from deciding which faction in a community leadership dispute has ultimate authority.

A Domain may still have many administrators.

### 4.7 Subdomain

A delegated organizational boundary inside a Community Domain.

Examples:

- Scribes;
- Warriors;
- Courts/Magistrates;
- Hospital;
- City Government.

A Subdomain is **not** a nested tenant.

It does not have:

- separate billing;
- separate theme;
- independent site identity.

It does have:

- its own administrators/heads;
- explicit membership;
- roles scoped to it;
- folders and delegated management;
- templates/forms relevant to it;
- an app-owned landing page for navigation and available actions;
- future optional SL location restriction.

Initial product assumption: Subdomains are one organizational level beneath a Domain. More granular hierarchy is represented by folders and delegated managers rather than recursive Subdomains unless real usage later proves nested Subdomains necessary.

### 4.8 Folder

The canonical organizational location of Documents.

Folders are hierarchical and are major permission/delegation boundaries.

Every Domain has a logical root folder. Every Document has exactly one canonical folder location, including the root.

### 4.9 Document Type

A required classification for every Document.

Examples:

- Plain Text;
- Incident Report;
- Property Deed;
- Marriage License;
- Court Ruling;
- Employment Contract.

Each Domain defines its own types, with starter packs seeding useful defaults.

A `Plain Text` Document Type and inheritable blank template provide the low-friction “just type the damned note” workflow when the Domain wants it.

### 4.10 Template

A reusable way to create a Document of a particular Document Type.

A Type may have many Templates.

Templates may be:

- document-first Markdown templates;
- form-first templates that collect inputs and generate Markdown;
- derived from a reusable base template such as letterhead.

### 4.11 Document

The canonical archive record.

A Document has:

- one Domain;
- one canonical Folder;
- one required Document Type;
- one canonical Markdown body;
- lifecycle state;
- standardized metadata;
- Character links;
- tags;
- relationships to other Documents;
- revisions;
- provenance/history.

### 4.12 Correspondence

Roleplay communication between Characters.

Correspondence is a separate system from Documents and from email.

A Correspondence item may later be copied/filed into the archive as a Document, but does not become a Document merely because it was sent.

---

## 5. Identity and Character Model

### 5.1 Active operating context

Most authenticated roleplay actions occur in an explicit context:

`User -> active Character -> active Domain -> optional Subdomain/folder`

The User login establishes who operates the account.

The active Character establishes the roleplay identity whose memberships, roles, permissions, Personal Domain, and correspondence are being used.

The active Domain establishes the current community/tenant context.

### 5.2 Character participation in Domains

A Character may:

- be a member of multiple Community Domains simultaneously;
- move from one city/community to another without being recreated;
- hold roles in multiple Domains;
- hold multiple roles in the same Domain/Subdomain;
- appear in records without being a formal member.

Domain membership and role assignment attach to the **Character**, not the User.

### 5.3 Character creation during filing

Authorized users may create an unclaimed Character while filing a record when the person referenced by the record does not yet exist.

Example:

A Warrior creates an Incident Report and enters a new suspect Character who has never used LoreForge.

The new Character becomes linkable immediately.

### 5.4 Character claims

A player may later create/log into a LoreForge account and request association with an existing unclaimed Character.

The claim workflow must support:

- request;
- pending state;
- approval;
- rejection;
- audit history.

A suitable authorized Domain user who has local knowledge of that Character may approve/reject the claim.

The mechanism must not require LoreForge platform staff to adjudicate ordinary identity claims.

### 5.5 Duplicate Characters and merges

Duplicate creation is expected.

Example:

- `Marcus of Ar`
- `Markus of Ar`

Two levels of correction exist:

#### Domain-level correction/aliasing

A Domain can treat two local references as the same person for its own archive/navigation without globally rewriting other Domains.

#### Global Character merge

A permanent global merge combines the Character identity across all Domains and linked records.

Global merge requests enter the **Platform Admin queue** because one Domain must not unilaterally alter another Domain's history.

A completed merge must:

- select a surviving Character;
- transfer structural Document links;
- preserve aliases/old IDs as needed for lookup;
- preserve the merge event permanently;
- never silently destroy provenance.

### 5.6 Character profile control

A Character may be:

- User-controlled; or
- unclaimed/domain-managed.

Once controlled by a User, the User controls the global identity/profile subject to normal platform rules.

Domains may maintain local context (roles, memberships, local titles/labels, local notes/aliases where appropriate) without gaining authority over the global Character outside their Domain.

### 5.7 Character public profile

Character profiles are public by default.

A public Character page may show:

- Character name;
- portrait/profile fields;
- controlling User relationship by default;
- public Domain participation where appropriate;
- public Documents structurally linked to that Character.

Private Documents remain private even when linked to a public Character.

---

## 6. Domain and Subdomain Model

### 6.1 Community Domain

A Community Domain owns the community-specific configuration and archive data, including:

- name/slug;
- Owner;
- administrators;
- theme;
- vocabulary;
- public-site settings;
- Subdomains;
- folders;
- roles;
- memberships;
- document types;
- templates/forms;
- tags;
- documents;
- permissions;
- optional correspondence policy;
- optional SL location policy;
- subscription/lifecycle state.

### 6.2 Subdomain administration

A Subdomain has one or more designated heads/administrators.

Examples:

- Head Scribe administers Scribes;
- Commander administers Warriors.

The Subdomain head can manage the Subdomain's people, roles, folders, and permissions according to Domain policy.

Delegation continues beneath the Subdomain through folder-scoped authority.

Example:

- Head Scribe controls all Scribe records;
- Property Records Clerk manages the Property Records branch;
- Historical Records Clerk manages Historical Records;
- each manager may delegate within their own branch but cannot grant more authority than they possess.

### 6.3 Subdomain landing page

Each Subdomain receives an application-owned landing page, not a separately themed microsite.

The page should automatically present, permission-filtered for the active Character:

- accessible folders;
- available templates/forms;
- recent/relevant records;
- administrative actions if authorized;
- future location-restriction state if relevant.

### 6.4 Domain and Subdomain membership are explicit

Membership is not inferred merely because a Character can read one resource.

A Character can be a member of a Domain/Subdomain while still lacking permission to particular folders.

Conversely, direct sharing can give a nonmember access to a particular Document without making them a department member.

---

## 7. Roles, Hierarchy, Delegation, and Permissions

### 7.1 Role hierarchy is real

Roles may form a rigid hierarchy within their administrative context.

Example:

`Commander > Captain > Warrior`

or

`Head Scribe > Senior Scribe > Junior Scribe`

A Character may hold multiple roles simultaneously, including roles in different Subdomains.

Example:

A Character may be both a Warrior and a Magistrate and therefore receive privileges from both role assignments.

Role definitions within a Domain/Subdomain form an acyclic parent-child hierarchy (a tree for that role set). A Character may still hold several assignments in different branches/scopes, so the organizational hierarchy remains rigid without forcing the Character into only one job.

### 7.2 Role hierarchy is not the only access mechanism

Hierarchy supplies convenient defaults, rank/delegation rules, and normal institutional structure.

It must **not** prohibit direct exceptions.

Example:

The First Platoon Captain may explicitly grant an unrelated Warrior permission to edit a battle-plans folder even though that Warrior is not assigned to First Platoon.

### 7.3 Scoped role assignments

Where needed, a role assignment can carry an authority scope.

Example:

- Marcus: Captain scoped to First Platoon branch;
- Tarl: Captain scoped to Second Platoon branch.

The Role can therefore remain `Captain` rather than requiring a separate role definition for every platoon.

### 7.4 Delegation rule

A Character may never delegate more authority than they currently possess.

Delegation must also remain inside the resource scope the delegator is authorized to manage.

### 7.5 Role creation authority

Role creation is intentionally not a generally delegatable power.

By default:

- Domain Owner/top-level Domain administrators can create Domain roles;
- Subdomain heads/administrators can create roles belonging to their Subdomain;
- lower delegated managers cannot create new Roles merely because they can manage a folder.

### 7.6 Membership defaults

Domain and Subdomain membership may carry a configurable baseline/default permission bundle for convenience. Membership remains conceptually separate from Role and from direct ACL grants: changing the membership defaults should not rewrite a Character's role assignments or explicit exceptions.

### 7.7 Direct user/Character grants

The authorization model must support direct grants independent of role hierarchy.

Examples:

- grant a Court Clerk read access to a Police folder;
- let a specific Warrior edit a particular plan;
- share a single Document with a spouse.

### 7.8 Explicit deny

Explicit deny is required.

Example:

A Warrior under investigation can be denied access to particular data while still technically holding the Warrior role.

The exact precedence algorithm should be finalized and scenario-tested during the authorization phase rather than prematurely encoded now. Required behavior is:

- hierarchical inherited defaults;
- direct grants;
- direct denies;
- resource inheritance;
- document-specific exceptions;
- no delegation beyond possessed authority.

### 7.9 Resource scopes

Permissions may apply at:

- Domain;
- Subdomain;
- Folder;
- Document.

Folder-level rules are the primary fine-grained archive mechanism.

Document-specific grants/denies are supported for exceptions but should not become the normal organizational workflow.

### 7.10 Core capabilities

The eventual authorization engine should be able to express at least:

- read;
- create Document;
- edit Document;
- submit/file Document;
- approve/reject filing;
- lock/unlock;
- delete/restore;
- move;
- copy;
- share;
- export;
- manage folders;
- manage templates/forms;
- manage tags/types where appropriate;
- manage members;
- assign roles;
- manage Subdomain;
- manage Domain appearance/vocabulary/public settings;
- manage Domain ownership/subscription only where explicitly appropriate.

Do not expose every capability as a giant wall of checkboxes if a role preset/default can provide a better UX.

---

## 8. Archive Organization

### 8.1 Canonical location

Every Document has exactly one canonical folder location.

A Document may be moved.

Other folders/Subdomains should generally refer to the same Document by link/share rather than pretending the Document physically lives in many places.

### 8.2 Folder tree

Folders support arbitrary nesting.

A logical root Folder exists for each Domain so that every Document can have an actual folder reference and permission inheritance has a consistent root.

### 8.3 Move

Moving changes the canonical location of the existing Document while preserving:

- Document identity;
- revision history;
- relationships;
- Character links;
- tags;
- provenance.

Move history records:

- previous Domain/Folder;
- destination Domain/Folder;
- actor;
- timestamp.

### 8.4 Cross-Domain move

Cross-Domain destructive moves are supported as an optional roleplay behavior, because a community may intentionally model a physical book being carried from one library/archive to another.

However:

- cross-Domain move is **disabled by default**;
- the source and destination authorization requirements must both pass;
- source Domain policy must allow destructive transfer;
- provenance must preserve the origin;
- the destination Domain becomes the canonical owner/location afterward.

### 8.5 Copy

Copy creates a genuinely independent new Document.

The copy:

- receives a new Document identity;
- receives its own versions/history from copy time forward;
- may be placed in another Folder or Domain;
- does not synchronize edits with the source;
- permanently records copy provenance: source identity/context, copy timestamp, and actor.

This is the default mechanism for “send a copy for your files.”

### 8.6 Share

Share grants access to the **same** canonical Document.

Share is different from Copy.

The UI must make the distinction understandable:

- **Share access** — same live record;
- **Send/Keep Copy** — independent new archival record.

### 8.7 Delete and restore

Normal delete should be soft-delete/trash/archive behavior.

A deleted Document remains recoverable by authorized administrators and retains provenance.

Permanent purge is a separate privileged operation, audited, and not part of ordinary record management.

---

## 9. Document Model

### 9.1 Required Document Type

Every Document must have a Document Type.

No untyped Document state exists.

Domains that want low-friction freeform notes use the seeded `Plain Text` type and blank template.

### 9.2 Canonical content

Canonical readable body: Markdown.

Supported dialect should remain deliberately constrained and well tested. Initial expected capabilities:

- headings;
- paragraphs;
- bold/italic;
- lists;
- links;
- blockquotes;
- horizontal rules;
- tables if the editor experience remains acceptable.

Raw arbitrary HTML is not part of the supported document language.

### 9.3 Standardized metadata

LoreForge defines the metadata envelope rather than allowing Domains to invent arbitrary database columns.

At minimum, Document metadata supports:

- title;
- Domain;
- canonical Folder;
- Document Type;
- archive lifecycle state;
- optional type-specific record status vocabulary if/when implemented;
- created by/at;
- submitted/filed by/at where relevant;
- approved/rejected by/at where relevant;
- locked/unlocked by/at;
- last edited by/at;
- origin/import channel;
- Character links;
- tags;
- relationship links;
- copy/move provenance;
- SL import/export provenance later.

The specialized substantive fields of a deed/report/license belong in its Markdown/template/form rather than becoming arbitrary schema columns.

### 9.4 Archive lifecycle

One Document model supports flexible lifecycle rather than separate “living” and “locked” document species.

Core archive states:

- **Draft** — working record, not formally filed;
- **Pending Review** — optional workflow state when a supervisor/authority must approve filing;
- **Filed** — accepted official record;
- **Locked** — direct body edits no longer allowed through ordinary editing.

Rejection is an auditable workflow outcome. Depending on workflow, rejection may return the record to Draft or leave a retained rejected/submitted history rather than silently deleting it.

A Domain/Type may use simple Draft -> Filed flow or require Draft -> Pending Review -> Filed.

### 9.5 Editing and locking

Unlocked Documents may be edited directly if the active Character has permission.

Every saved edit creates a revision.

Locked Documents cannot be directly edited through ordinary edit capability.

They may still participate in:

- grouped relationships;
- supersession;
- copies;
- shares;
- administrative unlock when explicitly authorized and audited.

### 9.6 Full revisions

Keep complete historical versions of Document content.

Revision UI must eventually allow:

- view previous version;
- compare meaningful changes when practical;
- see who saved the revision and when;
- restore an earlier version if authorized.

Payload's built-in versions facility is a strong implementation candidate for body/history storage. LoreForge lifecycle state should remain a LoreForge concept rather than simply equating `Draft/Filed/Locked` with Payload's publishing status.

### 9.7 Document provenance timeline

Provenance belongs to the Document experience, not merely a generic server log.

The Document page includes a chronological History/Provenance view containing meaningful events such as:

- created;
- edited/revision saved;
- submitted;
- approved/rejected;
- filed;
- locked/unlocked;
- moved;
- copied;
- shared/revoked where appropriate;
- Character linked/unlinked;
- relationship created/removed;
- superseded;
- imported/exported to SL;
- restored/deleted.

Each event records sufficient actor/time/context to answer “what happened to this record?”

### 9.8 Audit vs provenance

Document provenance is a domain object shown with the record.

General platform/application audit logging is separate and may contain system/support events not appropriate to show as Document history.

Do not make Document history depend on parsing generic logs.

---

## 10. Document Relationships

LoreForge supports two fundamentally different relationship classes.

### 10.1 Grouped relationship

A grouped/related relationship associates Documents without changing which record is current.

The relationship carries a human/domain-defined label, such as:

- amendment;
- appeal;
- supporting evidence;
- related incident;
- contract attachment;
- prior case.

The label explains the relationship but has no built-in lifecycle semantics.

This relationship should generally display symmetrically as a connection between the records, with the configured label.

### 10.2 Supersedes relationship

`Supersedes` is a first-class directional semantic relationship.

Example:

A newly recorded property deed supersedes the previous deed for that property.

The old Document remains intact and historically readable.

The UI should make it easy to navigate:

- previous/superseded records;
- the current successor;
- the supersession chain.

Where practical, current-vs-historical state should be derived from the supersession chain rather than manually maintaining duplicated truth.

---

## 11. Character Links and Tags

### 11.1 Structured Character links

Characters mentioned meaningfully in a Document are linked structurally, not only typed in prose.

This allows:

- Character pages to show related public records;
- search/filter by Character;
- form fields to select/create Characters;
- future cross-domain lore/history navigation.

The Markdown may still contain the visible name. The structural link is separate metadata.

### 11.2 Tag vocabulary

Tags use a hybrid model:

- each Domain maintains a normalized autocomplete vocabulary;
- starter packs seed useful tags;
- authorized users may create a new tag during filing when needed;
- duplicate/case-variant tags should be normalized/merged through UI.

---

## 12. Document Types and Templates

### 12.1 Type and Template remain distinct

A Document Type defines what kind of record something is.

A Template defines one way to create that type.

Example:

`Incident Report` type may offer:

- General Incident Report;
- Arrest Report;
- Property Crime Report;
- Use-of-Force Report.

### 12.2 Default Plain Text type

Starter configuration includes:

- Document Type: `Plain Text` (vocabulary may rename it);
- root-level blank Markdown Template;
- template marked available to descendant folders by default.

A Domain may hide/remove this convenience if it wants every record tightly structured.

### 12.3 Template scope and inherited availability

A Template has an administrative scope/location.

It may be configured as:

- available only at its configured scope; or
- available to descendant folders.

Example:

A Head Scribe publishes a generic Scribe letterhead/template at the Scribes root and marks it available below. Property Records can then use it when defining a deed template.

### 12.4 Base-template composition

LoreForge should support a reusable base-template concept so a child Template can start from/compose with a higher-level base such as official letterhead.

Required behavior:

- parent/base template can be selected only when visible to the child template's scope;
- new Documents resolve the current template composition at creation time;
- existing Documents do not retroactively change when a template/base changes;
- exact placeholder/composition syntax is deferred to the template phase and must be kept understandable in the UI.

### 12.5 Template authoring modes

#### Document-first

Open preformatted Markdown in the WYSIWYG editor and let the user complete/edit it.

#### Form-first

Present structured fields, then generate canonical Markdown.

After generation, the result is an ordinary Document.

### 12.6 Form data retention

Structured form answers are an authoring aid only.

Once the form produces the Document, the raw structured submission is not retained as a second source of truth unless a future use case explicitly changes this requirement.

Canonical outcome: generated Markdown Document + normal archive metadata/provenance.

### 12.7 Form field types

Initial production set should include at least:

- short text;
- long text;
- date/time as appropriate;
- select/dropdown;
- checkbox;
- Character picker/create field;
- potentially tag picker where useful.

Do not add exotic field types without a specific record workflow that needs them.

### 12.8 Form authoring UX

The spike proved Payload Form Builder technically, but the production customer-facing Form Studio should hide irrelevant CMS/email concepts.

Target experience:

1. choose Document Type;
2. choose destination/default filing scope;
3. add/reorder fields;
4. name fields in ordinary language;
5. mark required/optional;
6. configure select choices;
7. edit the generated document layout in a WYSIWYG/Markdown template surface;
8. insert field placeholders through buttons/menus rather than requiring syntax knowledge;
9. preview the finished form and generated document;
10. save/publish availability.

If the Payload plugin can be wrapped cleanly, keep it. If not, replace the customer-facing authoring UI while preserving the neutral form schema and `form -> Document` seam.

---

## 13. Search and Retrieval

### 13.1 Primary search scope

Search is Domain-specific by default.

When the user is in a Domain, Search means “search this Domain.”

Cross-Domain search may be considered later but is not foundational.

### 13.2 Searchable dimensions

Eventually support permission-aware searching across:

- title;
- full Markdown text;
- Document Type;
- archive lifecycle state;
- optional record status;
- Subdomain;
- Folder;
- tags;
- linked Characters;
- creator/filer;
- relevant dates;
- related-document title/identifier where useful.

### 13.3 Search implementation strategy

Do not introduce Elasticsearch/search infrastructure merely because the final feature list is broad.

Development phases may use simple Payload/SQLite queries.

The production-data phase should move to Postgres. Search should first use Postgres-appropriate indexing/full-text capability and only introduce a dedicated search engine if measured requirements demand it.

### 13.4 Permission-aware results

Search must not reveal inaccessible Document content/metadata merely because the index can see it.

Future SL location restrictions are evaluated at search-start time where configured. Results may remain on screen after the check. Opening a result performs the access/location checks required for opening that Document.

---

## 14. Appearance, Vocabulary, and Informational Pages

### 14.1 Theme Studio

Each Community Domain receives a deliberately constrained visual identity editor.

Expected controls:

- Domain name/identity display;
- logo/seal;
- motto/tagline;
- banner/header image;
- primary/secondary/accent colors;
- background/page color;
- heading font;
- body font;
- curated visual preset;
- optional background-image treatment if user testing supports it;
- live preview of both site chrome and a representative Document.

Do not expose arbitrary layout controls in the core product.

### 14.2 Theme presets

Ship several coordinated presets rather than a blank design system.

Starter packs may select a default preset but Domains remain free to customize afterward.

The final set of fonts/presets should be expanded based on actual visual testing rather than a huge catalog.

### 14.3 Raw CSS

Raw custom CSS is explicitly deferred.

Keep it as a possible advanced feature. Do not design other systems around the assumption that arbitrary CSS exists.

### 14.4 Vocabulary

Domains can customize a controlled product vocabulary, not translate every interface string.

Examples of concepts that may have configurable labels:

- Subdomain/Department/Office;
- Scribe/Clerk-oriented defaults;
- Warrior/Police-oriented defaults;
- role titles supplied by starter packs;
- common document type/template names.

Core internal identifiers remain stable and language-neutral.

The system assembles ordinary interface language around the configured vocabulary rather than exposing hundreds of arbitrary localization strings.

### 14.5 Informational pages

Domains may maintain Markdown informational pages such as About, Government, Rules, etc. inside an application-owned site shell.

No general page builder is required.

The homepage and member dashboard remain application-owned layouts driven by Domain configuration and data.

---

## 15. Starter Packs

### 15.1 Purpose

Starter Packs turn an empty Community Domain into a believable starting archive for a particular RP style.

Initial examples:

- Gorean City;
- Modern Municipality;
- possibly Medieval Kingdom or another second demonstrator after real needs are understood.

### 15.2 First-party only

For the planned product, starter packs are authored by LoreForge only.

Do not build a community marketplace, publishing workflow, moderation system, or third-party pack execution model.

### 15.3 Pack contents

A pack may seed:

- theme preset;
- vocabulary;
- Subdomains;
- role hierarchy/default roles;
- folder structure;
- Document Types;
- templates/forms;
- tags;
- starter informational/help content.

### 15.4 Copy-on-install

Starter packs are **copy-on-install**.

After installation, seeded objects become the Domain's own editable configuration.

Future changes to LoreForge's starter pack do not silently rewrite existing Domains.

A future optional “preview/import new pack additions” mechanism may be considered, but live pack dependency is not part of the architecture.

---

## 16. Public Access

### 16.1 Public archive

A Community Domain may enable public web access to selected folders/Documents.

Anonymous users can browse/search only content made public by Domain policy.

Private neighboring content must not become discoverable through links, counts, search results, metadata, or Character pages.

### 16.2 Public site

Public visitors see the Domain's branding and app-owned public surface:

- homepage;
- informational pages;
- public Subdomain/office navigation where configured;
- public archive;
- public search;
- public Character profiles.

### 16.3 Logged-in dashboard

Authenticated active-Character view adds:

- the Character's Domains/Subdomains;
- accessible folders;
- available forms/templates;
- recent documents;
- activity/notifications later;
- administrative actions where authorized.

Public site and member dashboard are related surfaces but not identical.

---

## 17. Personal Domains

### 17.1 Root identity is the Character

A Personal Domain belongs to a **Character**, not directly to the User.

This is important because roleplay identity is the archive boundary.

A single Character can participate in many Community Domains and the Personal Domain aggregates that Character's own private records/copies across them.

A User controlling several unrelated Characters may therefore eventually have several Personal Domains. Whether one subscription includes one or several Character archives is a pricing/entitlement decision explicitly deferred.

### 17.2 Personal Domain feature subset

Use the same underlying Domain/Document infrastructure, but hide organizational capabilities that do not apply.

Personal Domain:

- private by default;
- no Subdomains;
- no public website;
- no role hierarchy;
- no shared folder permissions;
- owner Character has full control;
- ordinary folders for organization;
- personal templates/types as allowed by product tier;
- may receive independent copies from Community Domains;
- presents a `Shared with this Character` view for live Documents shared from other Domains without pretending those Documents were copied into the Personal Domain;
- may directly share an individual Document with another authorized account/Character, including optional edit permission.

If users later demand multi-person shared private organizations, that should become a distinct organization tier rather than quietly turning Personal Domains into small Community Domains.

### 17.3 File-and-keep-copy workflow

Where appropriate, a Character filing a Document in a Community Domain can request:

- file the Community Domain Document; and
- create an independent copy in their Personal Domain.

The Personal copy receives permanent source/copy provenance but no live synchronization.

---

## 18. Notifications, Activity, and Watches

### 18.1 Audit/provenance is not notification

LoreForge records meaningful events independently of whether anyone is notified.

Later product logic decides which event types are notification-worthy.

### 18.2 Activity feed

Activity feed is a human-friendly projection of meaningful events, not the authoritative audit storage.

Possible views:

- Domain activity;
- Subdomain activity;
- recent activity relevant to active Character.

### 18.3 In-app notification inbox

Planned later feature.

Examples:

- Document shared with you;
- Character claim approved/rejected;
- watched Document changed/superseded;
- access/role granted;
- submitted Document approved/rejected;
- correspondence delivered.

### 18.4 Watches

Initial watch scopes:

- Document;
- Folder.

Do not initially build watches for every possible Type/tag/filter.

### 18.5 Email

Email is a notification delivery channel only.

The in-app Message/Correspondence system is separate.

Future channels may include SL delivery notifications without changing the underlying notification event model.

---

## 19. Correspondence

### 19.1 Separate from Documents

Correspondence represents communication between Characters.

It is not an archive Document by default.

An authorized user may later explicitly file/copy a message into an archive as a Document, recording provenance from the Correspondence item.

### 19.2 Character-to-Character

Visible sender and recipient are Characters.

The system internally records which User operated the sending Character for audit/security.

Authorized Domain managers may operate domain-managed/NPC Characters where appropriate.

### 19.3 Reply linkage

Initial correspondence model uses individual messages/letters with optional `reply_to` / thread linkage.

Do not build Slack-style live chat initially.

### 19.4 Normal delivery mode

Default Domain behavior:

`send -> deliver normally`

### 19.5 Optional moderated roleplay delivery mode

A Domain may opt into GM/admin-controlled delivery.

In that mode:

`send -> moderation/delivery queue -> authorized decision -> delivery outcome`

Authorized game masters/admins may decide:

- deliver immediately;
- deliver after a delay;
- intercept/prevent delivery;
- mark delivery failed/lost;
- deliver a modified/garbled version.

### 19.6 Delay semantics

Delay is real application-enforced delivery delay, not “show it now and ask the player to pretend.”

The delay counts from original send time.

Example:

- sent Monday;
- GM reviews Wednesday;
- GM decides delivery takes three days;
- earliest delivery is Thursday (three days after original send), not Saturday.

If nobody ever reviews a queued message, it does not auto-deliver merely because time passed.

Once an authorized GM has chosen a future delivery time, a job may release it at that time.

### 19.7 Original vs delivered text

If a GM alters/garbles a message, retain:

- original text;
- delivered text;
- sender;
- recipient;
- operator;
- decision maker;
- decision timestamp;
- delay/delivery metadata;
- internal GM notes where supported.

Recipient sees only the version their roleplay should receive.

Sender visibility into delivery outcome may be Domain-policy dependent.

---

## 20. Second Life Integration Boundary

### 20.1 One LoreForge account to one SL account maximum

Required identity policy:

- LoreForge User -> zero/one verified SL identity;
- SL identity -> zero/one LoreForge User.

Do not model cross-account alt ownership.

### 20.2 SL identity vs Character

A verified SL account is not automatically a Character.

A single SL account/User may control several Characters.

A LoreForge User with no active Character can remain logged in and see a mostly empty/account-level dashboard rather than having the account deleted.

### 20.3 Separate bridge process

Expected future technical direction:

- one or more Second Life bot accounts;
- likely LibreMetaverse-based bridge/service;
- bridge runs as a separate long-lived process from the core web server;
- bridge authenticates to LoreForge through explicit service APIs/credentials;
- bridge does not directly own or mutate the core database.

Exact mechanism remains out of scope until the SL phase.

### 20.4 Notecard import/export

Future integration must support both directions:

- SL notecard/plain text -> LoreForge canonical Markdown Document;
- LoreForge Markdown Document -> SL-compatible notecard.

The exact transfer mechanism is deferred.

### 20.5 SL provenance

Imported/exported records should preserve rich provenance when data is available, for example:

- original notecard creator;
- original notecard creation date if knowable;
- uploading/importing Character/User/SL avatar;
- archive import timestamp;
- bridge/bot identity;
- whether the source was treated as read-only;
- subsequent export requestor/date;
- original historical provenance carried forward into exported notecard text where useful.

Do not reduce SL import/export to a generic `origin=sl` badge.

### 20.6 Location restriction

Future Community Domains may require SL location verification for access to:

- Domain;
- Subdomain;
- Folder.

Documents inherit folder restrictions rather than requiring routine per-Document location configuration.

### 20.7 Location checks happen at action start

Location enforcement must not continuously police an already-authorized browser action.

Required behavior examples:

- check location before starting a restricted search; results may remain visible afterward;
- check again before opening a restricted result/Document;
- once a Document view opens, do not close the tab because SL telemetry becomes delayed;
- check location when edit begins, not again at Save, so transient SL/network issues do not destroy user work.

### 20.8 Permissions remain authoritative

Physical presence is not a bypass around LoreForge authorization.

Conceptually:

`normal LoreForge permission/public-access rule` **AND** `required SL location condition, if configured`

A public filing cabinet can expose a public record to anyone physically present if the resource is configured public. A private resource still requires private permissions.

### 20.9 In-world retrieval

A future in-world object may request a Folder/Document on behalf of a Character.

LoreForge checks permission first. Only then may the SL bridge/bot generate/bundle/deliver the requested notecard.

### 20.10 Stable external identifiers

LoreForge resources should have stable IDs/URLs suitable for storing in SL objects/scripts without requiring knowledge of internal database implementation.

---

## 21. Platform Administration

Platform administration is a separate authority above all Domain roles.

### 21.1 Platform Admin powers

Platform Admin can:

- see/manage every Domain;
- inspect configuration/content for support;
- transfer Community Domain ownership;
- suspend/restore Domains;
- manage subscription state;
- resolve global Character merge queue;
- repair broken relationships/configuration;
- inspect storage/activity/usage;
- view failed jobs/integration health later;
- perform final deletion/archive operations when appropriate.

### 21.2 Platform Admin audit

Platform Admin actions that alter user/Domain data are audited.

Examples:

- ownership transfer;
- forced Document unlock;
- global Character merge;
- Domain suspension;
- permanent deletion.

### 21.3 Platform dashboard

The platform owner needs a useful operator dashboard with data visualization, not just a raw collection list.

Eventually show at least:

- Domain counts and lifecycle states;
- active/suspended/grace/read-only Domains;
- user/Character counts;
- Document counts/activity trends;
- storage usage once meaningful;
- subscription/revenue state once billing exists;
- failed background jobs;
- Character-merge queue;
- support/admin actions;
- SL bridge health once connected.

---

## 22. Product Tiers and Domain Lifecycle

### 22.1 Free User account

A free User account can:

- participate in invited Community Domains through controlled Characters;
- use permissions granted there;
- control/claim Characters;
- receive shares/notifications;
- maintain account/Character identity.

No free personal storage commitment is implied.

### 22.2 Community Domain

Paid organizational product with the complete organizational feature set.

### 22.3 Personal Domain

Paid Character-rooted private archive with reduced UI/features as specified above.

Exact subscription packaging—especially whether one entitlement includes several Character Personal Domains—is deferred until pricing is designed.

### 22.4 Community Domain subscription lifecycle

Conceptual lifecycle:

- Active;
- Grace;
- Read-only;
- Suspended/locked;
- Archived/Closed.

Core principle: a failed payment does not casually erase a community's accumulated RP history.

Permanent deletion is not an automatic short timer.

### 22.5 Intentional Domain sunset

A Community Domain may intentionally end.

Support a controlled sunset concept such as:

- read-only preservation;
- public historical archive if desired;
- private archive;
- ownership transfer;
- export;
- eventual deletion request.

Exact pricing/storage commitments for long-term archival hosting are deferred until real storage costs are known.

### 22.6 Storage quotas

The product may impose configurable storage/usage limits, but exact quotas are deferred until:

- image/attachment policy is known;
- storage provider/cost is known;
- observed usage exists.

Markdown text itself is not expected to drive major storage cost.

### 22.7 Custom DNS

Custom hostnames remain an open future possibility, not a foundational assumption.

The routing/domain model should not make future custom DNS difficult, but no phase should build it until product demand justifies it.

---

## 23. Import, Export, and Portability

### 23.1 Bulk historical import

Established communities may have years of text/notecard records.

Plan a future bulk import workflow for:

- text/Markdown files;
- folder/directory structures where useful;
- type/destination selection;
- provenance marking;
- later SL-specific migration tools.

Do not require users to re-enter historical archives manually.

### 23.2 Full Domain export

A Community Domain Owner should eventually be able to request a portable export containing enough information to avoid lock-in.

Expected export contents:

- Documents/Markdown;
- folders;
- standardized metadata;
- Character links;
- tags;
- relations;
- templates/forms;
- provenance/history where practical;
- attachments/media later.

Exact format can be designed in the export phase.

---

## 24. Technical Architecture Direction

This section states the intended shape without pretending all production infrastructure must exist immediately.

### 24.1 Web application

Continue with:

- Next.js / React / TypeScript;
- Payload as application backend/content/data framework;
- customer-facing custom React UI;
- Payload Admin primarily for platform/developer/back-office functions.

### 24.2 Database progression

#### Local/model phases

Continue with Payload + local SQLite while the core product model and UX are changing rapidly.

Do not add a fake repository/DAO abstraction solely to hide SQLite.

Use Payload's normal collection/local/API model.

#### Dedicated production-data phase

After the core Domain/Character/Document/Template/Permission model is validated, perform one explicit migration phase to Postgres.

That phase must include:

- Postgres adapter/config;
- repeatable schema migrations;
- data migration from the current local fixture/database;
- backup/restore procedure;
- realistic dataset tests;
- search/index strategy;
- environment configuration;
- deployment database choice.

Do not casually switch production databases in the middle of an unrelated feature sprint.

### 24.3 Media/storage progression

Local filesystem remains acceptable in local development.

When production infrastructure is built, choose a real persistent media strategy appropriate to actual media scope, likely S3-compatible/object storage if images/attachments are included.

The choice is deferred until that phase; do not prematurely build an attachment platform.

### 24.4 Versioning

Use/assess Payload's built-in Versions functionality for complete Document revisions rather than creating redundant custom full-body snapshot infrastructure.

Keep LoreForge provenance/event timeline separate because moves, shares, SL transfers, relationships, and similar events are not merely content revisions.

### 24.5 Jobs/worker

Later features genuinely require delayed/background work:

- delayed correspondence delivery;
- notification email;
- large exports;
- possibly import processing;
- bridge transfer requests.

Prefer Payload's job queue where it cleanly fits.

Use a dedicated jobs runner process in production rather than hiding long-running work in web requests.

The SL bridge remains a separate specialized service, not merely a Payload job handler.

### 24.6 APIs and future clients

The data model and authorization system must be callable through standard authenticated APIs so a future Flutter/mobile/desktop client can use the same backend.

Do not share the React UI implementation with Flutter; share the model/API.

Portable representations:

- Markdown;
- theme tokens;
- neutral form/template schema;
- ordinary resource IDs/relationships.

### 24.7 Authorization enforcement

The MVP's query helpers were correct for a spike but are insufficient as the final authorization boundary.

When real permissions are introduced:

- create one centralized LoreForge authorization subsystem/policy layer;
- integrate it with Payload access control and custom server actions/API endpoints;
- ensure server-side enforcement for every path;
- use query constraints where possible so inaccessible rows are never returned;
- avoid duplicating permission logic in each page/component.

Do not add an external FGA service unless later complexity provides a concrete reason.

### 24.8 Markdown safety

Before untrusted users:

- sanitize rendered output;
- reject/neutralize unsupported raw HTML;
- test dangerous links and event-handler injection;
- ensure Source mode cannot bypass the renderer's safety rules.

### 24.9 Production deployment

Do not select a provider as part of an unrelated feature.

The production-foundation phase should choose and configure:

- web host/server;
- Postgres;
- persistent media storage;
- backup policy;
- jobs runner;
- email provider if notifications/invites need one;
- secret management;
- logging/monitoring sufficient for support.

---

## 25. UI / Interaction Standards

### 25.1 Target user

Assume users may be technically unsophisticated roleplayers who know Second Life but not web-development concepts.

### 25.2 Editor

Document editing should feel like a small conventional word processor.

Default to WYSIWYG.

Source Markdown is an explicit power-user mode, not the default.

Toolbar stays intentionally small.

### 25.3 Save behavior

For the first production iterations, prefer explicit Save with:

- strong saved/saving/error state;
- dirty-state indicator;
- warning on navigation away with unsaved changes.

Revisit autosave only after lifecycle/versioning semantics are in place so autosave does not accidentally produce confusing filing/revision behavior.

### 25.4 Customer admin surfaces

Use domain language and concrete tasks:

- “Add report form”;
- “Give access”;
- “Manage Scribes”;
- “Create role”;
- “Choose document type.”

Avoid exposing database/CMS terminology such as Collection, relationship field, schema block, etc.

### 25.5 UI tuning is continuous

Do not defer all visual/usability work to the end.

Every phase that adds a major customer workflow gets a targeted tuning pass after the workflow is functional.

---

# 26. Phased Implementation Plan

## Phase 0 — MVP Spike Closeout **[COMPLETE]**

### Goal

Preserve the completed experiment and explicitly separate proven seams from temporary schema/UI.

### Actions

- Tag/archive the successful MVP state.
- Preserve `MVP_REVIEW.md` and the test fixtures.
- Record the 27-step acceptance scenario as historical baseline.
- Do not begin “cleanup refactors” merely for style.

### Exit condition

Spike is reproducible/referenceable and no longer treated as the branch where every future feature is indiscriminately piled.

---

## Phase 1 — Editor, Theme, and Safety Baseline

### Goal

Turn the UX experiments we already proved into a trustworthy baseline before adding domain complexity.

### Build

1. Fix Markdown rendering safety:
   - sanitized output;
   - unsupported raw HTML blocked/neutralized;
   - injection regression tests.
2. Finalize the supported Markdown dialect for this stage.
3. Tune MDXEditor integration:
   - WYSIWYG default;
   - Source toggle;
   - preserve custom source approach if it remains more reliable;
   - dirty-state tracking;
   - navigation-away warning;
   - clear save/error feedback;
   - keyboard/accessibility basics.
4. Decide MDXEditor vs replacement based on actual use, **now**, before deeper workflows depend on it.
5. Tune Theme Studio:
   - improve layout/usability;
   - make presets visibly distinct;
   - expand curated fonts/colors only enough to prove useful freedom;
   - ensure logo/banner upload is obvious;
   - maintain live homepage + Document preview.
6. Make UI terminology generic enough for Domains rather than hard-coded “city” labels.
7. Review Form Builder Admin cruft and determine what can be hidden/wrapped later; do not yet build the full Form Studio.

### Explicit non-goals

- Characters;
- real roles/permissions;
- Postgres;
- production hosting;
- starter packs;
- SL integration.

### Manual acceptance scenario

An ordinary user can:

- create/edit a Markdown document without knowing Markdown;
- switch to Source, make a valid edit, switch back;
- save/reopen without structural corruption;
- paste malicious-looking raw HTML and see it rendered safely/not executed;
- restyle a Domain into two convincingly different identities using Theme Studio.

### REVIEW GATE 1

**Question:** Is the editor/theme experience good enough to become the foundation of the real product?

Do not proceed if the answer is “we'll fix the editor later.”

---

## Phase 2 — User, Character, and Active Context

### Goal

Replace the spike's user-centric membership assumption with the real Character-centric identity model.

### Build

1. Expand User model with optional one-to-one SL identity placeholder fields/state, but no verification protocol.
2. Add global Characters.
3. User controls zero/many Characters.
4. Add active Character selection.
5. Active application context becomes User + Character + Domain.
6. Add unclaimed Characters.
7. Allow authorized fixture flow to create unclaimed Character while creating/linking a record.
8. Add Character claim request/approve/reject flow.
9. Add Character public profile basics.
10. Add Domain-local Character alias/context support sufficient to avoid cross-Domain ownership confusion.
11. Add duplicate/merge request concept, but global final merge UI may wait for Platform Admin phase.
12. Move Domain membership from User to Character.

### Tests

- one User controls two Characters;
- one Character participates in two Domains;
- two Characters controlled by same User have different Domain access;
- unclaimed Character exists without a User;
- claim can be requested/approved/rejected;
- account with no active Character remains usable at account level.

### UX tuning pass

Focus on:

- Character switcher clarity;
- avoiding confusion between User account and Character;
- “you are acting as…” visibility;
- public vs private profile/control language.

### REVIEW GATE 2

Use the product as a player with multiple Characters and verify that roleplay identity feels natural rather than like an account-management database.

---

## Phase 3 — Community Domain and Subdomain Structure

### Goal

Create the durable organizational skeleton before detailed ACL logic.

### Build

1. Replace/rename tenant concepts with Domain product model.
2. Community Domain with exactly one Owner.
3. Domain administrators separate from Owner.
4. Subdomain entity.
5. Explicit Domain membership and Subdomain membership for Characters.
6. App-owned Domain member dashboard.
7. App-owned Subdomain landing page.
8. Folder roots associated appropriately with Domain/Subdomain.
9. Initial Role model with:
   - Domain/Subdomain ownership;
   - parent Role hierarchy;
   - role assignments to Characters;
   - optional assignment scope.
10. Keep authorization simple enough to exercise structure; do **not** implement the full exception/deny engine halfway here.

### Fixture

Create a Gorean-style test Domain with at least:

- Scribes;
- Warriors;
- Magistrates/Courts;
- Head Scribe;
- Property Records Clerk;
- Commander;
- two Captains;
- Warriors;
- one Character holding roles in two Subdomains.

### Acceptance

- Character sees only Domains/Subdomains in which they participate, plus directly shared resources as later appropriate;
- Subdomain landing pages show their own folders/templates placeholders;
- same Role can be scoped differently for two Captains;
- role hierarchy renders understandably.

### UX tuning pass

Tune the navigation model now. Do not wait until there are hundreds of records.

### REVIEW GATE 3

Does Domain -> Subdomain -> Folder feel like the community's real institutional structure without becoming a tree-management application?

---

## Phase 4 — Document Types, Lifecycle, Revisions, and Provenance

### Goal

Turn the spike's simple Document into the durable archival record model.

### Build

1. Required Document Type.
2. Seed/create Plain Text type.
3. Logical root Folder so every Document has one canonical location.
4. Lifecycle state:
   - Draft;
   - Pending Review;
   - Filed;
   - Locked.
5. Optional filing-review policy sufficient to test:
   - author submits;
   - supervisor approves/files or rejects;
   - locked record cannot be normally edited.
6. Enable complete Document revision history.
7. Implement Document provenance/event timeline.
8. Record created/edited/submitted/filed/approved/rejected/locked/unlocked events.
9. Soft delete/restore rather than normal hard delete.
10. Upgrade Document viewer metadata/provenance UI.

### Implementation note

Evaluate Payload Versions for full content revisions. Do not make Payload's publish/draft concept automatically equal LoreForge lifecycle unless a targeted spike proves that mapping is actually simpler.

### Tests

- revision restoration;
- locked edit refusal;
- rejected submission retained/audited;
- timeline ordering;
- actor attribution;
- soft delete/restore;
- revision/body history survives move and later metadata changes.

### REVIEW GATE 4

Take one deed/report through its complete working life and verify that the history is understandable to a roleplayer, not just technically complete.

---

## Phase 5 — Archive Relationships, Tags, Character Links, Copy/Move/Share

### Goal

Complete the record-management semantics around the Document.

### Build

1. Structured Character links.
2. Character picker + create-new flow from Document metadata.
3. Domain-managed tag vocabulary + controlled ad hoc tag creation.
4. Grouped relationship with human label.
5. First-class directional `supersedes` relationship.
6. Supersession chain UI.
7. Move within Domain with full provenance.
8. Copy within Domain and cross-Domain with independent identity/history.
9. Cross-Domain destructive move feature flag/policy, OFF by default.
10. Share same canonical Document with direct access grant placeholder; full authorization semantics finalize next phase.
11. Distinguish Share vs Copy clearly in UI.

### Tests/scenarios

- deed A -> deed B supersedes -> deed C supersedes;
- old deeds remain readable/history-preserving;
- incident report grouped with court order using label `related case`;
- copy a record to another Domain, edit the copy, prove source unchanged;
- move within Domain and verify timeline;
- attempt cross-Domain move when disabled;
- link a new unclaimed Character from a report.

### UX tuning pass

The Document page now contains significant actions. Tune action grouping and history/relationship presentation before adding permission complexity.

### REVIEW GATE 5

Can a Scribe understand where the record lives, what happened to it, what it relates to, and whether another record superseded it?

---

## Phase 6 — Templates and Form Studio

### Goal

Turn the technical form spike into the product's most approachable document-creation workflow.

### Build

1. Full Document Type management UI.
2. Template entity separate from Type.
3. Blank Markdown/document-first template flow.
4. Template scope and descendant-availability toggle.
5. Base-template/letterhead composition.
6. Customer-facing Form Studio:
   - field add/remove/reorder;
   - labels;
   - required;
   - select choices;
   - Character field;
   - output Markdown template editor;
   - Insert Field controls;
   - preview.
7. Preserve replaceable `form answers -> Document` seam.
8. Discard raw structured answers after successful Document creation.
9. Generated Document enters normal lifecycle according to Template/Folder policy.
10. Clean the user-facing interface of irrelevant Payload Form Builder email/confirmation concepts.

### Tests

- Head Scribe creates letterhead available to descendants;
- Property Clerk creates Deed template based on letterhead;
- Commander creates Incident Report form;
- Warrior fills form and gets ordinary Markdown Document;
- template edits affect future Documents, not existing ones;
- generated Character fields create structural Character links.

### UX tuning pass

This is a high-risk usability phase. Use actual representative nontechnical workflows.

### REVIEW GATE 6

Can a non-web-developer department head create a useful report form/template without understanding schemas, placeholder syntax, HTML, or Payload?

If not, change the authoring UI before continuing.

---

## Phase 7 — Real Authorization and Delegated Administration

### Goal

Replace temporary membership checks with the actual permission system once the resources it governs are stable.

### Build

1. Central authorization service/policy module.
2. Integrate with Payload/server/API access paths.
3. Role default permissions.
4. Role hierarchy/delegation constraints.
5. Scoped Role assignments.
6. Folder inheritance.
7. Direct Character grants.
8. Direct Role grants.
9. Explicit denies.
10. Document-specific share/grant/deny.
11. Permission-aware Subdomain/template/folder/document navigation.
12. Delegated folder managers can manage access only within their scope.
13. Role creation limited to Domain/Subdomain authorities as specified.
14. Audit permission/role changes.

### Required scenario matrix

At minimum test:

- Commander manages all Warrior folders;
- First Platoon Captain manages only First Platoon branch;
- Captain grants unrelated Warrior edit access to one folder;
- Warrior under investigation gets explicit deny despite normal Warrior role;
- Court Clerk gets read to a Police folder as peer exception;
- direct single-Document share works;
- manager cannot delegate permission they do not possess;
- manager cannot delegate outside their branch;
- Character with Warrior + Magistrate roles receives union of legitimate access;
- Personal Domain folder-sharing remains disabled when that tier arrives.

### REVIEW GATE 7

Do not review this only from unit tests. Log in as each fixture Character and try to perform the expected job.

---

## Phase 8 — Theme/Vocabulary Productization, Public Surfaces, and Starter Packs

### Goal

Turn the branded shell into a configurable product and prove that the same application can convincingly represent different RP settings.

### Build

1. Finalize first production Theme Studio scope.
2. Controlled vocabulary editor.
3. Public homepage.
4. Member dashboard distinction.
5. Public archive/public folders/Documents.
6. Public Character profiles with permission-filtered record links.
7. Markdown informational pages.
8. First-party Starter Pack installer with copy-on-install semantics.
9. Initial Gorean City pack.
10. Second contrasting pack (Modern Municipality recommended) to prove genericity.
11. Starter pack seeds roles/Subdomains/folders/types/templates/tags/theme/vocabulary.

### Tests

- install Gorean pack, customize heavily;
- later alter built-in Gorean pack fixture and prove existing Domain is unchanged;
- install modern pack and prove same core flows use different terms/visual identity;
- anonymous public user cannot infer private records;
- public Character page includes only public-linked records.

### UX tuning pass

This is the main “does it feel like *our* city?” review.

### REVIEW GATE 8

A Gorean Domain and Modern Domain should feel distinctly theirs without either administrator having designed a website.

---

## Phase 9 — Personal Domains

### Goal

Add Character-rooted private archival storage as a strict product subset rather than a parallel architecture.

### Build

1. Personal Domain `kind`/policy based on same core Domain model.
2. Owner Character.
3. Private-only shell.
4. Ordinary folder organization.
5. Personal Document Types/templates as product policy permits.
6. Hide Subdomains/public site/role administration/folder sharing.
7. Single-Document sharing only.
8. “File there + keep a copy in my Personal Domain” flow.
9. Copies aggregate for the Character across Community Domains.
10. Pricing entitlement remains mocked/configurable; do not hard-code one-subscription-per-character economics yet.

### REVIEW GATE 9

Verify the Personal Domain feels like a private Character file cabinet, not a crippled Community Domain with confusing dead controls.

---

## Phase 10 — Production Data and Runtime Foundation

### Goal

Only now, after the core model has survived repeated review, replace deliberate local infrastructure in one focused phase.

### Build

1. Postgres adapter and migration path.
2. Local Postgres test environment first.
3. Repeatable migrations.
4. Migrate representative SQLite fixture data.
5. Backup + restore test.
6. Choose/configure actual persistent production Postgres deployment.
7. Choose/configure persistent media storage if required.
8. Production auth/invite/email prerequisites.
9. Jobs runner process.
10. Base logging/error reporting.
11. Environment/secrets handling.
12. Deployment/runbook.
13. Data-volume fixture generation.
14. Verify all permission queries on Postgres.

### Explicit non-goal

Do not add billing, correspondence, or SL bot work just because runtime infrastructure now exists.

### REVIEW GATE 10

Fresh deploy -> migrate -> seed/import -> run complete core acceptance suite -> backup -> restore -> rerun acceptance suite.

Only after this gate should real persistent beta data be considered safe to accumulate.

---

## Phase 11 — Platform Administration and Domain Lifecycle

### Goal

Give the platform owner a production-quality operator surface before broad external use.

### Build

1. Platform Admin role separate from Domain roles.
2. Dashboard metrics/visualizations.
3. Domain listing/state/usage/activity.
4. Enter/support a Domain with clear operator banner and audit trail.
5. Transfer single Domain Owner.
6. Domain state controls:
   - Active;
   - Grace;
   - Read-only;
   - Suspended;
   - Archived/Closed.
7. Intentional sunset workflow skeleton.
8. Global Character merge queue + merge tool.
9. Job/error view.
10. Platform Admin audit log.
11. Billing/subscription provider integration may be added here if commercial launch timing requires it; keep provider-specific work contained.
12. Storage quota fields/policy remain configurable/deferred until actual costs are known.

### REVIEW GATE 11

Platform owner must be able to diagnose/support a Domain without reaching directly into the database for normal operations.

---

## Phase 12 — Search, Bulk Import, Export, and Scale UX

### Goal

Upgrade retrieval/onboarding once the production data platform is stable.

### Build

1. Postgres-appropriate full-text/indexed search.
2. Filters for Type/lifecycle/tags/Characters/folder/Subdomain/date.
3. Permission-aware query path.
4. Public search path.
5. Pagination/result UX.
6. Bulk Markdown/text import.
7. Folder mapping/type selection during import.
8. Domain export job + portable archive format.
9. Larger archive navigation UX tuning.
10. Measure before considering an external search engine.

### REVIEW GATE 12

Load a synthetic archive large enough to make the MVP's 100-row/simple-folder assumptions visibly insufficient and verify the resulting search/navigation still feels simple.

---

## Phase 13 — Activity, Notifications, and Watches

### Goal

Layer useful awareness over the already-authoritative provenance/audit system.

### Build

1. Domain/Subdomain activity feed projections.
2. In-app notifications.
3. unread/read state.
4. Watch Document.
5. Watch Folder.
6. Notification preferences.
7. Email notification channel.
8. Event-to-notification classification kept configurable in code/policy rather than assuming every audit event is noteworthy.

### REVIEW GATE 13

Verify a busy Domain does not spam users merely because the audit system records detailed events.

---

## Phase 14 — Correspondence

### Goal

Build deliberate roleplay communication after identity, permissions, jobs, audit, and notifications are stable.

### Build

1. Character-to-Character messages.
2. reply linkage.
3. inbox/sent views.
4. optional Domain moderated-delivery policy.
5. GM delivery queue.
6. immediate/delay/intercept/fail/garble outcomes.
7. original + delivered text preservation.
8. delayed job scheduling from original sent time.
9. correspondence-specific audit.
10. file/copy correspondence into archive as Document with provenance.
11. notification on appropriate delivery outcomes.

### REVIEW GATE 14

Run a politics-heavy scenario where a GM delays, intercepts, and garbles different messages and verify sender/recipient only see what the roleplay policy intends while authorized admins retain full provenance.

---

## Phase 15 — Second Life Bridge

### Goal

Connect the proven web archive to SL without embedding grid-specific runtime responsibilities into the core web server.

### Preliminary design phase first

Before implementation, write a separate bridge protocol/spec covering:

- account verification;
- service authentication;
- bot lifecycle;
- notecard inventory operations;
- location verification;
- transfer request/response model;
- rate limits/retries;
- provenance fields actually obtainable from SL;
- failure semantics.

### Build after protocol review

1. Separate LibreMetaverse bridge process/service.
2. one-to-one User <-> SL identity verification flow.
3. SL location check endpoint/contract.
4. Domain/Subdomain/Folder location rules.
5. Markdown/notecard import.
6. export/delivery through bot.
7. provenance round-trip.
8. permission check before any in-world delivery.
9. stable object/resource-link support.
10. bridge health in Platform Admin dashboard.

### REVIEW GATE 15

Test on an actual controlled SL environment with deliberate lag/failure cases. Specifically verify that stale/late location data does not destroy in-progress browser work.

---

## 27. Release Checkpoints

The phase sequence is not the same as marketing release numbering.

Suggested checkpoints:

### Core Alpha

After Phase 7:

- real Character/Domain model;
- Subdomains;
- durable Documents;
- templates/forms;
- permissions/delegation;
- still local/dev infrastructure acceptable.

Purpose: prove the actual roleplay archive model with trusted testers.

### Branded Alpha

After Phase 9:

- starter packs;
- public archive;
- strong theming/vocabulary;
- Personal Domains.

Purpose: prove product packaging and differentiation.

### Persistent Private Beta

After Phase 11:

- Postgres/persistent deployment;
- backup/restore;
- operator dashboard;
- Domain lifecycle support.

Purpose: begin accumulating real customer data responsibly.

### Usability/Onboarding Beta

After Phase 12:

- scalable search;
- bulk import;
- export;
- archive navigation under larger datasets.

### Later differentiators

Phases 13–15 add notification depth, mediated RP correspondence, and deep Second Life integration.

---

## 28. Testing Strategy

### 28.1 Automated tests

Focus tests on logic that can silently leak/corrupt history:

- Domain/permission scoping;
- Markdown canonicalization/sanitization;
- role delegation limits;
- explicit grant/deny scenarios;
- Document lifecycle transitions;
- revision history;
- provenance event creation;
- copy vs move semantics;
- supersession chain;
- Character claims/merge behavior;
- template inheritance/composition;
- form generation;
- public/private search visibility;
- Personal Domain restrictions;
- delayed correspondence calculation;
- SL location check boundary later.

### 28.2 Representative fixture cast

Maintain stable named fixture actors with roles such as:

- Platform Admin;
- Community Domain Owner;
- Head Scribe;
- Property Records Clerk;
- Historical Records Clerk;
- Commander;
- First Platoon Captain;
- Second Platoon Captain;
- ordinary Warrior;
- Warrior under temporary deny;
- Magistrate/Court Clerk;
- Character holding both Warrior and Magistrate roles;
- outsider/guest;
- unclaimed Character;
- Personal Domain owner Character.

### 28.3 Representative records

Maintain fixtures including:

- Plain Text note;
- Incident Report;
- Property Deed chain with multiple supersessions;
- Marriage License shared/copied to Personal Domains;
- locked Court Ruling;
- form-generated report;
- imported Markdown/notecard simulation;
- copied cross-Domain record;
- moderated correspondence item later.

### 28.4 Manual UX tests

Every major customer workflow must be tested without relying on Payload Admin unless the feature is explicitly platform-backoffice-only.

Primary usability question remains:

> Can an ordinary Second Life roleplayer do the job without reading a long manual or understanding web-development concepts?

---

## 29. Open Decisions — Deliberately Deferred

These are not missing requirements. They are intentionally unresolved until evidence makes the choice useful.

1. **Custom DNS/hostnames** — possible later; not foundational.
2. **Raw CSS advanced override** — keep option open, defer.
3. **Personal Domain pricing entitlement** — one paid Character archive vs several per subscription.
4. **Exact storage quotas** — wait for image/attachment policy and observed cost.
5. **Long-term sunset/archive pricing** — wait for storage/service cost.
6. **Billing provider** — choose in commercial-production phase.
7. **Production hosting provider** — choose in dedicated infrastructure phase.
8. **Exact SL verification mechanism** — bridge design phase.
9. **Exact SL location mechanism** — bridge design phase.
10. **Exact LibreMetaverse bot transfer protocol** — separate bridge spec.
11. **External search engine** — only if Postgres search proves inadequate.
12. **Raw form-submission retention** — current decision is discard after Document generation; revisit only with a concrete need.
13. **Autosave** — revisit after lifecycle/versioning UX is established.
14. **Third-party/community starter packs** — explicitly not planned now.
15. **Organization tier between Personal and Community Domain** — only if demand emerges.
16. **Nested Subdomains** — initial model uses one Subdomain level + delegated folder branches; revisit only if real communities need recursive organizational tenants.

---

## 30. Explicitly Rejected / Not Planned as Core

Do not allow these ideas to creep into early phases without a new decision:

- generic CMS/page-builder product;
- Puck/GrapesJS as foundational site architecture;
- arbitrary per-Domain React/component code;
- arbitrary HTML as canonical Document content;
- raw structured form data as a second permanent record of truth;
- one LoreForge User proving ownership of multiple SL alts;
- recursive micro-tenants with independent themes/billing for departments;
- external FGA/authorization service by default;
- Elasticsearch by default;
- live collaborative Google-Docs editing;
- Flutter rewrite of the main web authoring application;
- Second Life protocol logic embedded directly in the core web process;
- third-party starter-pack marketplace;
- automatic deletion of Community Domain history soon after payment failure.

---

## 31. First Next Action

Do **not** begin Phase 2 immediately just because this specification exists.

The completed MVP intentionally did not receive taste-level UI tuning. The next execution packet should therefore contain **Phase 1 only**:

- Markdown safety correction;
- editor decision/tuning;
- Theme Studio tuning;
- generic Domain terminology cleanup;
- small Form Builder authoring review;
- targeted regression tests;
- a mandatory hands-on review gate.

Only after that gate should the Character/identity model be built.

This protects the project from growing a sophisticated backend around an editor/theme experience we have not yet chosen to live with.
