# P12-T04 — Whole-Domain owner export

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 12  
**Commit prefix:** `P12-T04:`

## Objective
Give Community Domain Owner a portable archive of their data without pretending it is a raw database backup.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-12/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P12-T03

## Frozen context for this ticket
- Owner export is product portability, distinct from operational DB backup.
- Export should include Documents/Markdown, metadata, folders, Characters/links, Types/Templates/tags/relationships/provenance and attachments/media later where owned/permitted.
- Only Community Domain Owner and Platform Admin may request full export.
- Exact format should be documented/versioned and human-accessible where possible.
- Phase 12 full export is Community-Domain-only, matching the product spec. Personal Domain portability is a future owner decision; do not silently expose it through Community owner authorization.

## Required work
1. Define a versioned LoreForge Domain Export manifest with JSON metadata and Markdown files in a stable folder tree. Include Domain/Subdomains/folders; all Documents including soft-deleted and every retained revision/provenance event; Types/Templates/form schemas; Tags/relationships/Character links; Roles/assignments/PermissionRules/memberships; Domain-local Character contexts; public Pages/theme/vocabulary/policy; and Domain-owned media bytes/checksums. Global Characters/Users and cross-Domain targets are pointer/projection records only; never export auth secrets, password/session data, or unrelated account fields.
2. At request, require current Community owner or Platform Admin. Generate from one consistent database snapshot and record its timestamp/revision boundary. Re-check current requester authorization before download; ownership loss revokes download. Future Domain-owned collections must register an export adapter before release.
3. Include README/schema version in archive and make no claim that archive is direct database restore.
4. Provide owner request/status/download UI with expiring protected download artifact.
5. Add fixture parser/validator test that exported archive is internally consistent.

## Likely code touchpoints
- src/jobs/exportDomain.ts
- src/lib/export/**
- src/app/**/domain-settings/export/**

## Automated acceptance
- Non-owner Domain admin cannot request full export.
- Export contains canonical Markdown and relationship/Character/provenance references.
- Checksum/manifest validates.
- Private data download requires requester authorization and expires.
- Snapshot remains internally consistent while writes occur; soft-deleted records and earliest retained revisions are present, and no User secrets/cross-Domain bodies are included.

## Manual acceptance
- Export Ar, inspect files manually, locate a deed Markdown and its provenance/reference metadata.

## Guardrails / non-goals
- `Do not expose cross-Domain data linked by reference unless it belongs to exporting Domain; include external pointer metadata only.`
- `Do not substitute pg_dump for product export.`
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
- `execution-notes/P12-T04.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
