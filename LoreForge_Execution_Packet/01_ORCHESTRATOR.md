# LoreForge Ticket Orchestrator

This file is the handoff prompt/protocol for an execution agent receiving a clean context.

## Mission

Advance LoreForge **one reviewed phase at a time** from the completed MVP spike toward the full product shape. Preserve deliberate seams. Do not convert temporary spike shortcuts into permanent architecture, and do not build future infrastructure halfway.

## Kickoff sequence — Phase 1 only

This sequence is retained for historical clean-start reconstruction. The current repository has completed and owner-approved Phases 1–4; current continuation begins with the Phase 5 sequence below.

1. Read `00_START_HERE.md` through `06_CHANGE_CONTROL.md` completely.
2. Read `references/FULL_PRODUCT_SPEC.md` sections 1–3, 24–25, and 27–29 (the source skips section 26).
3. Read `references/SPIKE_MVP_REVIEW.md` and `references/SPIKE_SOURCE_MANIFEST.md`.
4. Inspect the actual checked-out project and compare it to the manifest. Do not assume the snapshot is byte-identical if the owner has made local changes.
5. Run the existing automated test command and record the baseline result. If dependencies are absent, install exactly from the lockfile; do not upgrade.
6. Compare the checked-out commit to `owner-gates/P00_MVP_BASELINE_APPROVAL.md`. STOP if the gate is not approved or the exact commit/tag differs.
7. Preserve/tag the exact approved spike state if it does not already have a clear MVP tag.
8. Create branch `phase-01-editor-theme-safety` from that approved spike baseline.
9. Read `tickets/phase-01/00_PHASE_ORCHESTRATOR.md` completely.
10. Execute, in order:
   - `tickets/phase-01/P01-T01-markdown-dialect-and-render-safety.md`
   - `tickets/phase-01/P01-T02-editor-save-dirty-and-navigation-ux.md`
   - `tickets/phase-01/P01-T03-editor-toolbar-source-roundtrip-and-accessibility.md`
   - `tickets/phase-01/P01-T04-theme-studio-and-domain-language-tuning.md`
   - `tickets/phase-01/P01-GATE-review-gate-1.md`
11. Stop after `P01-GATE`. Return the gate report to the owner. **Do not create a Phase 2 branch.**

## Current continuation — Phase 5

1. Confirm the repository's `execution-notes/P04-GATE.md` is `APPROVED_BY_OWNER` and this packet contains `CC-2026-09-03-03`.
2. Create `phase-05-document-relations-copy-share` from that approved state.
3. Read `tickets/phase-05/00_PHASE_ORCHESTRATOR.md` completely.
4. Execute exactly: `P05-T00`, `P05-T01`, `P05-T02`, `P05-T03`, `P05-T04`, `P05-GATE`.
5. Stop after `P05-GATE`; Phase 6 requires explicit owner approval.

## Ticket loop

For each implementation ticket:

1. Read the entire ticket before editing.
2. Re-read every frozen decision cited by that ticket.
3. Inspect only the relevant current files plus directly coupled tests.
4. Make the smallest coherent change that satisfies the complete ticket.
5. Add/update automated tests required by the ticket.
6. Run targeted tests, then the full suite, then build/typecheck/lint supported by the repository.
7. Perform the ticket's manual acceptance scenario where feasible.
8. Update generated Payload types when schema changes require it.
9. Commit with the exact ticket prefix.
10. Write `execution-notes/<ticket-id>.md` with commit hash, files changed, tests, manual result, and any issue deliberately left for a named later ticket.
11. Begin the next ticket only if the current ticket passes.

## Forbidden orchestrator behavior

- Do not run multiple phases in parallel.
- Do not send several tickets to independent agents against the same branch concurrently.
- Do not allow an executor to select a new framework, database, auth provider, FGA service, search engine, page builder, or SL protocol unless the relevant Owner Gate has been approved.
- Do not “clean up” temporary spike collections before the ticket that replaces them.
- Do not silently resolve contradictions between the packet and source. Use `06_CHANGE_CONTROL.md`.
- Do not continue past a review gate based on your own judgment. Human approval is required.

## Phase branch names

- P01 `phase-01-editor-theme-safety`
- P02 `phase-02-character-context`
- P03 `phase-03-domain-subdomain-structure`
- P04 `phase-04-user-first-shell-document-lifecycle`
- P05 `phase-05-document-relations-copy-share`
- P06 `phase-06-template-form-studio`
- P07 `phase-07-authorization-delegation`
- P08 `phase-08-branding-public-starter-packs`
- P09 `phase-09-personal-domains`
- P10 `phase-10-production-runtime`
- P11 `phase-11-platform-admin-lifecycle`
- P12 `phase-12-search-import-export-scale`
- P13 `phase-13-notifications-watches`
- P14 `phase-14-correspondence`
- P15 `phase-15-second-life-bridge`

Each phase begins only from the owner-approved previous phase state.
