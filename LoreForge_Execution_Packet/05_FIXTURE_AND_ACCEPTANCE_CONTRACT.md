# Fixture and Acceptance Contract

Keep stable fixture identities/scenarios across phases. Add fields as the model grows, but do not casually rename the cast.

## P07X-T11 integrated fixture (current corrective acceptance)

The corrective stack adds an additive, idempotent fixture without deleting the
historical phase fixtures. Run `npm run seed:p07x` for an isolated local
database or let the normal seed call the same helper. The integrated acceptance
command is `npm run test:p07x-t11`.

The reserved current cast is `admin@example.test` (one `Administrator`
`platform_admin`, one `Administrator of Ar` `domain_admin`, and ordinary
`Lucan`), with `Tarl` as Warrior, `Marlen` as Sergeant, `Cassius` as Scribe,
an ordinary `NPC Villager`, and an unclaimed player Character. Ar contains
Scribes, Warriors, and Magistrates departments; Incident Report, Property Deed,
and Trade License Document Types; Type-routed Incident workflow Folders; and
Incident Report document/form Templates. The form fixture has a WYSIWYG-authored
header and footer plus date, text, and textarea fields. This P07X cast is the
source of truth for the final integrated run; older names below remain stable
fixtures for their original phase scenarios.

## Community Domains

### `Ar` — Gorean-style primary fixture
Owner User: `owner@fixture.local` (`Domain Owner`)

Subdomains:
- Scribes
- Warriors
- Magistrates

Core folders:
- Domain Root
  - Scribes
    - Property Records
      - Deeds
    - Historical Records
  - Warriors
    - Incident Reports
    - First Platoon
      - Battle Plans
    - Second Platoon
      - Battle Plans
    - Internal Affairs
  - Magistrates
    - Court Cases
    - Rulings

### `Bayview` — contrasting modern fixture
Used later to prove genericity. No hidden Gorean nouns.

## Users and Characters
Local fixture credentials only:
- Platform Admin User.
- Domain Owner User — owns Ar.
- `Marlen of Ar` — Head Scribe.
- `Sera` — Property Clerk.
- `Dorian` — Historical Clerk.
- `Kael` — Commander.
- `Rarius` — First Captain.
- `Tarl` — Second Captain.
- `Varro` — Warrior.
- `Cassian` — investigated Warrior.
- `Livia` — Magistrate.
- `Aren` — Warrior + Magistrate.
- `Mira` — outsider.
- `Unknown Traveler` — unclaimed Character.
- one User controlling two Characters, e.g. `Lucan` and `Elara`.

Fixture fantasy names are not product vocabulary.

## Role hierarchy fixture
Scribes: `Head Scribe > Senior Scribe > Junior Scribe`
Warriors: `Commander > {First Captain, Second Captain, Warrior}`
Magistrates: `Chief Magistrate > Magistrate/Clerk`

Assignments:
- Kael = Commander, Warriors.
- Rarius = First Captain, Warriors.
- Tarl = Second Captain, Warriors.
- Varro = Warrior.
- Cassian = Warrior + explicit deny scenario.
- Livia = Magistrate.
- Aren = Warrior + Magistrate.
- Marlen = Head Scribe.
- Sera = Property Records Clerk; that Role supplies default Property Records permissions.
- Dorian = Historical Records Clerk; that Role supplies default Historical Records permissions.

There are no direct Character-to-Department membership fixtures and no Folder-scoped RoleAssignments. Department participation is derived from active RoleAssignments. Add at least one direct per-Character Folder override fixture to prove that Folder access remains editable without changing Roles.

## Required record fixtures
1. Plain Text note.
2. Form-generated Incident Report.
3. Three Property Deeds for one building, supersession A <- B <- C.
4. Marriage License for Share scenarios.
5. Filed then Locked Court Ruling.
6. Imported Markdown/notecard-simulation record.
7. A superseding record chain for one property, with older records locked and linked to the current version.
9. Document linked to `Unknown Traveler`.
10. Later: delivered/delayed/intercepted/garbled correspondence.

## Golden scenarios

### GS-01 Canonical edit
WYSIWYG edit -> Source edit -> WYSIWYG -> save/reopen. LF canonical Markdown and structure survive.

### GS-02 Theme identity
Restyle same Domain into two convincingly different identities. Shell and Document change; Markdown does not.

### GS-03 Character context
One User switches Characters; ordinary Character-level Domain/Department access changes with active Character, account session does not. The top-level bar shows the one `Domain` selector on the left and `Acting as` Character on the right; the Character choices for a selected Domain are only that User's active member Characters. Switching to a managed Domain with no eligible Character clears the Character and preserves the Domain. The ownerUser/operational DomainAdmin can use User-level management links for that selected Domain without entering a mode or gaining roleplay identity.

### GS-04 Role hierarchy + exception
Commander sees the Warrior defaults inherited through the Role hierarchy. First Captain and Second Captain are distinct Department-owned Roles with different default Folder rules. An authorized manager directly grants Varro Write to First Platoon Battle Plans without changing Varro's Role or creating Department membership.

### GS-05 Explicit deny
Cassian's direct deny blocks normal Warrior role grant. A more-specific direct Document grant may override a broader direct deny per authorization contract.

### GS-06 Document lifecycle
Draft -> submit -> approve/file -> lock. Pending body frozen. Reject -> Draft with reason/history. Locked edit fails until unlock.

### GS-07 Provenance/versioning
Edit, share, supersede. Timeline names actor/time/action. Revisions inspect/restore without losing provenance.

### GS-08 Share
Share Marriage License = same ID and revision stream. Revoke removes future access while preserving audit history.

### GS-09 Supersession
Create a superseding record from the prior version. The new record gets a new ID and revision stream; the old record is locked and links to the current version. Cross-Domain transfer is not a supported operation.

### GS-10 Form Studio
Department head builds form without CMS terminology. Warrior fills it. Output is Markdown Document; Character fields create links; no raw answer record remains.

### GS-11 Public filtering
Anonymous user sees public only; no private titles/snippets leak through navigation/search/Character pages.

### GS-12 Personal Domain
Character receives no implicit cross-Domain record. No public/subdomain/role/folder-share controls. Single-document share works.

### GS-13 Backup/restore
Postgres backup -> destroy/replace -> restore -> rerun permissions/provenance acceptance.

### GS-14 Correspondence moderation
GM delivers, delays, intercepts, garbles. Original admin-auditable; recipient sees only approved delivered content. Delay uses original send time.

### GS-15 SL location boundary
Permission + location checked at action start. Authorized edit can save later despite lag/location expiry. Physical presence never bypasses local permission.

### GS-16 LoreForge shell and user-first administration
Signed-out `/` is a branded LoreForge home with embedded customer login and About/Subscriptions/Create Account links; signed-in `/` is the User dashboard. Domain primary navigation remains Home/About/Departments/Records for ordinary and administrative users. An authorized head finds Sera through the ranked People quick search, checks/unchecks Department-owned Roles in the Role tree, and manages direct Read/Write Folder overrides in a separate searchable Folder tree without navigating raw collection tables. The Department list is derived from Sera's Roles.

### GS-17 Unified document creation
From Records, click one `New document` action and reach the full editor. Choose an accessible Document Type, then its available Blank/Template/Form method; the Type's lifecycle routing resolves the destination Folder and ordinary creators cannot override it. Enter title, additional Prepared by credits, Concerns Characters, and Tags. The active Character cannot be removed from Prepared by. Blank and document Templates open WYSIWYG; a form Template opens the form; all methods create ordinary lifecycle/provenance-bearing Documents.
