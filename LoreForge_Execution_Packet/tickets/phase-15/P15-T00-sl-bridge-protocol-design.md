# P15-T00 — Second Life bridge protocol design packet

**Mode:** DESIGN TICKET — OWNER GATE  
**Phase:** 15  
**Commit prefix:** `P15-T00:`

## Objective
Freeze the core<->bridge API and identity/location/notecard transfer contracts before any LibreMetaverse process is written.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-15/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P14-GATE approved

## Frozen context for this ticket
- Second Life integration is a separate process/service, likely LibreMetaverse, never embedded in core web server.
- Exact mechanism was deliberately deferred until this phase; a lesser agent MAY NOT invent it and proceed without owner approval.
- One LoreForge User maps to at most one SL avatar/account and vice versa; LoreForge does not verify/manage alt relationships.
- Location checks are action-start gates only and additive to local permissions.
- Core server authorizes before bridge delivers an in-world resource.

## Required work
1. Read full product decisions and current core APIs; inventory exact SL operations needed: identity verification, location assertion, notecard ingest/export/delivery, stable resource links.
2. Write protocol proposal: authenticated bridge identity/service credentials, request IDs/idempotency, core->bridge commands, bridge->core events, failure/retry semantics, provenance fields, trust boundaries.
3. Specify avatar UUID/name binding without alt linkage.
4. Specify location assertion payload and freshness semantics for Domain/Subdomain/Folder access-start checks.
5. Specify edit-session format/storage and approved binding fields (User, controlled active Character, Document, starting version), 8-hour/first-save/explicit-close lifetime, replay prevention, logout/Character-switch behavior, optimistic conflict handling, and local body preservation on expiry.
6. Specify notecard transfer provenance round-trip and what LibreMetaverse/bot can/cannot attest to; mark unknown SL capability questions for owner/domain expert review rather than guessing.
7. Record the protocol proposal path, Git commit, and SHA-256 in `owner-gates/P15_SL_PROTOCOL_APPROVAL.md`; approval applies only to that exact artifact revision.

## Likely code touchpoints
- docs/integrations/second-life/PROTOCOL_PROPOSAL.md

## Automated acceptance
- Protocol proposal covers all operations and failure/idempotency cases at conceptual/API level.
- No SL runtime dependency added to core server.
- No implementation ticket begins until owner gate approval.

## Manual acceptance
- Owner reviews proposal using their SL domain knowledge and corrects protocol/capability assumptions.

## Guardrails / non-goals
- `Do not implement bridge code in this ticket.`
- `Do not search/guess undocumented SL behavior as fact; flag unknowns.`
- `Do not model multiple SL avatars per User.`
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.

## Owner decision dependency

After this ticket, STOP. The owner must complete/approve `owner-gates/P15_SL_PROTOCOL_APPROVAL.md`. P15-T01 and later are unauthorized until then.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P15-T00.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
