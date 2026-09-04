# Frozen Product Decisions

These decisions came from the product-design conversation and supersede stale/speculative alternatives. Executors do not revisit them unless the owner explicitly changes them.

## Product identity
- LoreForge is a specialized roleplay institutional archive, **not a generic CMS**.
- Initial marketing/content focus may be Gorean Roleplay Cities, but core code is genre-neutral.
- Genre adaptation comes from first-party starter packs, vocabulary, templates, roles, folders, and visual theme—not conditional Gorean code.
- `Domain` is the product term for a tenant. Use DNS/hostname terminology for actual internet DNS.
- LoreForge owns a polished public platform home, ordinary customer login, account dashboard, account pages, and global context header. Ordinary users never enter through Payload Admin; Payload Admin remains an internal developer/operator back office.
- Signed-out `/` is the LoreForge marketing/login home. Signed-in `/` is the LoreForge User dashboard. The LoreForge logo returns there; a selected Domain's `Home` navigation returns to that Domain's home.

## Users, Second Life identities, and Characters
- One LoreForge User may link to **zero or one** Second Life account/avatar.
- One SL account/avatar may link to **at most one** LoreForge User.
- LoreForge never tries to prove that several SL accounts are alts of one human. Five SL accounts means five LoreForge accounts.
- A User can control zero or many Characters on that one account.
- Character is the root roleplay identity. Memberships, roles, permissions, Personal Domains, and correspondence are Character-centric.
- A Character is global and may participate in many Domains.
- Characters may be unclaimed/domain-managed and created during document filing.
- Character -> controlling User is public by default.
- A player may request to claim an unclaimed Character; an authorized Domain actor approves/rejects ordinary claims.
- Duplicate Characters can be corrected locally per Domain. Permanent global merge requires Platform Admin review and is permanently audited.
- A User without an active Character may remain logged in and see account-level/mostly empty surfaces.
- The customer shell has one top-level operating-context bar: the left control is the selected `Domain` and the right control is the active `Character`, labeled `Acting as`. These controls are product context, not account settings, Role selectors, or an Administration mode.
- The one Domain selector contains Domains available through controlled Character participation and Domains available through User-level owner/operational-admin authority. The UI may group them as `Participating` and `Managed`, but there is no second Administration selector.
- For a selected Domain, the Character selector offers only active Characters controlled by the User with active membership in that Domain. A `domain-character-context` alias never makes a Character selectable. A selected Domain with no eligible Character is valid for public browsing and User-level owner/admin work and displays `No participating Character` honestly.
- Domain selection never silently changes the acting Character. If the prior Character is invalid in the newly selected Domain, clear the Character selection while preserving the selected Domain. Character-scoped reads/actions require a server-validated `(User, Character, Domain)` membership tuple. User-level owner/admin operations validate `(User, Domain)` directly and never fabricate Character identity.
- Administration is capability, not a mode. There is no `Enter Administration`, `Exit Administration`, or separate administration context. The selected Domain is the only Domain being managed; permission-aware management links appear for it and every route/action remains server-authorized.
- Membership management is a separate, clearly labeled administrative surface. Selecting a Character connected to a Domain does not grant a Role, permission, ownership, or operational-admin authority.

## Community Domains
- A Community Domain has exactly **one Owner User** with final commercial/closure/ownership authority.
- A Domain may have multiple operational administrators, but LoreForge does not adjudicate owner disputes.
- Subdomain is the neutral internal model for a real delegated organizational boundary (Scribes, Warriors, Courts, etc.), not a nested tenant. The default customer-facing vocabulary and canonical route use `Department(s)`; legacy `/subdomains` URLs redirect to `/departments`. The controlled vocabulary may later change the displayed noun without renaming the schema.
- Subdomains share Domain theme/billing/site identity.
- Departments have Roles, folders, templates/forms, and an app-owned landing page. A Character participates in a Department only by holding at least one active Role owned by that Department; there is no separate Character-to-Department membership assignment.
- Initial model has one Subdomain level. More granular organization uses folders/delegation, not recursive Subdomains.

## Roles and access
- Every Community-Domain Role belongs to exactly one Department. Role hierarchy is real and rigid within that Department. A Character may hold multiple Role assignments in one or many Departments.
- Hierarchy provides rank, default privilege inheritance, and delegation convenience, but **is not the only source of access**.
- Direct grants across the hierarchy are allowed.
- Explicit deny is required.
- A Role assignment is only a Character-to-Role relationship. It never carries a Folder, resource scope, or Folder permission.
- Role definitions may supply default permission rules, including defaults that affect Folders. Those defaults belong to the Role definition, not to an individual Role assignment.
- Direct per-Character Folder access is represented and edited separately from Role assignments. Removing a Role removes only defaults inherited through that Role; direct Folder grants/denies remain.
- Removing a Character from a Domain transactionally removes that Character's RoleAssignments and direct Folder grants/denies in the Domain. Audit history preserves the fact of removal, not reusable live assignment rows. Re-adding the Character starts with no Roles, Department participation, or direct Folder access.
- No actor may delegate more authority than they possess or outside the branch they administer.
- Domain membership is explicit and separate from Roles and explicit permissions. Department participation is derived from active Department-owned Roles and is not stored or edited as a redundant membership.
- Domain membership and Roles may supply default permissions; they are not synonymous with direct Folder permissions.
- Role creation is not generally delegatable: Domain Owner/Domain admins create Roles; a Department Role with explicit `manage_roles` authority may create/configure Roles in that Department; folder managers do not create Roles merely because they manage Folder access. `manage_roles` and `assign_subordinates` are separate capabilities.
- `assign_subordinates` is a Role-management capability. A holder may assign only active descendant Roles beneath a Role they hold, within the same Department; it never permits assigning that Role itself, a peer, an ancestor, or a Role in another Department. Server authorization, not tree visibility, enforces this boundary.
- Folder permissions are primary. Document-specific sharing/grants/denies are supported as exceptions.
- Customer administration is Character-centered. `People` is the default navigation label for the Domain member manager: find a Character with a fast typeahead search, then inspect/manage Domain membership, Department-owned Roles, separately assigned Folder access, effective access, recent work, and change history in one workspace. The controlling User is displayed separately and never receives a Character Role by implication.
- `Roles` defines hierarchy/default authority and may support bulk assignment; the ordinary one-person assignment workflow lives on the Character's People page.

## Archive and Documents
- Every Document has exactly one canonical Folder location.
- Every Document has a required Document Type.
- Seed a `Plain Text` Document Type plus a blank inheritable template for “just type the note.”
- Document Type and Template remain separate concepts; a Type may have many Templates.
- Canonical Document prose is Markdown. No HTML/editor JSON as the business record.
- Form templates are an authoring method; after successful generation, raw structured form answers are discarded.
- Form-generated output becomes an ordinary Document.
- Required lifecycle states: Draft, Pending Review, Filed, Locked.
- Any Document may be superseded/amended through document relationships; unlocked Documents may also be edited normally.
- Full content revisions are retained.
- Provenance belongs to the Document model and is viewable as a chronological timeline, not merely an application log.
- Normal deletion is soft delete/restore.
- Records exposes one `New document` action leading to a full creation/editor page; it never asks for a title inline on the Records browser.
- New-document UI includes searchable Template selection, destination Folder, editable title, required `Prepared by` Character credits, `Concerns` Character links, Tags, and either WYSIWYG content or a generated form. The active Character is automatically included in `Prepared by` and cannot be removed during creation; additional Characters may be credited.
- A Template specifies its normal destination Folder. Choosing the Template selects that destination automatically; an authorized alternative is possible only when the Template explicitly permits destination override. Plain Text remains deliberately flexible.
- Visible `Prepared by` credits, `Concerns` links, and immutable provenance actors are separate semantics and may not be collapsed into one generic Character link.

## Document relationships and correspondence
There is one core document relationship:

1. `supersedes` — directional historical succession where the newer record points to the older record.

- Creating a superseding Document starts from the older record's title, body, and Concerns and adds an italic supersession note to the new body.
- A superseded Document is locked and displays a prominent link to its current successor. Each Document has at most one direct predecessor and one direct successor, so succession remains a linear chain.
- Documents are never moved or copied between Domains. A future correspondence/messaging feature may send a document between Domains as a communication, but it will not transfer the canonical record.
- `Share` means access to the same canonical Document and remains an explicit bottom-of-document action.

## Metadata, Characters, tags, search
- Platform defines standardized metadata. Domains express special record fields through templates/document body rather than arbitrary database columns.
- Metadata/provenance records who created, edited, submitted, filed, approved/rejected, locked/unlocked, superseded, shared, etc.
- Documents have typed structural Character links independent of text mentions: `prepared_by` credits and `concerns` links. A Concerns link may carry a human relationship label such as suspect, spouse, or owner. Provenance separately records the authenticated User and acting Character who performed an action.
- Tags are Domain-managed/autocomplete vocabulary with controlled ad-hoc creation by authorized users.
- Primary search scope is always one active Domain.

## Themes and starter packs
- Core customization is identity/theme/vocabulary, not arbitrary page layout.
- No Puck/GrapesJS core page builder.
- Theme Studio controls logo/seal, banner/background treatment, curated colors/fonts/presets and a few safe style options with live preview.
- Raw custom CSS remains an open future escape hatch but is not core and is not implemented by these tickets.
- Vocabulary is controlled terminology/default labels/content—not full localization of every interface string.
- Starter packs are first-party only for now.
- Starter packs are **copy-on-install**. Installed Domain configuration is independent forever; pack updates never silently rewrite it.
- Initial packs: Gorean City + one strongly contrasting modern pack.
- Domain branding begins below the persistent LoreForge global header. Primary Domain navigation is stable and ordered `Home, About, Departments, Records`. A visually subordinate, unlabeled management bar exposes authorized `People, Roles, Templates & Forms, Customize` destinations without changing the primary navigation; do not prepend redundant `Manage <Domain>` copy.
- `Templates & Forms` is one customer management area with distinct Document Types, Templates, and Forms subviews; grouping them must not conflate their data semantics.

## Public and Personal Domains
- Community Domains can expose public folders/Documents/pages/Character profiles; private content remains permission-filtered.
- Public Character profiles are allowed and show only public-linked records.
- Personal Domain is rooted in **one Character**, not one User.
- A User with several Characters may eventually have several Personal Domains; exact commercial entitlement is deliberately not hard-coded yet.
- Personal Domain uses the same archive infrastructure but is strictly private by product policy: no public site, no Subdomains, no organizational role system, no folder sharing.
- Personal Domain may share individual Documents to another User/Character, including edit permission.
- A Character can receive independent copies of Community Domain records into the Personal Domain.

## Activity, notifications, correspondence
- Provenance/audit history is authoritative. Activity feed is a human-friendly projection, not a second source of truth.
- Notifications come later and only selected event classes generate them.
- Watches initially support Document and Folder only.
- Signed-in dashboards reserve a `For you` feed for permission-filtered Domain notices, activity, watches, and notifications. Empty states are deliberate until the corresponding phase hydrates them.
- Domain notices are administrator-authored announcements, not audit/provenance records and not correspondence. They require their own audited model and publication lifecycle before being projected into feeds.
- Email is a notification delivery channel, not the correspondence system.
- Correspondence is Character-to-Character and separate from Documents.
- Optional Domain policy may route correspondence through a GM/admin delivery queue.
- GM can deliver, delay, intercept/fail, or garble a message while preserving original and delivered text in authorized provenance.
- A delayed message is actually withheld. After a GM chooses delay, due time is calculated from original sent time. If the GM never reviews the queued message, nothing auto-decides it.
- Correspondence uses reply linkage; do not build Slack/chat as the initial model.

## Second Life boundary
- SL integration is a separate service/process, likely LibreMetaverse-based, not embedded into the core web process.
- Exact verification/location/notecard transport protocol is intentionally designed later with the owner.
- Location is an additional condition, never a bypass of normal LoreForge permission checks.
- Initial location scopes: Domain, Subdomain, Folder. Documents inherit folder requirement.
- Check location at **start of access/action**, not continuously:
  - search start may require check; results can remain visible;
  - opening a result can check again;
  - edit start can check; save does not recheck and destroy work because SL lagged.
- Notecard import and export both matter.
- SL transfer provenance is preserved and can round-trip into exported notecard metadata.
- Stable external resource IDs/URLs should support in-world objects linking to resources later.

## Platform operator and lifecycle
- Platform Admin is a separate superuser authority and can inspect/manage all Domains.
- Platform Admin actions are audited.
- Platform Admin gets a useful dashboard with data visualizations, Domain state, activity, jobs/errors, and later bridge health.
- Community Domain lapse must not casually destroy history. States include Active, Grace, Read-only, Suspended, Archived/Closed.
- Intentional Domain sunset/archive is a supported concept; exact long-term pricing/storage retention is decided when real costs are known.
- Whole-Domain export/backup is a product requirement.
- Bulk import of legacy text/Markdown archives is a product requirement.
