# LoreForge Execution Packet — Review Findings (Big Pickle)

**Reviewer:** Big Pickle (clean-context expert review agent)
**Date:** 2026-09-02
**Scope:** `LoreForge_Execution_Packet` at packet handoff, per `REVIEW_AGENT_BRIEF.md`
**Read order:** `00_START_HERE.md` → `01_ORCHESTRATOR.md` → `02_FROZEN_PRODUCT_DECISIONS.md` → `03_ARCHITECTURE_CONTRACT.md` → `04_SPIKE_BASELINE.md` → `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md` → `06_CHANGE_CONTROL.md` → `07_TICKET_INDEX.md` → `08_EXECUTOR_KICKOFF_PROMPT.md` → `09_REVIEW_KICKOFF_PROMPT.md` → `10_PACKET_MANIFEST.md` → `REVIEW_AGENT_BRIEF.md` → `references/FULL_PRODUCT_SPEC.md` (full) + `references/SPIKE_MVP_REVIEW.md` + `references/SPIKE_SOURCE_MANIFEST.md` → Phase 1 tickets in full → sampled tickets across every later phase → every `Pxx-GATE` inspected → `owner-gates/*` + `tools/validate_packet.py`
**Validator:** `python tools/validate_packet.py` on this (win32) host **crashes**: `UnicodeDecodeError: 'charmap' codec can't decode byte 0x9d in position 3579` at `tools/validate_packet.py:164`, traces to the bare `Path.read_text()` calls at lines 135/164/169 (locale cp1252 vs UTF-8 packet). With `$env:PYTHONUTF8="1"` the structural validator reports **PACKET VALIDATION: PASS** — 79 ticket files (64 implementation/design + 15 review gates), 15 phases, references complete. The crash is a tooling portability defect (Minor-1), not packet-logic.

**Verdict: ready to begin Phase 1 only.** No BLOCKER. Two IMPORTANT findings concern the Phase 2–7 authorization seam and must be patched before Phase 2 begins (and the P07 growth before Phase 7); neither touches Phase 1. MINOR patches recommended before handoff. Phase 2+ remains owner-gated per `00_START_HERE.md:40`, `01_ORCHESTRATOR.md:70`, `06_CHANGE_CONTROL.md`.

> Finding format per `REVIEW_AGENT_BRIEF.md:58-64`: **BLOCKER** = cannot safely execute; **IMPORTANT** = likely ambiguity/bug/data leak, patch before phase; **MINOR** = clarity/test improvement. Each entry: file/ticket, exact evidence, why it matters, concrete patch preserving `02`/`03` owner decisions.

---

## BLOCKER

None.

## IMPORTANT — likely ambiguity/bug/data leak; patch before phase

### I1 — "Temporary development authority" is never defined; executor must invent pre-P07 authorization

**Files/tickets:**
- `tickets/phase-02/P02-T04-character-claims-public-profiles-and-local-aliasing.md` line 28
- `tickets/phase-03/P03-T04-role-hierarchy-and-scoped-assignments.md` line 31
- `tickets/phase-04/P04-T04-review-approval-locking-and-soft-delete.md` line 29
- `tickets/phase-05/P05-T04-document-sharing-and-action-ux.md` lines 22–24 (share gating before `share_document` exists)

**Exact evidence:**
- `P02-T04:28` — "Add CharacterClaimRequests state machine and request/approve/reject UI **using temporary development authority until P07**."
- `P03-T04:31` — "Build customer role hierarchy/assignment UI **under temporary admin authority**."
- `P04-T04:29` — "review queue scoped to authorized Domain/Subdomain/folder actors **using temporary admin checks that are replaced by P07 evaluator** without changing workflow APIs."
- `P05-T04:22-24` — "Share is a Document-specific permission exception; P07 will replace/complete the evaluator but the stored rule shape must already match `03_ARCHITECTURE_CONTRACT.md`." — no statement of *who may share* during Phase 5; the `share_document` capability exists only from P07-T01.
- `02_FROZEN_PRODUCT_DECISIONS.md:20` — "an **authorized** Domain actor approves/rejects ordinary claims."
- `references/FULL_PRODUCT_SPEC.md:447` — "A **suitable authorized** Domain user who has local knowledge of that Character may approve/reject the claim."

Grep for `temporary` across `tickets/` returns exactly the three lines above (P02-T04, P03-T04, P04-T04) plus P10-T01's "SQLite was deliberately temporary" — no definition of who the temporary authority is, what scope it holds, or when it is removed.

**Why it matters:** Roles/RoleAssignments, claim approval, review approval, and Share are security-relevant customer-facing workflows built in P02–P06. With no defined authority a lower-context executor either (a) invents a product decision the owner froze, or (b) defaults to the spike's legacy User-Membership admin path (`04_SPIKE_BASELINE.md:61` — `src/lib/tenant/*` temporary scope helpers), producing exactly the "accidental hardening of spike-era User-Membership admin/member schema" that `09_REVIEW_KICKOFF_PROMPT.md` and `REVIEW_AGENT_BRIEF.md` warn against. P05 Share additionally ships ungated against anything (anyone who can open a Document can share it) for two phases.

**Patch (preserves frozen decisions; no new product role):** Append one bullet to the **Frozen context** of each of P02-T04, P03-T04, P04-T04, and P05-T04:

> Temporary development authority until Phase 7 is a discrete, recorded, non-product role — not a hardened spike-tenant backdoor. In P02 it is the Domain-owning fixture User; from P03 onward it is the Domain Owner User / operational Domain admin (as introduced by P03-T01) acting through the customer UI with the relevant acting Character. Every decision made under this authority is written to execution-notes, is audited with the same audit fields as permanent actions, and is fully replaced by the P07 evaluator without changing workflow APIs. No additional admin-only surface or capability is built for it. P05 Share is permitted only for a principal holding `edit_document` on the shared Document.

Add a matching cross-reference in `00_ORCHESTRATOR.md` / `00_PHASE_ORCHESTRATOR.md` (P02–P06) so the rule is discoverable where the executor looks first, plus an acceptance line on each ticket: "Every temporary-authority action produces an audit record; no legacy User-Membership grant path is introduced."

### I2 — Claim approval is bound to no capability, and `CharacterClaimRequests` is missing from the P07 wiring

**Files/tickets:**
- `03_ARCHITECTURE_CONTRACT.md` lines 90–98 and 227–230
- `tickets/phase-07/P07-T01-authorization-rule-model-and-evaluator.md` line 32
- `tickets/phase-07/P07-T02-server-and-payload-enforcement.md` line 29
- `02_FROZEN_PRODUCT_DECISIONS.md:20`; `references/FULL_PRODUCT_SPEC.md` §5.4 (lines 435–449)

**Exact evidence:**
- The stable capability vocabulary in `03_ARCHITECTURE_CONTRACT.md:228` and the "complete Phase-7 capability vocabulary" in `P07-T01:32` (`read, create_document, …, manage_members, assign_roles, manage_subdomain, manage_domain_appearance`) contain **no claim-approval capability**.
- `P07-T02:29` wires the evaluator into "Documents, Folders, Document Types, Templates, Tags, Document Character links, Document Relationships, Characters/DomainCharacterContexts, Domain/Subdomain memberships, Subdomains, Roles/RoleAssignments, and PermissionRules" — **`CharacterClaimRequests` is absent** from the list.
- `03_ARCHITECTURE_CONTRACT.md:90-98` (`character-claim-requests`) defines the model and "Approval only while Character is unclaimed. Approved claim sets `controlledBy`" but assigns no capability, principal tier, or scope.
- Frozen decision `02:20` and `FULL_PRODUCT_SPEC:447` say only "an authorized Domain actor / a suitable authorized Domain user with local knowledge," and `FULL_PRODUCT_SPEC:449` explicitly prohibits platform staff adjudicating ordinary claims — nothing maps to the evaluator.

**Why it matters:** Claim approval controls `controlledBy` — the single binding between a Character (the product's RP principal) and a User — a security-critical, effectively-global write. With I1 the pre-P07 authority is undefined; after P07 the situation is worse: once the evaluator goes live there is **no rule at all** governing the approval path, unless the executor adds an ad-hoc capability that contradicts the frozen vocabulary. The workflow persists post-P07 (Phase 13 projects and notifies "Character claim approved/rejected": `P13-T01:28`, `P13-T02:30`), so the gap is live, not theoretical.

**Patch (decision-preserving):**
- `03_ARCHITECTURE_CONTRACT.md:228`: append `manage_claims` to the capability list with semantics "approve/reject Character claim requests within the Domain where the claim is filed; approve only while the Character remains unclaimed."
- `P07-T01:32`: add `manage_claims` to the Phase-7 vocabulary (fold out of the "later phases may add…" sentence since it resolves in-phase).
- `P07-T02:29`: add `CharacterClaimRequests` to the wired list, with the server-side check that the decider holds `manage_claims` on the claim's Domain and the Character is still unclaimed; add acceptance "Approver without `manage_claims` cannot approve via direct API; concurrent approves cannot double-bind `controlledBy`."
- Tie the I1 temporary authority to this capability at replacement time so P02–P06 behavior and P07 enforcement are continuous.

---

## MINOR — clarity/test improvement

### M1 — `tools/validate_packet.py` crashes on Windows; three bare `read_text()` calls

**File:** `tools/validate_packet.py` lines 135, 164, 169 (vs the correct `encoding="utf-8"` at line 66).

**Evidence:** Reproduced on this host — `python tools/validate_packet.py` dies with `UnicodeDecodeError: 'charmap' codec can't decode byte 0x9d in position 3579` while reading `02_FROZEN_PRODUCT_DECISIONS.md` (cp1252 locale default). Runs clean with `PYTHONUTF8=1`. The kickoff (`09_REVIEW_KICKOFF_PROMPT.md:9`) mandates running this validator first, and `00_START_HERE` instructs not to begin on a FAIL — a crash traceback blocks that gate on the documented dev platform.

**Patch:** add `encoding="utf-8"` to the `read_text()` calls at lines 135, 164, 169.

### M2 — 12 of 15 review gates have an empty "Automated acceptance" section, and the validator does not check it

**Files:** `P04-GATE` … `P15-GATE` (empirically confirmed: P01-, P02-, P03-GATE have non-empty Automated acceptance; P04–P15 are all empty). `tools/validate_packet.py:84` flags only *missing* sections (`section(...) is None`); the emptiness guard at line 104 applies to Manual acceptance only.

**Evidence:** e.g. `P05-GATE:37-39` — `## Automated acceptance` is followed by nothing. The validator's "code-paths-only" heuristic (lines 100–103) silently passes empty content.

**Why it matters:** The affected gates include the hard security gate P07 and close-out gates P10–P15; an empty Automated acceptance section makes the "gates are hard stops with acceptance criteria" invariant untestable by tooling and visibly weakens gate rigor versus P01–P03.

**Patch:** fill each of the 12 gates' "Automated acceptance" with a one-line mechanical criterion already implied by its Manual acceptance (e.g. "All Phase N automated tests pass; `<phase invariant>` holds"), and add a validator check treating an empty **or** missing "Automated acceptance" as an error.

---

## Verified consistent (no finding)

Checked against the `REVIEW_AGENT_BRIEF.md` required questions and found correct — no patch needed:

- **Copy/Move/Share/Supersedes/Supersedes group** unambiguous and mutually consistent across `P05-T02`/`T03`/`T04` and Architecture §8 (`03` lines 180–210); cross-Domain move defaults disabled via `allowCrossDomainMove` (`03:114`), Type mapping exact-name with Plain Text fallback.
- **Character vs User authority** — Character is the RP principal; Domain ownership/admin is User-level (`P03-T01:25`, `P03-T02:25`, `P07-T05`); Personal Domain is Character-rooted (`P09-T01`, `03:106-108`) with per-Character uniqueness and no folder sharing.
- **Deterministic precedence** — direct grant/deny vs Role vs membership tiers frozen in `03:235-249` and implemented as a single evaluator (`P07-T01`); server-side enforcement plus list/search filtering (`P07-T02`, `P12-T01/T02`) with no client-trusted "current role."
- **Same Captain Role / scoped branches** (`P03-T04:32` → `P07-T03`) and multi-role Characters — consistent; delegation limited to possessed authority/scope (`P07-T05`, `02:38`, `03:252-256`).
- **Revisions vs provenance distinct and preserved**; later tickets (P04 → P10 migration → P12 import/export) do not destroy earlier history promises; global Character merge is Platform-Admin-only with tombstone, conflict blocks, and audit (`P11-T03`), and P02-T04's merge placeholder correctly defers mutation to P11.
- **No generic CMS / page builder / raw CSS / alt-linking / recursive tenant creep** anywhere; `Raw HTML is **not** a supported feature` (`03:153`); theme/vocabulary are constrained (P08-T01/P08-T04), Form Studio is neutral-schema and discards raw answers (`P06-T02`/`T03`/`T04`, `02:50`).
- **Provider / SL choices Owner-Gated and deferred** — `P10-T05`, `P11-T04`, `P15-T00` correctly STOP on owner-gates; SL bridge is a separate process, never evaluates or stores permissions (`P15-T01`, `03:401-405`); `moderate_correspondence` correctly anticipated as a later-added capability (`P14-T02:29` vs `P07-T01:32`).
- **Dependency ordering** — all 79 tickets carry prerequisites; no forward dependencies (validator-confirmed); gates are hard stops listing every phase ticket.
- **Payload Admin** kept out of customer-critical authoring (`P07-T02:28` explicit Payload bypass prevention; `P06` Form Studio is customer-facing, neutral schema).

## Infrastructure & dependencies

- **Speaking gate posture:** `owner-gates/P10_DEPLOYMENT_DECISIONS.md` and `owner-gates/P15_SL_PROTOCOL_APPROVAL.md` are not filled/approved — correctly blocking by design (`P10-GATE:27`, `P10-T05:61`, `P15-GATE:26`). Executor must STOP and record `BLOCKED-*.md` per `06_CHANGE_CONTROL.md:C`; may prepare factual comparison but may not select providers/protocol.
- **Search:** PostgreSQL-native, no external search service (`P12-T01`); permission-aware filtering aligns with I2/I1 seam discipline.
- **Backup/restore vs owner export correctly separated:** `P10-T03` (operational) vs `P12-T04` (product portability); provider-neutral until owner gate.

## What to fix first (minimal diffs, preserve frozen decisions)

1. `tools/validate_packet.py:135,164,169` → `read_text(encoding="utf-8")` (M1); add empty-section check (M2).
2. Patch `P02-T04`/`P03-T04`/`P04-T04`/`P05-T04` Frozen context with the temporary-authority rule from I1.
3. Add `manage_claims` to `03:228`, `P07-T01:32`, and `CharacterClaimRequests` to `P07-T02:29` wiring (I2).
4. Fill the 12 empty gate "Automated acceptance" sections (M2).
5. Re-run `python tools/validate_packet.py` — must PASS.

---

*Review agent stance: no redesign; all patches above are the smallest change closing a defined authority gap, a security seam, or a tooling/clarity defect while preserving `00_START_HERE.md:40` Phase 1-only authorization, `01_ORCHESTRATOR.md` one-phase-at-a-time protocol, and the frozen decisions in `02`/`03`.*