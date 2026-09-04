# LoreForge Execution Packet — START HERE

**Packet status:** authoritative execution breakdown derived from the 2026-09-02 full product specification, the completed MVP spike, and owner-approved change `CC-2026-09-02-01` establishing the user-first customer shell before Phase 4.

This packet exists because the full roadmap is too large to hand to an execution agent as one prompt. **Do not execute the roadmap as a marathon.** Tickets are intentionally bounded, committed separately, and separated by mandatory human review gates.

## What is authoritative

Read these in order before touching code:

1. `00_START_HERE.md` — this file.
2. `01_ORCHESTRATOR.md` — execution protocol and the only authorized kickoff sequence.
3. `02_FROZEN_PRODUCT_DECISIONS.md` — product decisions that executors may not reinterpret.
4. `03_ARCHITECTURE_CONTRACT.md` — technical/data-model decisions that executors may not redesign on their own.
5. `04_SPIKE_BASELINE.md` — what the completed MVP actually proved, and what remains temporary.
6. `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md` — stable cast, records, and cross-phase test scenarios.
7. `06_CHANGE_CONTROL.md` — what to do if code reality conflicts with a ticket.
8. `07_TICKET_INDEX.md` — complete phase/ticket map and owner-gate locations.
9. The current phase `00_PHASE_ORCHESTRATOR.md`.
10. The current phase ticket files only.

`references/FULL_PRODUCT_SPEC.md` is the detailed source specification. It is authoritative where this packet does not narrow it. If a ticket and the full product spec appear to conflict, **stop and report the conflict; do not choose one silently.**

## Packet integrity check

Before review or execution, run:

```bash
python tools/validate_packet.py
```

Do not begin work if it reports FAIL. The validator checks exact byte hashes for every authoritative file, ticket count/structure, nonempty acceptance sections, index/dependency references, hard review gates, required references, and the known section-shift packaging failure. `review findings/` is explicitly non-authoritative and excluded from hashes.

## Current continuation instruction

Phases 1–4 have been executed and owner-approved in the working repository. Confirm `execution-notes/P04-GATE.md` records `APPROVED_BY_OWNER` and that the checked-out source includes changes `CC-2026-09-02-01` and `CC-2026-09-03-02`; do not restart completed phases from the original spike.

> **Phase 5 — Archive Relationships, Tags, Character Links, Supersedes/Share**

Continue on `phase-05-document-supersession-and-sharing`, which includes the completed Phase 5 implementation and owner-requested corrections. `P05-T00`, `P05-T01`, `P05-T02`, and `P05-T04` are implemented; `P05-T03` is retired. The current step is owner validation of `P05-GATE`, using `execution-notes/P05-GATE.md` in the repository. Do not restart completed tickets or create a branch from an older Phase 4 snapshot. **Stop at the gate.** Do not begin Phase 6 until the project owner explicitly approves Review Gate 5.

The original P00/Phase 1 kickoff remains historical evidence of how the project began; it is not the current continuation point.

## Repository discipline

- Verify the checked-out commit matches the P00 approval, then preserve/tag that exact MVP baseline before Phase 1 changes.
- One phase branch at a time. Suggested Phase 1 branch: `phase-01-editor-theme-safety`.
- One commit per implementation ticket. Use commit prefix matching the ticket ID, e.g. `P01-T01:`.
- Review-gate tickets do not add speculative features. They run acceptance, document findings, and stop.
- Do not squash ticket commits before the phase review unless the owner explicitly asks.
- Never mix “while I am here” dependency upgrades, broad formatting, schema cleanup, provider setup, or unrelated refactors into a ticket.

## Executor behavior

The executor is expected to implement, not redesign.

When a decision is specified here, **use it** even if another design would also work. Do not ask a lesser agent to choose architecture, invent abstractions, or “future-proof” outside the ticket.

Only stop for clarification when one of these is true:

- the checked-out source materially contradicts the documented spike baseline;
- a frozen decision is impossible with the actual library/runtime version;
- completing the ticket would require changing a frozen product decision;
- credentials, a provider choice, or a Second Life mechanism is explicitly marked as an Owner Gate.

Normal implementation details, naming within the stated model, and routine bug fixes are not reasons to stop.
