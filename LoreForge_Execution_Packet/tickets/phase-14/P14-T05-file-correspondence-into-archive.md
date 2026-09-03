# P14-T05 — File correspondence into archive and integrate notifications

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 14  
**Commit prefix:** `P14-T05:`

## Objective
Allow authorized roleplayers to intentionally preserve a correspondence record as a normal Document without collapsing the two systems.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-14/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P14-T04

## Frozen context for this ticket
- Correspondence is not a Document by default.
- `File in archive` creates a new independent Document/Copy-like record with provenance linking source correspondence.
- Filed content should reflect the actor's authorized view; special moderator audit original must not leak accidentally.
- Notifications may signal delivered correspondence but inbox content remains correspondence UI.

## Required work
1. Add File-to-Archive action. Eligible filer must be the sender, recipient, or a Character/User with `moderate_correspondence`; in every case the filer must also have `create_document` on the chosen destination Folder. Allow choosing destination Folder and active Document Type/Template; default to the destination Domain's Plain Text Type/blank Template when no richer Template is chosen.
2. Generate canonical Markdown representation with sender/recipient/sent/delivered metadata appropriate to filer view and provenance pointer to Correspondence ID.
3. Create new Document with normal lifecycle policy and independent future edits.
4. On delivery, create one body-free summary/link notification only for the recipient Character's current controlling User, if any. Sender status remains in Sent, moderators use their queue, and an unclaimed recipient produces no User notification. Avoid duplicating message body in Notification.
5. Show filed Document link from correspondence only to actors who can read it.

## Likely code touchpoints
- src/lib/correspondence/fileToArchive.ts
- src/lib/notifications/**

## Automated acceptance
- Filing creates new Document ID and does not mutate correspondence.
- Recipient filing garbled letter cannot access original through resulting Document.
- Document lifecycle/review policy applies normally.
- Notification contains no secret full body.
- Delivery retry is idempotent and cannot notify a former controller, sender, or moderator as recipient.

## Manual acceptance
- File an immediately delivered letter and a garbled letter; inspect resulting Documents/provenance from recipient perspective.

## Guardrails / non-goals
- `Do not make every correspondence automatically an archive Document.`
- `Do not synchronize later Document edits back into message.`
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P14-T05.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
