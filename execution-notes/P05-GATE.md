# P05-GATE execution note

**Status: implementation complete; owner manual acceptance remains open.** This note records the automated evidence and the exact browser scenarios required to close Review Gate 5. No self-approval is recorded here.

## Delivered commits

- `c10ca00` — owner correction: document-first view, bottom Share action, superseding creation with prefilled content and locking, removal of Copy/Move/Grouped, and updated packet rules.

- `d8b1bf1` — P05-T00 corrected Role, Department, and Folder assignment model.
- `2b0fd91` — P05-T01 Character links and Domain Tags.
- `253d504` — P05-T02 Supersedes relationships.
- `c38493f` — P05-T04 Share and consolidated Document Actions.
- `4615a9d` — P05-T01 follow-up: fix the Character workspace checkbox boundary, make Acting-as/Prepared-by optional, and replace the Concerns checkbox list with any-Character search/chips and unlinked Character creation.

## Automated evidence

- `npm test` — **62 passed, 0 failed** after retiring the Copy/Move tests.
- `npx tsc --noEmit` — **passed**.
- `npm run build` — **passed**; all Phase 5 routes compile, including links, tags, supersedes relationships, Share, and Character workspace routes.
- `PAYLOAD_PUSH=false npm run migrate:phase5` — **passed**; no legacy `SubdomainMembership` table remained and role migration is idempotent.
- `PAYLOAD_PUSH=false npm run seed` — **passed**; fixture reconciliation completed without duplicate document creation.
- Public smoke check while running the dev server: `/`, `/about`, `/subscriptions`, and `/create-account` returned HTTP 200; legacy `/domain/ar/subdomains` redirected to `/domain/ar/departments`.

## Manual owner gate

Run the server with `npm run dev` (the script pins `PAYLOAD_PUSH=false`) and open `http://localhost:3055/`. Sign in on the Loreforge home page with the seeded admin account (`admin@example.test` / `test-password-123`). Use the top context bar to choose **Ar** and an acting Character controlled by that account (**Lucan** or **Elara**; both are seeded as active Ar members). The top bar's **Domain** and **Acting as** controls remain available on every branded Domain page. If no Character is selected, document creation is still allowed for this Domain Owner, but there will be no Prepared by credit.

### 1. Corrected Character workspace

1. Select **People** in the management bar, or open `/domain/ar/manage/people`.
2. Type `Sera` into **Find a Character**. Select the result shown beneath the search field; do not use a raw collection/admin page.
3. Confirm the header shows Sera's large Domain-local name with the controlling account/Unclaimed status in small right-aligned text, and that **Remove from Domain** is immediately below it. The old Overview copy, History section, and in-page section navigation must be absent.
4. In **Roles**, confirm each Department is a collapsible drawer and nested Roles line up hierarchically. Collapse and reopen a Department, expand a nested Role branch, search for a Role, and switch between **All roles** and **Held only**. Check one Role and confirm the assignment posts without a Server Component runtime error.
5. In **Folder access**, confirm the file-explorer tree has collapsible folders, a search field, and independent Read/Write checkboxes. Inherited permissions appear checked and muted; clicking one creates an explicit Allow or Deny state. Save a row and confirm the Role tree is unchanged.
6. Use **Remove from Domain**, then verify the Character workspace is no longer reachable and the member cleanup behavior remains intact when the Character is re-added.

### 2. Character links, tags, and provenance

1. Open **Records → New document** (`/domain/ar/records/new`). Choose a Document Type, enter a Title and body, and leave Destination at **Domain Root** or choose a Folder. The top-bar **Acting as** selector is optional; if a Character is selected it appears as an automatic, non-editable **Prepared by** credit, and if no Character is selected the document can still be created without that credit. If you arrive here before selecting a Character, use the **Acting as** selector in the page header; the switch is in-place and returns to this exact editor without clearing entered fields. It only returns to `/` when the selected Character is not an active member of the current Domain.
2. Create an Incident Report. Under **Concerns**, search for any Character, add several chips, and give each chip its own relationship (`perp`, `victim`, `witness`). Also type a name that does not exist and choose **Add as a new unlinked Character**.
3. Open the created record. Verify Prepared by (when selected), Concerns, Tags, and the History/provenance actor are separate concepts. The automatic Prepared by credit must not offer a working Remove action; newly created concern Characters must have no Domain/Role membership.

### 3. Superseding chains

1. Create three disposable deed records for one property.
2. On the newest deed, use **Create superseding document**. Confirm the new-document page pre-fills the title, body, and Concerns and appends the italic supersession note.
3. Create the next superseding version. Confirm the older record is locked and shows a prominent **Document superseded by** link naming the new title, date, and Prepared by Character.
4. Attempt a cycle or a second direct predecessor/successor; both must be rejected.

### 4. Share and document-view hierarchy

1. Open a record and confirm the page begins with the title, a single Prepared by/Date line, a Concerns box, and the rendered document text. There is no Document actions explainer, Shared with panel, Copy control, Move control, or cross-Domain mapping preview.
2. Confirm **Share record** is at the bottom of the page. Share and revoke behavior remains the same Document ID/revision stream and preserves History.

## Deferred by contract

- Final effective Folder inheritance/precedence and delegated role/capability evaluation remain P07 work. The Character workspace labels direct Folder summaries as provisional.
- Template-directed filing and the unified Template/Form chooser remain P06 work.
- Bayview starter-pack regression is intentionally deferred to P08, where the pack is installed and GS-09 is rerun.

**Gate decision:** owner/reviewer must record Pass, Fail, or exact remediation notes after the scenarios above. Stop here until that decision is explicit; do not begin Phase 6 from this note.
