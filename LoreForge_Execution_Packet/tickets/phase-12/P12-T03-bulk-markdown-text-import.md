# P12-T03 — Bulk Markdown/text legacy archive import

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 12  
**Commit prefix:** `P12-T03:`

## Objective
Provide a controlled path for established RP communities to bring years of plain-text/notecard-derived records into LoreForge.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-12/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P12-T02

## Frozen context for this ticket
- Pitch replaces existing folders/notecards; migration tool is a product requirement.
- Import is not Second Life transfer integration; accept files/archive/pasted content through web/operator flow.
- Every imported Document still requires Domain, Folder, Type; default can be Plain Text.
- Import provenance must record original filename/path/source and importer/time.

## Required work
1. Build owner/admin-only import job (and require `create_document` on every mapped destination Folder) accepting `.md`/`.txt` ZIP uploads. Defaults: 100 MiB compressed, 250 MiB uncompressed, 5,000 files, 2 MiB/file, path length 512, depth 32, expansion ratio 100:1; operators may lower but not raise these without change control. Reject symlinks, devices, absolute/drive/UNC paths, traversal, duplicate normalized/case-folded paths, encrypted entries, and unsupported files.
2. Preview tree and map source folders to destination Folder; choose Document Type globally or per branch; default titles from filename with editable preview.
3. Canonicalize Markdown/text; treat raw HTML according to safe dialect; do not execute embedded content.
4. Run import asynchronously with one transaction per file and a durable batch manifest. Successful files remain when other files fail; `(batchId, normalizedPath, contentHash)` is idempotent. A deliberate re-import requires a new batch ID and confirmation.
5. Imported Documents start Draft, use the chosen/default Type and destination policy only when later submitted, and never auto-file because the source file existed.
6. Create provenance per Document with original relative path/file hash/import batch.

## Likely code touchpoints
- src/jobs/importArchive.ts
- src/lib/import/**
- src/app/**/import/**

## Automated acceptance
- Zip-slip/path traversal fixture rejected.
- Mixed good/bad files produce explicit report without losing successful records.
- Rerun same batch warns/blocks duplicate unless user deliberately imports again as new batch.
- Imported Documents searchable after job completion.
- Provenance retains original path/hash.
- Caller lacking owner/admin or destination `create_document` is denied before the job is accepted; imported raw HTML remains inert under the common Markdown contract.

## Manual acceptance
- Import a fixture legacy archive with nested folders, search imported content, inspect provenance and one failure report.

## Guardrails / non-goals
- `Do not invent SL bot import mechanics.`
- `Do not infer structured Characters/tags from prose automatically.`
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
- `execution-notes/P12-T03.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
