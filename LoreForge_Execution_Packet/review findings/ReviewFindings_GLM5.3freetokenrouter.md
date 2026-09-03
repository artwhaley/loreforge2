# LoreForge Execution Packet — Review Findings (GLM 5.3, free/tokenrouter)

Audit performed per `REVIEW_AGENT_BRIEF.md` against the full packet: root control documents (00–10), all Phase 1–2 tickets in full, every later-phase implementation ticket, all phase orchestrators, all three owner gates, the validator, the fixture contract, and the full product spec (including the later sections on phased plan, release checkpoints, testing strategy, deferred decisions, and rejected ideas). Spike source-level checks were verified against `SPIKE_SOURCE_MANIFEST.md` (zip hash matches manifest) without unzipping.

---

## BLOCKER 1 — Packet's own validation command crashes on a default Windows/CP1252 environment

**File:** `tools/validate_packet.py` lines 164–166 (the `critical` content-assertion loop), interacting with `02_FROZEN_PRODUCT_DECISIONS.md`.

**Evidence:** `python tools/validate_packet.py` as literally instructed by `00_START_HERE.md` §"Packet integrity check", `08_EXECUTOR_KICKOFF_PROMPT.md` step 1, and `09_REVIEW_KICKOFF_PROMPT.md` raises `UnicodeDecodeError: 'charmap' codec can't decode byte 0x9d` because `f.read_text()` is called without `encoding="utf-8"`. `02_FROZEN_PRODUCT_DECISIONS.md` contains UTF-8 smart quotes ("packet date" line and elsewhere). On Windows the default codec is cp1252, so the crash occurs before any PASS/FAIL verdict. It only passes when invoked as `python -X utf8 tools/validate_packet.py`.

**Why it matters:** Every instruction in the packet says "Do not begin work if it reports FAIL" — but on the development platform this project actually uses (win32 per environment), the tool *never reports anything*; it crashes. A clean-context executor following the packet verbatim hits a hard stop at kickoff step 1, and worse, an executor may "fix" it by editing the validator — uncontrolled packet modification — or skip the check. Other `read_text()` calls in the validator (lines 66, 135, 169) pass `encoding="utf-8"` correctly; the `critical` loop is the inconsistent one.

**Patch:** Change line 164 to `txt=f.read_text(encoding="utf-8")` in `tools/validate_packet.py`. One-line fix, no decision impact. Note `06_CHANGE_CONTROL.md` treats this as harmless implementation drift (Category A) if discovered in-flight, but since the packet is still pre-handoff, fix it now and regenerate `SHA256SUMS.txt`.

---

## BLOCKER 2 — Review Agent Brief's read list is self-contradictory about owner gates

**File:** `REVIEW_AGENT_BRIEF.md` lines 9–11 and 22 vs `10_PACKET_MANIFEST.md` and `00_START_HERE.md`.

**Evidence:** The brief's ordered Read list (items 1–11) omits `06_CHANGE_CONTROL.md`, `01_ORCHESTRATOR.md`, and the owner-gate files, yet the brief's Required questions then demand infrastructure verdicts ("Provider choices Owner Gates, not executor choices?") that require reading `owner-gates/*` and `03_ARCHITECTURE_CONTRACT.md` §16. Meanwhile `00_START_HERE.md` builds its authority ladder on `06_CHANGE_CONTROL.md`. The brief references the zip only in a subordinate clause while `09_REVIEW_KICKOFF_PROMPT.md` tells the reviewer to "follow its required read order" — meaning the canonical review entrypoint omits the change-control document and owner gates from mandatory reading.

**Why it matters:** The stated purpose of the brief is to make the review reproducible by a "separate review agent **before execution**" with clean context. A reviewer who follows it literally will audit provider-gate compliance without ever reading the gate files, and will not know the escalation ladder when it finds a conflict — exactly the failure mode the packet exists to prevent.

**Patch:** Amend `REVIEW_AGENT_BRIEF.md` §Read to insert `06_CHANGE_CONTROL.md` after item 6, add items for `07_TICKET_INDEX.md`, the three `owner-gates/*` files, and `01_ORCHESTRATOR.md`, keeping the current narrative order otherwise intact. No decision changes.

---

## BLOCKER 3 — P01-T04 and P08-T01 duplicate Theme Studio scope with no boundary

**Files:** `tickets/phase-01/P01-T04-theme-studio-and-domain-language-tuning.md` and `tickets/phase-08/P08-T01-theme-studio-productization-and-vocabulary.md`.

**Evidence:** Both tickets own "Theme Studio" end-to-end, and their required work overlaps almost exactly. P01-T04 required work 1–4 (grouping/labels/layout/save feedback/live preview, ≥2 distinct presets, logo/banner robustness, dual preview) is restated nearly verbatim as P08-T01 required work 1–2. P08-T01 additionally claims "Finalize Theme token schema from Architecture Contract: preset, primary/secondary/accent/background/text colors, heading/body font, logo, banner, header layout, content width, document style" — but `03_ARCHITECTURE_CONTRACT.md` §12 lists `header layout` and `content width` as minimum tokens, so both tickets legitimately claim the same tokens, and the P08 ticket also mandates a P08-only background treatment field while the contract marks that as "optional background image/treatment in P08." The tickets differ only in vocabulary theming (P08-only) and Form Builder observation (P01-only). A 7-phase gap separates them with no statement of which deliverable is "tuning" versus "productization," which is decisive here because Review Gate 1's acceptance criteria (GS-02: "Restyle same Domain into two convincingly different identities") uses the identical acceptance wording that P08-T01 will be re-judged against at Gate 8.

**Why it matters:** Two-phase overlap with identical acceptance language means the Phase 1 executor cannot tell whether a Gate 1 finding of "presets not distinct enough" is a P01-T04 defect (fix now, per 06_CHANGE_CONTROL "Do not defer a ticket's scheduled UX tuning") or a P08-T01 feature (explicitly out of scope in Phase 1, per 04_SPIKE_BASELINE "Phase 1 does not... build starter packs"). Given that the entire Phase 1 thesis is "prove taste before building deeper" (`00_START_HERE.md`), an executor either over-builds Theme Studio in Phase 1 (scope violation) or defers the same tuning to P08 that Gate 1 requires (gate-blocking ambiguity). The Architecture Contract's token list is the only decider, and it does not say which ticket implements which tokens.

**Patch:** In P01-T04, add one sentence to Frozen context: "This ticket tunes the existing spike Theme Studio using the current token set; adding/refining the Architecture Contract token schema (header layout, content width, document style, background treatment) and vocabulary theming is P08-T01." In P08-T01, mirror: "This ticket productizes the token schema from §12; it is not a Phase-1 fix-backlog." No design change, just phase boundary confirmation.

---

## BLOCKER 4 — Correspondence sender-visibility contract in Architecture Contract is internally contradictory

**File:** `03_ARCHITECTURE_CONTRACT.md` §14 lines 387–388.

**Evidence:** The contract states: "`senderOutcomeVisibility`: `delivery_status | dispatched_only`; default `delivery_status` for immediate Domains and `dispatched_only` for moderated Domains." Two problems. (a) It declares one default for two different policies — a single field cannot simultaneously default to `delivery_status` under immediate and `dispatched_only` under moderated unless "default" means "derived from `mode` at write time," which is not stated. (b) The very next sentence says "`dispatched_only` leaves the sender-facing status as Dispatched after send regardless of the moderator's eventual outcome" — but the moderator's Delay action (per P14-T02) must display a terminal status ("Delivered") once the message is eventually delivered, meaning `dispatched_only` does leave sender status frozen while `delivery_status` under moderated mode would need to *un-freeze*. P14-T02 required work 5 restates this same pair of conflicting rules verbatim, and P14-T03 required work 5 then says "Add configurable sender-facing terminal status mapping only from fixed options" — a third, different mechanism. The fixture GS-14 requires "Original admin-auditable; recipient sees only approved delivered content" and says nothing about sender visibility, so no ticket resolves it either.

**Why it matters:** This is exactly the kind of ambiguity `09_REVIEW_KICKOFF_PROMPT.md` flags ("ambiguous Copy/Move/Share... behavior" class, here applied to correspondence) and it lands in Phase 14 with three tickets restating three different rules. An executor implementing P14-T02 will pick one reading, P14-T03 will assume a second, and either sender or moderator data leaks (moderator notes must never be sender-visible, so guessing wrong direction is a privacy defect) or the frozen-status invariant breaks. Owner decision required: which of the three is authoritative?

**Patch:** Rewrite §14 lines 387–388 as: "`senderOutcomeVisibility`: `delivery_status | dispatched_only`. Defaults to `delivery_status` when `mode=immediate` and `dispatched_only` when `mode=moderated`; the effective default is derived from `mode` at policy save and is stored explicitly. `delivery_status` reveals the terminal outcome (Delivered/Intercepted/Failed) once reached; `dispatched_only` renders the sender view as Dispatched permanently and never reveals the moderator's outcome. No other sender-facing statuses exist." Then delete "Add configurable sender-facing terminal status mapping" from P14-T03 required work 5 and align P14-T02 required work 5 to the same single sentence.

---

## IMPORTANT 1 — Spike baseline contradicts itself about whether MDXEditor replacement is executor-decidable

**Files:** `03_ARCHITECTURE_CONTRACT.md` §4 line 56 and `04_SPIKE_BASELINE.md` §"Spike review questions carried into Phase 1" lines 76–82, plus `references/SPIKE_MVP_REVIEW.md` lines 12–14.

**Evidence:** The Architecture Contract says: "If MDXEditor demonstrably corrupts supported canonical Markdown after Phase 1 fixes, stop at Review Gate 1 with a reproducible test. A lower agent does not choose a replacement." The Spike Baseline asks "Is WYSIWYG pleasant enough after tuning?" — a taste question — and the SPIKE_MVP_REVIEW asks whether "a lighter/simple Markdown editor" should replace MDXEditor. P01-T03 required work 6 hedges: "If supported Markdown corruption is reproducible, document it for Gate 1; do not select a replacement editor." P01-GATE then asks the owner to answer whether MDXEditor "passes" and states "If MDXEditor passes, it remains the editor; executor cannot choose a replacement." The bug: the contract's stop condition is only "demonstrable corruption," but the spike review questions and gate framing treat "pleasant enough" as a decidable owner criterion with a documented rejection path (lighter editor), while the gate ticket says the executor cannot even *select* a replacement. If the owner rejects MDXEditor at Gate 1, no ticket, phase, or gate language defines what happens next — there is no "P01-T05: editor replacement" or equivalent, and Phase 2+ all assume the editor is settled. Nothing in the packet tells the executor whether rejection means "owner issues new patch instructions" (per phase exit rule) or an undefined state.

**Why it matters:** Gate 1 exists precisely to make the MDXEditor call (`00_START_HERE.md`: "taste-level UI work was deliberately deferred. We are not building a sophisticated... backend around an editor... the owner has not yet accepted"). If the answer is "no," the packet's answer is only "STOP and return the report" — fine — but the packet gives the *owner* no pre-authored decision branch, and gives the *executor* a contract line that reads as forbidding replacement selection even after owner rejection. That's a latent contradiction: "a lower agent does not choose a replacement" is scoped to Gate-1-stop, not to post-rejection, but it doesn't say so.

**Patch:** Add to P01-GATE "Owner decision dependency" section: "If the owner rejects MDXEditor at this gate, the owner will issue replacement-editor instructions as a new ticket/patch; the executor does not select one unilaterally. Phase 2 remains blocked until either (a) MDXEditor is accepted, or (b) the owner provides a replacement decision." Add matching sentence to `03_ARCHITECTURE_CONTRACT.md` §4: "After Gate 1, if the owner rejects MDXEditor, replacement is an owner decision, not an executor one."

---

## IMPORTANT 2 — `permission-rules` model name collides with Payload's `access` and the ticket's collection list vs. Architecture Contract mismatch

**Files:** `03_ARCHITECTURE_CONTRACT.md` §6 ("permission-rules" collection, `principal polymorphic relation to Character, User, Role, DomainMembership, or SubdomainMembership`) and `tickets/phase-07/P07-T01-authorization-rule-model-and-evaluator.md` required work 1.

**Evidence:** The ticket says: "principal type `User|Character|Role|DomainMembership|SubdomainMembership`" — matching the contract. But the ticket's automated acceptance says "More-specific direct Character grant overrides broader direct Character deny; applicable direct Character/User deny cannot be overridden by Role grant" — introducing a *User-vs-Character* precedence nuance the contract's precedence rules (§7) do not fully pin down: rule 5 says "Principal class priority: **direct User/Character > Role > membership default**" without distinguishing User from Character as principals when a User-direct deny and Character-direct grant both exist (User owns multiple Characters). The contract's only cross-class statement is the final line: "A more-specific direct Character grant may override that Character's broader direct deny. A Role grant never overrides an applicable direct User/Character deny." There is no rule for *User-level deny vs. Character-level grant* on the same resource, which is a real case: Domain owner's User-level deny vs. a Character grant. The evaluator ticket's acceptance tests force the executor to invent this precedence.

**Why it matters:** This is the packet's most safety-critical seam (P07-GATE is a "Hard security/behavior gate"). The evaluator is specified as table-driven from "GS permission matrix fixtures," but neither the fixture contract nor the contract §7 enumerates the User-deny/Character-grant cell. An executor will resolve it silently — `06_CHANGE_CONTROL.md` Category C explicitly forbids that for frozen decisions, and authorization precedence is frozen (§7 heading "Authorization precedence — frozen").

**Patch:** Add one line to `03_ARCHITECTURE_CONTRACT.md` §7 after rule 5: "Within the direct principal class, a User-direct rule and a Character-direct rule are both 'direct'; when both apply to the same resource, most-specific resource wins and deny wins ties, identically to any other same-class conflict." (Or the owner's intended alternative — but it must be pinned before Phase 7.) Add the User-deny/Character-grant cell to `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md` GS-05 or GS-04 fixture matrix.

---

## IMPORTANT 3 — P02-T02 "clear/validate active Domain as memberships become available" is under-specified for a server-authoritative seam

**File:** `tickets/phase-02/P02-T02-active-character-domain-context.md` required work 5.

**Evidence:** "When switching Character, clear/validate active Domain as memberships become available." No definition of "memberships become available" (Domain memberships only arrive in P02-T03 — this ticket is *earlier* in the same phase). P02-T02 is the ticket that introduces the active-Character context server-side validation, but at P02-T02 execution time, `DomainMemberships` does not yet exist (it is created in the very next ticket, P02-T03). So "validate active Domain as memberships become available" cannot refer to the new Character-membership model; it must refer to the *spike's User-level Memberships*, which P02-T03 then deprecates. The ticket thus forces the executor to build context-validation logic against a membership model that is about to be replaced in the immediately-following ticket.

**Why it matters:** Two risks. (a) The executor wires validation to spike `Memberships` (User-level), then P02-T03 migrates membership to Characters and this validation silently becomes wrong — a User with no active Character could retain Domain context, or vice versa; the exact "User as RP principal" leak the phase is designed to prevent. (b) The executor, recognizing the ordering problem, forward-implements P02-T03 membership in P02-T02 — a scope violation of the one-ticket-one-commit rule.

**Patch:** Rewrite required work 5 as: "When switching Character, re-validate the active Domain against the current membership source. In this ticket the membership source remains the spike's User-level Memberships; P02-T03 must update this validation to the new DomainMemberships (Character-level) in the same commit that introduces them." Optionally reorder: move P02-T03's `DomainMemberships` collection creation ahead into P02-T02's scope, or re-scope P02-T02 work 5 to "store active Domain; validation is deferred to P02-T03's migration." Any of the three is fine; the current text is not.

---

## IMPORTANT 4 — P03-T01 Tenant→Domain migration is authorized as "deterministic local migration" but no ticket owns data-preserving constraint verification

**File:** `tickets/phase-03/P03-T01-domain-model-owner-and-admins.md` required work 1 and automated acceptance.

**Evidence:** "Create/migrate `domains` from Tenants, preserving data/IDs where practical or deterministic local migration" — the phrase "where practical" hands the executor a data-preservation judgment call, and the automated acceptance only verifies "Spike data migrates and renders," not that document counts, revision bodies, form definitions, theme values, media references, or membership rows survive 1:1. `06_CHANGE_CONTROL.md` Schema changes section says "Before P10, fixture reset may be used only when ticket permits" — this ticket does not say whether fixture reset is permitted, and "deterministic local migration" implies it is not. But there is no hash/count assertion required (contrast P10-T01, which *does* require "equal Domain/Document/version/provenance counts and canonical body hashes" for SQLite→Postgres). The very next ticket P03-T02 seeds Subdomains, which assumes the migrated Domains are queryable by stable slug/ID.

**Why it matters:** The packet's data-integrity principle (`02_FROZEN_PRODUCT_DECISIONS.md`: "Full content revisions are retained"; "Copy provenance permanently identifies...") is enforced by *later* tickets (P04), but P03-T01 is the single point where existing spike Documents and theme/media could be silently lost, and its acceptance criteria don't test for it. A "where practical" escape hatch plus no count/hash assertions is the classic migration-data-loss signature.

**Patch:** Amend P03-T01 required work 1: "preserving data/IDs" — delete "where practical," add: "Migration must preserve all Documents (count + canonical body hash set), all theme token values, all media relationships, and membership rows; automated acceptance must assert pre/post counts and hashes match." Add automated acceptance bullet: "Migration test asserts equal Document counts and body-hash sets pre/post migration; fixture reset is NOT permitted in this ticket." (Or, if the owner intends fixture reset, say so explicitly and drop the migration test.)

---

## IMPORTANT 5 — P13-T02 notification allowlist omits the P05-T04/P09-T02 share-with-edit and P11-T02 lifecycle-adjacent events, creating silent gaps

**File:** `tickets/phase-13/P13-T02-in-app-notifications-and-preferences.md` required work 2.

**Evidence:** The "initial direct-notification allowlist exactly:" lists Document shared with recipient; Character claim approved/rejected; Role assignment granted/revoked; direct access grant/deny/revocation; Document review approved/rejected; Document superseded (when watching). Missing: (a) Document share *revoked* — the recipient loses access and receives no signal, yet the ticket's manual acceptance is "Share then revoke a document; inspect notification wording and access behavior when link clicked after revocation," which presumes a revocation notification exists to inspect; (b) any correspondence-delivered event is correctly deferred to P14-T05 but the ticket says "Other audit/activity events do not notify by default," which is fine — but (c) P13-T01 activity projection allowlist includes "explicit access grant/deny/revocation" while the notification allowlist says "direct access grant/deny/revocation for affected User/Character" — the word "direct" appears in the notification list but not the activity list, an unexplained asymmetry an executor could read as "role-derived grants notify but folder grants don't" or vice versa; (d) Domain ownership/admin change is in the activity allowlist but ownership *transfer* (P11-T02, affecting the affected User) is in neither.

**Why it matters:** The manual acceptance in P13-T02 cannot pass as written if the allowlist is implemented "exactly" (no share-revoked notification to inspect). This is a self-contradictory ticket — the executor must either break the "exactly" frozen list or fail manual acceptance. Change control Category C applies.

**Patch:** Either add "Document share revoked (for the recipient whose access was removed)" to the P13-T02 allowlist, or change the ticket's manual acceptance to test a share-*grant* notification only. Also align the "direct" qualifier between P13-T01 and P13-T02 allowlists (state once: notifications fire on direct grants/denies/revocations affecting the recipient; role-derived changes notify via the Role assignment event).

---

## IMPORTANT 6 — P06-T03 Form Studio is scheduled before the P06-T02 adapter proves the `character` field type maps, but its acceptance presumes it

**File:** `tickets/phase-06/P06-T03-customer-form-studio.md` automated acceptance, dependent on `P06-T02-neutral-form-schema-and-payload-migration.md`.

**Evidence:** P06-T02's automated acceptance says: "Adapter fixtures correctly convert text/textarea/date/select/checkbox/character-supported mapping if plugin lacks character use explicit unsupported warning" (garbled sentence, but intent: `character` may map or may warn-as-unsupported). P06-T03's required work 1 then requires "field editor for six supported types" including `character`, with acceptance "UI writes valid neutral schema only." If the Payload Form Builder plugin (the spike's only form authoring source) lacks a character-equivalent field, then there is no fixture path to author a character field until P06-T03 builds the UI for it — fine — but P06-T04's acceptance then requires "Character form value creates DocumentCharacterLink" from a form authored in the studio. The gap: P06-T02 permits `character` to be unsupported by the adapter while P06-T03/04 require it to be first-class. Additionally the P06-T02 acceptance sentence is grammatically broken ("...character-supported mapping if plugin lacks character use explicit unsupported warning") and will be read differently by different executors.

**Why it matters:** Phase 6's gate question ("Can a non-web-developer department head create a useful report form...?") depends on the six field types being real. The broken sentence is exactly the "ambiguous editor/form choice" class the review brief asks about. An executor implementing P06-T02 conservatively (warn-unsupported) then P06-T03 fully (six editors) creates an untestable seam: the adapter test asserts a warning the studio immediately makes obsolete.

**Patch:** Fix the P06-T02 acceptance sentence to: "Adapter fixtures correctly convert text/textarea/date/select/checkbox; the `character` field type is LoreForge-native and has no Payload Form Builder equivalent — the adapter must emit an explicit unsupported-field warning if it encounters a plugin field it cannot map, and the Form Studio (P06-T03) authors character fields directly in the neutral schema." Add one P06-T03 acceptance bullet: "Character field authored in Form Studio survives save/load round-trip with stable key."

---

## IMPORTANT 7 — P12-T04 export omits Personal Domain export and media, while P09 fixture GS-12 and P11-T04 imply it must exist later

**File:** `tickets/phase-12/P12-T04-whole-domain-export.md` frozen context and required work.

**Evidence:** Frozen context: "Export should include Documents/Markdown, metadata, folders, Characters/links, Types/Templates/tags/relationships/provenance and attachments/media later where owned/permitted." Required work 2 includes "media references/files as available." But the ticket's authorization rule is "Only Community Domain Owner and Platform Admin may request full export" — Personal Domains (P09) have no owner-User with that authority (the owner is a Character, and `03_ARCHITECTURE_CONTRACT.md` §5/§6 makes Personal Domain ownership Character-level, `ownerUser` null), so a Personal Domain Character-owner cannot request an export of their own archive under this ticket's rule. `02_FROZEN_PRODUCT_DECISIONS.md` §"Public and Personal Domains" says a "Character can receive independent copies... into the Personal Domain" and the spec §23.2 says "A Community Domain Owner should eventually be able to request a portable export" — the spec scopes export to Community, so the omission is *consistent with the spec*, but the packet never states Personal Domain export is out of scope, and GS-13 (backup/restore) plus P11-T04 entitlement seams imply future portability expectations. Media "as available" is also undefined: before P10-T05 chooses production storage, media is local; after, it's provider-hosted. The ticket does not say whether export includes media bytes, URLs, or a manifest only — "as available" is an executor judgment call on a data-portability promise.

**Why it matters:** Silent scope gaps in export/portability are the class of defect that surfaces as customer data-loss complaints post-launch. "As available" without a rule will be resolved differently by different executors (bytes vs. references), and the Community-only authorization rule makes Personal archives structurally unexportable until some later unspecified ticket.

**Patch:** Add to P12-T04 frozen context: "Personal Domain export is explicitly out of scope for Phase 12; the owner Character's portability path is a future owner decision (see P11 billing gate). This ticket covers Community Domains only." Add to required work 2: "Media: export a manifest of media references plus file bytes only for media owned by the exporting Domain and stored in platform storage; 'as available' means bytes when storage adapter permits direct read, otherwise reference URLs — the manifest must state which." (Or simply: "Export media reference manifest; byte inclusion is P10-T05-dependent and documented in the README/schema version.")

---

## IMPORTANT 8 — Validator's "automated acceptance appears to be only code paths" heuristic (lines 100–103) has both false-positive and false-negative failure modes

**File:** `tools/validate_packet.py` lines 100–103.

**Evidence:** The check: `if any(x in auto for x in ("src/collections/","src/lib/","src/app/","deployment/**")) and not any(k in auto.lower() for k in (...))` — flags a ticket's Automated acceptance section as defective if it mentions source paths and lacks one of ~10 "test-ish" verbs. Two problems: (a) False negative: the heuristic only fires when the acceptance section *contains source paths*, which is unusual — a ticket with an acceptance section full of untestable prose ("UI feels clean") and no paths passes. (b) False positive: an acceptance section like "New `src/lib/search/index.ts` compiles" (contains a path and the word "compiles," which is not in the verb list) would be flagged. The list includes "works" but not "compiles," "builds," "migrates," "installs," "boots." P10-T01's automated acceptance includes "Application boots/works" — "boots" is not in the list but "works" is, so it passes; a slight rewording ("Application boots") would fail. This is fragile string-matching guarding the packet's most important property (testability).

**Why it matters:** The validator is the packet's integrity gate, and this heuristic gives both kinds of wrong answers. Since it currently passes on all 79 tickets (as verified: `python -X utf8 tools/validate_packet.py` → PASS), the false positives are latent, but any post-review ticket edit (e.g., rewording an acceptance line during the IMPORTANT-5 patch above) can trip it and *block the handoff* — or worse, teach the owner that the validator is noise to be ignored.

**Patch:** Invert the check: require every implementation ticket's Automated acceptance section to contain at least one match from a *positive* test-assertion vocabulary (contains/equals/rejects/matches/passes/fails/cannot/does not/verified/proves), and drop the source-path trigger entirely. Keep it simple and deterministic; the current dual-condition logic is the fragile part. (Same category as BLOCKER 1: fix the tool, regenerate SHA256SUMS.txt.)

---

## MINOR 1 — Ticket index line-wraps break copy/paste of ticket paths

**File:** `07_TICKET_INDEX.md` throughout.

**Evidence:** Every ticket entry wraps the path to its own line with two trailing spaces (markdown hard-break), e.g. "`tickets/phase-01/P01-T01-markdown-dialect-and-render-safety.md`  " on its own line. Copying the path from a rendered view includes the trailing spaces; copying from raw text requires manual joining. Most editors handle it, but the packet's own validator does not check path existence from the index (it rglobs the directory instead), so a typo'd path in the index would never be caught.

**Why it matters:** Small friction for every clean-context reader; the index is navigation-only by its own admission, but it is the file most likely to be copy/pasted from.

**Patch:** None required for correctness; optionally join ID, path, and summary onto one wrapped line per entry, and/or add a validator check that every path listed in `07_TICKET_INDEX.md` exists.

---

## MINOR 2 — P10-T05 owner-gate dependency is stated twice with slightly different wording

**File:** `tickets/phase-10/P10-T05-production-provider-configuration.md` "Depends on" (P10-T04, OWNER GATE P10 approved) and "Owner decision dependency" section.

**Evidence:** The Depends-on section already includes "OWNER GATE P10 approved," and the Owner decision dependency section restates "STOP before this ticket unless the owner has filled and approved `owner-gates/P10_DEPLOYMENT_DECISIONS.md`." Redundant but consistent. However, `01_ORCHESTRATOR.md` and `07_TICKET_INDEX.md` both say "Owner gate: `owner-gates/P10_DEPLOYMENT_DECISIONS.md` before P10-T05" — but the *phase-10 orchestrator* (which is what actually controls execution order per its own header) lists tickets in sequence T01→T05 with no gate mention in the ordered sequence, only the ticket's own Depends-on. An executor reading only the phase orchestrator (as instructed by "The current phase ticket files only" read rule in 00_START_HERE) would not see the gate stop before T05.

**Why it matters:** The gate is a hard stop; hard stops should be visible at the phase-orchestrator level, which is the authoritative order-control document.

**Patch:** Add to `tickets/phase-10/00_PHASE_ORCHESTRATOR.md` before the P10-T05 entry: "OWNER GATE: `owner-gates/P10_DEPLOYMENT_DECISIONS.md` must be approved before P10-T05 may begin." Same check for P15 (T00→gate→T01) — the P15 orchestrator does state the gate, verify it appears in the ordered sequence, not only in prose. (Verified P15's orchestrator does include it in the sequence header; P10's does not.)

---

## MINOR 3 — P02-T01 acceptance references `src/collections/Users.ts` and `Characters.ts` before P03 establishes Domain collections; P02-T03 references `DomainMemberships.ts` against "current tenant/Domain entity"

**Files:** `tickets/phase-02/P02-T01-user-sl-placeholder-and-character-model.md` and `P02-T03-character-domain-membership-and-local-context.md` likely code touchpoints.

**Evidence:** P02-T03 required work 1: "Add DomainMemberships against current tenant/Domain entity until P03 rename." The spike's collection is `Tenants.ts` (per SPIKE_SOURCE_MANIFEST), so "current tenant/Domain entity" is `Tenants`. The ticket's touchpoint list names `src/collections/DomainMemberships.ts` (correct, new) and `src/collections/Memberships.ts` (spike, to deprecate). Clear enough. But P02-T01's acceptance says "SL UUID unique across Users" while `03_ARCHITECTURE_CONTRACT.md` §6 specifies `slAvatarUUID` nullable unique on `users` — a database-level unique constraint on a nullable column (SQLite/Postgres permit multiple NULLs, so this works) — but the ticket does not say whether uniqueness is enforced at DB level, Payload hook level, or both. P07-T02 later says "Ensure mutations re-check authorization server-side" but no ticket pins where SL UUID uniqueness lives. Minor because the acceptance is testable either way, but the executor must choose.

**Why it matters:** Payload hook-level uniqueness is race-prone (two concurrent creates); DB-level unique is the safe answer but the ticket doesn't name it. `06_CHANGE_CONTROL.md` Category D (library impossibility) would let the executor stop, or Category A (harmless drift) lets them proceed — the classification depends on which they choose.

**Patch:** Add to P02-T01 required work 5: "Enforce SL UUID uniqueness at the database level (unique index on `slAvatarUUID`), in addition to any application-level validation." One sentence.

---

## MINOR 4 — GS-13 (Postgres backup → restore → rerun) is placed in the fixture contract but its earliest exercisable phase is P10-T03; earlier phases never state which subset of golden scenarios they run

**File:** `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md` GS-13, plus all gate tickets.

**Evidence:** The fixture contract defines 15 golden scenarios without phase mapping. Gate tickets reference scenarios explicitly in some cases (P01-GATE: "Run GS-01 and GS-02"; others: implied). But no gate ticket states its full scenario list, and several scenarios are only exercisable after their phase (GS-10 Form Studio → Gate 6; GS-12 Personal → Gate 9; GS-13 → Gate 10; GS-14 → Gate 14; GS-15 → Gate 15). P10-GATE's ticket says "Verify the product has moved cleanly... without semantic regressions" without naming GS-13, even though GS-13 is precisely the Gate-10 scenario (backup → destroy → restore → rerun). An executor assembling the gate report must infer the mapping.

**Why it matters:** The fixture contract's stated purpose ("Keep stable fixture identities/scenarios across phases") is undermined if gate tickets don't name their scenarios; two executors produce non-comparable gate reports.

**Patch:** Add one line to each gate ticket's Required work: "Run golden scenarios: GS-xx, GS-yy" mapping each to its phase (P01-GATE: GS-01, GS-02 [already present]; P04-GATE: GS-06, GS-07; P05-GATE: GS-08, GS-09; P06-GATE: GS-10; P07-GATE: GS-04, GS-05; P08-GATE: GS-11, GS-02 re-check; P09-GATE: GS-12; P10-GATE: GS-13 plus full regression; P12-GATE: search/import/export scenarios; P14-GATE: GS-14; P15-GATE: GS-15).

---

## MINOR 5 — `STALE_LOREFORGE_FUNCTIONAL_SPEC.md` is required reading for the validator but no ticket or control document instructs anyone to read it

**Files:** `tools/validate_packet.py` REQUIRED_REFS; `10_PACKET_MANIFEST.md` references section; `00_START_HERE.md` read order; `01_ORCHESTRATOR.md` kickoff sequence.

**Evidence:** The validator requires `references/STALE_LOREFORGE_FUNCTIONAL_SPEC.md` to exist, and the manifest describes it as "historical requirements mine only; superseded when it conflicts with frozen decisions." But `00_START_HERE.md`'s authoritative read order (items 1–10) never mentions it, nor does the orchestrator's kickoff or any ticket's pre-read. The review brief mentions it only in passing ("sample every later ticket"). So the file is shipped, hashed, and validated but read by no one per the packet's own instructions — its only role is to exist. If it truly is a mine-only historical artifact, the packet should say when mining is permitted (change-control conflict resolution? P15-T00 protocol design "Read full product decisions"?).

**Why it matters:** Low; but a clean-context executor who discovers it may treat it as background and absorb superseded requirements, since nothing in the read path warns against it except the manifest's one-line description. The manifest is not in the mandatory read order either (items 1–10 skip it).

**Patch:** Add one line to `06_CHANGE_CONTROL.md` §"If source disagrees" or a new subsection: "`references/STALE_LOREFORGE_FUNCTIONAL_SPEC.md` is historical context only; it may be consulted for intent-mining when a frozen decision appears ambiguous, but never overrides frozen decisions, the architecture contract, or tickets." Optionally add it (and the manifest) to the `00_START_HERE.md` read order as non-authoritative context.

---

## MINOR 6 — P15-T03 "short action authorization token/session" introduces a new security primitive without an Architecture Contract section

**File:** `tickets/phase-15/P15-T03-sl-location-restrictions.md` required work 3.

**Evidence:** "Issue short action authorization token/session for document edit start sufficient to permit save of that edit without rechecking location; bind to user/character/document/version and expiration to prevent broad replay." This is a bearer-token/session design with replay-prevention, binding, and expiration semantics — a new security primitive. `03_ARCHITECTURE_CONTRACT.md` §15 (SL boundary) covers process separation and permission precedence but says nothing about action tokens. The ticket is otherwise well-bounded, but the token design (format, storage, lifetime default, revocation on Character switch) is left entirely to the executor, and it is *security-relevant* (a sloppy token could authorize saves on any document for a user, or survive a logout).

**Why it matters:** It contradicts the packet's own stated philosophy (`03_ARCHITECTURE_CONTRACT.md` header: "This file closes implementation gaps that must not be left to a lower-context executor") — a new auth primitive is exactly such a gap. P15-T00 (protocol design) should own it.

**Patch:** Add to P15-T00 required work (protocol design): "Specify the action-start authorization token: binding fields (user/character/document/version), lifetime, single-use vs. windowed-use semantics, and revocation triggers (Character switch, session end)." Then P15-T03 required work 3 references: "Implement the token per P15-T00-approved protocol."

---

## Verified non-findings (checked, no issue)

These were specifically audited per the review brief's required questions and found correctly handled, so the record shows they were checked rather than skipped:

- **Product fidelity:** No generic CMS/page-builder/raw-CSS/raw-HTML-storage alt paths in any ticket; `permission-rules` remains a single centralized collection (P07-T01) rather than per-collection ACLs; no recursive tenant/Subdomain creep (P03-T02 explicitly forbids); Character vs User authority split is consistently enforced (contract §5; P03-T01 owner/User vs. P03-T04 roles/Character).
- **Personal Domains:** Character-rooted (P09-T01), folder-share prohibition tested (P09-T01 acceptance "Folder share API denied for personal kind"), no public site/Subdomains/Roles.
- **Copy/Move/Share/Supersedes:** All four semantically distinct in contract §10 and P05-T02/T03/T04, with provenance invariants and UI-confirmation requirements; P05-T02 explicitly rejects self-links/cycles and duplicate `grouped` rows.
- **Revisions vs. provenance:** Distinct throughout (P04-T02 guardrail: "Do not use revision history as the provenance timeline"; P04-T03 separate append-only collection with actor/revision linkage).
- **Later tickets destroying earlier promises:** No instance found. P02-T03 deprecation of User Memberships is gated on "delete only after migration is verified"; P03-T01 migration preserves IDs/data; P06-T02 discards raw form answers per frozen decision, not retroactively against earlier tickets.
- **Global Character merge Platform Admin only:** Consistent across `02_FROZEN_PRODUCT_DECISIONS.md`, P02-T04 (placeholder only), and P11-T03 (transactional merge with tombstones, blocked on conflicting controllers).
- **Authorization seam consistency:** P07-T02 covers direct API/server-action/list paths, matching contract §7's "All API/server-action/list paths use this subsystem" — no client-side-only enforcement found.
- **Same Captain Role, different scopes:** Explicitly tested (P03-T04 and P07-T03 acceptance).
- **Delegation ≤ possessed authority:** P07-T05 implements contract §8 including the "no delegatable flag; computed from manage_access + capability possession" decision.
- **Infrastructure:** No Postgres/cloud before P10 (P03–P09 tickets all SQLite-local; P10-T01 is the first Postgres ticket; P10-T02 adds the anti-SQLite-boot check). Provider choices all Owner-Gated (P10-T05, P11-T04, P13-T04, P15). SL bridge isolated as separate process (P15-T01, contract §15).
- **Ticket dependencies:** All resolve (validator confirms); no ticket depends on a future ticket; gates depend on all phase tickets; phase orchestrators name all tickets and contain STOP language (validator confirms).
- **Spike baseline fidelity:** Zip SHA-256 matches manifest exactly; the documented Markdown injection gap (render.ts unsanitized `marked.parse`) is precisely what P01-T01 fixes, with the correct defense-in-depth ordering (escape at source, sanitize at render, canonicalize at write).
- **Payload Admin kept out of customer-critical authoring:** P06-T03 Form Studio replaces the Form Builder admin surface; P07-T02 acceptance explicitly tests "ordinary customer users must not receive a broad CMS backdoor."
