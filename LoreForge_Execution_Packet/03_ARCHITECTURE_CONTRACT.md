# LoreForge Architecture Contract

This file closes implementation gaps that must not be left to a lower-context executor. It is intentionally more prescriptive than the full product spec.

## 1. Framework/runtime baseline
Until a ticket explicitly changes it:
- Next.js + React + TypeScript.
- Payload is the backend/data framework.
- Use custom LoreForge React UI for customer workflows. Payload Admin is back-office/developer support, not the final customer product.
- Keep the spike lockfile dependency versions during Phases 1–9 unless a security/compatibility fix is required by the ticket. Do not perform opportunistic major upgrades.
- Payload + SQLite remains the database through Phase 9.
- Local filesystem media remains development storage through Phase 9.
- Phase 10 performs the deliberate Postgres/runtime transition.
- Do not add a Repository/DAO layer merely to disguise SQLite/Payload.

## 2. Canonical representations
- Document/page prose: canonical LF-newline Markdown.
- Theme: neutral Domain theme fields/tokens, not generated CSS blobs.
- Forms: LoreForge neutral form schema described below, not permanent Payload Form Builder plugin JSON.
- Relationships/resources: normal IDs and explicit relation records.
- Future clients consume APIs/models; React component state is never the business format.

## 3. Markdown dialect and safety contract
Supported user-facing dialect:
- paragraphs;
- H1–H4 headings;
- bold/italic;
- ordered/unordered lists;
- links;
- blockquotes;
- horizontal rules;
- tables.

Raw HTML is **not** a supported feature. Raw HTML in source/import must render inertly and must never execute or become active markup.

Implementation contract:
1. Keep `canonicalizeMarkdown()` LF normalization at every Markdown write/import boundary.
2. Render Markdown through Marked unless an owner-approved editor/parser change replaces it.
3. Add server-capable HTML sanitization with an explicit allowlist matching the dialect. `sanitize-html` is the approved Phase 1 dependency unless current package compatibility makes it impossible.
4. Strip dangerous link schemes (`javascript:`, `data:` except future explicitly approved media cases). Allow ordinary `http`, `https`, and `mailto` initially.
5. Raw HTML tokens must be escaped/treated as text before or during Markdown rendering; sanitization remains defense in depth.
6. Source mode does not get a privileged render path.
7. Add regression tests for script tags, event-handler attributes, javascript links, SVG/script payloads, and benign angle-bracket text.

The sanitizer configuration is part of the contract, not an executor choice:
- allowed tags exactly: `p, h1, h2, h3, h4, strong, em, ul, ol, li, a, blockquote, hr, table, thead, tbody, tr, th, td, br`;
- allowed attributes: `a[href,title]`, `th[align]`, and `td[align]`; no `style`, `class`, `id`, event attributes, embedded content, SVG, or MathML;
- allowed URL schemes exactly `http`, `https`, and `mailto`; protocol-relative URLs are rejected;
- Marked uses GFM tables with hard line breaks disabled. Do not add unsupported dialect features merely because Marked can parse them.

Store canonical Markdown; do not replace it with sanitized HTML.

## 4. Editor contract
Phase 1 retains MDXEditor. Do not replace it merely because it is heavy.
- Default: WYSIWYG.
- Explicit `Source` toggle remains.
- Keep the custom source textarea pattern from the spike.
- Small toolbar only: undo/redo, heading, bold, italic, ordered/unordered list, link, blockquote, horizontal rule, table if stable.
- Explicit Save remains through lifecycle/versioning work.
- Add dirty state, save/saving/error feedback, and navigation-away warning.
- No autosave in Phase 1.
- If MDXEditor demonstrably corrupts supported canonical Markdown after Phase 1 fixes, stop at Review Gate 1 with a reproducible test. A lower agent does not choose a replacement.
- If the owner rejects MDXEditor at Gate 1 for corruption or usability, Phase 2 remains blocked until the owner issues a replacement decision/new ticket. An executor never chooses the replacement unilaterally.

## 5. Domain/User/Character authority split
- Domain Owner is a **User-level** relation. Exactly one User owns a Community Domain.
- Operational Domain Administrators are also User-level assignments.
- Roleplay access/membership/roles are **Character-level**.
- Subdomain administrators/heads are Character-level.
- Platform Admin is User-level and outside tenant authorization.

Billing/closure/support belongs to account authority; Scribe/Commander/Magistrate privileges belong to Characters.

### Operating-context bar contract
The customer shell exposes one top-level operating-context bar with two visibly distinct controls:
- left: `Domain`, the selected Domain selector;
- right: `Acting as`, the active Character selector.

There is exactly one Domain selector. Its options are the union of Domains reachable through at least one active controlled-Character membership and Domains the User owns or operationally administers. Options may be grouped as `Participating` and `Managed`; duplicate Domains appear once. For the selected Domain, the Character list contains only active Characters controlled by that User with active membership in that Domain. A `domain-character-contexts` row can supply a local alias/display label but never qualifies a Character for this list. No client-supplied IDs or labels are trusted.

Selected Domain and acting Character are related but not an indivisible mode. When switching Domain invalidates the prior Character, clear the Character selection and preserve the explicitly selected Domain; never silently choose another Character. Character-scoped actions validate `(User, active Character, selected Domain)` and active membership server-side. Public browsing and User-level Domain owner/admin actions validate without an acting Character. The no-active-Character state is valid and displays `No participating Character` when appropriate.

Administration is capability, not a context or mode. The customer shell has no Administration selector, Enter/Exit Administration control, or parallel Domain choice. User-level owner/admin authority is evaluated directly for the selected Domain and never grants RP identity/access. Membership editing remains separate; membership does not imply a Role, permission, ownership, or operational-admin assignment.

Public Character/controller responses use a dedicated projection. A public controller value contains only the User's public display name; it never serializes User email, internal ID, SL identity fields, platform/admin flags, or account metadata.

### Customer surface and navigation contract
Signed-out `/` is the branded LoreForge platform home with an embedded ordinary customer login. Signed-in `/` is the LoreForge User dashboard. Ordinary customer flows never link to `/admin/login`; Payload Admin remains internal back office. Branded `/about`, `/subscriptions`, `/create-account`, `/forgot-password`, `/account`, and `/account/characters` destinations may begin as explicit placeholders but must never expose diagnostics/test credentials.

The LoreForge logo returns to `/`. Within a selected Domain, primary navigation is stable and ordered exactly `Home, About, Departments, Records`. Domain theme/identity appears beneath the persistent LoreForge global header. Authorized management links appear only in a subordinate `Manage <Domain>` bar with customer destinations `People, Roles, Templates & Forms, Customize`; the primary bar never swells or reorders based on capability. The server authorizes every destination/action independently of link visibility.

`People` is a Character-centered Domain manager, not a User-role table. Its detail workspace unifies Domain membership, Department memberships, Role assignments including independent Folder scopes, effective Folder access with source explanations, recent work, and audited change history. The controlling User is separate identity metadata. Before P07, effective access editing may be explicitly unavailable; do not fake the final evaluator.

Canonical customer routes use `/departments` and `/manage/*`. Legacy `/subdomains` customer URLs redirect to `/departments`; internal collection/model names remain neutral `subdomain` unless a later schema migration explicitly renames them. Templates & Forms groups three separate subviews: Document Types, Templates, and Forms.

## 6. Core collection/model target

### users
- auth fields;
- `name`;
- `isPlatformAdmin` boolean (present and evaluator-active by P07; secure bootstrap/dashboard productized in P11);
- optional SL identity placeholder:
  - `slAvatarUUID` nullable unique;
  - `slAvatarName` nullable;
  - `slVerificationState`: `unlinked | pending | verified`;
  - `slVerifiedAt` nullable.
Enforce at most one SL identity per User and UUID uniqueness. Do not model alt groups.

### characters
- `name` required;
- portrait/media optional;
- public bio/profile;
- `controlledBy` User nullable;
- `status`: `active | inactive | merged`;
- `mergedInto` Character nullable;
- aliases array;
- audit timestamps/creator.

### character-claim-requests
- Character;
- claimant User;
- Domain context;
- `pending | approved | rejected | cancelled`;
- requested/decided timestamps;
- deciding User + acting Character where applicable;
- decision note optional.
Approval only while Character is unclaimed. Approved claim sets `controlledBy`.

### character-merge-requests
- source Character required;
- target survivor Character nullable at request time and required before approval;
- requesting Domain required;
- requesting User and acting Character where applicable;
- evidence/note required;
- status `pending | approved | rejected | blocked`;
- deciding Platform Admin, decision reason, requested/decided timestamps;
- impact-preview snapshot/hash before approval.
P02 creates requests in this final shape. Only P11 may approve or perform a global merge.

### domain-character-contexts
Unique `(domain, character)` local context for alias/local display information without implying membership.

### domains
- `kind`: `community | personal`;
- name/slug;
- Community: exactly one `ownerUser`; `ownerCharacter` null.
- Personal: exactly one `ownerCharacter`; `ownerUser` null for ownership semantics.
- At most one Personal Domain may exist per Character. Commercial entitlement may limit creation, but the data model does not allow duplicate Personal Domains for one Character.
- User-level operational administrator assignments.
- lifecycle state;
- theme tokens;
- vocabulary;
- public settings: `publicEnabled` boolean default false; public policy is defined below;
- cross-Domain destructive move flag default false;
- correspondence policy later;
- informational `installedPackKey/version` only—never a live dependency.

### domain-memberships
Unique `(domain, character)` active/inactive membership. Membership alone does not imply full read access.

### subdomains
- Domain;
- name/slug/sort;
- Character head/admin assignments;
- no theme/billing/hostname;
- no recursive parent Subdomain initially.
- `publicListing` boolean default false.
- default customer vocabulary `Department(s)` and canonical customer route `/departments`; internal schema remains `subdomains`.

### subdomain-memberships
Unique `(subdomain, character)`.

### folders
- Domain required;
- Subdomain nullable;
- parent Folder nullable;
- name/sort;
- logical Domain root exists and is system-managed;
- optional filing policy;
- later location restriction config.
- `publicAccess`: `inherit | private | public`, default `inherit`; the Domain root resolves to private unless explicitly made public.
Every Document points to one Folder. Null folder is not permanent root.

### roles
- Domain;
- Subdomain nullable;
- name;
- `parentRole` = immediate **superior** role, nullable for top;
- active/system flags as needed.
Hierarchy must be acyclic. A senior role inherits default grants given to descendant/subordinate roles. A subordinate never inherits senior grants.

### role-assignments
- Character;
- Role;
- Domain/Subdomain derived/validated from Role;
- optional `scopeFolder`;
- active dates/status;
- assignedBy User/Character.

### document-types
- Domain;
- name/description;
- active;
- default filing policy `direct-file | review-required`;
- optional default folder;
- seeded `Plain Text`.

### documents
- Domain;
- Folder required;
- Document Type required;
- title;
- canonical Markdown body;
- lifecycle `draft | pending_review | filed | locked`;
- source kind `web | markdown-import | form | copy | correspondence | second-life`;
- created by User and acting Character when applicable;
- typed Character credits/links through `document-character-links`; every Character-authored create includes the active Character as a non-removable `prepared_by` credit during creation;
- soft-delete fields;
- timestamps;
- Payload Versions enabled.
- `publicAccess`: `inherit | private | public`, default `inherit` from Folder.

Do not map LoreForge lifecycle onto Payload draft/publish by default.

### pages
- Domain required;
- fixed product slot/slug plus title and canonical Markdown body;
- `publicAccess`: `private | public`, default private;
- no arbitrary block/page-builder schema.

### domain-notices
- Community Domain required;
- title and canonical safe Markdown body;
- status exactly `draft | published | archived`;
- audience exactly `members | public`;
- pinned boolean;
- publishedAt and optional expiresAt;
- author/editor User and timestamps;
- publication mutations audited separately from content.
Initial notices are Domain-wide. They are authored content, not provenance/audit truth, notifications, or correspondence. Public audience still requires `publicEnabled=true`.

### document-provenance-events
Append-only Document-owned history through one service/helper.
Minimum event types:
`created, edited, submitted, withdrawn, approved, rejected, filed, locked, unlocked, soft_deleted, restored, moved, copied_from, copied_to, shared, share_revoked, relationship_added, relationship_removed, superseded, tag_changed, character_link_changed, imported, exported, sl_transfer`.
Each event records document, timestamp, actor User, acting Character if any, and typed context sufficient to explain the action.

### document-character-links
- Document;
- Character;
- kind exactly `prepared_by | concerns`;
- optional human relationship label for `concerns` (`owner`, `suspect`, `spouse`, etc.); no relationship label for `prepared_by`;
Prevent accidental duplicate display.

### tags / document-tags
Domain-owned Tag vocabulary. Authorized ad-hoc creation creates a normal Tag before linking.

### document-relationships
- source Document;
- target Document;
- kind `grouped | supersedes`;
- `label` required for grouped;
- actor/timestamps.
`grouped` is presented symmetric.
`supersedes` is directional source=newer, target=older. Reject self-links/cycles. A Document may have at most one direct superseding successor; correcting that relationship is audited.

### templates
- Domain;
- Document Type;
- name;
- scope Folder (Domain root allowed);
- `availableToDescendants`;
- optional `baseTemplate` same Domain;
- kind `document | form`;
- title template;
- Markdown output/body template;
- neutral form fields for form kind;
- active/version timestamps.
Base graph acyclic. Base contains exactly one `{{content}}`; child replaces it, then field tokens resolve.

### permission-rules
One centralized rule collection.
- Domain;
- principal polymorphic relation to Character, User, Role, DomainMembership, or SubdomainMembership;
- resource polymorphic relation to Domain, Subdomain, Folder, or Document;
- capability;
- effect `grant | deny`;
- audit fields.

Stable capabilities include:
`read, create_document, edit_document, submit_document, file_document, approve_document, lock_document, unlock_document, delete_document, restore_document, move_document, copy_document, share_document, export_document, manage_folders, manage_templates, manage_types_tags, manage_access, manage_members, manage_claims, assign_roles, manage_subdomain, manage_domain_appearance, manage_notices`.

Ownership/subscription transfer is not a normal permission capability.

## 7. Authorization precedence — frozen
Evaluate `(User, active Character, capability, resource)` server-side.

1. Platform Admin: allow; audit action.
2. Community Domain Owner/User-level Domain Admin: full operational Domain access except platform-only operations; lifecycle state still gates ordinary writes.
3. Personal Domain owner Character: full Personal Domain access subject to Personal policy restrictions.
4. Gather ordinary rules whose resource scope contains requested resource.
5. Principal class priority: **direct User/Character > Role > membership default**. Within the direct class, User and active-Character rules are peers: most-specific resource wins and deny wins equal-specificity ties. A Character grant does not automatically outrank a User deny or vice versa.
6. Within a principal class, most-specific resource wins: Document > deepest matching Folder > Subdomain > Domain.
7. Equal class + specificity: deny wins.
8. Role evaluation: senior assignment also matches rules for descendant/subordinate roles. `scopeFolder` excludes role authority outside that branch.
9. Role conflicts: most-specific resource wins; deny wins ties.
10. Membership defaults last with same rule.
11. No matching grant = deny.

A more-specific direct Character grant may override that Character's broader direct deny. A Role grant never overrides an applicable direct User/Character deny.

All API/server-action/list paths use this subsystem. Filter inaccessible rows before return where practical.

### Interim enforcement before Phase 7

Pre-P07 authority is a compatibility seam, not a product role and not permission-by-UI-hiding:
- expose one server-side `authorizeInterimOperation` boundary and call it from every pre-P07 privileged API/action;
- in P02 only, claim approval is limited to a User with the legacy Tenant `admin` membership for that Domain; P03 migrates that operational authority to `ownerUser`/DomainAdmin and removes this legacy branch;
- from P03 through P06, ownerUser and operational DomainAdmins may manage Domain/Subdomain memberships and Roles; review/approve/lock/restore; add/remove tags, Character links, or Document relationships; Copy/Move/Share; manage Templates; and create unclaimed Characters inline;
- ordinary P06 form/document creation requires an authenticated User controlling the active Character, an active DomainMembership, and the existing server-validated destination scope; it never grants management authority;
- all interim decisions record actor User, acting Character where applicable, operation, resource, and timestamp in audit/provenance;
- P07-T02 replaces and deletes this helper/legacy branch, with integration tests proving no legacy User Membership still grants access.

Interim Share is owner/admin-only. Do not substitute `edit_document` for final Share delegation: after P07, the actor must satisfy the delegation contract for `share_document` and the granted capability.

### Public/anonymous read policy

Public access is a resource policy, not a fake `Public` PermissionRule principal:
1. `publicEnabled=false` makes all Domain resources private regardless of resource flags.
2. When enabled, Folder visibility resolves by nearest explicit `public|private` value; Domain root defaults private.
3. Document `publicAccess=inherit` uses its Folder result; explicit `public|private` overrides it.
4. Pages are public only when explicitly `public`.
5. A public Document inside a private/unlisted Folder may be opened directly and returned by public search, but no private ancestor names, sibling counts, or breadcrumbs are returned.
6. Public policy grants anonymous/authenticated callers only `read`; it never grants listing of a private container or any mutation.
7. Public list/search/profile projections apply the same server-side predicate before count, pagination, snippets, relationships, or facets. Private existence must not be inferable.
8. Character profiles are the deliberate exception: active Character basics/controller projection are public by default, with only publicly readable linked Documents and safe Domain-participation summaries.

## 8. Delegation contract
To grant capability `X` on resource `R`, actor must:
- possess `manage_access` on `R`;
- possess `X` on `R`;
- have scope covering `R`;
- not extend outside their scope.

To deny, actor must possess `manage_access` for that scope.
Folder managers may manage ACLs/folders but may not create Roles.
Role creation:
- Domain Owner/Domain Admin -> Domain roles;
- Subdomain head/admin -> that Subdomain's roles;
- nobody else through delegation.

## 9. Document lifecycle contract

### Effective filing policy
Domain default = `direct-file`.
Document Type = `direct-file | review-required`.
Folder = `inherit | direct-file | review-required`.
Template = `inherit | direct-file | review-required`.

Precedence: Template explicit > Folder explicit > Document Type default > Domain default.

### Transitions
- New -> `draft` unless a dedicated flow explicitly files it.
- `draft -> pending_review`: submit under review-required.
- `draft -> filed`: direct file when allowed and actor has capability.
- `pending_review -> filed`: approve.
- `pending_review -> draft`: reject with reason, or author withdraws.
- `filed -> locked`: lock.
- `locked -> filed`: unlock.

Editing:
- Draft editable.
- Pending Review frozen; withdraw/reject before editing.
- Filed editable if not locked and authorized; every edit versioned/provenance.
- Locked no body edit until unlock or new related/superseding record.
Soft delete is orthogonal and preserves prior state.

## 10. Copy/move/share contract

### Copy
- Always new Document ID.
- Copy exact current body/title revision.
- Provenance stores source Document ID/Domain, source version or body hash, actor/time.
- Independent after creation.
- Same Domain Type defaults source Type.
- Cross-Domain Type defaults exact same-name active Type; otherwise destination Plain Text; UI confirms mapping.
- Community copy starts Draft and follows destination filing policy.
- `Keep a copy in Personal Domain` defaults Filed.
- Copy title/body, global Character links, and safe source metadata. Set the new creator/acting Character to the copy actor and source kind to `copy`; do not copy lifecycle approvals/locks, soft-delete state, PermissionRules, revision history, or DocumentRelationships.
- Same-Domain copy retains Tag links. Cross-Domain copy maps each Tag by case-insensitive exact name to an active destination Tag and drops unmatched Tags after showing the confirmation summary.

### Move
- Same-Domain: same ID/history/lifecycle; folder changes; provenance event.
- Cross-Domain: source Domain flag must be enabled; explicit confirmation and destination authorization.
- Cross-Domain preserves ID/history/lifecycle, changes Domain/Folder, maps Type as above.
- Source Domain keeps an audit pointer/event to destination.
- Same-Domain move retains Character links, Tags, and relationships.
- Cross-Domain move retains global Character links and relationships/history; relationship rendering remains permission-filtered. Map Tags by case-insensitive exact name and drop unmatched Tags only after explicit confirmation/provenance.

### Share
- Same Document ID.
- Document-specific PermissionRules, usually read and optional edit.
- UI says Share, never Copy.
- Revoke removes future access, not audit.
- Personal Domains only allow Document-specific shares.

Operation authorization is exact:

| Operation | Source requirement | Destination/extra requirement |
|---|---|---|
| Copy | `read` and `copy_document` on source Document | `create_document` on destination Folder |
| Same-Domain Move | `move_document` on source Document | `create_document` on destination Folder |
| Cross-Domain Move | same as Move; source Domain `allowCrossDomainMove=true` | `create_document` on destination Folder, both Domains active for writes, explicit confirmation |
| Share read/edit | `manage_access` and `share_document` on Document | actor also possesses the exact capability being granted (`read` or `edit_document`) on that Document |
| Revoke Share | `manage_access` on Document | revocation remains audited |
| Add/remove Tag or Character link | `edit_document` on Document | linked Tag belongs to Domain; Character link never grants read |
| Add/remove Grouped/Supersedes | `edit_document` on both Documents | both Documents readable; relationship itself never grants read |

## 11. Form/template contract
Payload Form Builder is spike-only business-schema-wise. Permanent schema is neutral.

Initial field types:
`text, textarea, date, select, checkbox, character`.

Each field: stable machine `key`, human `label`, `required`, optional help; select has value/label options. Character field transiently selects/creates Character and produces a `concerns` DocumentCharacterLink, optionally with the Template-defined human relationship label. It never fabricates `prepared_by` credit.

Tokens: `{{field_key}}`; `{{content}}` reserved for base composition.

Form answers are plain input, not Markdown fragments. Escape Markdown structural characters during substitution. Validate before activation:
- unique valid keys;
- every token declared or reserved;
- valid select options;
- acyclic base templates;
- safe output preview.

Unknown runtime token = error/no Document, never silent blanking.

After successful Document creation, raw answer JSON/submission rows are not retained as a second truth.

The ordinary creation route is `/domain/:domain/records/new`. Records presents one `New document` action and no inline title/create form. The full creation surface contains destination Folder, searchable Template selector grouped by Document Type, title, `Prepared by`, `Concerns`, Tags, and WYSIWYG or form body. Plain Text is the blank option once its Template exists. Template changes after user input require destructive-replacement confirmation. Lifecycle actions are `Save Draft` and the effective `Submit for Review` or `File` action.

## 12. Theme/vocabulary/starter-pack contract
No raw CSS.

Minimum theme tokens:
- preset key;
- primary/secondary/accent/background;
- curated heading/body font keys;
- logo/seal;
- banner;
- optional background image/treatment in P08;
- header layout `left | centered`;
- content width `standard | wide`;
- document style `paper | flat`.

Derive accessible text/surface colors rather than expose every CSS variable.

Theme media accepts only decoded/re-encoded JPEG, PNG, or WebP, maximum 5 MiB and 4096x4096 pixels. Reject SVG, animated/ambiguous polyglots, MIME/extension mismatch, and decompression-bomb inputs server-side; strip metadata during re-encode.

Vocabulary is limited to singular/plural values for exactly these product nouns: `domain, subdomain, archive, document, folder, role, member`. Action labels, permission names, arbitrary interface strings, and translation keys are not customizable. Missing/blank values fall back to platform defaults.

Starter packs are code-owned manifests with key/version/display name plus theme, vocabulary, Subdomains, Roles, folders, Types, Templates, Tags. Install copies records. Installed pack key/version is provenance only.

## 13. Search contract
- Domain-scoped.
- Before P12 simple search may remain.
- P12 uses **PostgreSQL native full-text search/indexing** plus ordinary filter indexes.
- No Elasticsearch/OpenSearch by default.
- Filters: Type, lifecycle, Tag, Character, Folder/Subdomain, date.
- All search paths authorization-aware.

## 14. Correspondence contract
Correspondence belongs to exactly one Community Domain and is exactly one sender Character -> exactly one recipient Character for the initial product. No group messages in this phase.

Body uses canonical LoreForge Markdown and the same safe rendering dialect as Documents.

States are exactly:
`draft, queued_for_review, approved_waiting, delivered, intercepted, failed`.

Transitions:
- immediate Domain: `draft -> delivered` on Send; `sentAt` and `deliveredAt` are set by that action;
- moderated Domain: `draft -> queued_for_review` on Send; `sentAt` becomes immutable;
- moderator Deliver Now: `queued_for_review -> delivered`;
- moderator Delay: `queued_for_review -> approved_waiting`; due time is stored;
- moderator Garble + Deliver: `queued_for_review -> delivered` with separate `deliveredBody`;
- moderator Garble + Delay: `queued_for_review -> approved_waiting` with separate `deliveredBody`;
- moderator Intercept: `queued_for_review -> intercepted`;
- moderator Fail/Lost: `queued_for_review -> failed`;
- worker: `approved_waiting -> delivered` when due.
No other ordinary transitions are permitted.

Domain correspondence policy fields:
- `mode`: `immediate | moderated`, default `immediate`;
- `senderOutcomeVisibility`: `delivery_status | dispatched_only`; default `delivery_status` for immediate Domains and `dispatched_only` for moderated Domains.
  The effective default is derived from `mode` when policy is created/changed and stored explicitly.
`dispatched_only` leaves the sender-facing status as Dispatched after send regardless of the moderator's eventual outcome. `delivery_status` reveals only the terminal Delivered/Intercepted/Failed outcome when reached. No other sender-facing mapping/status configuration exists. Moderator notes are never sender/recipient-visible.

Original text is immutable after send. Delivered text is separate. Recipient of a modified/garbled message never sees original unless independently authorized as a correspondence moderator/platform operator.

Delay due = `sentAt + chosenDelay`.
- GM decides after due -> deliver promptly after the decision/job;
- GM never reviews -> nothing auto-decides;
- GM chooses future delay -> jobs runner can auto-deliver at due.
Reply linkage is a nullable parent in the same Domain and only to correspondence visible to the replying Character. No live chat infrastructure.

Filing correspondence into the archive is explicit and creates a new independent Document. The filer must (a) be the sender, recipient, or an authorized correspondence moderator and (b) have `create_document` permission in the destination Folder. The generated Document contains only the content that filer is authorized to see; moderator-only original text must never leak through a recipient-filed garbled message. The new Document follows the destination lifecycle policy and keeps a provenance pointer to the source Correspondence.

Send requires the authenticated User to control the active sender Character and both sender and recipient to have active membership in the same active Community Domain. Domain Owner/Admin operational authority does not permit impersonating a sender Character. On delivery, notify only the recipient Character's controlling User (if any) with a body-free summary/link; the sender uses the Sent view/status policy and moderators use their queue.

## 15. Second Life service boundary
Bridge:
- separate process/service;
- not the web server's SL runtime;
- never bypasses core permissions;
- talks to core through authenticated service endpoints/jobs; does not write production DB directly;
- likely LibreMetaverse, with exact protocol owner-reviewed in P15-T00.

Location authorization checked at action start. An authorized edit session is not invalidated at save because a later SL check fails/lags.

Location restrictions use `inherit | none | required` at Domain/Subdomain/Folder scope. Deepest Folder restriction wins, then Subdomain, then Domain; `none` explicitly clears an ancestor requirement. Documents inherit their Folder. A successful edit-start issues a server-recorded, signed session bound to User, active Character, Document, and starting version. It expires after 8 hours or first successful save/explicit close; save never rechecks SL location. Expiration or version conflict must retain the user's body locally and require a new start check rather than discarding work.

## 16. Community Domain lifecycle access matrix

| State | Public read | Member read | Ordinary writes | Owner/Admin | Platform Admin |
|---|---|---|---|---|---|
| Active | per public policy | per permission | per permission | normal | audited override |
| Grace | per public policy | per permission | per permission | normal plus notice | audited override |
| Read-only | per public policy | per permission | denied | read/export/settings needed for recovery; content writes denied | audited repair/transition |
| Suspended | denied | denied | denied | lifecycle/support view only | audited repair/transition/export |
| Archived/Closed | denied | denied | denied | read/export only | audited repair/transfer/export |

Lifecycle transitions never delete data. The initial matrix is fixed; a later sunset policy may change it only through owner change control.

## 17. Owner-only provider/price decisions
Executors do **not** choose:
- production web host;
- Postgres host;
- media/object storage;
- email provider;
- billing provider;
- Personal Domain pricing/entitlement;
- sunset/archive pricing;
- custom DNS product scope;
- exact SL verification/location/transfer protocol.

Use `owner-gates/` files when these become relevant.
