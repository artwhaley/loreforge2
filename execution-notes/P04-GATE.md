# P04-GATE review report

## Status

`PENDING_OWNER_REVIEW` — implementation and automated checks are complete; this gate is not self-approved.

## Ordered implementation commits

- `19382c7` — P04-T00 Loreforge home/login/dashboard
- `6742ecb` — P04-T05 one-Domain context and customer navigation
- `0d2fdf5` — P04-T06 Departments, People, and full-page record entry
- `77fae28` — P04-T01 Document Types and lifecycle policy
- `ea9d4ba` — P04-T02 revisions, edit guards, history, restore
- `3d3265b` — P04-T03 provenance collection and timeline
- `74e0fdf`, `9f349b3`, `5a55e0c` — P04-T04 workflow, soft delete/restore, and direct-API lifecycle guard
- `cbf4813` — P04-GATE direct Document/revision read boundary hardening

## Automated evidence

- `npm test`: 59 passed, 0 failed.
- `npx tsc --noEmit`: passed.
- `npm run build` with `PAYLOAD_PUSH=false`: passed; all customer and legacy compatibility routes compiled, including `/domain/[slug]/review` and `/domain/[slug]/documents/[id]/history`.
- HTTP smoke: signed-out `/`, `/about`, `/subscriptions`, `/create-account` returned 200; authenticated admin after selecting `ar` returned 200 for Domain Home, Departments, Records, and Review Queue. An officer forged lifecycle PATCH against a Filed record was rejected by the server hook (HTTP 500 fail-closed; no state change).

## Schema/migration delta from the Phase 3 spike

- Added `document_types` (Domain, name, active, default folder, template/default filing policy) and seeded one active Plain Text type per Domain.
- Added required Document `document_type`, `source_kind`, `lifecycle`, and `public_access`; added nullable `soft_deleted_at`/`soft_deleted_by`; enabled unlimited Payload versions (`_documents_v`). Existing Markdown bodies are preserved and seed backfills required values.
- Added Domain `default_filing_policy` and Folder `filing_policy` for deterministic Template > Folder > Document Type > Domain resolution.
- Added append-only `document_provenance_events` (Domain, Document, actor User/Character, event type, occurred timestamp, context, revision ID, source descriptor). Seed creates an idempotent origin event for existing Domain Documents.
- No destructive Document delete path remains in normal application code; soft delete/restore retains the same ID, versions, and events.

## Human-only acceptance still required

The owner/reviewer must verify the clerk workflow in the running browser:

1. Signed out at `/`: Loreforge branding, embedded customer login, About/Subscriptions/Create account links. Log in with `admin@example.test` / `test-password-123`; select `Ar` in the single Domain selector and confirm the acting Character selector is separate. Confirm there is no Administration mode or second Domain selector, and the account menu exposes logout.
2. In `Ar`, verify stable Home/About/Departments/Records navigation and the conditional Manage bar. Open People, select a Character, and confirm Departments/Roles are managed from that Character workspace; ordinary members do not see management links.
3. Open Records → New document. Choose Plain Text, enter a title/body, create, and verify the record opens in the editor with a lifecycle badge. Edit and save once; open History and verify a revision plus a readable timeline entry.
4. Set a Domain Type to review-required (or use the review-required fixture if present), create a record, and verify it is Pending Review and body controls are read-only. As the supervisor, use Review to approve; separately reject another record with a note and confirm it returns to Draft and becomes editable.
5. From a Filed record, Lock then verify body/title editing is blocked; Unlock and verify editing resumes. Open History and preview an older revision; restore it and confirm the revision count grows and the restored body is current.
6. Soft-delete a record, confirm it disappears from Records/search, open its direct History URL, restore it, and verify the same record ID and prior timeline remain.

Any ambiguity or P0/P1 defect found in those checks must remain a gate blocker rather than being silently resolved in a later phase. Stop after this report; Phase 5 requires explicit owner approval.
