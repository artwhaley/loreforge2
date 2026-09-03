# LoreForge Ticket Packet — Consolidated Review Disposition

**Synthesis date:** 2026-09-02  
**Authority used:** `02_FROZEN_PRODUCT_DECISIONS.md`, then `03_ARCHITECTURE_CONTRACT.md`, then the current ticket stack/full spec. Reviewer majority was not treated as authority.  
**Reviews adjudicated:** BigPickle, Claude, Deepseek Flash 0731, Gemini, GLM 5.3 Flash, GLM 5.3 free/tokenrouter, Muse Spark 1.2, plus the synthesizer's independent full-stack/source audit.

This file is review working material, not an executor instruction. Accepted changes have been incorporated into the authoritative packet files. It is deliberately excluded from `SHA256SUMS.txt` and the executor read order.

## Result

The structural/content stack has been repaired and the strengthened validator passes with 79 tickets: 64 implementation/design tickets and 15 hard review gates across 15 phases. Exact SHA-256 validation now covers every authoritative packet file.

One owner-only prerequisite remains open: `owner-gates/P00_MVP_BASELINE_APPROVAL.md`. The reviewed candidate is commit `b92b6f054f22c6ad28e23f00de7926603fb383d7`, matching the submitted spike baseline evidence, with 15 observed baseline tests passing. A reviewer cannot approve it for the owner. Phase 1 is first eligible but remains blocked until that exact commit/tag is approved in P00.

## Accepted findings and resulting contract changes

### Packet integrity and execution control

- Fixed every locale-dependent `read_text()` call in `tools/validate_packet.py`; plain `python tools/validate_packet.py` now works on default Windows rather than requiring `PYTHONUTF8`.
- Validator now verifies exact bytes against `SHA256SUMS.txt`, exact authoritative file membership, nonempty bullet-based automated/manual acceptance, and ticket-index paths. Review working files are explicitly excluded instead of accidentally unmanifested.
- Populated Automated acceptance in P04–P15 gates.
- Added P00 exact-baseline approval; reconciled `00_START_HERE`, master kickoff, Phase-1 status, and executor prompt.
- Corrected the full-spec section range, strengthened the review-agent read order to require every ticket/orchestrator/owner gate, clarified the stale spec's non-authoritative role, and made P10's provider gate visible at the T05 sequence point.

Primary sources: all non-Gemini reviews on the Windows crash; BigPickle/GLM/Deepseek on empty gates; GLM free/tokenrouter on review-order and P10 visibility; independent audit on missing hash validation/baseline contradiction.

### Phase 1 safety and UX

- Froze the exact Markdown sanitizer tag/attribute/scheme allowlist, GFM/break behavior, raw-HTML treatment, obfuscation corpus, and compatibility stop path.
- Froze dirty/save semantics as snapshot acknowledgment, one in-flight request, edits-during-save remaining dirty, stale-response protection, and browser plus internal navigation interception. Required a pure state module under the existing `node:test` runner.
- Replaced `table if stable` discretion with a three-cycle round-trip/save/reopen/keyboard criterion.
- Added server media rules: decoded/re-encoded JPEG/PNG/WebP only, 5 MiB, 4096x4096, no SVG/polyglots/mismatch/bombs.
- Split Phase-1 Theme Studio tuning from Phase-8 schema/vocabulary/public-surface productization; made terminology scan boundaries exact.
- Defined the owner branch if MDXEditor is rejected at Gate 1 and prohibited source edits in the review gate itself.

Primary sources: Muse Spark; GLM free/tokenrouter; independent source audit of the missing UI-test harness and unsafe `image/*` baseline.

### Character, membership, and interim authority

- Defined one pre-P07 server authorization boundary and exact operation/actor matrix; made it auditable and required P07 to delete the helper, legacy Tenant-admin branch, and temporary Share adapter.
- Added `manage_claims`, wired `CharacterClaimRequests` through P07, and required concurrency-safe claim decisions.
- Defined deterministic User-Membership to Character-membership migration, including ambiguous multi-Character Users, legacy admin staging, idempotent reconciliation, and no access fan-out.
- Removed P02's temptation to validate active Domain against obsolete User Memberships: character switch clears Domain; P02-T03 re-establishes it from Character membership.
- Added database SL UUID uniqueness and safe public controller projection.
- Added the final CharacterMergeRequest schema in P02 and made P11 consume it instead of inventing a second model.
- Made Tenant-to-Domain migration preserve/reconcile bodies, relations, theme/media, forms/pages/folders, and membership rows without fixture reset.

Primary sources: BigPickle and Deepseek on claims; Claude on merge-request schema and Phase-6 interim authority; GLM free/tokenrouter on P02 ordering/P03 migration; Muse/independent audit on membership migration.

### Documents, relationships, sharing, templates, and permissions

- Changed revision retention from `sufficient` to unlimited until owner change control; required direct revision-read authorization.
- Made grouped labels required and Supersedes single-successor/correction auditing testable.
- Froze Copy/Move metadata, Tag/relationship/Character-link behavior, source audit pointers, and source/destination authorization matrix.
- Built P05 Share on the final PermissionRule shape with temporary read/edit enforcement and mandatory P07 replacement. Final Share delegation is `manage_access + share_document + possessed granted capability`; edit permission alone is not enough.
- Froze relationship and link/tag mutation authorization.
- Rejected implicit base-template concatenation; bases require exactly one `{{content}}`.
- Reconciled the neutral `document|form` Template shape and Payload-adapter/Character-field boundary.
- Froze User-direct versus Character-direct conflicts as one direct tier: specificity first, deny on ties.
- Added Subdomain-admin Role creation and exact revoke semantics.

Primary sources: Muse, GLM Flash, Deepseek, and independent audit; GLM free/tokenrouter on the direct-tier tie and malformed form-adapter sentence.

### Public surfaces, theming, Personal Domains

- Defined public access as resource policy rather than a fake PermissionRule principal: Domain enable, Folder inheritance, Document/Page overrides, private-container redaction, and filter-before-count/search/facet rules.
- Added safe public Character/User projection requirements.
- Removed independent text-color tokens, added the scheduled background treatment, and enumerated the only vocabulary slots.
- Required Bayview installation in P08 and a disposable non-Bayview destination for P05 acceptance.
- Made Personal Domain uniqueness one row per Character regardless of lifecycle, defined dev/production provisioning, reused the constrained theme system, and enforced no public/Subdomain/Role/folder-share paths in evaluator/server hooks.
- Made keep-copy atomic, idempotent, source-version/hash pinned, and independently authorized.

Primary sources: GLM Flash/Deepseek on public access and missing background token; Muse on evaluator-level Personal policy; independent audit on uniqueness/provisioning/keep-copy.

### Production, platform, import/export, notifications, correspondence, and SL

- Expanded SQLite→Postgres migration reconciliation and made restore acceptance use verified disposable targets.
- Froze Community lifecycle actor/state behavior and a transactional Character-merge reference matrix.
- Defined hostile ZIP limits, path rules, per-file transactions/idempotency, and Draft behavior for imports.
- Defined consistent-snapshot Community Domain export contents, media bytes/checksums, secret/cross-Domain exclusions, and download reauthorization; explicitly left Personal export out of Phase 12 because the full spec scopes this ticket to Community Domains.
- Defined activity source identity, notification/watch Character context, share-revocation notification, and the watch forward-reference/default-descendants behavior.
- Froze correspondence send identity/membership, sender-status derivation, delayed transition ownership, filing authorization, and recipient-only body-free notification.
- Bound P15 owner approval to an exact proposal commit/hash, defined location inheritance and edit-session semantics, required real SL final acceptance, and made core—not bridge—authorize and persist idempotency/provenance.

Primary sources: Deepseek on P13 forward reference; GLM free/tokenrouter on share revoke and edit-session contract; Muse on migration/bridge hardening; independent audit on lifecycle/import/export/correspondence/location details.

## Rejected or narrowed findings

### Gemini — rejected in full

1. **Alleged Phase-1→6 schema ordering defect:** false. P02-T01 is in Phase 2 and the packet enforces sequential phase gates; no instruction runs Phase 6 migrations before it.
2. **Alleged Phase-4/Phase-6 parallel race:** false. The master orchestrator expressly forbids parallel phases; P06 depends transitively on P04/P05 gates.
3. **Alleged missing P03 prerequisite for P07:** false. The gate chain is transitive and validator-confirmed.
4. **Checksum normalization proposal:** rejected as unsafe. Byte checksums are supposed to detect CRLF/whitespace drift. Normalizing before hashing would weaken the integrity guarantee; the original validator did not even perform the claimed hash operation.

### Muse Spark — false positives or over-prescription

- **B8, missing Delay transitions in P14-T03:** false. P14-T04 deliberately owns `queued_for_review -> approved_waiting` and worker delivery; P14-T03 owns terminal modified/intercept/fail transitions. Combining them would blur ticket ownership.
- **`manage_members` as the implied claim capability:** rejected. Claim control is security-sensitive and semantically distinct; the stack now uses explicit `manage_claims`.
- **JWT/15-minute SL token shape:** rejected. JWT, exact fields, and 15 minutes were implementation guesses and a 15-minute expiry undermines long editing. The contract uses an authenticated server-recorded session bound to User/Character/Document/version, 8 hours or first save/close, with local body preservation.
- **Allow/sanitize SVG theme uploads:** rejected. SVG is unnecessary for the contracted raster theme assets and materially enlarges the XSS parser surface; it is rejected server-side.
- **Brittle grep as the provenance security boundary:** narrowed. One append-only service and mutation tests are mandatory; a text grep cannot prove runtime exclusivity and would create false confidence.

### BigPickle / Deepseek temporary-Share wording

The recommendation that pre/final Share be permitted merely to a principal with `edit_document` was rejected. The frozen delegation contract requires `manage_access`, `share_document`, scope, and possession of the capability being granted. Pre-P07 Share is conservatively owner/admin-only.

### Claude / GLM fixture proposals

Bayview is not pulled into Phase 5. P05 uses a disposable, clearly non-fixture destination; P08 installs stable Bayview from the Modern pack and reruns the scenario. This preserves starter-pack phase ownership while keeping P05 acceptance executable.

### GLM free/tokenrouter — narrowed claims

- Conditional sender-status defaults were not inherently contradictory; the actual conflict was P14-T03's extra configurable mapping. The contract now stores a mode-derived default and permits only the two frozen outcomes.
- Personal Domain export is not a missing Phase-12 requirement: the full spec explicitly promises this full export to Community Domain Owners. Media ambiguity was real and fixed; Personal portability remains an explicit future owner decision.
- Ticket-index Markdown hard breaks are cosmetic; instead of churn, the validator now verifies every indexed ticket path exists.
- P10 owner-gate wording was redundant but already present in the phase exit rule; a sequence-local stop was added for discoverability, not because the gate was absent.

### Review `Verified consistent` claims rejected

BigPickle and Claude said Copy/Move/Share/Supersedes, Personal uniqueness, revisions, and/or Phase 1 were fully consistent. Those conclusions were too broad: the ticket text demonstrably had optional-vs-required grouped labels, omitted the single-successor rule, left copy metadata behavior open, said `one active` Personal Domain, used `sufficient` revision retention, and left several Phase-1 security/state decisions unstated. Their positive findings remain useful, but these pass assertions were not accepted.

## Review quality assessment

Scores emphasize contract fidelity, full-stack coverage, novelty, evidence, severity calibration, and false-positive rate—not prose length.

| Rank | Review file/model | Score | Assessment |
|---:|---|---:|---|
| 1 | Deepseek Flash 0731 | 9.0/10 | Best overall balance of breadth, evidence, cross-review adjudication, and mostly sound severity. It uniquely surfaced the missing P08 background treatment and P13 watch forward-reference. Some minor recommendations were over-specific, and it accepted a few areas as cleaner than they were. |
| 2 | GLM 5.3 free/tokenrouter | 8.6/10 | Best late/novel pass: review-order defect, Theme phase boundary, P02 context sequencing, P03 migration reconciliation, direct User/Character tie, malformed form adapter, Share revoke, and SL session contract. Lost points for calling four items blockers, overstating the sender-default issue, and treating Personal export as a likely omission despite the spec. |
| 3 | Muse Spark 1.2 | 8.2/10 | Widest security/UX scrutiny and the strongest Phase-1 state-machine/sanitizer critique. It caught multiple issues the synthesizer's first pass had not made explicit. Severity was substantially inflated, B8 was wrong, and several patches hard-coded implementation choices beyond the frozen product decisions. |
| 4 | GLM 5.3 Flash | 7.8/10 | Concise, high-signal core review: Windows gate, early Share enforcement, public policy, single-successor invariant, plus useful gate/read-list/fixture minors. Good precision but missed claims/interim authority and most Phase-1 details. |
| 5 | BigPickle | 6.8/10 | Excellent narrow catch on `manage_claims` and missing CharacterClaimRequests wiring, plus the validator/gate defects. Too shallow for a packet-wide audit and issued several demonstrably false `verified consistent` passes. |
| 6 | Claude | 6.6/10 | Highest precision among the short reviews: all three findings were useful, especially the cross-phase merge-request schema. Recall was low and its broad clean bill for relationships/Personal/revisions/Phase 1 was unsupported. |
| 7 | Gemini | 1.0/10 | Reviewed an execution model the packet explicitly forbids, asserted validator/hash behavior that did not exist, and recommended weakening byte integrity. No finding survived evidence check. |

### Who caught material points the synthesizer's initial independent pass did not

- **BigPickle:** the exact missing `manage_claims` capability and omission of CharacterClaimRequests from P07 wiring.
- **Claude:** the P02/P11 merge-request schema split and the precise Phase-6 omission of interim-authority language.
- **Muse Spark:** the save-snapshot/navigation state machine, exact sanitizer surface, table criterion, and several security-test specifics.
- **Deepseek Flash 0731:** the missing P08 background treatment and P13-T02 watch forward-reference.
- **GLM 5.3 free/tokenrouter:** review-brief read-order incompleteness, Phase-1/P08 Theme boundary, P02 membership-order seam, P03 migration reconciliation, User-vs-Character direct-rule tie, malformed P06 adapter acceptance, and Share-revocation notification mismatch.
- **GLM 5.3 Flash:** no major finding unique after the combined independent/other reviews, but it independently corroborated three of the highest-risk cross-phase seams with strong evidence.
- **Gemini:** none.

## Handoff verdict

The revised stack is coherent and validator-clean. It is **not yet authorized for execution solely because P00 owner approval is intentionally blank**. After the owner records the exact approved commit/tag in P00, regenerate `SHA256SUMS.txt`, rerun `python tools/validate_packet.py`, and Phase 1 may begin. No later phase is authorized until its preceding human gate.
