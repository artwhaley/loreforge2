# Change Control and Executor Guardrails

## Priority
1. Explicit owner instruction issued after this packet.
2. Frozen product decisions.
3. Architecture contract.
4. Current ticket.
5. Full product specification.
6. Spike implementation details.

The spike is evidence, not authority over later product decisions.

`references/STALE_LOREFORGE_FUNCTIONAL_SPEC.md` is historical intent-mining material only. Consult it only when useful to explain an ambiguity; it never overrides frozen decisions, the Architecture Contract, current tickets, or owner gates.

## If source disagrees
### A. Harmless implementation drift
Proceed using actual names/locations; note it in completion report.

### B. Extra nonconflicting local work
Preserve it. Do not delete owner work just to match the snapshot.

### C. Conflict with frozen decision/prerequisite
Stop the ticket and write `BLOCKED-<ticket-id>.md` with:
- exact file/commit evidence;
- conflicting packet requirement;
- smallest resolution choices.
Do not silently redesign.

### D. Library/API impossibility
Keep product behavior fixed. Demonstrate incompatibility minimally. Stop only if straightforward mechanisms require changing the contract.

## Forbidden scope expansion
No:
- Postgres/cloud before P10;
- raw CSS;
- page builder;
- external FGA;
- external search engine;
- arbitrary metadata framework;
- permanent raw form submissions;
- recursive Subdomains;
- multi-SL-alt linking;
- live collaborative editing;
- WebSocket chat architecture;
- SL bot inside Next/Payload process;
- third-party starter packs.

## Schema changes
- Only in tickets that name them.
- Regenerate Payload types.
- Before P10, fixture reset may be used only when ticket permits.
- After P10, repeatable migrations are mandatory.

## UI
Customer workflows use LoreForge language, never Payload/CMS terminology.
Do not defer a ticket's scheduled UX tuning with “polish later.”

## Completion standard
- required behavior implemented;
- targeted tests pass;
- full suite passes;
- build/typecheck/lint supported by repo pass;
- manual acceptance recorded or exact environment block documented;
- no unrelated changes;
- execution note written;
- ticket committed.

## Review gates
Hard stop. Executor reports; owner approves. No self-approval.

## Approved change log

### CC-2026-09-02-01 — User-first customer shell before Phase 4

- **Authority:** explicit owner approval on 2026-09-02 of `PROPOSED_UX_WORKFLOW_SPEC.md` after Phase 3 acceptance.
- **Problem closed:** the Phase 3 spike exposed database-shaped customer pages, a redundant Administration Domain selector/mode, diagnostic platform home, ordinary login through `/admin/login`, missing People-centered administration, and an inline-title Document creation entry that did not match the real workflow.
- **Supersedes:** every packet statement requiring an explicit Administration context/mode, Enter/Exit Administration controls, or a second administrative Domain selector. It also changes the default customer noun from Subdomain to Department while retaining the neutral internal model.
- **Frozen replacement:** one selected Domain, optional eligible acting Character, capability-driven management links, stable Domain primary navigation, branded platform home/login/dashboard, Character-centered People workspace, and full-page Document creation as defined in `02_FROZEN_PRODUCT_DECISIONS.md` and `03_ARCHITECTURE_CONTRACT.md`.
- **Execution:** Phase 4 begins with P04-T00, P04-T05, and P04-T06 before the existing lifecycle sequence. Phase 5 distinguishes Prepared by/Concerns links; Phases 6–8 and 11 hydrate the approved surfaces; P13-T00 adds Domain notices before activity projection.
- **Non-change:** User-level Domain authority remains distinct from Character identity; server authorization remains authoritative; internal `subdomain` schema may remain; pricing/providers remain owner-gated.

### CC-2026-09-03-02 — Phase 4 navigation and workflow closeout

- **Authority:** explicit owner direction and P04-GATE approval on 2026-09-03.
- **Dashboard:** the signed-in Loreforge dashboard must expose the active Character selector directly; managing or switching Characters must not require navigating through Account tabs.
- **Record creation:** New document and Import notecard are one visible action group on Records because both create a Record.
- **Management strip:** omit redundant “Manage [Domain]” copy. Review is not an administration destination and must not appear in the management strip or as an admin-only Review Queue shortcut on a Document.
- **Vocabulary:** every customer-visible reference uses Department(s). Internal `subdomain` collection, field, helper, and compatibility-route names remain unchanged until an explicitly authorized schema migration.
- **Brand boundary:** Loreforge platform styling remains scoped to platform-owned pages. It must not replace, modify, or leak into a Domain's stored theme or Domain shell.
- **Deferred placement:** lifecycle review machinery remains intact, but its durable user-facing entry belongs to the future Inbox workflow. This change does not invent Inbox behavior early or alter interim server authorization before the authorization phase.
- **Phase gate:** Phase 4 is owner-approved after these corrections; Phase 5 is the current continuation point.

### CC-2026-09-03-03 — Separate Roles, Department participation, and Folder access

- **Authority:** explicit owner correction on 2026-09-03 before Phase 5 execution.
- **Problem closed:** the packet and Phase 3/4 implementation conflated Role assignment with Folder scope and redundantly stored direct Character-to-Department membership. This contradicted the intended real-world workflow: people hold jobs (Roles) within Departments, while their direct Folder access is edited independently.
- **Supersedes:** the RoleAssignment `scopeFolder` contract; `SubdomainMembership` as an ordinary Character assignment; direct Character head/admin fields on Departments; the same-Role/different-Folder-scope Captain fixture; completed P03-T02/P03-T04 and P04-T06 requirements that created or exposed those rejected concepts; and forward P07 tests that preserve them.
- **Frozen replacement:** every Community-Domain Role belongs to exactly one Department; a Character participates in that Department through at least one active Role; RoleAssignment is only Character + Role; Folder access is a separate direct per-Character Read/Write override system. Role definitions may still carry default permission rules, including Folder defaults, but no Role-assignment mutation contains a Folder. Domain removal deletes/revokes the Character's Role and direct Folder assignment rows; only audit history persists, so re-add starts clean.
- **People workflow:** ranked typeahead person search with results beneath; a searchable hierarchical Role checkbox tree filtered by Held roles or Roles I can assign; and a separate searchable Folder tree with independent Read/Write controls and clear effective/default/direct sources. These controls mutate separate records and do not route the administrator through database-shaped pages.
- **Delegation:** `assign_subordinates` permits assignment only of descendant Roles beneath a Role the actor holds in the same Department. It does not authorize peers, ancestors, the held Role itself, or other Departments; server enforcement is mandatory.
- **Template filing:** every non-Plain-Text Template has a normal destination Folder. Template selection sets it automatically. Alternative destination selection exists only when that Template explicitly permits override and the actor may create there.
- **Execution:** new P05-T00 is mandatory before P05-T01. It removes the rejected structures and hydrates the corrected Character workspace without pretending to implement the final P07 evaluator. P06-T01/P06-T04 implement Template-directed filing. P07-T01/T03/T04/T05 implement final defaults, direct overrides, explanations, and delegation.
- **Non-change:** explicit Domain membership remains required for Character participation in a Domain. User-level Domain owner/admin authority remains separate from Character Roles. Folder access can still be inherited from Role defaults; it is the per-person Folder assignment and storage that is independent of RoleAssignment.

### CC-2026-09-03-04 — Defer Document Sharing workflow

- **Authority:** explicit owner instruction after the Phase 5 audit (2026-09-04).
- **Problem closed:** P05 attempted to freeze and implement Document Sharing before the actual operational workflow was understood. The resulting implementation stores pieces of Share state without delivering a coherent end-to-end feature, and audit review found it untestable to acceptance (no forged-mutation coverage, ineffective edit grants, raw numeric-ID UI).
- **Supersedes:** any current packet requirement that makes working Document Sharing a Phase 5 or automatic Phase 7 acceptance requirement, including working Read Share; working Edit Share; external/non-member recipient behavior; a Share principal finder; a current-share/revoke UI; interim Share authorization; automatic assumptions about User versus Character recipients; automatic assumptions about whether recipients must belong to the Domain; Share delegation UX; and Share notification/invitation behavior.
- **Frozen replacement:** Document Sharing is placeholder/deferred functionality. No active customer Share mutation is required before a later owner decision. The existing implementation is prototype residue, not product authority. A Share control may remain only as a disabled/`Share — planned` placeholder. No new Share PermissionRules are created through ordinary customer workflows. `share_document` remains reserved capability vocabulary so a future implementation does not require gratuitous schema migration. `shared` and `share_revoked` provenance names likewise remain reserved but unused. Copy and Move remain rejected product concepts. Any future Sharing implementation uses the same canonical Document rather than making a copy, unless a future explicit owner change-control decision says otherwise. The workflow decision is registered as `DEF-SHARE-01` in `11_DEFERRED_WORK_REGISTER.md` and briefed in `references/P07-D01-DOCUMENT-SHARING-DECISION.md`; P07-GATE requires an owner-recorded result.

### CC-2026-09-03-05 — Prepared-by credit: acting-Character-optional creation (owner ruling)

- **Authority:** owner-accepted P05-GATE (2026-09-04) plus the `4615a9d` P05-T01 follow-up that made Acting-as/Prepared-by optional; recorded here because frozen decision and ticket wording still says Prepared by is required and non-removable (Phase 5 audit: GLM finding 1, SolarPro finding 5, MuseSpark finding 12).
- **Frozen replacement:** any Character-authored Document creation includes the acting Character as a non-removable Prepared-by credit; creation UI cannot remove that Character but may add more credits. A Domain Owner (or an explicitly platform-authorized user path) may create without an acting Character and therefore without a Prepared-by credit. Ordinary members must create through an acting Character and therefore always carry the credit. P06 form-driven creation requires an active member Character.
- **Execution:** P05-T01's automated-acceptance wording is amended accordingly (see ticket header notice added by P05R-T00); owner confirmation of this ruling is required at the P05R remediation gate.
