# Clean-Context Review Agent Brief

Use this file if the packet is handed to a separate review agent **before execution**.

## Mission
Audit the packet for contradictions, missing implementation decisions, unsafe seams, dependency-order errors, or tickets that require a lower-context executor to invent product behavior.

Do **not** redesign LoreForge or suggest fashionable alternatives without a concrete problem.

## Read
1. `00_START_HERE.md`
2. `01_ORCHESTRATOR.md`
3. `02_FROZEN_PRODUCT_DECISIONS.md`
4. `03_ARCHITECTURE_CONTRACT.md`
5. `04_SPIKE_BASELINE.md`
6. `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
7. `06_CHANGE_CONTROL.md`
8. `07_TICKET_INDEX.md`, `08_EXECUTOR_KICKOFF_PROMPT.md`, `09_REVIEW_KICKOFF_PROMPT.md`, and `10_PACKET_MANIFEST.md`.
9. Every `owner-gates/*` file and every phase `00_PHASE_ORCHESTRATOR.md`.
10. `references/FULL_PRODUCT_SPEC.md`, `references/SPIKE_MVP_REVIEW.md`, and `references/SPIKE_SOURCE_MANIFEST.md`.
11. Every ticket and review gate in full; sampling is not a packet-wide review.
12. Inspect `references/sl-civic-archive-mvp-source.zip` when source-level verification is relevant; at minimum verify its hash and the baseline claims targeted by Phase 1.

## Required questions

### Product fidelity
- Any generic CMS/page builder/raw form storage/alt-linking/recursive tenant creep?
- Any permission/membership accidentally moved from Character to User?
- Owner/User operational authority vs Character roleplay authority consistent?
- Personal Domain Character-rooted and folder-sharing forbidden?

### Data integrity
- Revisions and provenance distinct/preserved?
- Copy, Move, Share, Supersedes unambiguous?
- Later ticket destroys history promised earlier?
- Global Character merge Platform Admin only?

### Authorization
- Deterministic direct grant/deny vs Role vs membership precedence?
- Same Captain Role supports different scoped branches?
- Delegation limited to possessed authority/scope?
- API/search/public paths share server authorization boundary?

### UX
- High-risk customer workflows receive actual tuning/review?
- Payload Admin kept out of final customer-critical authoring?
- Editor/form/theme choices resolved before deeper dependencies?

### Infrastructure
- No Postgres/cloud half-build before P10?
- Provider choices Owner Gates, not executor choices?
- SL bridge isolated?

### Dependencies
- Tickets have prerequisites?
- Any future feature assumed early?
- Gates are hard stops?

## Finding format
Use only:
- **BLOCKER** — cannot safely execute.
- **IMPORTANT** — likely ambiguity/bug/data leak; patch before phase.
- **MINOR** — clarity/test improvement.

For each: file/ticket, exact evidence, why it matters, concrete patch preserving frozen decisions.

If no important issues exist, say: **ready to begin Phase 1 only**. Do not authorize later phases.
