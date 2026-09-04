# P12-T01 — PostgreSQL-native Domain search and filters

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 12  
**Commit prefix:** `P12-T01:`

## Objective
Deliver scalable, permission-aware archive retrieval without adding an external search service.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-12/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P11-GATE approved

## Frozen context for this ticket
- Primary search scope is exactly one Domain at a time.
- Search covers title/full canonical Markdown plus Type/status/tags/linked Characters/filer/date/folder/Subdomain filters.
- PostgreSQL native full-text search is the approved first implementation; no Elasticsearch/OpenSearch.
- Search results must be filtered by authorization before data/titles/snippets leak.

## Required work
1. Create search document/index strategy using Postgres tsvector/generated/search table compatible with Payload migrations; normalize Markdown to searchable text without indexing hidden source markup unnecessarily.
2. Index title/body and join/filter Type, lifecycle, tags, Character links, filer/date, folder/Subdomain.
3. Build search service requiring Domain + authorization context and returning ranked/paginated results with safe snippets.
4. Build user-facing search/filter UI and empty/loading/error states; preserve filter query in URL.
5. Add index refresh/update hooks for document create/edit/move/tag/link changes and migration backfill.

## Likely code touchpoints
- src/lib/search/**
- src/migrations/**
- src/app/**/search/**

## Automated acceptance
- Fixture terms return expected results and filters compose.
- Private/denied Documents never appear/count/snippet to unauthorized actor.
- Document edit updates search result.
- Search cannot span Domain without explicit future feature.
- Performance smoke on generated corpus size defined in full spec or at least 10k Documents.

## Manual acceptance
- Search Ar as Head Scribe, Warrior, denied Warrior, outsider; compare visibility.
- Search a Character name via structural filter and text body separately.

## Guardrails / non-goals
- `Do not add external search infrastructure.`
- `Do not make global cross-Domain search primary or hidden admin default.`
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.
- Forward-patch guardrails (P05R-T07, DEF-FTS-01, DEF-SEARCH-02): production search is Postgres-native indexed search, not full-roster scans; superseded and soft-deleted Documents are filtered out of active results.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P12-T01.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
