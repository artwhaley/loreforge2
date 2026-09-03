# P05-GATE execution note

**Status: implementation complete; owner manual acceptance remains open.** This note records the automated evidence and the exact browser scenarios required to close Review Gate 5. No self-approval is recorded here.

## Delivered commits

- `d8b1bf1` — P05-T00 corrected Role, Department, and Folder assignment model.
- `2b0fd91` — P05-T01 Character links and Domain Tags.
- `253d504` — P05-T02 Grouped and Supersedes relationships.
- `c149d40` — P05-T03 Copy and Move semantics.
- `c38493f` — P05-T04 Share and consolidated Document Actions.
- `aa9a2a9` — P05-T04 follow-up hardening: strict Character-authored creation context, form/import/copy identity checks, independent Folder search, and cleanup of Domain-local shares during cross-Domain Move.

## Automated evidence

- `npm test` — **64 passed, 0 failed**.
- `npx tsc --noEmit` — **passed**.
- `npm run build` — **passed**; all Phase 5 routes compile, including links, tags, relationships, Copy/Move, Share, and Character workspace routes.
- `PAYLOAD_PUSH=false npm run migrate:phase5` — **passed**; no legacy `SubdomainMembership` table remained and role migration is idempotent.
- `PAYLOAD_PUSH=false npm run seed` — **passed**; fixture reconciliation completed without duplicate document creation.
- Public smoke check while running the dev server: `/`, `/about`, `/subscriptions`, and `/create-account` returned HTTP 200; legacy `/domain/ar/subdomains` redirected to `/domain/ar/departments`.

## Manual owner gate

Run the server with `npm run dev` (the script pins `PAYLOAD_PUSH=false`) and open `http://localhost:3055/`. Sign in on the Loreforge home page with the seeded admin account (`admin@example.test` / `test-password-123`). Use the top context bar to choose **Ar** and an acting Character controlled by that account (for example **Lucan**). The top bar's **Domain** and **Acting as** controls remain available on every branded Domain page.

### 1. Corrected Character workspace

1. Select **People** in the management bar, or open `/domain/ar/manage/people`.
2. Type `Sera` into **Find a Character**. Select the result shown beneath the search field; do not use a raw collection/admin page.
3. In Sera's workspace, leave **Held roles** selected and record the current roles. Switch to **Roles I can assign**, check one Scribe role, and confirm the inline checkbox returns to the workspace.
4. In **Folder access**, search `Deeds`. Change Read and Write independently and press that row's **Save** button. Confirm the Role list and role-assignment count are unchanged.
5. Use **Remove from Domain**, then add Sera back. Confirm Domain membership is Active after re-add but no prior Department participation, Role, or direct Folder override returns.

### 2. Character links, tags, and provenance

1. Open **Records → New document** (`/domain/ar/records/new`) with an active participating Character selected in the top bar.
2. Create an Incident Report. The active Character must remain checked and marked required under **Prepared by**; add another preparer, add controlled/unclaimed Characters under **Concerns**, enter a relationship label, and add a new tag.
3. Open the created record. Verify Prepared by, Concerns, Tags, and the History/provenance actor are separate concepts. The required Prepared by credit must not offer a working Remove action.

### 3. Grouped and Supersedes

1. Create three disposable deed records for one property.
2. On the newest deed, add a **Supersedes** relationship to the middle deed; on the middle deed, add one to the oldest. Confirm both records render the directional chain and none disappears.
3. Attempt a cycle and a second direct successor; both must be rejected.
4. Add a **Grouped** relationship with label `amendment`; verify the label appears from either endpoint. A blank Grouped label must be rejected.

### 4. Share versus Copy

1. On a disposable Filed record, use **Share existing record** and choose a seeded Character/User recipient. Select Read, then inspect the recipient view: it must be the same Document ID and revision stream. Revoke it and confirm the active share disappears while History remains.
2. Use **Create independent copy**. Confirm the copy has a different ID and starts Draft; edit the copy and verify the source is unchanged. The copy must not inherit source relationships, approvals, locks, soft-delete state, or Domain-local permission rules.

### 5. Cross-Domain Move

1. Create or use a disposable Community Domain named **P05 Test Destination** (do not use the reserved Bayview fixture for this gate). Ensure it has a root Folder and an active Plain Text Document Type.
2. Attempt a cross-Domain Move while the source Domain's `allowCrossDomainMove` flag is disabled. It must fail and leave the source ID, Domain, Folder, and history unchanged.
3. As the source owner, enable the flag through the Domain settings/admin surface. Retry with the explicit confirmation checkbox. Verify the same Document ID and full history now appear in the destination; Type maps by exact active name or destination Plain Text fallback, Tags map by case-insensitive exact name and unmatched Tags are dropped, Character links and relationships remain, and old Domain-local shares do not carry over.
4. Inspect History/provenance on the moved record and confirm the source retains a non-content audit pointer.

## Deferred by contract

- Final effective Folder inheritance/precedence and delegated role/capability evaluation remain P07 work. The Character workspace labels direct Folder summaries as provisional.
- Template-directed filing and the unified Template/Form chooser remain P06 work.
- Bayview starter-pack regression is intentionally deferred to P08, where the pack is installed and GS-09 is rerun.

**Gate decision:** owner/reviewer must record Pass, Fail, or exact remediation notes after the scenarios above. Stop here until that decision is explicit; do not begin Phase 6 from this note.
