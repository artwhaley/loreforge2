# LoreForge Execution Packet Manifest

**Packet date:** 2026-09-02  
**Purpose:** clean-context review and phase-gated implementation handoff from the completed MVP spike to the full LoreForge product.

## Counts
- 15 implementation phases after the completed spike.
- 84 individual ticket files.
- 69 implementation/design tickets.
- 15 mandatory human review gates.
- 15 phase orchestrators plus the master orchestrator.
- 10 spike/spec/decision reference artifacts (includes the P07-D01 Document Sharing decision brief added by P05R-T00).

## Root control documents
- `00_START_HERE.md` — authority/read order and immediate Phase 1 boundary.
- `01_ORCHESTRATOR.md` — master execution protocol.
- `02_FROZEN_PRODUCT_DECISIONS.md` — owner decisions executors may not reinterpret.
- `03_ARCHITECTURE_CONTRACT.md` — closed technical/data behavior, including authorization precedence and correspondence state semantics.
- `04_SPIKE_BASELINE.md` — what the MVP proved vs what is temporary.
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md` — stable actors/records/golden scenarios.
- `06_CHANGE_CONTROL.md` — conflict handling; stop rather than improvise.
- `07_TICKET_INDEX.md` — all tickets, branches, and owner gates.
- `08_EXECUTOR_KICKOFF_PROMPT.md` — clean-context executor prompt.
- `09_REVIEW_KICKOFF_PROMPT.md` — clean-context review prompt.
- `REVIEW_AGENT_BRIEF.md` — reviewer mission/checklist.
- `11_DEFERRED_WORK_REGISTER.md` — permanent register of deliberately deferred work, each row with a reason and a named owning ticket/path (added by P05R-T00).

## References
- `references/P07P_DATABASE_ACCESS_PATCH.md` — owner-requested Phase 7
  performance patch specification, six ordered work units. Implementation and
  automated verification are recorded in the repository-root
  `execution-notes/P07P-01.md` through `execution-notes/P07P-06.md`; the owner
  browser/release gate remains open. This is an additive reference beyond the
  original reference-count snapshot.
- `references/FULL_PRODUCT_SPEC.md` — detailed full-product intent and phased roadmap.
- `references/STALE_LOREFORGE_FUNCTIONAL_SPEC.md` — historical requirements mine only; superseded when it conflicts with frozen decisions.
- `references/sl-civic-archive-mvp-source.zip` — exact submitted MVP spike source.
- `references/SPIKE_SOURCE_MANIFEST.md` — per-file hashes of that source archive.
- `references/SPIKE_MVP_REVIEW.md` — original executor's end-of-spike findings.
- `references/SPIKE_README.md` — original runnable-spike notes.
- `references/SPIKE_ORIGINAL_*` — the build packet that produced the spike.
- `references/P07-D01-DOCUMENT-SHARING-DECISION.md` — owner decision brief for the deferred Document Sharing workflow (CC-2026-09-03-04); decision required before P07-GATE closes.
- `../LoreForge_P07X_Execution_Packet/` (repository root, outside this packet) — owner-directed corrective extension between Phase 7 and Phase 8: acting identity, Document-Type workflows, invitations, and Work surfaces (CC-P07X-2026-09-04).

## Deliberate owner-only gates
- `owner-gates/P00_MVP_BASELINE_APPROVAL.md` — Phase 1 cannot start until the exact source revision is approved.
- `owner-gates/P10_DEPLOYMENT_DECISIONS.md` — no execution agent chooses production providers.
- `owner-gates/P11_BILLING_DECISIONS.md` — pricing/entitlement/provider decisions remain owner-controlled.
- `owner-gates/P15_SL_PROTOCOL_APPROVAL.md` — Second Life protocol design must be reviewed before bridge implementation.

## Integrity
- Run `python tools/validate_packet.py` before use.
- `SHA256SUMS.txt` hashes every authoritative packet file except itself.
- `review findings/` is non-authoritative review working material, deliberately excluded from the manifest, executor read order, and checksums. Its accepted changes are incorporated into the authoritative files.
- Phase 1 is the first eligible phase, but requires the approved P00 baseline gate; every later phase gate is also a hard stop.
