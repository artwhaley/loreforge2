# P07-GATE — Review Gate 7 — authorization and delegated administration

**Mode:** REVIEW GATE — NO SELF-APPROVAL  
**Phase:** 7  
**Commit prefix:** `P07-GATE:`

## Objective
Hard security/behavior gate before public surfaces and starter packs multiply configuration.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-07/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P07-T01
- P07-T02
- P07-T03
- P07-T04
- P07-T05
- Owner-requested performance addendum P07P-01 through P07P-06, defined in
  `references/P07P_DATABASE_ACCESS_PATCH.md` (implemented and verified; owner
  manual acceptance remains required).

## Frozen context for this ticket
- The goal is understandable RP administration, not bank-grade complexity, but no known privilege-escalation or tenant leak is acceptable.

## Required work
0. Complete the performance addendum and attach query-count, warm latency,
   pure-evaluator/query parity, and revocation/isolation evidence before asking
   the owner to resume the Head Scribe acceptance section. A passing functional
   suite alone does not close the reported unusable page latency.
1. Run exhaustive permission matrix and integration/API tests.
2. Execute golden scenarios for Commander/Captains/Warrior, cross-hierarchy grant, explicit deny, multi-role Character, and delegation chain.
3. Produce permission explanation outputs for each fixture actor and compare the People Folder-access tree with the equivalent Folder-centered permissions view. Separately inspect the Role tree and prove its mutations do not alter direct Folder rules.
4. Have reviewer attempt direct URL/API bypass and scope escalation.
5. Confirm `P07-D01` (the Document Sharing decision brief at `references/P07-D01-DOCUMENT-SHARING-DECISION.md`, registered `DEF-SHARE-01`) has an owner-recorded result before this gate closes: a workflow approved for a named later implementation ticket, or another explicit deferral with a named future ticket. Gate 7 does **not** require Sharing to work.

## Likely code touchpoints
- Inspect current adjacent files; do not broaden scope.

## Automated acceptance

- Full permission matrix and direct REST/local API/server-action suite passes for precedence, scope, deny, delegation, `manage_claims`, and lifecycle gates.
- No legacy User Membership, interim helper, or temporary Share adapter remains capable of granting access.


## Manual acceptance

Owner execution guide: `PHASE_07_TESTING.md` at repository root (rewritten and
checked against the working database on 2026-09-04). Use its actual accounts,
Domains, links, and click sequences. The previously recorded fixture and
permission-presentation blockers were repaired; see execution-notes/P07-GATE.md.
Owner acceptance is still required; automated results are not self-approval.

- All authorization tests green.
- No tenant leak.
- No lower actor can grant more authority/scope than possessed.
- Direct Document-level PermissionRules and explicit deny follow frozen precedence as generic permission exceptions; no customer-facing Share workflow is required or implied (Share deferred, CC-2026-09-03-04).
- A Head Scribe can find one Character through quick search, assign only permitted descendant Roles with checkboxes, edit direct Read/Write overrides in a separate Folder tree, and understand effective sources without navigating collection tables.
- Role mutation requests contain no Folder; Folder mutation requests contain no RoleAssignment operation; Department participation is derived from Roles.
- Management navigation is capability-driven while the primary Domain navigation remains stable; no Administration mode returns.
- Role, assignment, Folder access, membership, and PermissionRule changes have durable actor-aware audit evidence (P05R-T05 seam).

## Guardrails / non-goals
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.
- Owner/reviewer approves permission-management UX and confirms hierarchy remains convenient rather than mandatory for exceptions.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P07-GATE.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- STOP and return the review-gate report to the owner. Do not begin the next phase.
