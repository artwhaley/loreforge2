# Fixture and Acceptance Contract

Keep stable fixture identities/scenarios across phases. Add fields as the model grows, but do not casually rename the cast.

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
Warriors: `Commander > Captain > Warrior`
Magistrates: `Chief Magistrate > Magistrate/Clerk`

Assignments:
- Kael = Commander, Warriors.
- Rarius = Captain scoped First Platoon.
- Tarl = Captain scoped Second Platoon.
- Varro = Warrior.
- Cassian = Warrior + explicit deny scenario.
- Livia = Magistrate.
- Aren = Warrior + Magistrate.
- Marlen = Head Scribe.
- Sera = Junior Scribe + delegated Property Records management.
- Dorian = Junior Scribe + delegated Historical Records management.

## Required record fixtures
1. Plain Text note.
2. Form-generated Incident Report.
3. Three Property Deeds for one building, supersession A <- B <- C.
4. Marriage License for Share/Personal-copy scenarios.
5. Filed then Locked Court Ruling.
6. Imported Markdown/notecard-simulation record.
7. Cross-Domain copied record after Bayview exists.
8. `related case` grouped relationship.
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
Commander sees all Warrior folders. First Captain manages First Platoon not Second. Captain grants Varro edit to First Platoon Battle Plans despite no platoon assignment.

### GS-05 Explicit deny
Cassian's direct deny blocks normal Warrior role grant. A more-specific direct Document grant may override a broader direct deny per authorization contract.

### GS-06 Document lifecycle
Draft -> submit -> approve/file -> lock. Pending body frozen. Reject -> Draft with reason/history. Locked edit fails until unlock.

### GS-07 Provenance/versioning
Edit, move, copy, share, supersede. Timeline names actor/time/action. Revisions inspect/restore without losing provenance.

### GS-08 Copy vs Share
Share Marriage License = same ID. Copy = new ID + source provenance + independent edits.

### GS-09 Cross-Domain transfer
Copy works with Type mapping. Destructive Move refused while source Domain flag off.

### GS-10 Form Studio
Department head builds form without CMS terminology. Warrior fills it. Output is Markdown Document; Character fields create links; no raw answer record remains.

### GS-11 Public filtering
Anonymous user sees public only; no private titles/snippets leak through navigation/search/Character pages.

### GS-12 Personal Domain
Character receives independent Community copy. No public/subdomain/role/folder-share controls. Single-document share works.

### GS-13 Backup/restore
Postgres backup -> destroy/replace -> restore -> rerun permissions/provenance acceptance.

### GS-14 Correspondence moderation
GM delivers, delays, intercepts, garbles. Original admin-auditable; recipient sees only approved delivered content. Delay uses original send time.

### GS-15 SL location boundary
Permission + location checked at action start. Authorized edit can save later despite lag/location expiry. Physical presence never bypasses local permission.

### GS-16 LoreForge shell and user-first administration
Signed-out `/` is a branded LoreForge home with embedded customer login and About/Subscriptions/Create Account links; signed-in `/` is the User dashboard. Domain primary navigation remains Home/About/Departments/Records for ordinary and administrative users. An authorized head selects Sera from People and manages Department membership, multiple scoped Roles, and effective Folder access from one Character workspace without navigating raw collection tables.

### GS-17 Unified document creation
From Records, click one `New document` action and reach the full editor. Select a searchable Template/Plain Text option, destination, title, additional Prepared by credits, Concerns Characters, and Tags. The active Character cannot be removed from Prepared by. Plain Text opens WYSIWYG; a form Template opens the form; both create ordinary lifecycle/provenance-bearing Documents.
