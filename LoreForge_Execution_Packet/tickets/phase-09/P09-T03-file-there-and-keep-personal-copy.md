# P09-T03 — File to Community Domain and keep independent Personal copy

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 9  
**Commit prefix:** `P09-T03:`

## Objective
Implement the attorney/scribe workflow where a Character files a Community record and optionally keeps an independent archival copy.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-09/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P09-T02

## Frozen context for this ticket
- Keep-copy is Copy semantics, never Share/sync.
- Community and Personal copies diverge after creation.
- Personal copy provenance records Community source and source version/time.
- Frozen default: Personal keep-copy may be created Filed while Community record follows its own lifecycle; this is a deliberate convenience copy, not an official mirror.

## Required work
1. Add optional `Keep a copy in my Personal Archive` selection to hand-authored and form/template filing when active Character owns Personal Domain.
2. Allow destination folder selection inside Personal Domain or sensible Inbox default.
3. When keep-copy is selected, create the Community Document and Personal copy in one database transaction using an idempotency key. Pin `sourceDocumentId`, source version ID, canonical body hash, and timestamp in `copied_from`/`copied_to` provenance on both records. If either creation fails, neither commits; preserve form/editor input and show a retryable error. Without keep-copy selected, Community filing remains the ordinary single-record transaction.
4. Render source provenance link subject to current permission; if source inaccessible later show provenance text without leaking protected current data.
5. Add direct Copy-to-Personal on existing Community Documents only when the actor has `read` + `copy_document` on source and `create_document` on destination Personal Folder; guessed IDs use the same server evaluator.

## Likely code touchpoints
- src/lib/documents/copy.ts
- src/app/**/new/**
- src/app/**/documents/**/actions/**

## Automated acceptance
- Community and Personal IDs differ and edits diverge.
- Personal copy remains if Community source is later moved/locked/deleted, preserving source provenance.
- Character without Personal Domain does not see misleading checkbox.
- Unauthorized Community Document cannot be copied through guessed ID.
- Retrying after an ambiguous response creates at most one Community Document and one Personal copy.

## Manual acceptance
- File a Scribe Deed with keep-copy; edit Community original; verify private copy unchanged and provenance readable.
- Copy an existing marriage license to Personal archive.

## Guardrails / non-goals
- `Do not create live linked/synchronized copies.`
- `Do not decide subscription entitlement/pricing.`
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
- `execution-notes/P09-T03.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
