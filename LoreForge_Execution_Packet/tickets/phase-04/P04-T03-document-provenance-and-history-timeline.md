# P04-T03 — Document provenance events and unified history timeline

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 4  
**Commit prefix:** `P04-T03:`

## Objective
Create the authoritative per-Document provenance record and user-facing timeline for meaningful state changes.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-04/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P04-T02

## Frozen context for this ticket
- Provenance belongs to the Document domain model, not generic application logs.
- Every meaningful mutation records actor, timestamp, action, target/context, and relevant before/after references.
- Revision events should link to the corresponding Payload revision where possible.
- History must support future external actors/sources such as Second Life bridge events without requiring an SL runtime now.

## Required work
1. Add append-only DocumentProvenanceEvent collection/table with Document, Domain, actor User/Character as applicable, event type, timestamp, structured context JSON, optional revision ID, optional source descriptor.
2. Create a single provenance-writing service used by document create/edit/file/lock/unlock/move/copy/share/relationship paths as those paths come online.
3. Backfill/create events for current create/edit/lifecycle operations.
4. Build a chronological Document History panel that renders human-readable event summaries and links edit events to revision previews.
5. Prevent normal application mutations/deletes of provenance events; Platform Admin repair tooling is later and must itself be audited.

## Likely code touchpoints
- src/collections/DocumentProvenanceEvents.ts
- src/lib/documents/provenance.ts
- src/app/**/documents/**/history/**

## Automated acceptance
- Tests prove create/edit/file/lock/unlock each append expected events with actor and timestamp.
- Tests prove a failed transaction does not leave a misleading provenance event.
- Tests prove normal Domain actors cannot update/delete provenance rows.
- Timeline ordering is deterministic when timestamps tie (stable ID/sequence fallback).

## Manual acceptance
- Walk a document from Draft through edit, Filed, edit, Locked, unlock; verify one coherent timeline and revision links.
- Verify timeline language is useful to a clerk, not raw JSON/event codes.

## Guardrails / non-goals
- `Do not log every page view or keystroke as provenance.`
- `Do not build Domain-wide activity feed yet; P13 projects from authoritative events.`
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
- `execution-notes/P04-T03.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
