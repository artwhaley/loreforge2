# P05-T03 — Document Copy and Move semantics

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 5  
**Commit prefix:** `P05-T03:`

## Objective
Implement independent copying and canonical moving exactly as frozen, including cross-Domain behavior and provenance.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-05/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P05-T02

## Frozen context for this ticket
- Copy creates a genuinely independent new Document ID. Later edits never propagate.
- Copy provenance permanently records source Document, source Domain, source version/hash, actor, and copy time.
- Move preserves the same Document ID/history. Cross-Domain destructive move is disabled by default and requires explicit Domain policy + confirmation.
- Cross-Domain type mapping: exact same-name Type if present, otherwise destination `Plain Text` Type.
- Community copies start Draft; Personal keep-copy behavior is P09 and may request Filed.
- Before P07, Copy/Move is ownerUser/operational-DomainAdmin only through `authorizeInterimOperation`; P07 replaces it with the exact capability matrix.

## Required work
1. Implement copy service for same-Domain and cross-Domain destinations using the exact Architecture Contract matrix: copy title/body and global Character links; set creator/acting Character to the actor and source kind `copy`; never copy approvals/locks/soft-delete state, PermissionRules, revision history, or DocumentRelationships. Same-Domain copies retain Tags; cross-Domain Tags map by case-insensitive exact name and unmatched Tags are shown then dropped. Community copies start Draft.
2. Implement same-Domain move between folders with same ID and provenance.
3. Add Domain `allowCrossDomainMove` default false; implement cross-Domain move with explicit confirmation and the operation matrix: `move_document` on source plus `create_document` on destination Folder, active-write lifecycle in both Domains, and policy flag enabled.
4. On cross-Domain move/copy, map Type and Tags by the frozen rules. Move retains the same ID, full revisions/provenance, global Character links, and DocumentRelationships; related titles/bodies remain permission-filtered. The source Domain retains a non-content audit pointer to the destination. Show every mapping/drop before confirmation.
5. Build clear Copy vs Move UI and success navigation.

## Likely code touchpoints
- src/lib/documents/copy.ts
- src/lib/documents/move.ts
- src/collections/Domains.ts

## Automated acceptance
- Copy gets new ID and independent edit/version stream.
- Copy provenance includes immutable source pointer/version hash even if source later changes.
- Cross-Domain move fails when setting disabled.
- Cross-Domain move retains same Document ID and original provenance/history.
- Type fallback to Plain Text is deterministic.
- Copy/move authorization tests cover source and destination independently; move preserves relationships safely and copy never clones them.

## Manual acceptance
- Create a disposable `P05 Test Destination` Community Domain solely for this phase (do not use reserved `Bayview` fixture names). Copy a Filed deed there, edit copy, verify source unchanged. Re-run GS-09 against the installed Bayview fixture in P08.
- Attempt cross-Domain move disabled, enable as owner, move with confirmation, verify same ID/history and destination type mapping.

## Guardrails / non-goals
- `Do not silently copy Domain-local permission rules to another Domain.`
- `Do not treat a move as delete+new-copy.`
- `Do not invent automatic metadata field mappings.`
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
- `execution-notes/P05-T03.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
