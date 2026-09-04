# P05-T02 — Superseding document chains

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 5  
**Commit prefix:** `P05-T02:`

## Objective
Implement the single approved document relationship: a linear superseding chain with useful history behavior.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-05/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P05-T01

## Frozen context for this ticket
- `supersedes` is directional and first-class; it models historical succession such as repeated property deeds.
- Before P07, relationship mutations are ownerUser/operational-DomainAdmin only through `authorizeInterimOperation`; final authorization requires `edit_document` on both endpoints and never grants read through the relationship.

## Required work
1. Add DocumentRelationship model with kind `supersedes`, source Document, target Document, actor/timestamp.
2. For supersedes, source means newer Document supersedes target older Document; render a prominent successor link on the old record and a predecessor link on the new record.
3. Prevent cycles in the supersedes graph and enforce at most one direct predecessor and one direct successor. Replacing/correcting a relationship is an explicit audited remove+add operation.
4. When a supersedes edge is created, lock the older Document and record that lock and relationship in provenance.

## Likely code touchpoints
- src/collections/DocumentRelationships.ts
- src/lib/documents/relationships.ts
- src/app/**/documents/**/relationships/**

## Automated acceptance
- Supersedes chain A<-B<-C renders current/historical sequence correctly.
- Cycle attempt C superseded-by A is rejected.
- A second direct predecessor or successor is rejected, while the audited correction path records both removal and addition on affected Documents.
- Relationship access never grants read access to an otherwise unreadable related Document.

## Manual acceptance
- Create three deeds for one property and supersede them in order; older deeds clearly lead to current deed without disappearing.
- Open an older superseded record and verify the prominent hyperlink names the newer title, date, and Prepared by Character.

## Guardrails / non-goals
- Do not delete or hide superseded Documents; they remain readable and locked.
- `Do not expose inaccessible related Document titles/body beyond safe placeholder semantics.`
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
- `execution-notes/P05-T02.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
