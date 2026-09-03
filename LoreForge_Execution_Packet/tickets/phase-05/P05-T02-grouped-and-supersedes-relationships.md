# P05-T02 — Grouped and Supersedes document relationships

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 5  
**Commit prefix:** `P05-T02:`

## Objective
Implement exactly the two frozen semantic relationship classes with useful history behavior.

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
- `grouped` is generic/symmetric and carries a human-entered label such as amendment, supporting evidence, related case.
- `supersedes` is directional and first-class; it models historical succession such as repeated property deeds.
- Do not turn human labels into hard-coded relationship subclasses.
- Before P07, relationship mutations are ownerUser/operational-DomainAdmin only through `authorizeInterimOperation`; final authorization requires `edit_document` on both endpoints and never grants read through the relationship.

## Required work
1. Add DocumentRelationship model with kind `grouped|supersedes`, source Document, target Document, **required nonblank label for grouped**, actor/timestamp.
2. For grouped relationships, present both directions equivalently while storing one canonical row; reject self-links and exact duplicates.
3. For supersedes, source means newer Document supersedes target older Document; render chain/history in both old and new documents.
4. Prevent cycles in supersedes graph within the connected chain and enforce at most one direct superseding successor for any older Document. Replacing/correcting that successor is an explicit audited remove+add operation.
5. Record add/remove relationship provenance on affected Documents.

## Likely code touchpoints
- src/collections/DocumentRelationships.ts
- src/lib/documents/relationships.ts
- src/app/**/documents/**/relationships/**

## Automated acceptance
- Grouped relation is discoverable from both Documents and preserves label.
- Supersedes chain A<-B<-C renders current/historical sequence correctly.
- Cycle attempt C superseded-by A is rejected.
- Grouped relation without a nonblank label is rejected; a second direct successor is rejected, while the audited correction path records both removal and addition on affected Documents.
- Relationship access never grants read access to an otherwise unreadable related Document.

## Manual acceptance
- Create three deeds for one property and supersede them in order; older deeds clearly lead to current deed without disappearing.
- Create a grouped `amendment` link and verify the custom label is shown.

## Guardrails / non-goals
- `Do not auto-lock or auto-void superseded Documents unless a later explicit product decision says so.`
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
