# LoreForge Execution Packet — Review Findings (Deepseek Flash 0731)

**Reviewer:** Deepseek Flash 0731 (clean-context expert review agent)
**Date:** 2026-09-02
**Scope:** `LoreForge_Execution_Packet` at packet handoff, per `REVIEW_AGENT_BRIEF.md`
**Read order:** `00_START_HERE.md` → `01_ORCHESTRATOR.md` → `02_FROZEN_PRODUCT_DECISIONS.md` → `03_ARCHITECTURE_CONTRACT.md` → `04_SPIKE_BASELINE.md` → `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md` → `06_CHANGE_CONTROL.md` → `07_TICKET_INDEX.md` → `08_EXECUTOR_KICKOFF_PROMPT.md` → `09_REVIEW_KICKOFF_PROMPT.md` → `10_PACKET_MANIFEST.md` → `REVIEW_AGENT_BRIEF.md` → `references/FULL_PRODUCT_SPEC.md` (full, 2656 lines) + `references/SPIKE_MVP_REVIEW.md` + `references/SPIKE_SOURCE_MANIFEST.md` → every Phase 1 ticket in full → every owner gate → `tools/validate_packet.py` in full → all Phase 2–15 tickets and gates (a parallel sub-agent scanned all 79 tickets + 15 orchestrators; I independently re-read the high-risk P05/P07/P08/P11/P13/P14/P15 tickets and all gates). Also inspected `SHA256SUMS.txt`, `VALIDATION_REPORT.txt`, and the on-disk `review findings/` folder.
**Validator:** `python tools/validate_packet.py` on this (win32) host **crashes** on first run: `UnicodeDecodeError: 'charmap' codec can't decode byte 0x9d in position 3579` raised at `tools/validate_packet.py:164` (bare `Path.read_text()`, Windows cp1252 locale vs UTF-8 packet). Three `read_text()` calls lack `encoding="utf-8"` (phase-orchestrator loop, critical-content assertions, `REVIEW_AGENT_BRIEF.md` read). With `$env:PYTHONUTF8="1"` the structural validator reports **PACKET VALIDATION: PASS** — 79 ticket files (64 implementation/design + 15 review gates), 15 phases, references complete. Independently re-verified `SHA256SUMS.txt`: all spot-checks (incl. the `sl-civic-archive-mvp-source.zip` hash `ebad9513…`) match; the source archive hash equals `SPIKE_SOURCE_MANIFEST.md:6`.

**Verdict: no defect in the Phase 1 ticket content, but the packet is not clean to hand off as-is.** The mandated first command of both kickoff prompts crashes on the owner's platform (F1), and the packet folder already contains three prior reviews (BigPickle, GLM 5.3 Flash, Muse Spark 1.2) with material **unpatched** findings and **diverging verdicts** that were never adjudicated. Fix F1 before Phase 1 handoff; close F2–F8 before their named phases. **No later phase is authorized by this review.**

> Finding format per `REVIEW_AGENT_BRIEF.md:58-64`: **BLOCKER** = cannot safely execute; **IMPORTANT** = likely ambiguity/bug/data leak, patch before phase; **MINOR** = clarity/test improvement. Each entry: file/ticket, exact evidence, why it matters, concrete patch preserving `02`/`03` owner decisions.

---

## BLOCKER — cannot safely execute

None on Phase 1 ticket *content*. The item below (F1) is effectively blocking to the handoff gate because the packet's own mandatory first command fails on the target platform; I rate it IMPORTANT because the packet logic is otherwise sound and a one-line fix exists, but it **must** be patched before any executor or reviewer runs.

## IMPORTANT — likely ambiguity/bug/data leak; patch before the named phase

### F1 — `tools/validate_packet.py` crashes on Windows; the mandated integrity gate fails on the owner's platform
**File:** `tools/validate_packet.py`
**Exact evidence:** Reproduced by execution. First run (plain `python`, Python 3.14, Windows, cp1252 default) raises:
```
UnicodeDecodeError: 'charmap' codec can't decode byte 0x9d in position 3579
  File "...\LoreForge_Execution_Packet\tools\validate_packet.py", line 164, in <module>
    txt=f.read_text()
```
Three bare `f.read_text()` / `.read_text()` calls carry no `encoding="utf-8"`: the phase-orchestrator loop, the critical-content assertions loop (the one that crashed — a control doc contains non-ASCII), and the `REVIEW_AGENT_BRIEF.md` read. Only the ticket-file read passes an explicit encoding.
**Why it matters:** Both `00_START_HERE.md` ("Before review or execution, run: `python tools/validate_packet.py`. Do not begin work if it reports FAIL.") and `08_EXECUTOR_KICKOFF_PROMPT.md` step 1 make this the unconditional, packet-gated first action. A Windows executor gets a traceback + exit 1 and must either misinterpret it as a FAIL and halt, or improvise around the packet's own integrity gate — exactly the improvisation the packet exists to prevent. The same crash hits `09_REVIEW_KICKOFF_PROMPT.md`'s first step.
**Patch (preserves all owner decisions; no content change):** add `encoding="utf-8"` to the three bare `read_text()` calls (lines 135, 164, 169); regenerate `SHA256SUMS.txt` (the tool is itself hashed in it) and `VALIDATION_REPORT.txt`. Two-line fix; nothing else in the packet changes. (All three prior reviews flagged this identically; I reproduce it independently.)

### F2 — Pre-P07 "temporary development/admin authority" is never defined; the executor must invent authorization for claim/review/role/share
**Files/tickets:** `tickets/phase-02/P02-T04-character-claims-public-profiles-and-local-aliasing.md:28`; `tickets/phase-03/P03-T04-role-hierarchy-and-scoped-assignments.md:31`; `tickets/phase-04/P04-T04-review-approval-locking-and-soft-delete.md:29`; `tickets/phase-05/P05-T04-document-sharing-and-action-ux.md:29`.
**Exact evidence:**
- `P02-T04:28` — "Add CharacterClaimRequests state machine and request/approve/reject UI **using temporary development authority until P07**."
- `P03-T04:31` — "Build customer role hierarchy/assignment UI **under temporary admin authority**."
- `P04-T04:29` — "review queue scoped to authorized Domain/Subdomain/folder actors **using temporary admin checks that are replaced by P07 evaluator** without changing workflow APIs."
- `P05-T04:29` — "Introduce PermissionRule storage **if not already present** … match frozen principal/resource/action/effect shape so P07 extends it rather than migrates it." — no statement of *who may share*; the `share_document` capability exists only from P07-T01.
- `02_FROZEN_PRODUCT_DECISIONS.md:20` — "an **authorized** Domain actor approves/rejects ordinary claims."
- `references/FULL_PRODUCT_SPEC.md:447` — "A **suitable authorized** Domain user … may approve/reject the claim."
`grep -r "temporary" tickets/` returns exactly the three lines above plus P10-T01's "SQLite was deliberately temporary" — no definition of who the temporary authority is, what scope it holds, or when it is removed.
**Why it matters:** claim approval writes `controlledBy`, and role/review/share are security-critical workflows built in P02–P06. With no defined authority a lower-context executor either (a) invents a product decision the owner froze, or (b) defaults to the spike's legacy User-Membership admin path (`04_SPIKE_BASELINE.md:61` — `src/lib/tenant/*` temporary scope helpers), producing exactly the "accidental hardening of spike-era User-Membership schema" the brief warns against. P05 Share additionally ships ungated against anything for two phases.
**Patch (preserves frozen decisions; no new product role):** append one bullet to the **Frozen context** of each of P02-T04, P03-T04, P04-T04, P05-T04:
> Temporary development authority until Phase 7 is a discrete, recorded, non-product role — not a hardened spike-tenant backdoor. In P02 it is the Domain-owning fixture User; from P03 onward it is the Domain Owner User / operational Domain admin (as introduced by P03-T01) acting through the customer UI with the relevant acting Character. Every decision made under this authority is written to execution-notes, is audited with the same audit fields as permanent actions, and is fully replaced by the P07 evaluator without changing workflow APIs. No additional admin-only surface or capability is built for it. P05 Share is permitted only for a principal holding `edit_document` on the shared Document.
Add a matching cross-reference in `00_PHASE_ORCHESTRATOR.md` (P02–P06) so the rule is discoverable where the executor looks first, plus an acceptance line on each ticket: "Every temporary-authority action produces an audit record; no legacy User-Membership grant path is introduced." (Concurs with BigPickle I1 / MuseSpark B4.)

### F3 — Character claim approval has no capability and is missing from the P07 wiring
**Files/tickets:** `03_ARCHITECTURE_CONTRACT.md:90-98, 227-230`; `tickets/phase-07/P07-T01-authorization-rule-model-and-evaluator.md:32`; `tickets/phase-07/P07-T02-server-and-payload-enforcement.md:29`; `02_FROZEN_PRODUCT_DECISIONS.md:20`; `FULL_PRODUCT_SPEC.md` §5.4.
**Exact evidence:** the stable capability vocabulary (`03:228`) and "complete Phase-7 capability vocabulary" (`P07-T01:32`) contain **no claim-approval capability**. `P07-T02:29` wires the evaluator into Documents, Folders, Document Types, Templates, Tags, Document Character links, Document Relationships, Characters/DomainCharacterContexts, Domain/Subdomain memberships, Subdomains, Roles/RoleAssignments, and PermissionRules — **`CharacterClaimRequests` is absent**. `03:90-98` defines the model but assigns no capability, principal tier, or scope. P13 notifies "Character claim approved/rejected" (`P13-T02:30`), so the path persists post-P07.
**Why it matters:** claim approval controls `controlledBy` — the single binding between a Character (the product's RP principal) and a User, a security-critical, effectively-global write. Once the evaluator is live there is no rule at all governing the approval path unless the executor adds an ad-hoc capability contradicting the frozen vocabulary.
**Patch (decision-preserving):** append `manage_claims` to `03:228` ("approve/reject Character claim requests within the Domain where the claim is filed; approve only while the Character remains unclaimed"); add it to `P07-T01:32`; add `CharacterClaimRequests` to `P07-T02:29` with the server-side check "decider holds `manage_claims` on the claim's Domain and the Character is still unclaimed" and a concurrent double-bind negative test. (Concurs with BigPickle I2.)

### F4 — P05-T02 drops the frozen "at most one superseding successor" invariant and contradicts the required grouped label
**File:** `tickets/phase-05/P05-T02-grouped-and-supersedes-relationships.md`
**Exact evidence:** `03_ARCHITECTURE_CONTRACT.md:202` — "A Document may have at most one direct superseding successor; correcting that relationship is audited." `P05-T02:31` only says "Prevent cycles in supersedes graph within the connected chain"; its automated acceptance tests only cycle rejection (`P05-T02:42`), and the gate checks only "No supersedes cycles" (`P05-GATE:42`). The single-successor invariant appears nowhere outside the contract. Separately, `P05-T02:28` says "optional label for grouped" while `03:199` and `02:60` make the label **required** for grouped.
**Why it matters:** without the constraint, Deed A can be superseded by both B and C simultaneously; "the current deed" that GS-05/GS-07 and the P05-GATE chain depend on becomes ambiguous, and the executor either adds an undocumented rule at execution time or silently allows forked succession of official records — a permanent data-model decision made by a lower-context agent. A null-label grouped relationship is unrenderable.
**Patch:** P05-T02 Required work — "Enforce at most one direct superseding successor per Document; replacing/correcting an existing successor link is permitted only as an audited relationship change recorded in provenance on both affected Documents." Make grouped label required (DB check). Add acceptance: a second superseding-successor attempt is rejected; the audited correction path succeeds; grouped without a label is rejected. (Concurs with GLM I-3 / MuseSpark B6.)

### F5 — P05-T04 Share enforcement ships before any evaluator exists; acceptance is unpassable as written
**File:** `tickets/phase-05/P05-T04-document-sharing-and-action-ux.md`
**Exact evidence:** `P05-T04:29` "Introduce PermissionRule storage **if not already present** … so P07 extends it rather than migrates it." The phrase is vacuous: nothing in P02–P05 creates `PermissionRules` (the model first appears in P07-T01; `src/collections/PermissionRules.ts` is listed only there), and the evaluator is explicitly P07 (`P07-T01` builds it; `P07-T02` wires it "into every customer-accessible path"). Nothing in P02–P06 enforces a document-level rule on the read path. The ticket's automated acceptance ("Revoking share removes subsequent access"; "Shared reader sees same Document ID/current version") cannot pass without quietly pre-building a mini permission evaluator plus read-path enforcement inside P05.
**Why it matters:** the executor must either build P07's engine early and unreviewed, or ship a Share UI that grants nothing and fails the P05-GATE — both are precisely the "lower-context executor invents architecture" failure mode the brief targets.
**Patch (frozen decisions preserved):** keep the rule storage shape, share/revoke provenance, and Share/Copy/Move UX in P05-T04, and apply the packet's own established pattern (used verbatim by P02-T04/P04-T04): make enforcement an explicitly **temporary server-side check honoring document-level read/edit PermissionRules only**, wired into the document view/action paths, with acceptance reworded to "a temporary server-side check honors document-level read/edit rules; the shared evaluator replaces it in P07-T02 without changing the stored rule shape or workflow APIs." Freeze that the temporary check is deleted in P07-T02 (add it to P07-T02's required work so the replacement is contractual, not optional). (Concurs with GLM I-1 / BigPickle I1 / MuseSpark I9.)

### F6 — The "public" access mechanism is never defined anywhere in the stack
**Files/tickets:** `tickets/phase-08/P08-T02-public-and-member-domain-surfaces.md:26`; `tickets/phase-08/P08-T04-modern-pack-and-public-character-pages.md`; `tickets/phase-12/P12-T02-public-and-permission-search-ux.md`; contract `03_ARCHITECTURE_CONTRACT.md` §6/§7.
**Exact evidence:** P08-T02:26 "Public access must expose only resources explicitly public through authorization/public rules." P08-T04 requires "publicly readable linked Documents only" on public Character pages. P12-T02 requires anonymous public search that is "Domain-scoped and only public-readable material" and acceptance "Anonymous query cannot distinguish existence/count of private matching records." Yet the frozen PermissionRule principal vocabulary (`03:221`, mirrored in `P07-T01`) is exactly `User|Character|Role|DomainMembership|SubdomainMembership` — there is **no public/anonymous principal**, no public read capability, and no `isPublic`/`publicReadable` flag or its implementing ticket anywhere (grep of phase-07 shows zero mention of public/anonymous; the `domains` model lists "public settings" as a bare word with no shape). The full spec (§16.1) says only "content made public by Domain policy" without a mechanism.
**Why it matters:** two lower-context executors (P08 and P12, a phase apart) must each invent the public mechanism independently and can plausibly invent different ones. Public access is the highest data-leak-risk surface in the product, and GS-11 plus P12-T02's acceptance demand no existence/count leakage of private records through it. This is a cross-phase seam left to executor discretion, which the packet's own standards forbid.
**Patch:** add one owner-signed paragraph to `03` (§6 `domains` "public settings" and/or §7) choosing the mechanism — e.g., Domain-scoped `publicReadable` flags on Folder/Document/Page evaluated as the lowest principal class below membership, with per-resource control and no folder-listing inference — and name the ticket that implements it (extend P08-T02's required work to create it; P12-T02 consumes it). (Concurs with GLM I-2.)

### F7 — P08-T01 omits a frozen theme token
**File:** `tickets/phase-08/P08-T01-theme-studio-productization-and-vocabulary.md`
**Exact evidence:** `P08-T01:29` enumerates the Theme token schema: "preset, primary/secondary/accent/background/text colors, heading/body font preset, logo, banner, header layout, content width, document style" — omitting the "optional **background image/treatment in P08**" token that `03_ARCHITECTURE_CONTRACT.md:346` explicitly schedules to P08 (also in `FULL_PRODUCT_SPEC.md` §14.1 "optional background-image treatment if user testing supports it").
**Why it matters:** a frozen minimum token that the contract assigns to this exact phase is absent from the phase's schema enumeration; the executor will either silently drop a promised capability or add it ad-hoc.
**Patch:** add the optional background-image/treatment token to P08-T01's schema list and to its theme save/round-trip acceptance. (Not caught by the three prior reviews — my own find.)

### F8 — P13-T02's notification allowlist forward-references the watch feature built in P13-T03
**File:** `tickets/phase-13/P13-T02-in-app-notifications-and-preferences.md`
**Exact evidence:** `P13-T02:30` — the "initial direct-notification allowlist **exactly**" includes "…and Document superseded **when the recipient is explicitly watching that Document**. Folder/Document watch-generated change notifications are added in P13-T03." T02 depends only on P13-T01; the watch model does not exist until P13-T03.
**Why it matters:** the executor implementing T02 cannot satisfy a frozen "exactly" allowlist that requires a watch mechanism built in the next ticket — it must either stub a watch concept (invented ahead of its phase) or silently defer a promised notification, both of which the packet forbids.
**Patch:** move the "superseded-when-watching" item out of T02's allowlist and into P13-T03 (with its watch trigger), or explicitly mark it deferred in T02. (Corroborated by the survey; prior reviews only caught the separate P13-T03 descendants-default wording.)

---

## MINOR — clarity / test / integrity

- **M1 — Twelve review gates have empty "Automated acceptance" sections.** `P04-GATE` through `P15-GATE` are empty (e.g. `P05-GATE:37-39`), while `P01`/`P02`/`P03` gates are populated. The validator's emptiness guard (line 104) covers Manual acceptance only, and its "code-paths-only" heuristic (lines 100-103) silently passes empty content. Populate each gate's automated section with its mechanical criterion (or teach the validator that REVIEW GATE mode may omit it). Populating is better: gates are the packet's hard stops. Affects the hard security gate P07 and close-outs P10–P15.
- **M2 — Broken read-list reference in `01_ORCHESTRATOR.md:12`.** Kickoff step 2 says read `references/FULL_PRODUCT_SPEC.md` "sections 1–3 and 24–27", but the spec has **no §26** (numbering jumps 25 → 27). Point to 1–3, 24–25, and 27–29 (§27 Release Checkpoints, §28 Testing Strategy, §29 Open Decisions are directly relevant to executor judgment).
- **M3 — `P15-T00` is labeled `Mode: IMPLEMENTATION TICKET` though it is design-only** and ends in a hard owner stop ("Do not implement bridge code in this ticket"). Label it DESIGN (the validator accepts any non-REVIEW GATE mode) so an executor doesn't pattern-match it into code work.
- **M4 — Bayview has no creation ticket.** Fixture record 7 ("Cross-Domain copied record after Bayview exists"), GS-09, and P05-T03's cross-Domain copy/move acceptance all require a second Community Domain by Phase 5, but no ticket creates or seeds it. Add one line to P05-T03 ("ensure the Bayview fixture Domain exists before cross-Domain tests").
- **M5 — Fixture cast drift.** `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md:62-64` assigns Sera/Dorian to a "Scribe" role, but the Role hierarchy fixture (lines 58-70) defines only `Head Scribe > Senior Scribe > Junior Scribe`. Name their actual roles (e.g. Junior Scribe plus delegated folder management) before P07-T03 seeds the fixture cast and permission-matrix tests depend on it.
- **M6 — `P09-T01` "theme-lite settings" is undefined** and sits in unresolved tension with the frozen theme contract (`03` §12 minimum tokens; GS-02 requires the same Domain to restyle convincingly). Freeze it ("P08 Theme Studio restricted to preset-level tokens" or "platform default theme in P09"). Its gate also re-asks a provisioning question the ticket already answers — remove the gate question.
- **M7 — `P13-T03` folder-watch descendants default is ambiguous** ("include descendants by default with explicit toggle if needed" vs. Required work "includeDescendants for Folder default true"). Freeze: descendants on by default with a visible per-watch toggle.
- **M8 — GS-03 vs Owner authority.** `05_FIXTURE:88` says "Domain/Subdomain access changes with active Character", but `03:236` (precedence step 2) and `P03-T01:47` ("Owner authority is not tied to active Character") make Owner/Admin operational access User-wide regardless of active Character. Intent is documented (not a data bug), but GS-03 should carve out the Owner/Admin exception so the executor doesn't implement one inconsistent behavior.
- **M9 — "Regenerate Payload types after schema changes" appears on every ticket** (e.g. `P01-T01:56`) even where the ticket makes no schema change (`04_SPIKE_BASELINE.md:64` says Phase 1 has none). Re-word to "only if schema changed in this ticket; otherwise verify no-op."
- **M10 — Missing `mvp-baseline` tag step.** `01_ORCHESTRATOR.md:16` and `00_START_HERE.md:46` require tagging the MVP baseline, but the kickoff has no step-0 that does it. Add it before P01-T01.
- **M11 — `P01-T01` allowlist not mapped to the dialect.** The ticket says "explicit dialect allowlist" and "Strip dangerous URL schemes" but never maps `03:24-32` (paragraphs, H1–H4, bold/italic, lists, links, blockquotes, hr, tables) to concrete `sanitize-html` `allowedTags`/`allowedSchemes`. Providing the exact allowlist (and the `gfm`/`headerIds`/`mangle` Marked options, plus `javascript:`/`data:`/`vbscript:`/protocol-relative obfuscations) removes executor discretion on a security surface.

---

## Packet-integrity meta-finding (resolve before handoff)

**The `review findings/` folder is not part of the packet's integrity contract and contains unadjudicated, diverging, material findings.**

- `review findings/ReviewFindings_BigPickle.md`, `ReviewFindings_GLM5.3Flash.md`, `ReviewFindings_MuseSpark1_2.md` exist in the folder but are **not listed in `SHA256SUMS.txt`** (contradicting `10_PACKET_MANIFEST.md:43` "hashes every packet file except itself"), are **not in the manifest**, and are **not in any read list**.
- Their verdicts disagree: BigPickle = 0 BLOCKER / 2 IMPORTANT → ready Phase 1; GLM = 1 BLOCKER / 3 IMPORTANT → ready Phase 1 after the validator fix; **Muse Spark = 9 BLOCKER / 18 IMPORTANT → NOT ready even for Phase 1**. None of Muse Spark's blockers are patched into the ticket files, and there is no disposition record reconciling them.
- My independent review **concurs** with the shared core (F1–F6) and **disagrees** with several Muse Spark "BLOCKERs": e.g. B8 (garble+delay transitions are actually split across P14-T03/P14-T04 and covered), B5 (revision-retention wording is adequate), B7 (Personal-Domain folder-sharing denial is substantively present). I rate none of these BLOCKER. I also independently found F7 (theme token) and F8 (P13-T02 watch forward-reference) that the prior three did not surface.

**Action:** either (a) integrate/append these to the packet, patch the tickets, regenerate `SHA256SUMS.txt`, and add a disposition note in the manifest, or (b) remove the folder and record that disposition. As shipped, a clean-context executor or reviewer handed this folder cannot know whether the security claims inside were adjudicated — that uncertainty is itself a handoff defect.

---

## Reviewer checklist results (per `REVIEW_AGENT_BRIEF.md` required questions)

| Question | Verdict |
|---|---|
| Generic CMS / page builder / raw form storage / alt-linking / recursive tenant creep? | **Clean.** Pages fixed-chrome Markdown; page builder banned; raw form answers discarded (P06-T02/T04); no alt linkage (P15-T02); Subdomains non-recursive (P03-T02). |
| Any permission/membership accidentally moved from Character to User? | **Clean, except F2/F3.** Only Domain ownership/operational admin are deliberately User-level (contract §5); all RP access/membership stays Character-level. |
| Owner/User operational authority vs Character roleplay authority consistent? | **Yes** — consistently across P03-T01, P07, P09. |
| Personal Domain Character-rooted and folder-sharing forbidden? | **Yes** — P09-T01/acceptance deny folder-share for personal kind; P09-T02 re-tests hidden API. |
| Revisions and provenance distinct/preserved? | **Yes** — P04-T02/T03 explicitly separate Payload Versions from the provenance timeline. |
| Copy / Move / Share / Supersedes unambiguous? | **No, until F4/F5** (single-successor invariant; share enforcement seam). Otherwise consistent. |
| Later ticket destroys history promised earlier? | **No** — soft delete, merge tombstones (P11-T03), copy-on-install packs (P08-T03), provisional provenance writes all preserve history. |
| Global Character merge Platform Admin only? | **Yes** — P11-T03, with endpoint-level negative test. |
| Deterministic grant/deny vs Role vs membership precedence? | **Yes** — contract §7 steps 1–11 mirrored item-for-item in P07-T01 acceptance. |
| Same Captain Role supports different scoped branches? | **Yes** — P03-T04 and P07-T03 test Rarius/Tarl same-Role/different-scopeFolder. |
| Delegation limited to possessed authority/scope? | **Yes** — P07-T05 implements contract §8, with forged-API negative tests. |
| API/search/public paths share the server authorization boundary? | **Partially — P07-T02 + P12-T01/T02 route through the shared evaluator, but the public/anonymous mechanism is undefined (F6).** |
| High-risk customer workflows receive actual tuning/review? | **Yes** — editor/theme first (P01), Form Studio UX gate (P06). |
| Payload Admin kept out of final customer-critical authoring? | **Yes** — P06-T03 replaces it for forms; P07-T02 closes the admin backdoor with a test. |
| Editor/form/theme choices resolved before deeper dependencies? | **Yes** — deliberate Phase 1 sequencing; no later ticket re-opens editor/theme choice. |
| No Postgres/cloud half-build before P10? | **Yes** — verified in every phase's guardrails and by the validator's forbidden-scope checks. |
| Provider choices Owner Gates, not executor choices? | **Yes** — P10/P11/P15 gates exist un-filled; each dependent ticket hard-stops. |
| SL bridge isolated? | **Yes** — separate process (P15-T01), no product authorization logic in bridge, action-start location semantics end-to-end (P15-T03, GS-15). |
| Tickets have prerequisites; any future feature assumed early? | **Yes, except F5/F8** — dependency graph is otherwise acyclic, future-free, and gate-complete (validator-verified). |
| Gates are hard stops? | **Yes** — every gate is NO SELF-APPROVAL with STOP language; orchestrators forbid continuing on executor judgment. |

---

## What to fix first (minimal diffs, preserve frozen decisions)

1. `tools/validate_packet.py:135,164,169` → `read_text(encoding="utf-8")`; regenerate `SHA256SUMS.txt` + `VALIDATION_REPORT.txt` (F1).
2. Patch `P02-T04`/`P03-T04`/`P04-T04`/`P05-T04` Frozen context with the temporary-authority rule from F2.
3. Add `manage_claims` to `03:228` + `P07-T01:32`; add `CharacterClaimRequests` to `P07-T02:29` wiring (F3).
4. P05-T02: enforce the single-successor invariant and required grouped label (F4); P05-T04: make share enforcement an explicit temporary check with a contractual P07-T02 removal (F5).
5. Define the public/anonymous mechanism in `03` and name its implementing ticket (F6).
6. Add the missing theme token to P08-T01 (F7); move the watch-triggered notification to P13-T03 (F8).
7. Resolve the `review findings/` folder (adjudicate the three prior reports; re-hash/manifest or remove with a disposition record).
8. Batch the MINOR items into a single packet-revision commit; re-run `python tools/validate_packet.py` — must PASS.

---

## Required verdict

Phase 1 tickets (P01-T01 → P01-T04, P01-GATE) are internally consistent, correctly dependency-ordered, faithful to the frozen Markdown/theme/editor contracts, and their claims verify against the actual spike source (Marked-without-sanitization in `render.ts` is a real, correctly-targeted P01-T01 fix; the canonical LF seam and custom Source editor are confirmed). **No Phase 1 content defect found.** However, the packet cannot be handed off unmodified because the mandated first command of both kickoff prompts crashes on the owner's platform (**F1**). Fix F1 and adjudicate the `review findings/` folder before Phase 1; schedule F2/F3 before Phase 2, F4/F5 before Phase 5, F6/F7 before Phase 8, F8 before Phase 13.

**Conclusion: with F1 fixed before handoff and the IMPORTANT findings patched before their named phases — ready to begin Phase 1 only.** No later phase is authorized by this review.

*Review agent stance: no redesign; all patches above are the smallest change closing a defined authority gap, a security seam, a cross-phase leak, or a tooling/clarity defect while preserving `00_START_HERE.md:40` Phase 1-only authorization, `01_ORCHESTRATOR.md` one-phase-at-a-time protocol, and the frozen decisions in `02`/`03`.*