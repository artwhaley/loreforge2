# P04-GATE review report

## Status

`APPROVED_BY_OWNER` — the owner accepted Phase 4 on 2026-09-03 after the closeout corrections recorded below.

## Ordered implementation commits

- `19382c7` — P04-T00 Loreforge home/login/dashboard
- `6742ecb` — P04-T05 one-Domain context and customer navigation
- `0d2fdf5` — P04-T06 Departments, People, and full-page record entry
- `77fae28` — P04-T01 Document Types and lifecycle policy
- `ea9d4ba` — P04-T02 revisions, edit guards, history, restore
- `3d3265b` — P04-T03 provenance collection and timeline
- `74e0fdf`, `9f349b3`, `5a55e0c` — P04-T04 workflow, soft delete/restore, and direct-API lifecycle guard
- `cbf4813` — P04-GATE direct Document/revision read boundary hardening
- `96b76e9` — P04-GATE owner-requested branding and workflow closeout corrections
- `fdf50aa` — P04-GATE customer-visible Department vocabulary enforcement

## Automated evidence

- `npm test`: 59 passed, 0 failed.
- `npx tsc --noEmit`: passed.
- `npm run build` with `PAYLOAD_PUSH=false`: passed; all customer and legacy compatibility routes compiled, including `/domain/[slug]/review` and `/domain/[slug]/documents/[id]/history`.
- HTTP smoke: signed-out `/`, `/about`, `/subscriptions`, `/create-account` returned 200; authenticated admin after selecting `ar` returned 200 for Domain Home, Departments, Records, and Review Queue. An officer forged lifecycle PATCH against a Filed record was rejected by the server hook (HTTP 500 fail-closed; no state change).
- Closeout HTTP smoke: authenticated dashboard exposes its Character selector directly; Records groups New document with Import notecard; the management strip has no redundant Domain label and no Review link; Document actions no longer expose an admin-only Review Queue shortcut.

## Schema/migration delta from the Phase 3 spike

- Added `document_types` (Domain, name, active, default folder, template/default filing policy) and seeded one active Plain Text type per Domain.
- Added required Document `document_type`, `source_kind`, `lifecycle`, and `public_access`; added nullable `soft_deleted_at`/`soft_deleted_by`; enabled unlimited Payload versions (`_documents_v`). Existing Markdown bodies are preserved and seed backfills required values.
- Added Domain `default_filing_policy` and Folder `filing_policy` for deterministic Template > Folder > Document Type > Domain resolution.
- Added append-only `document_provenance_events` (Domain, Document, actor User/Character, event type, occurred timestamp, context, revision ID, source descriptor). Seed creates an idempotent origin event for existing Domain Documents.
- No destructive Document delete path remains in normal application code; soft delete/restore retains the same ID, versions, and events.

## Owner acceptance

The owner completed the Phase 4 browser review and explicitly accepted the phase after requesting these final workflow corrections:

- the Loreforge dashboard exposes the Character selector directly;
- New document and Import notecard are adjacent because both create Records;
- the capability-driven management strip contains only useful destinations, with no redundant “Manage [Domain]” label;
- Review is not presented as administration. The temporary Review Queue route and lifecycle machinery remain available for later Inbox integration, but management navigation and the admin-only Document shortcut no longer expose it.
- the remaining customer-facing Subdomain labels were corrected to Department while internal compatibility names were preserved;
- source and rendered-token checks confirmed Loreforge platform branding did not change or leak into the Ar Domain theme.

No unresolved P0/P1 blocker remains for Phase 4. Phase 5 is authorized but has not begun.
