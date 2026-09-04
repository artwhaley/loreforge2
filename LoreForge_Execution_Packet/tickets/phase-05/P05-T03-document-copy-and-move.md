# P05-T03 — Retired: Document Copy and Move

**Mode:** RETIRED BY OWNER
**Phase:** 5
**Commit prefix:** `P05-T03:`

## Decision

Documents are not copied or moved between Domains. A future correspondence feature may send a document as a message without transferring the canonical record. No customer-facing Copy, Move, cross-Domain mapping preview, or Domain-transfer action is approved.

## Objective

Record the owner's retirement of the former Copy/Move ticket so later execution cannot reintroduce those operations.

## Required pre-read

- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-05/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on

None. This ticket is a retired no-op retained for packet traceability.

## Frozen context for this ticket

- Supersedes is the only approved Document relationship in Phase 5.
- Cross-Domain delivery may be added later as correspondence/messaging, never as canonical record transfer.

## Required work

None. Do not implement this ticket or restore its former acceptance scenarios.

## Likely code touchpoints

- Inspect current adjacent files; no implementation is authorized.

## Automated acceptance

- Packet validation recognizes this ticket as a retired no-op with no Copy/Move implementation requirement.
- The active application path contains no Copy, Move, transfer, or cross-Domain mapping action for Documents.

## Manual acceptance

- Review the Document view and confirm no Copy, Move, transfer, or cross-Domain mapping control appears.
- Confirm the Phase 5 gate does not ask the owner to test a transfer operation.

## Guardrails / non-goals

- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket.
- Commit this ticket separately if the retired status itself is recorded in a phase commit.
- Do not implement Copy, Move, or transfer behavior under this ticket.

## Completion handoff

- Record the retired status in `execution-notes/P05-T03.md`.
- Ensure any stale active instruction mentioning Copy, Move, or transfer is updated before execution continues.
