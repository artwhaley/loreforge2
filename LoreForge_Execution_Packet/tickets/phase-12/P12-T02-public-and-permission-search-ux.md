# P12-T02 — Public search and permission-sensitive retrieval UX

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 12  
**Commit prefix:** `P12-T02:`

## Objective
Expose public archive search cleanly and make restricted search behavior unsurprising without leaking hidden records.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-12/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P12-T01

## Frozen context for this ticket
- Anonymous public search is Domain-scoped and only public-readable material.
- Location restrictions are Phase 15; search service must accept future external condition gate at action start but not implement it now.
- Search result relationships/Character pages obey same access rules.

## Required work
1. Add public search route using same search service with anonymous authorization context.
2. Add member search scope affordances for current Subdomain/folder while default remains whole current Domain permitted set.
3. Ensure inaccessible related/superseding Document references render safe placeholders or no link.
4. Add query validation/rate-control baseline appropriate to public endpoint without introducing third-party rate service.
5. UI tune result density/snippets/filter affordances for record-office workflow.

## Likely code touchpoints
- src/app/(public)/**/search/**
- src/components/search/**

## Automated acceptance
- Anonymous query cannot distinguish existence/count of private matching records.
- Member denied folder produces no result leakage.
- Invalid filter IDs from another Domain rejected/ignored safely.
- Public search response bounded/paginated.

## Manual acceptance
- Search same unique private phrase anonymously and as authorized clerk; anonymous result set gives no hint it exists.

## Guardrails / non-goals
- `Do not expose permission-debug explanations to public users.`
- `Do not implement SL location check yet.`
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.
- Forward-patch guardrails (P05R-T07, DEF-SEARCH-01): real pagination with no hard-coded 100-result assumption; permission filtering precedes counts/snippets/facets; no hidden-resource metadata leaks through search.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P12-T02.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
