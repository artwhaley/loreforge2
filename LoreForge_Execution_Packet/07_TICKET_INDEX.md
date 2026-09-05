# LoreForge Ticket Index

## Current Phase 7 performance remediation

Owner-requested executable addendum:
`references/P07P_DATABASE_ACCESS_PATCH.md` (P07P-01 through P07P-06).
Status: implementation and automated verification complete; owner manual gate
pending. These six ordered work units supplement the original 84 ticket files;
they are not six additional phase gates. P07-GATE must remain open until the
owner completes the visible acceptance and release measurements before Phase 8.
Repository-root entry point: `P07_DATABASE_ACCESS_PATCH.md`.

**Total ticket files:** 84 (69 implementation/design tickets plus 15 mandatory human review gates). The P07X corrective extension below supplements but does not replace this count.

## P07X — Acting-Identity and Document-Workflow Corrective Extension

Owner-directed corrective stack executed between Phase 7 and Phase 8. Spec and
stack live outside this packet at the repository root:
`LoreForge_P07X_Execution_Packet/` (`00_CORRECTIVE_SPEC.md`, `01_EXECUTION_STACK.md`, `02_INTEGRATED_ACCEPTANCE.md`).

- Branch: `phase-07x-acting-identity-document-workflows`
- **P07X-T00** — freeze acting identity and document workflow redirects  
  _Patch canonical packet docs so later agents do not restore the User-admin bypass / Folder-primary / Template-destination model._
- **P07X-T01** — add four hard-separated Character kinds  
  _Introduce `player | npc | domain_admin | platform_admin` with system-managed administrative identities._
- **P07X-T02** — make acting Character authoritative  
  _Split platform vs Domain authorization seams; remove ambient User-level authority from ordinary Domain record authorization._
- **P07X-T03** — pivot record permissions to Document Types  
  _Two-axis record authorization with DocumentType as a PermissionRule resource._
- **P07X-T04** — simplify Type permissions and Folder projection  
  _Role × Document Type permission surface and permission-aware Folder projection._
- **P07X-GATE-A** — identity/authorization invariant gate  
  _Executor continuation gate; continue automatically when all 12 checks pass._
- **P07X-T05** — route lifecycle through Document Type folders  
  _Type-owned draft/pending/filed/locked routing with atomic relocation and provenance._
- **P07X-T06** — make Document Type the creation entry point  
  _Type-first New Document with Blank / Template / Form creation methods._
- **P07X-T07** — add WYSIWYG form header and footer  
  _Form Studio headerMarkdown/footerMarkdown with canonical generation order._
- **P07X-T08** — add secure invitation link foundation  
  _One narrow token-based invitation mechanism (bootstrap / character claim / domain join)._
- **P07X-T09** — implement Domain invitation workflows  
  _Bootstrap, Character, and general Domain invite experiences on the T08 foundation._
- **P07X-T10** — add source-specific Work queues  
  _Platform/Domain pending-work surfaces projected from canonical sources; no universal queue storage._
- **P07X-T11** — complete integrated identity workflow correction  
  _Migration cleanup, fixtures, and the full integrated acceptance run._
- **P07X-GATE-FINAL** — owner end-to-end review  
  _Hard stop before any Phase 8 work; the empty-Domain buildout exercise determines the first starter pack._

**P07X status:** P07X-T00 through P07X-T11 are complete on
`phase-07x-acting-identity-document-workflows`. The integrated acceptance,
migration, regression, and security checks are green. Work stops at
P07X-GATE-FINAL for owner review; the empty-Domain buildout exercise is the
next product activity and the historical Phase 8 starter-pack tickets do not
start automatically.

This index is navigation only. `01_ORCHESTRATOR.md`, each phase's `00_PHASE_ORCHESTRATOR.md`, and the ticket itself control execution.

## Global execution rule
- The current continuation point is P07X-GATE-FINAL after P07X-T11 on
  `phase-07x-acting-identity-document-workflows`; the original Phase 1 kickoff
  and earlier phase continuation bullets are historical.
- Every later phase requires explicit owner approval of the previous phase gate.
- One ticket = one bounded change = one separate commit.
- Review gates are hard stops and may not be self-approved.

## Phase 1 — Editor, Theme, and Safety Baseline
- Branch: `phase-01-editor-theme-safety`
- Orchestrator: `tickets/phase-01/00_PHASE_ORCHESTRATOR.md`

- **P01-T01** — Markdown dialect and render safety  
  `tickets/phase-01/P01-T01-markdown-dialect-and-render-safety.md`  
  _Close the spike's known Markdown injection gap while preserving canonical Markdown as the stored format._
- **P01-T02** — Editor save, dirty-state, and navigation UX  
  `tickets/phase-01/P01-T02-editor-save-dirty-and-navigation-ux.md`  
  _Make explicit Save trustworthy before lifecycle/versioning complexity._
- **P01-T03** — Editor toolbar, Source round-trip, and accessibility  
  `tickets/phase-01/P01-T03-editor-toolbar-source-roundtrip-and-accessibility.md`  
  _Tune the actual editing experience while keeping the tested custom Source seam._
- **P01-T04** — Theme Studio and Domain-language tuning  
  `tickets/phase-01/P01-T04-theme-studio-and-domain-language-tuning.md`  
  _Give the rough spike its first taste/usability pass and remove customer-facing assumptions that every Domain is a modern city._
- **P01-GATE** — Review Gate 1 — editor/theme foundation  
  `tickets/phase-01/P01-GATE-review-gate-1.md`  
  _Prove the tuned editor/theme/safety baseline is good enough to build the real product on._

## Phase 2 — User, Character, and Active Context
- Branch: `phase-02-character-context`
- Orchestrator: `tickets/phase-02/00_PHASE_ORCHESTRATOR.md`

- **P02-T01** — User SL placeholder and global Character model  
  `tickets/phase-02/P02-T01-user-sl-placeholder-and-character-model.md`  
  _Introduce the real User/Character distinction without implementing SL verification._
- **P02-T02** — Active Character and Domain operating context  
  `tickets/phase-02/P02-T02-active-character-domain-context.md`  
  _Make acting identity explicit so later authorization cannot accidentally use User as RP principal._
- **P02-T03** — Character Domain membership and local context  
  `tickets/phase-02/P02-T03-character-domain-membership-and-local-context.md`  
  _Move participation from spike User Memberships to explicit Character memberships._
- **P02-T04** — Character claims, public profiles, and local alias correction  
  `tickets/phase-02/P02-T04-character-claims-public-profiles-and-local-aliasing.md`  
  _Complete initial Character identity workflows without Domain-level global destructive merge._
- **P02-GATE** — Review Gate 2 — Character-centric identity  
  `tickets/phase-02/P02-GATE-review-gate-2.md`  
  _Verify acting as Characters feels natural rather than like User memberships with RP labels._

## Phase 3 — Community Domain and Subdomain Structure
- Branch: `phase-03-domain-subdomain-structure`
- Orchestrator: `tickets/phase-03/00_PHASE_ORCHESTRATOR.md`

- **P03-T01** — Domain model, single Owner, and operational admins  
  `tickets/phase-03/P03-T01-domain-model-owner-and-admins.md`  
  _Replace spike tenant terminology/schema with durable Community Domain and User-level authority._
- **P03-T02** — Subdomains, membership, and landing pages  
  `tickets/phase-03/P03-T02-subdomains-memberships-and-landing.md`  
  _Historical Phase 3 implementation; direct Department membership is superseded by CC-2026-09-03-03 and mandatory P05-T00._
- **P03-T03** — Domain root, Subdomain folder branches, and navigation  
  `tickets/phase-03/P03-T03-domain-root-subdomain-folders-and-navigation.md`  
  _Make every Document location explicit and prepare folder branches for later delegation._
- **P03-T04** — Role hierarchy and scoped assignments  
  `tickets/phase-03/P03-T04-role-hierarchy-and-scoped-assignments.md`  
  _Historical Phase 3 implementation; scoped Role assignments are superseded by CC-2026-09-03-03 and mandatory P05-T00._
- **P03-GATE** — Review Gate 3 — institutional structure and navigation  
  `tickets/phase-03/P03-GATE-review-gate-3.md`  
  _Historical gate; its relationship model is superseded by CC-2026-09-03-03 and mandatory P05-T00._

## Phase 4 — User-first Shell, Document Types, Lifecycle, Revisions, and Provenance
- Branch: `phase-04-user-first-shell-document-lifecycle`
- Orchestrator: `tickets/phase-04/00_PHASE_ORCHESTRATOR.md`

- **P04-T00** — LoreForge home, customer login, and User dashboard  
  `tickets/phase-04/P04-T00-loreforge-home-login-and-user-dashboard.md`  
  _Replace the diagnostic root and Payload-admin customer entry with deliberate signed-out and signed-in LoreForge platform surfaces._
- **P04-T05** — Single-Domain context and customer navigation  
  `tickets/phase-04/P04-T05-single-domain-context-and-customer-navigation.md`  
  _Remove Administration mode and establish one selected Domain, optional eligible Character, stable primary navigation, and capability-driven management links._
- **P04-T06** — Department, People, and Record-entry workflow shells  
  `tickets/phase-04/P04-T06-department-people-and-record-entry-shells.md`  
  _Reorganize Phase 3 machinery around Department navigation, Character-centered administration, and full-page Document creation._
- **P04-T01** — Document Types, Plain Text baseline, and lifecycle policy  
  `tickets/phase-04/P04-T01-document-types-plain-text-and-lifecycle-policy.md`  
  _Replace the spike's untyped document assumption with the required Type model and deterministic filing/review policy._
- **P04-T02** — Payload Versions and lifecycle edit guards  
  `tickets/phase-04/P04-T02-payload-versions-and-edit-guards.md`  
  _Turn document revision history into a durable invariant while enforcing editability from lifecycle state._
- **P04-T03** — Document provenance events and unified history timeline  
  `tickets/phase-04/P04-T03-document-provenance-and-history-timeline.md`  
  _Create the authoritative per-Document provenance record and user-facing timeline for meaningful state changes._
- **P04-T04** — Review, approval/rejection, locking, and soft delete  
  `tickets/phase-04/P04-T04-review-approval-locking-and-soft-delete.md`  
  _Complete the first usable archive lifecycle without conflating approval, locking, and deletion._
- **P04-GATE** — Review Gate 4 — user-first shell and durable document core  
  `tickets/phase-04/P04-GATE-review-gate-4.md`  
  _Human review of the approved customer shell/workflows and durable Document/Type/lifecycle/version/provenance foundation before relationships and templates build on it._

## Phase 5 — Archive Relationships, Tags, Character Links, Supersedes/Share
- Branch: `phase-05-document-supersession-and-sharing`
- Orchestrator: `tickets/phase-05/00_PHASE_ORCHESTRATOR.md`

- **P05-T00** — Correct Role, Department, and Folder assignment model
  `tickets/phase-05/P05-T00-correct-role-department-and-folder-assignment-model.md`
  _Remove Folder scope from RoleAssignments and redundant Department memberships, make Roles Department-owned, and establish separate modern Role and Folder controls on the Character workspace._
- **P05-T01** — Prepared-by credits, Concerns links, and Domain tag vocabulary  
  `tickets/phase-05/P05-T01-character-links-and-domain-tags.md`  
  _Add typed visible preparation credits, Characters a record concerns, and Domain tags without conflating any of them with provenance actors._
- **P05-T02** — Superseding document relationships
  `tickets/phase-05/P05-T02-grouped-and-supersedes-relationships.md`
  _Implement one linear supersedes relationship with locking and successor history._
- **P05-T03** — Retired: Document Copy and Move (owner decision; do not execute)
  `tickets/phase-05/P05-T03-document-copy-and-move.md`
  _Retired. Do not implement Copy, Move, transfer, or cross-Domain mapping._
- **P05-T04** — Document sharing and document action UX  
  `tickets/phase-05/P05-T04-document-sharing-and-action-ux.md`  
  _Add exceptional same-document sharing and keep the document view focused on the record._
- **P05-GATE** — Review Gate 5 — supersedes/share
  `tickets/phase-05/P05-GATE-review-gate-5.md`
  _Human validation that document identity, succession, and cross-boundary operations are unambiguous before template automation expands creation volume._

## Phase 6 — Templates and Form Studio
- Branch: `phase-06-template-form-studio`
- Orchestrator: `tickets/phase-06/00_PHASE_ORCHESTRATOR.md`

- **P06-T01** — Template model, inheritance scope, and base composition  
  `tickets/phase-06/P06-T01-template-model-scope-and-composition.md`  
  _Create a reusable template system that supports Domain/Subdomain/folder availability and letterhead-style composition without a page-builder._
- **P06-T02** — Neutral form schema and Payload Form Builder migration seam  
  `tickets/phase-06/P06-T02-neutral-form-schema-and-payload-migration.md`  
  _Replace plugin-specific form definitions as business data with LoreForge's frozen neutral form schema while preserving the spike's proven form-to-Markdown path._
- **P06-T03** — Customer-facing Form Studio  
  `tickets/phase-06/P06-T03-customer-form-studio.md`  
  _Build the Head-Scribe-friendly form-template authoring surface instead of exposing Payload's CMS-oriented Form Builder admin UI._
- **P06-T04** — Form-driven Document creation  
  `tickets/phase-06/P06-T04-form-document-creation.md`  
  _Complete form-first authoring so a filer fills a friendly form and receives an ordinary canonical Markdown Document with structural Character links._
- **P06-GATE** — Review Gate 6 — templates and forms  
  `tickets/phase-06/P06-GATE-review-gate-6.md`  
  _Human UX gate for the authoring shortcut most likely to determine whether nontechnical roleplayers can use LoreForge._

## Phase 7 — Real Authorization and Delegated Administration
- Branch: `phase-07-authorization-delegation`
- Orchestrator: `tickets/phase-07/00_PHASE_ORCHESTRATOR.md`

- **P07-T01** — Authorization rule model and deterministic evaluator  
  `tickets/phase-07/P07-T01-authorization-rule-model-and-evaluator.md`  
  _Implement the frozen hierarchical-plus-exception permission model in one testable service before wiring it across the application._
- **P07-T02** — Server, Payload, and query authorization enforcement  
  `tickets/phase-07/P07-T02-server-and-payload-enforcement.md`  
  _Make the evaluator authoritative across all read/write paths so UI hiding is never the security boundary._
- **P07-T03** — Department Role defaults and hierarchy
  `tickets/phase-07/P07-T03-role-defaults-hierarchy-and-scoped-authority.md`  
  _Make Department-owned Role hierarchy useful for default access and subordinate assignment without attaching Folder scope to a RoleAssignment._
- **P07-T04** — Folder inheritance, direct grants, and explicit denies  
  `tickets/phase-07/P07-T04-folder-inheritance-direct-grants-and-explicit-denies.md`  
  _Complete practical folder/document permission administration including temporary lockout cases._
- **P07-T05** — Delegated administration and Role-creation boundaries  
  `tickets/phase-07/P07-T05-delegated-administration-and-role-creation-boundaries.md`  
  _Enforce 'cannot delegate more than you possess' and frozen authority to create Roles._
- **P07-GATE** — Review Gate 7 — authorization and delegated administration  
  `tickets/phase-07/P07-GATE-review-gate-7.md`  
  _Hard security/behavior gate before public surfaces and starter packs multiply configuration._

## Phase 8 — Theme/Vocabulary Productization, Public Surfaces, and Starter Packs
- Branch: `phase-08-branding-public-starter-packs`
- Orchestrator: `tickets/phase-08/00_PHASE_ORCHESTRATOR.md`

- **P08-T01** — Theme Studio productization and controlled vocabulary  
  `tickets/phase-08/P08-T01-theme-studio-productization-and-vocabulary.md`  
  _Turn the spike Theme Studio into a deliberate, safe personalization feature and three first-class design templates (owner-corrected 2026-09-05: vocabulary theming removed)._
- **P08-T02** — Public Domain, member Domain Home, and Department surfaces  
  `tickets/phase-08/P08-T02-public-and-member-domain-surfaces.md`  
  _Hydrate and polish the approved public/User/Domain/Department surfaces without replacing their user-first information architecture._
- **P08-T03** — Starter Pack schema, copy-on-install installer, and Gorean City pack  
  `tickets/phase-08/P08-T03-starter-pack-schema-installer-and-gorean-pack.md`  
  _Create first-party Domain seeding as ordinary copied configuration, with Gorean City as the initial real starter pack._
- **P08-T04** — Contrasting Modern City pack and public Character pages  
  `tickets/phase-08/P08-T04-modern-pack-and-public-character-pages.md`  
  _Prove genericity with a second first-party vocabulary/theme seed and complete public Character presentation/claim-safe visibility._
- **P08-GATE** — Review Gate 8 — product identity, public/member UX, starter packs  
  `tickets/phase-08/P08-GATE-review-gate-8.md`  
  _Human product/UX gate proving LoreForge feels like a branded RP archive rather than a generic CMS._

## Phase 9 — Personal Domains
- Branch: `phase-09-personal-domains`
- Orchestrator: `tickets/phase-09/00_PHASE_ORCHESTRATOR.md`

- **P09-T01** — Character-owned Personal Domain policy  
  `tickets/phase-09/P09-T01-character-owned-personal-domain-policy.md`  
  _Implement Personal Domains as a constrained profile of the same Domain/archive infrastructure, rooted in Character identity._
- **P09-T02** — Personal Document sharing and private archive UX  
  `tickets/phase-09/P09-T02-personal-document-share-and-private-ux.md`  
  _Support exceptional per-Document collaboration while keeping Personal Domains genuinely private._
- **P09-T03** — File to Community Domain and keep independent Personal copy  
  `tickets/phase-09/P09-T03-file-there-and-keep-personal-copy.md`  
  _Implement the attorney/scribe workflow where a Character files a Community record and optionally keeps an independent archival copy._
- **P09-GATE** — Review Gate 9 — Personal Domains  
  `tickets/phase-09/P09-GATE-review-gate-9.md`  
  _Validate Character-rooted private archives and copy/share boundaries before replacing temporary infrastructure._

## Phase 10 — Production Data and Runtime Foundation
- Branch: `phase-10-production-runtime`
- Orchestrator: `tickets/phase-10/00_PHASE_ORCHESTRATOR.md`
- Owner gate: `owner-gates/P10_DEPLOYMENT_DECISIONS.md` before P10-T05.

- **P10-T01** — PostgreSQL adapter and deterministic local migration  
  `tickets/phase-10/P10-T01-postgres-adapter-and-local-migration.md`  
  _Move the now-stable product model from intentional SQLite proof infrastructure to PostgreSQL without inventing an abstraction layer._
- **P10-T02** — Production migrations, persistent volumes, and database enforcement  
  `tickets/phase-10/P10-T02-production-migrations-volumes-and-db-enforcement.md`  
  _Make database/schema operations repeatable and close gaps that should be enforced below application UI._
- **P10-T03** — Operational backup and restore baseline  
  `tickets/phase-10/P10-T03-backup-restore-and-export-integrity.md`  
  _Prove LoreForge can recover its database/media before hosting real community history._
- **P10-T04** — Jobs, structured logging, secrets, and runtime seams  
  `tickets/phase-10/P10-T04-jobs-logging-secrets-and-runtime-seams.md`  
  _Add minimum production-shaped operational plumbing needed by later notifications/correspondence without choosing providers prematurely._
- **P10-T05** — Production provider configuration  
  `tickets/phase-10/P10-T05-production-provider-configuration.md`  
  _Apply owner-selected hosting/media/email/deployment choices as one bounded production configuration step._
- **P10-GATE** — Review Gate 10 — production foundation  
  `tickets/phase-10/P10-GATE-review-gate-10.md`  
  _Verify the product has moved cleanly from deliberate local proof infrastructure to recoverable Postgres-based staging without semantic regressions._

## Phase 11 — Platform Administration and Domain Lifecycle
- Branch: `phase-11-platform-admin-lifecycle`
- Orchestrator: `tickets/phase-11/00_PHASE_ORCHESTRATOR.md`
- Commercial gate is deliberately unconsumed: `owner-gates/P11_BILLING_DECISIONS.md`.

- **P11-T01** — Platform Admin authority and operational dashboard  
  `tickets/phase-11/P11-T01-platform-admin-dashboard.md`  
  _Build the separate superuser surface the platform owner needs to see and manage all Domains with useful visualization._
- **P11-T02** — Single-owner transfer and Community Domain lifecycle states  
  `tickets/phase-11/P11-T02-ownership-transfer-and-domain-lifecycle.md`  
  _Implement final authority and non-destructive subscription/closure states without prematurely choosing billing economics._
- **P11-T03** — Platform-admin global Character merge queue  
  `tickets/phase-11/P11-T03-global-character-merge-queue.md`  
  _Resolve true global duplicates safely while preserving Domain-local correction capability and history._
- **P11-T04** — Operator jobs/errors and commercial entitlement seams  
  `tickets/phase-11/P11-T04-operator-jobs-errors-and-commercial-seams.md`  
  _Finish platform operations and define billing/entitlement boundary without letting an executor invent pricing or payment provider._
- **P11-GATE** — Review Gate 11 — platform operations and commercial boundary  
  `tickets/phase-11/P11-GATE-review-gate-11.md`  
  _Validate owner authority, platform administration, non-destructive lifecycle, and provider-neutral entitlement seam._

## Phase 12 — Search, Bulk Import, Export, and Scale UX
- Branch: `phase-12-search-import-export-scale`
- Orchestrator: `tickets/phase-12/00_PHASE_ORCHESTRATOR.md`

- **P12-T01** — PostgreSQL-native Domain search and filters  
  `tickets/phase-12/P12-T01-postgres-native-search-and-filters.md`  
  _Deliver scalable, permission-aware archive retrieval without adding an external search service._
- **P12-T02** — Public search and permission-sensitive retrieval UX  
  `tickets/phase-12/P12-T02-public-and-permission-search-ux.md`  
  _Expose public archive search cleanly and make restricted search behavior unsurprising without leaking hidden records._
- **P12-T03** — Bulk Markdown/text legacy archive import  
  `tickets/phase-12/P12-T03-bulk-markdown-text-import.md`  
  _Provide a controlled path for established RP communities to bring years of plain-text/notecard-derived records into LoreForge._
- **P12-T04** — Whole-Domain owner export  
  `tickets/phase-12/P12-T04-whole-domain-export.md`  
  _Give Community Domain Owner a portable archive of their data without pretending it is a raw database backup._
- **P12-GATE** — Review Gate 12 — retrieval, migration, and portability  
  `tickets/phase-12/P12-GATE-review-gate-12.md`  
  _Validate that a real archive can be found, onboarded, and exported before communication features add more data._

## Phase 13 — Activity, Notifications, and Watches
- Branch: `phase-13-notifications-watches`
- Orchestrator: `tickets/phase-13/00_PHASE_ORCHESTRATOR.md`

- **P13-T00** — Domain notices for member and public dashboards  
  `tickets/phase-13/P13-T00-domain-notices.md`  
  _Add administrator-authored Domain notices as a distinct dashboard/feed source without conflating them with audit, notifications, or correspondence._
- **P13-T01** — Domain/Department activity feed projections  
  `tickets/phase-13/P13-T01-activity-feed-projections.md`  
  _Create human-friendly Domain/Department activity views from authoritative provenance/audit events without turning feed entries into a second truth source._
- **P13-T02** — In-app notifications and preference model  
  `tickets/phase-13/P13-T02-in-app-notifications-and-preferences.md`  
  _Add durable user notification inbox with explicit event eligibility, separate from correspondence._
- **P13-T03** — Document and Folder watches  
  `tickets/phase-13/P13-T03-document-and-folder-watches.md`  
  _Implement the intentionally narrow subscription model for changes users explicitly care about._
- **P13-T04** — Email notification delivery channel  
  `tickets/phase-13/P13-T04-email-notification-channel.md`  
  _Add email as an optional transport for Notifications without coupling product semantics to a particular mail provider._
- **P13-GATE** — Review Gate 13 — activity and notifications  
  `tickets/phase-13/P13-GATE-review-gate-13.md`  
  _Validate event projections, watches, and notification delivery without conflating audit, activity, notification, and correspondence._

## Phase 14 — Correspondence
- Branch: `phase-14-correspondence`
- Orchestrator: `tickets/phase-14/00_PHASE_ORCHESTRATOR.md`

- **P14-T01** — Character-to-Character correspondence and immediate delivery  
  `tickets/phase-14/P14-T01-correspondence-model-and-immediate-delivery.md`  
  _Add formal RP correspondence as a first-class system separate from Documents and Notifications._
- **P14-T02** — Optional moderated correspondence policy and GM queue  
  `tickets/phase-14/P14-T02-moderated-correspondence-policy-and-gm-queue.md`  
  _Implement the politics-heavy RP mode where a GM decides whether/when/how a dispatched message arrives._
- **P14-T03** — Modified delivery, interception/failure, and immutable correspondence history  
  `tickets/phase-14/P14-T03-garble-intercept-fail-and-history.md`  
  _Support GM-mediated roleplay outcomes while retaining an authoritative original for administrators._
- **P14-T04** — Delayed correspondence delivery timing  
  `tickets/phase-14/P14-T04-delayed-delivery-timing-and-worker.md`  
  _Implement actual server-held delayed delivery using original send time semantics and the existing worker._
- **P14-T05** — File correspondence into archive and integrate notifications  
  `tickets/phase-14/P14-T05-file-correspondence-into-archive.md`  
  _Allow authorized roleplayers to intentionally preserve a correspondence record as a normal Document without collapsing the two systems._
- **P14-GATE** — Review Gate 14 — correspondence  
  `tickets/phase-14/P14-GATE-review-gate-14.md`  
  _Human roleplay-behavior gate for immediate and GM-mediated correspondence before Second Life integration._

## Phase 15 — Second Life Bridge
- Branch: `phase-15-second-life-bridge`
- Orchestrator: `tickets/phase-15/00_PHASE_ORCHESTRATOR.md`
- Owner gate: `owner-gates/P15_SL_PROTOCOL_APPROVAL.md` after P15-T00 and before P15-T01.

- **P15-T00** — Second Life bridge protocol design packet  
  `tickets/phase-15/P15-T00-sl-bridge-protocol-design.md`  
  _Freeze the core<->bridge API and identity/location/notecard transfer contracts before any LibreMetaverse process is written._
- **P15-T01** — Separate Second Life bridge service skeleton  
  `tickets/phase-15/P15-T01-sl-bridge-service-skeleton.md`  
  _Create the approved separately deployable bridge process with authentication, health, idempotent job handling, and no product authorization logic._
- **P15-T02** — One-to-one Second Life identity verification  
  `tickets/phase-15/P15-T02-sl-identity-verification.md`  
  _Link one LoreForge User to at most one verified SL avatar using the owner-approved bridge mechanism._
- **P15-T03** — SL location restrictions with action-start semantics  
  `tickets/phase-15/P15-T03-sl-location-restrictions.md`  
  _Apply optional Domain/Subdomain/Folder Second Life presence requirements without creating an annoying continuous policing system._
- **P15-T04** — Second Life notecard import/export with provenance round-trip  
  `tickets/phase-15/P15-T04-sl-notecard-import-export-and-provenance.md`  
  _Connect canonical Markdown Documents to SL notecards through the bridge while retaining chain-of-custody-style RP provenance._
- **P15-T05** — In-world resource links and authorized bot delivery  
  `tickets/phase-15/P15-T05-inworld-resource-links-and-authorized-delivery.md`  
  _Support stable LoreForge references from SL objects such as filing cabinets while ensuring core authorization precedes any notecard delivery._
- **P15-GATE** — Review Gate 15 — Second Life integration  
  `tickets/phase-15/P15-GATE-review-gate-15.md`  
  _Final human/domain-expert gate for the separate bridge, one-to-one avatar identity, location semantics, and notecard provenance._
