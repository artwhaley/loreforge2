# LoreForge Execution Packet — Review Findings (Muse Spark 1.2)

**Reviewer:** Muse Spark 1.2 (clean-context review agent)
**Date:** 2026-09-02
**Scope:** `LoreForge_Execution_Packet` at packet handoff, per `REVIEW_AGENT_BRIEF.md`
**Read order:** `00_START_HERE.md` → `02_FROZEN_PRODUCT_DECISIONS.md` → `03_ARCHITECTURE_CONTRACT.md` → `04_SPIKE_BASELINE.md` → `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md` → `06_CHANGE_CONTROL.md` → `references/FULL_PRODUCT_SPEC.md` → `references/SPIKE_MVP_REVIEW.md` + `references/SPIKE_SOURCE_MANIFEST.md` → `07_TICKET_INDEX.md` → Phase 1 tickets in full + sampled tickets across Phases 2–15 + every `00_PHASE_ORCHESTRATOR.md` + `owner-gates/*`
**Validator:** `python tools/validate_packet.py` → `UnicodeDecodeError: 'charmap' codec can't decode byte 0x9d` at `tools/validate_packet.py:135,164` (`Path.read_text()` without `encoding="utf-8"` on Windows cp1252). Patch: `read_text(encoding="utf-8")`. Not a packet-logic defect. With patch applied, structural validator reports PASS (79 ticket files, 15 gates) — logical defects below still block execution.

**Verdict: NOT ready to begin Phase 1 only.** 9 BLOCKERs must be patched. After patches, ready to begin **Phase 1 only**; Phase 2+ remains owner-gated per `01_ORCHESTRATOR.md:25` / `06_CHANGE_CONTROL.md`.

> Finding format per `REVIEW_AGENT_BRIEF.md:59-63`: **BLOCKER** = cannot safely execute; **IMPORTANT** = likely ambiguity/bug/data leak; **MINOR** = clarity/test improvement. Each entry: file/ticket, exact evidence, why it matters, concrete patch preserving `02`/`03`.

---

## BLOCKER — cannot safely execute

### B1 — `tickets/phase-01/P01-T01-markdown-dialect-and-render-safety.md:28-32` Allowlist undefined
**Evidence:** Ticket says `explicit dialect allowlist` and `Strip dangerous URL schemes while preserving normal http/https/mailto` but never maps `03_ARCHITECTURE_CONTRACT.md:24-32` dialect (paragraphs, H1-H4, bold/italic, ul/ol, links, blockquotes, hr, tables) to `sanitize-html` `allowedTags`/`allowedAttributes`/`allowedSchemes`. Also contradicts `03:40-41` defense-in-depth (`Raw HTML tokens must be escaped before parsing; sanitization remains defense in depth`).
**Why it matters:** Executor invents tags (`img, iframe, svg, div, style, pre, code`) or strips required `table/thead/tbody/th/td` — XSS or broken fixture. Generic CMS sanitizer drift.
**Patch (preserve `03:38-45`):** Add to Required work:
```
- Marked: gfm:true, breaks:false, headerIds:false, mangle:false; escape raw HTML before parsing (tokenizer) so `<div>`/`<script>` never becomes active.
- sanitize-html (server-capable, not DOMPurify) with frozen allowlist:
  allowedTags: ['h1','h2','h3','h4','p','strong','em','b','i','ul','ol','li','a','blockquote','hr','table','thead','tbody','tr','th','td','br']
  allowedAttributes: { a:['href','title'], th:['align'], td:['align'] }
  allowedSchemes: ['http','https','mailto'], allowProtocolRelative:false
  disallowedTagsMode:'escape' (benign `<3` stays visible per P01-T01:44)
- Always strip style, on*, xmlns, form/action, iframe/object/embed/svg/math.
- Store canonical LF Markdown; sanitization never mutates stored Markdown; canonicalizeMarkdown() at every write/import boundary.
```
Add automated acceptance: `render.ts` uses `canonicalizeMarkdown()` on boundary; stored value === LF Markdown; `sanitize-html` runs only on rendered HTML.

### B2 — `tickets/phase-01/P01-T02-editor-save-dirty-and-navigation-ux.md:28-31` Dirty + pending-save + navigation guard underspecified
**Evidence:** `Track dirty state across title, WYSIWYG, and Source edits.` `Prevent duplicate saves while preserving edits made during a pending save.` `Protect against browser/internal navigation` with acceptance `Dirty transitions correctly` / `Edits made while save pending not falsely marked saved` — no definition, no coalescing semantics, and spike uses Next.js `16.3.4` App Router (`src/app/(frontend)` per `references/SPIKE_SOURCE_MANIFEST.md`) where `router.events` / `usePrompt` does not exist.
**Why it matters:** MDXEditor normalizes `**bold**` vs `__bold__` → false dirty; naive `isSaving? disable Save` drops edits typed during 800 ms `await saveDocument()` (data loss); `beforeunload` alone misses `<Link>`/`router.push` (silent discard of dirty work).
**Patch:** Define `dirty = canonicalizeMarkdown(current.title).trim() !== canonicalize(baseline.title).trim() || canonicalize(current.markdown) !== canonicalize(baseline.markdown)` where baseline = last server-confirmed value (not mount). While `saving==true`, disable Save (`aria-disabled`) but keep inputs enabled; if edits occur during save, after `await` resolve keep `status===Unsaved` and second save sends latest value (no stale snapshot). Guard: `beforeunload` + `visibility` for reload/close, plus custom `useDirtyGuard(dirty)` intercepting `Link` clicks/`router.push` with modal `Leave / Stay / Save & Leave`; document App Router limitation per `06_CHANGE_CONTROL.md:27` D if full blocking impossible and file `BLOCKED-P01-T02.md` fallback. Add truth-table tests and broadcast baseline = `canonicalize(response.markdown ?? local)` to both WYSIWYG and Source on success.

### B3 — `tickets/phase-01/P01-T03-editor-toolbar-source-roundtrip-and-accessibility.md:28` Toolbar `table if stable` is executor choice
**Evidence:** Ticket repeats `03_ARCHITECTURE_CONTRACT.md:52` `table if stable` without criteria. `04_SPIKE_BASELINE.md:29` custom Source preserved structure better than MDXEditor built-in diff.
**Why it matters:** Executor subjectively enables broken `insertTable` that corrupts GFM `| a | b |`; corrupts `GS-01 Canonical edit` `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md:86`.
**Patch:** Enumerate allowed toolbar `undo, redo, h1-h4 dropdown, bold, italic, ul, ol, link, blockquote, hr, table` — forbidden `image, codeBlock, code, frontmatter, diffSource, html`. Rule: include `table` only if it round-trips `canonicalize(source) === canonicalize(WYSIWYG->Source->WYSIWYG)` for fixture covering H1-H4, nested 2-level lists, blockquote containing list, table, link, hr; else omit and document `execution-notes/P01-T03.md` with input/output/version.

### B4 — `tickets/phase-02/P02-T04-character-claims-public-profiles-and-local-aliasing.md:28` Temporary dev authority is persistent backdoor
**Evidence:** `Add CharacterClaimRequests state machine and request/approve/reject UI using temporary development authority until P07.` vs `02_FROZEN_PRODUCT_DECISIONS.md:20` `authorized Domain actor approves/rejects ordinary claims` implying `manage_members` capability under `03_ARCHITECTURE_CONTRACT.md:232-249` deterministic evaluator. No ticket mandates removal.
**Why it matters:** Bypass survives to production if `P07-T02` wiring misses this path; non-owner can approve via direct API; no audit of acting Character — authorization leak + provenance hole.
**Patch:** Amend to `Temporary authority = isPlatformAdmin OR Domain ownerUser only, gated server-side, audit event character_claim_decided with actor User + acting Character`. Add `TODO(P07-T02): replace with evaluator capability manage_members/approve_claim` and automated acceptance `Non-owner/non-admin cannot approve even via direct API`. Add `P07-T02` checklist: `bypass deleted; grep proves no direct insert`.

### B5 — `tickets/phase-04/P04-T02-payload-versions-and-edit-guards.md:29` Retention is not frozen
**Evidence:** `Enable Payload Versions for Documents with sufficient retained revisions for product history; do not prune by arbitrary small count.` vs `02_FROZEN_PRODUCT_DECISIONS.md:54` `Full content revisions are retained.` and `03_ARCHITECTURE_CONTRACT.md:176` `Payload Versions enabled.` / `P04-T02:24` `Full historical bodies must be retained`.
**Why it matters:** `maxPerDoc=50` default pruning destroys history, breaks `P04-T03` provenance `revisionId` linking, violates `06:43` no casual destruction.
**Patch:** `Enable Payload Versions with maxPerDoc=undefined (retain all). Add config test asserts maxPerDoc not small; pruning requires owner Change Control C (06:20).` Add acceptance: editing `Draft/Filed` creates version; restore creates new version without erasing history.

### B6 — `tickets/phase-05/P05-T02-grouped-and-supersedes-relationships.md:28-31` Contradicts frozen relationship contract
**Evidence:** `optional label for grouped` vs `03_ARCHITECTURE_CONTRACT.md:199` ``label` required for grouped`` + `02_FROZEN_PRODUCT_DECISIONS.md:60` human label required; `Prevent cycles in supersedes graph` vs `03:202` `A Document may have at most one direct superseding successor; correcting that relationship is audited.`
**Why it matters:** Null-label grouped is unrenderable; diamond `B supersedes A` and `C supersedes A` breaks `A<-B<-C` chain `P05-T02:41` and `GS-07` history.
**Patch:** `DocumentRelationships: kind=grouped => label NOT NULL trimmed maxlength>0 (DB check); kind=supersedes label NULL. Enforce Unique(target) where kind=supersedes (older has one successor) where not soft-deleted + reject self-links; add 409 test for second supersedes targeting same older doc.` Also require both Documents exist and add provenance via `writeProvenanceEvent` (see B8).

### B7 — `tickets/phase-09/P09-T01-character-owned-personal-domain-policy.md:29-43` Folder sharing not denied at evaluator
**Evidence:** `Personal Domain: no public site, no Subdomains, no organizational Roles, no folder sharing` `02_FROZEN_PRODUCT_DECISIONS.md:92` / `03_ARCHITECTURE_CONTRACT.md:104-108` `At most one Personal Domain per Character`. Ticket only says `Folder share API denied for personal kind`; `03:218-228` evaluator could still grant Folder `PermissionRule` on `kind=personal`.
**Why it matters:** Authorization leak — Document share vs Folder inheritance conflated; Personal Domains become small Community Domains.
**Patch:** In evaluator + Payload hooks, if `Domain.kind=personal && resourceType=Folder` → deny `folder sharing prohibited in Personal Domain` with code. DB constraint `kind=personal => no Subdomain/Role rows`. Unique partial index `(personalOwnerCharacter) WHERE kind=personal AND deletedAt IS NULL` (allow recreation after soft-delete, forbid two active). Add test: folder grant 403 while Document share succeeds; `Lucan` vs `Elara` isolation test.

### B8 — `tickets/phase-14/P14-T03-garble-intercept-fail-and-history.md:29` Missing `delay → approved_waiting` transitions
**Evidence:** `P14-T02:30` queue promises actions `deliver now, delay, deliver modified/garbled, intercept/fail`. `P14-T03:29` implements only `queued_for_review->delivered/intercepted/failed`; omits `Delay: queued_for_review->approved_waiting` and `Garble+Delay -> approved_waiting` and worker `approved_waiting->delivered` defined in `03_ARCHITECTURE_CONTRACT.md:377-382` / `02_FROZEN_PRODUCT_DECISIONS.md:104` `due time is calculated from original sent time. If GM never reviews, nothing auto-decides.`
**Why it matters:** Clicking delay 500s or never auto-delivers at due; `GM can delay` promise broken; garbled+delayed cannot be queued; violates `GS-14` moderation.
**Patch:** Add to `P14-T03` Required work 1: `Delay: queued_for_review->approved_waiting with dueAt=sentAt+chosenDelay (immutable sentAt); Garble+Delay: queued_for_review->approved_waiting with deliveredBody; worker idempotent approved_waiting->delivered when now>=dueAt (requires jobs runner per 03:392-395).` Render countdown in `P14-T02` queue. Add `P14-T04` worker integration tests: delay preserves `sentAt`, not delivered before due, delivered after via worker. Also add `FileCorrespondenceToDocument` per `03:398-399` (recipient-filed garbled must not leak original — redact to `deliveredBody` only, provenance pointer to source Correspondence).

### B9 — `tickets/phase-05/P05-T03-document-copy-and-move.md:31-33` Source audit pointer + authz stub missing
**Evidence:** `Cross-Domain preserves ID/history/lifecycle, changes Domain/Folder, maps Type` `03:304-307` `Source Domain keeps an audit pointer/event to destination.` — ticket's acceptance `Cross-Domain move retains same ID/history` does not require it. Also `source/destination authorization hooks compatible with P07 evaluator` without stub.
**Why it matters:** Destructive cross-Domain move loses trace after Document leaves source; copy/move ships with `if(user)` check before P07 — cross-Domain exfiltration.
**Patch:** On cross-Domain move, write two provenance events: `moved` on moved Document + audit stub still queryable by source Domain admins via `sourceVersionId/hash`. On copy, provenance `copied_from/copied_to` with `sourceVersionId+hash` captured transactionally at source creation. Implement `canCopy/canMove` stub checking `DomainMembership` now, mandatory `TODO(P07-T02): replace with capability copy_document/move_document on source+destination Folder/Document per 03:228` and grep check that stub deleted. On cross-Domain copy, drop `Tags` (Domain-owned `03:192`) and `DomainCharacterContext` alias; preserve global `CharacterLinks`; UI notes `Tags/relationships not copied`.

---

## IMPORTANT — likely ambiguity/bug/data leak; patch before phase

### I1 — `P01-T01:32` / `03:41` Dangerous URL schemes incomplete
Missing `JAVASCRIPT:`, whitespace `java\tscript:`, `&#106;avascript:`, `vbscript:`, `data:text/html`, protocol-relative `//evil`. **Patch:** Strip `javascript:, data:, vbscript:, file:` case-insensitive/encoded/whitespace → `#`/remove; relative links without scheme allowed; add corpus tests for each obfuscation.

### I2 — `P01-T01:25` No fallback
`sanitize-html is approved unless package compatibility makes it impossible` `03:40` vs ticket mandatory. **Patch:** Add frozen context: if `sanitize-html` cannot install on `Next 16.3.4 / Payload 3.88.0` lockfile, STOP per `06_CHANGE_CONTROL.md:27` D, file `BLOCKED-P01-T01.md`.

### I3 — `P01-T04:29` Theme schema deadlock
`improve within current schema` vs `03:338-351` tokens `contentWidth, documentStyle, headerLayout` needed for contrasting presets; spike had 2 presets/4 colors per `SPIKE_MVP_REVIEW.md`. **Patch:** Clarify: may add curated values within existing `Tenants.theme` JSON fields but not new Payload fields in P01; if contrasting `GS-02` impossible without new field, document BLOCKED and defer field addition to `P08-T01`.

### I4 — `P01-T04:32` City wording sweep undefined
`Replace hard-coded city wording where appropriate.` **Patch:** Provide map `city→Domain/community, tenant→Domain (UI only; schema Tenants unchanged until P03 per 04:58), department→Subdomain label via vocabulary`; grep test `grep -R city` zero customer-facing matches outside seed/fixtures; update `src/seed/index.ts` only in `P01-T04`.

### I5 — `P02-T02:P02-T02-active-character-domain-context.md:33` Active context before membership
`When switching Character, clear/validate active Domain as memberships become available.` but `DomainMemberships` not created until `P02-T03`. **Patch:** Add `TODO(P02-T03): re-validate active Domain against DomainMemberships` and test `Character B cannot keep Character A Domain after switch (stubbed until T03)`.

### I6 — `P02-T03:character-domain-membership-and-local-context.md:33` Legacy `User Memberships` leak
`Deprecate old User Memberships; delete only after migration is verified.` No ticket ever forbids `P07-T01` evaluator reading them. **Patch:** Data migration `User Membership -> DomainMembership(Character)`; evaluator gathers only `DomainMembership/SubdomainMembership`, never legacy `Memberships`; test legacy row does not grant.

### I7 — `P04-T02:44` Revision retrieval authz insufficient
`Revision retrieval is Domain-scoped` — any member can read any Document's history. Per `03:249` `Filter inaccessible rows before return` and `P07-T02:28`, must be `read` capability on Document via evaluator (stub until P07). **Patch:** `read` check on revision list/preview; `TODO(P07-T02)` wiring; test direct REST fetch of another Domain's revision 403.

### I8 — `P04-T03:document-provenance-and-history-timeline.md:30-32` Provenance helper optional
`Create a single provenance-writing service used by document ... as those paths come online.` **Patch:** Mandate `writeProvenanceEvent()` helper; CI grep forbids direct insert into `DocumentProvenanceEvents` outside helper; ordinary `update/delete` denied (`403`), `isPlatformAdmin` repair must itself append audit event with before/after hash; add tests. Apply to `P05-T02/T03/T04, P07-T05, P09-T03, P14-T02/T03, P15-T01`.

### I9 — `P05-T04:document-sharing-and-action-ux.md:29` PermissionRule shape drift
Limiting to `direct Document read/edit grants` tempts narrow `documentShares` table vs full `03:218-228` polymorphic `principalType User|Character|Role|DomainMembership|SubdomainMembership` / `resourceType Domain|Subdomain|Folder|Document`. **Patch:** Create full `PermissionRules` now (writes only `Document`/`User|Character`/`read|edit_document` this ticket), check column set matches `03`; share principal search scoped to Domain members + `DomainCharacterContext`; share/revoke provenance with redaction (unauthorized reader never sees hidden recipient).

### I10 — `P07-T01:authorization-rule-model-and-evaluator.md:42-47` Precedence incomplete
Acceptance lists `direct Character grant overrides broader direct deny; role grant cannot override direct deny` but omits top tiers `PlatformAdmin allow+audited, Community Owner/User-level Admin full access, Personal owner full access subject to Personal policy` `03:235-237` and membership defaults last `03:240`. **Patch:** Add table-driven tests for each tier plus `DomainMembership` grant on Domain allows read to all Folders unless denied, `SubdomainMembership` does not leak.

### I11 — `P07-T02:server-and-payload-enforcement.md:29-42` Wiring gaps
No composition with lifecycle (`Locked/Pending frozen` `P04-T02:25`) and no public Character profile exception (`02:19` `Character->controlling User public by default`, `02:88` public profiles show only public-linked records) and count leakage. **Patch:** Mutations check `lifecycle editability AND evaluator.can(edit_document)`; `Characters` read allows public profile fields for any authenticated principal unless explicitly denied / anonymous only public-linked; list/search filters suppress `totalDocs`/titles/counts for denied rows.

### I12 — `P07-T05:delegated-administration-and-role-creation-boundaries.md:30` Delegation missing `possess X`
Must possess `manage_access` on R AND `X` on R AND scope covering R `03:252-256` — acceptance tests scope but not `possess X`. **Patch:** Enforce both; test `Manager with manage_access but lacking edit_document cannot grant edit_document → 403` (forge API payload).

### I13 — `P09-T03:file-there-and-keep-personal-copy.md:32` Keep-copy hash not pinned
`Personal copy provenance records Community source and source version/time` `P09-T03:27` vs implementation note `if personal copy fails, report clearly`. **Patch:** Capture `sourceVersionId + canonical body hash` at Community creation within transaction; write `copied_from/copied_to` on both Documents; test editing Community after keep-copy does not change personal provenance hash; `Copy-to-Personal` on existing doc requires `read + copy_document` on source and `create_document` on Personal Folder (evaluator), not just `activeDomain` check; IDOR test `P09-T03:43` must go through evaluator.

### I14 — `P10-T01:postgres-adapter-and-local-migration.md:31-32` Migration hashes incomplete
`Write one-shot SQLite->Postgres migration/import tool` must preserve IDs/history/provenance `P10-T01:26` yet omits `DocumentVersions, DocumentProvenanceEvents.revisionId, PermissionRules, slVerificationState`. **Patch:** Validate counts AND LF-normalized hashes for `Domains, Documents, DocumentVersions, DocumentProvenanceEvents (with revisionId), PermissionRules, Characters, Memberships, Tags, Relationships`.

### I15 — `P14-T02:moderated-correspondence-policy-and-gm-queue.md:29` Capability not in P07 set
`moderate_correspondence` not in `03:227` list; evaluator must be extended without changing semantics `P07-T01:32`. **Patch:** Extend evaluator capability set in this ticket; test only `moderate_correspondence` grant sees queue; ensure `P14-T05` filing creates independent Document via `writeProvenanceEvent` with redaction (recipient filing garbled sees only `deliveredBody`).

### I16 — `P15-T01:sl-bridge-service-skeleton.md:48-49` Bridge can forge provenance
`Do not duplicate evaluator in bridge` / `Do not store canonical Documents in bridge` insufficient. **Patch:** Bridge→core event endpoint validates HMAC/service token + persisted idempotency `requestId` store in core DB (not bridge memory); core re-validates `export_document` via evaluator before logging `sl_transfer` and before instructing bot to deliver notecard; replay `requestId` → 200 without second provenance row; fake token 401. Pin `LibreMetaverse` exact version.

### I17 — `P15-T03:sl-location-restrictions.md:32-52` Location token replay / evaluator separation
Token bound to `user/character/document/version` correct but must also include `folderId, nonce, expiresAt ~15m` and be version-bound to prevent replay to sibling Document. Guardrail `Do not embed simulator coordinates logic in generic permission evaluator` needs enforcement. **Patch:** Token = JWT/DB row `{userId,characterId,documentId,folderId,versionId,issuedAt,expiresAt,nonce}`; validate on save matches Document ID and `edit_document` still holds; add grep test `src/lib/authz/evaluate.ts` never imports `src/lib/sl/*`; error codes `location_check_failed` vs `unauthorized` distinct.

### I18 — Cross-phase TODOs missing
`P05-T02/T03/T04` ship before `P07-T01/T02` but say `compatible with P07 evaluator` without hard retrofit. **Patch:** Add `TODO(P07-T02): replace stub with shared evaluator` to each `P05` ticket and `P07-T02` checklist: `Verify P05-T02/T03/T04 now call shared evaluator; stubs deleted; integration tests prove direct API bypass fails`.

---

## MINOR — clarity/test improvement

- **M1 — Required pre-read:** `00_PHASE_ORCHESTRATOR.md:9` says `00_START_HERE through 06_CHANGE_CONTROL` but every `P01` ticket lists only `00,02,03,04,05,00_PHASE_ORCHESTRATOR`. Add `01_ORCHESTRATOR.md` + `06_CHANGE_CONTROL.md` to every ticket pre-read.
- **M2 — `Regenerate Payload types after schema changes.`** in `P01-T01:56` etc. P01 has no schema change per `04_SPIKE_BASELINE.md:64`. Change to `only if schema file changed in this ticket; otherwise verify no-op`.
- **M3 — Test harness:** `P01-T01:32` `include them in project test script` — specify `src/lib/markdown/render.safety.test.ts` wired to `package.json#scripts.test` / `npm test`.
- **M4 — `P01-T04:30` upload security:** Require `image/png|jpeg|webp|svg (sanitize svg via T01 sanitizer or reject script)` max 2 MB, server `activeTenant` scope check via `src/lib/tenant/scope.ts`, missing `logoUrl` shows placeholder without breaking CSS; authz test.
- **M5 — `P04-T01:24` seeding:** Clarify `one active Plain Text Document Type per Domain (unique(domain,name))` + `one blank Template per Domain scoped to Domain root availableToDescendants=true`; test two Domains have independent IDs.
- **M6 — `P01-GATE:review-gate-1.md:30-42`:** Gate lacks `typecheck/lint`, malicious corpus definition, report location, severity grading, `no src/ change` guard. Patch: `typecheck+lint+build`, corpus = `P01-T01` safety suite + `P01-T03` round-trip fixtures + 10 OWASP payloads (inert output, no `script/on*/javascript:`), produce `execution-notes/P01-GATE.md` + `PHASE_01_REVIEW.md` at repo root; gate MUST NOT modify `src/`; if corruption reproduced → BLOCKER per `P01-T03:33`.
- **M7 — Orchestrator branch + tagging:** `01_ORCHESTRATOR.md:15` / `00_START_HERE.md:46` require `mvp-baseline` tag — add step 0 before `P01-T01`. Add to `00_PHASE_ORCHESTRATOR: No Postgres/provider/media changes until P10 per 06_CHANGE_CONTROL.md:31` and `No recursive Subdomains per 06:38`.

---

## Product fidelity checks (per `REVIEW_AGENT_BRIEF.md` required questions)

- **Generic CMS/page builder/raw form storage/alt-linking/recursive tenant creep:** PASS — correctly deferred; `06:31-38` forbidden scope (`Puck/GrapesJS, raw CSS, recursive Subdomains`) enforced; `P04-T02`/`P06` keep `02:50` form answers discarded.
- **Permission/membership Character vs User:** PASS after B4/I5/I6; otherwise B4 leaks approval to User level.
- **Owner/User vs Character authority:** PASS — `03:58-63` split preserved; Personal Domain Character-rooted after B7.
- **Personal Domain Character-rooted and folder-sharing forbidden:** FAIL until B7/I13.
- **Revisions/provenance distinct:** FAIL until B5/I8.
- **Copy/Move/Share/Supersedes unambiguous:** FAIL until B6/B9.
- **Global merge Platform Admin only:** PASS — `P02-T04:33` placeholder defers mutation to `P11-T03`; add DB constraint `status=merged <=> mergedInto NOT NULL`.
- **Deterministic direct>Role>membership, deny-wins, most-specific:** FAIL until I10/I11/I12.
- **Same Captain Role scoped branches:** PASS — `03:150-154` `scopeFolder` preserved.
- **Delegation limited to possessed scope:** FAIL until I12.
- **API/search/public share `evaluator` boundary:** FAIL until I7/I11 (revision restoration, list counts).
- **UX tuning before dependencies:** PASS for Phase 1 (intentional `P01-GATE` before identity/permissions), but `P01-T02` navigation guard impossible needs B2 patch (App Router).
- **No Postgres/cloud before P10; provider Owner Gates; SL bridge isolated:** PASS — `03:11-13` + `06:31` correctly enforced; `P10-T01` first Postgres switch; `P10-T05`/`P15-T00` correctly STOP; `P15-T01:48` separate process but I16/I17 needed.
- **Tickets have prerequisites; no future feature assumed early; gates hard stops:** PASS with fixes — gates correctly list `Depends on` all phase T tickets; `P02-T02→T03`, `P05→P07`, `P14-T02→T03` ordering holes fixed by I5/I18/B8.

## Infrastructure & dependencies

- **P10-T05 / P15:** `owner-gates/P10_DEPLOYMENT_DECISIONS.md:4-11` blank and `owner-gates/P15_SL_PROTOCOL_APPROVAL.md:13` `NOT YET APPROVED` — correctly blocking. Executor must create `BLOCKED-P10-T05.md` / `BLOCKED-P15-T01.md` per `06:C` and may prepare factual comparison but may not choose providers/protocol. `03:415-422` owner-only decisions honored.
- **SL boundary `03:401-405`:** Bridge never bypasses core permissions, never writes DB directly, talks via authenticated service endpoints/jobs — tickets honor but I16/I17 prevent forgery/replay.
- **Search `03:365` / `P12`:** `PostgreSQL native full-text` (no Elasticsearch) correctly deferred; `permission-aware` requires I11 list filtering.
- **Correspondence `03:398-399`:** Filing into archive requires `sender/recipient/moderator + create_document` and redacts original from recipient-filed garbled — missing in sampled Phase 14 until B8/I15 patch.

## What to fix first (minimal diffs, preserve frozen decisions)

1. `tools/validate_packet.py:135,164` → `read_text(encoding="utf-8")`.
2. Patch tickets with B1-B9 + I1-I18 + M1-M7 (all edits are additive Required work / Guardrail / Acceptance, no redesign of `02`/`03`).
3. Create `BLOCKED-P10-T05.md` and `BLOCKED-P15-T01.md` evidence per `06:C` (executor must STOP there).
4. Re-run `python tools/validate_packet.py` — must PASS.

---

*Review agent stance: Do not redesign LoreForge or suggest fashionable alternatives without a concrete problem. All patches above are the smallest change that closes a contradiction, provenance hole, or authorization leak while preserving `00_START_HERE.md:40-43` Phase 1-only authorization and `01_ORCHESTRATOR.md` one-phase-at-a-time protocol.*
