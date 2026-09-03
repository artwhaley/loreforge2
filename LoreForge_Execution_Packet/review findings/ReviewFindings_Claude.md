# LoreForge Execution Packet — Review Findings

**Reviewer:** Independent review agent (clean-context, per `09_REVIEW_KICKOFF_PROMPT.md` / `REVIEW_AGENT_BRIEF.md`)
**Artifact reviewed:** `LoreForge_Execution_Packet_2026-09-02.zip`
**Review date:** 2026-09-02
**Scope:** Full packet — all root control docs, all 79 ticket files (64 implementation tickets + 15 review gates across 15 phases), both spec references, all 3 owner-gates, `tools/validate_packet.py`, and a source-level spot-check against `references/sl-civic-archive-mvp-source.zip`.

---

## Validation status

- `python tools/validate_packet.py` → **PASS**. Note: this validator is purely structural (file/section presence, ticket counts, dependency-order resolution, standard-guardrail boilerplate, a few critical-phrase greps). It does **not** check semantic/product-logic consistency — that is this report's job.
- `sha256sum -c SHA256SUMS.txt` → all files verified, no drift/tampering.
- Spot-checked `04_SPIKE_BASELINE.md`'s specific technical claims against the actual spike source zip (the unsanitized `marked.parse()` call in `src/lib/markdown/render.ts`, exact package versions, `Documents`/`Folders`/`Tenants`/`Memberships` collection shapes) — **all claims verified accurate.**

## Overall assessment

This packet is unusually disciplined and internally consistent. Cross-checked areas that were explicitly in scope — Copy/Move/Share/Supersedes semantics, User-vs-Character authority split, authorization precedence/delegation, correspondence state machine, SL service boundary, and phase/gate sequencing (no ticket depends on a future-phase ticket) — held up under scrutiny. **No BLOCKER-level issue was found.** Two IMPORTANT gaps and one MINOR clarity issue were found; all three are patchable without touching any frozen product decision.

---

## Findings

### IMPORTANT — 1. Global Character-merge-request schema is invented in Phase 2, defined in Phase 11

**File/ticket:** `tickets/phase-02/P02-T04-character-claims-public-profiles-and-local-aliasing.md` (Required work #5) vs. `tickets/phase-11/P11-T03-global-character-merge-queue.md` (Required work #1) vs. `03_ARCHITECTURE_CONTRACT.md` §6.

**Evidence:**
- P02-T04 required work #5: *"Add global merge request placeholder/queue record only; mutation waits P11."* — no field list given.
- `03_ARCHITECTURE_CONTRACT.md` §6 (the frozen collection list) has no `character-merge-request(s)` model at all — it only defines `characters.status: active|inactive|merged` and `mergedInto`.
- The real shape only appears in P11-T03: *"Add global merge request queue with source Character, target survivor, requesting Domain/actor, evidence/note."*

**Why it matters:** Every other pre-P07 ticket that introduces an incomplete structure either gives an exact field list, or explicitly defers the persisted-schema question with language tying the interim shape to the eventual one (e.g., P05-T04's PermissionRule: *"match frozen principal/resource/action/effect shape so P07 extends it rather than migrates it"*). P02-T04 does neither — it asks a low-context Phase-2 executor to create a persisted "placeholder/queue record" with zero fields specified, nine phases before the real schema is defined. Outcome risk: the executor invents fields that don't match P11-T03's `source/survivor/requestingDomain/actor/evidence` shape, forcing a migration; or under-builds it and P11-T03 silently redoes the work. This is exactly the "leaves a product/architecture decision to the executor" failure mode the review brief calls out.

**Suggested patch (either, preserves frozen "merge is Platform-Admin-only, permanently audited" decision):**
- (a) Add the merge-request collection to `03_ARCHITECTURE_CONTRACT.md` §6 now, with P11-T03's fields (`sourceCharacter`, `targetSurvivorCharacter` nullable, `requestingDomain`, `requestingActor`, `evidenceNote`, `status: pending`, audit timestamps), so P02-T04 and P11-T03 build the same collection; or
- (b) Strike work item 5 from P02-T04 entirely; Domain actors requesting a global merge see only a "contact Platform Admin" UI affordance with no persisted row, and all schema/creation work is deferred wholesale to P11-T03.

---

### IMPORTANT — 2. Phase 6 (Templates/Form Studio) drops the "temporary authority until P07" convention used everywhere else pre-authorization

**File/ticket:** `tickets/phase-06/P06-T01-template-model-scope-and-composition.md`, `P06-T03-customer-form-studio.md`, `P06-T04-form-document-creation.md`.

**Evidence:** Every other pre-P07 ticket that gates an action behind "authorized" names the interim mechanism explicitly:
- P02-T04: *"using temporary development authority until P07"*
- P03-T04: *"under temporary admin authority"*
- P04-T04: *"using temporary admin checks that are replaced by P07 evaluator without changing workflow APIs"*
- P05-T04: PermissionRule shape *"must already match Architecture Contract... so P07 extends it rather than migrates it"*

Phase 6, by contrast, never names an interim mechanism:
- P06-T01: template chooser resolution — no authority check named.
- P06-T03: *"Build Form Studio for **authorized template managers**"* — "authorized" undefined pre-P07.
- P06-T04: character field *"permits **authorized** create-unclaimed Character inline"* — same gap.

**Why it matters:** P06-GATE's own stated objective calls Form Studio *"the authoring shortcut most likely to determine whether nontechnical roleplayers can use LoreForge"* — i.e., explicitly one of the highest-stakes UX surfaces in the roadmap, and one of only two phases (with P05) that write to permission-gated paths before the real evaluator (P07) exists. Dropping the interim-authority framing here — after four consecutive phases of consistently calling it out — leaves the executor to invent who can create/edit Templates and who can create unclaimed Characters via a form, with no guidance on whether that check must be replaceable "without changing workflow APIs" (P04-T04's explicit non-negotiable) or can be freely reworked at P07. Risk: an insecure interim gate (e.g., "any logged-in user is a template manager"), or throwaway work P07-T02 has to unwind.

**Suggested patch:** Add to P06-T01/T03/T04's "Frozen context" section the same sentence pattern used in P04-T04: template-management/form-creation authorization in this phase must use **temporary Domain-admin-level checks that P07-T02 replaces without changing the underlying workflow APIs**, and template-manager/filer eligibility must be expressed via the same eventual PermissionRule/Role concepts already scaffolded in P03/P05 — not a bespoke check.

---

### MINOR — 3. Cross-Domain Copy/Move acceptance in P05-T03 predates the only documented second-Domain fixture

**File/ticket:** `tickets/phase-05/P05-T03-document-copy-and-move.md` (manual acceptance) vs. `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md` vs. `tickets/phase-08/P08-T04-modern-pack-and-public-character-pages.md`.

**Evidence:** `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md` names exactly one contrasting fixture Domain, `Bayview`, explicitly marked "used later," and required-record item 7 states "Cross-Domain copied record **after Bayview exists**." `Bayview` is only actually created in Phase 8 (via the Modern City starter pack, P08-T04). But P05-T03's manual acceptance already requires copying/moving a document "to another Community Domain" — three phases before Bayview exists.

**Why it matters:** Not a contradiction of any frozen decision, but genuinely ambiguous whether the executor should fabricate an unnamed, un-cast second Domain purely for P05 acceptance (risking an ad hoc fixture that later collides with or duplicates Bayview's intended role), or treat this acceptance step as deferred/re-verified later. The ticket doesn't say.

**Suggested patch:** Add to P05-T03's manual acceptance: "Use a minimal, unnamed second Community Domain created solely for this acceptance step (not the reserved `Bayview` fixture name); re-run this scenario against the real `Bayview` Domain once P08-T04 creates it, as GS-09 requires." This preserves the fixture-cast stability rule in `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md` ("do not casually rename the cast") while unblocking Phase 5 acceptance.

---

## Areas explicitly checked and found consistent (no findings)

For synthesis purposes, the following review-brief checklist items were checked in depth and produced **no issues**:

- Product fidelity: no generic-CMS/page-builder creep; no Character-authority accidentally moved to User; Owner/User operational authority vs. Character roleplay authority kept separate and consistent throughout; Personal Domain is Character-rooted with folder-sharing forbidden and enforced (P09-T01/T02).
- Data integrity: revisions vs. provenance kept distinct (P04-T02 vs. P04-T03); Copy/Move/Share/Supersedes semantics unambiguous and identical across `02_FROZEN_PRODUCT_DECISIONS.md`, `03_ARCHITECTURE_CONTRACT.md` §10, and P05-T02/T03/T04; no later ticket destroys history promised earlier (soft-delete, merge tombstones, lifecycle states all preserve history); global Character merge is Platform-Admin-only end to end (mutation gated to P11-T03).
- Authorization: precedence rules (direct > Role > membership; most-specific resource wins; deny wins ties) are stated once in `03_ARCHITECTURE_CONTRACT.md` §7 and applied identically in every dependent ticket (P07-T01 through T05); the same Role title correctly supports different scoped branches (Captain/First Platoon vs. Second Platoon); delegation is provably bounded to possessed authority/scope (P07-T05); API/search/public paths are required to share one server-side authorization boundary (P07-T02, P12-T01/T02).
- UX: Payload Admin is explicitly kept out of customer-critical authoring paths (P07-T02); editor/theme decisions are resolved and gated (Phase 1) before the Character/permissions backend is built on top of them.
- Infrastructure: no Postgres/Redis/Elasticsearch appears before Phase 10/12 (verified by grep across all pre-P10 tickets); all owner-only provider/pricing/SL-protocol decisions are correctly routed through `owner-gates/` and never chosen by an executor.
- Dependencies: `validate_packet.py` confirms no ticket depends on a future-phase ticket; every review gate is a named hard stop with explicit "STOP... do not begin next phase" language; every phase orchestrator names every ticket in its phase.

## Conclusion

No BLOCKER or IMPORTANT issue affects Phase 1 itself. The two IMPORTANT findings (#1, #2) should be patched into the packet before an executor reaches Phase 2 and Phase 6 respectively; the MINOR finding (#3) should be patched before Phase 5.

**Ready to begin Phase 1 only.**
