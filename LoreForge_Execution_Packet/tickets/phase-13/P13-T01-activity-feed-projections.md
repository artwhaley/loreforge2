# P13-T01 — Domain/Department activity feed projections

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 13  
**Commit prefix:** `P13-T01:`

## Objective
Create human-friendly Domain/Department activity views from authoritative provenance/audit events without turning feed entries into a second truth source.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-13/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P13-T00

## Frozen context for this ticket
- Audit/provenance is authoritative; Activity feed is a projection.
- Not every provenance event is notification-worthy.
- Domain/Subdomain feed visibility follows ability to see referenced resources.
- Domain notices are authored content from P13-T00. Their publish/update/archive audit events may project into activity, while the active notice card reads the notice model; do not copy notice bodies into activity rows.

## Required work
1. Define one typed projection adapter over authoritative DocumentProvenanceEvent, Character claim/context audit, Role/Permission audit, Domain structure/ownership audit, DomainNotice publication audit, and PlatformAuditEvent sources. Use stable `(sourceCollection, sourceEventId)` identity and the exact allowlist: Document filed/lifecycle/moved/shared/share-revoked/relationship added-removed; Character claim approved-rejected/local alias correction; Role assignment-revocation; explicit access grant-deny-revocation; Department/folder create-rename; Domain ownership/admin change; Domain notice published/updated/archived. Do not project ordinary body edits, notice drafts, page views, searches, or every audit event; store no activity rows.
2. Hydrate the existing User dashboard, selected-Domain Home, and Department landing activity areas with pagination/filtering and permission-aware redaction. Deduplicate the same Domain notice/event for Users controlling several Characters in one Domain.
3. Link activity to resource when reader can access it; otherwise omit rather than leak.
4. Add projection unit tests so later events can be opted in explicitly.

## Likely code touchpoints
- src/lib/activity/**
- src/app/**/activity/**

## Automated acceptance
- Feed derived from existing provenance/audit fixtures without extra state writes.
- Private event omitted for unauthorized actor.
- Same event appears in relevant Domain/Subdomain feed only once.
- Identical numeric IDs from two source collections do not collide; a source event with no registered projection is absent by default.
- Active notice cards and notice activity entries use stable identities and never duplicate or expose draft/expired content.

## Manual acceptance
- Compare Head Scribe and Warrior activity feed on mixed private/public events.

## Guardrails / non-goals
- `Do not emit notifications yet.`
- `Do not add every audit event automatically.`
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
- `execution-notes/P13-T01.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
