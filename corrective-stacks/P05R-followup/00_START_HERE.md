# Phase 05 review follow-up — executable corrective stack

Status: EXECUTED THROUGH T15; GATE2 WAITING_FOR_OWNER.
Date: 2026-09-04.
Baseline: phase-05-remediation at df94f23 (includes P05R-T08).
Purpose: close R01–R10 from P05_CORRECTIVE_REVIEW.md, not restart Phase 5.
This directory is the authoritative follow-up stack. Its tickets are self-contained; the external review is supporting evidence, not a required dependency.

Execution record: T09–T15 have been implemented and verified on
`phase-05-remediation`. Evidence is in `execution-notes/P05R-T09.md` through
`execution-notes/P05R-T15.md`; the current acceptance state is recorded in
`execution-notes/P05R-GATE2.md`. GATE2 remains owner-gated, so P06 is blocked.

## Executor kickoff

Read this file, repository AGENTS.md, then execute T09 through T15 in order and run GATE2. Read current source before editing. Preserve T00–T08 changes, all owner UI decisions, and unrelated changes. Stop at GATE2 for owner/reviewer approval; do not begin P06. Do not mark a ticket passed merely because the existing suite is green.

## Order

| Order | File | Purpose |
| --- | --- | --- |
| 1 | 01_P05R-T09.md | Version-parent authorization and real endpoint tests |
| 2 | 02_P05R-T10.md | Complete transactional document creation and correct lock restoration |
| 3 | 03_P05R-T11.md | Storage-enforced PermissionRule identity and Domain scope |
| 4 | 04_P05R-T12.md | Atomic admin mutations, Write pairs, and durable audit |
| 5 | 05_P05R-T13.md | Exhaustive Domain-participation removal |
| 6 | 06_P05R-T14.md | Non-destructive upgrade of the actual development database |
| 7 | 07_P05R-T15.md | Honest consolidated regression evidence and documentation |
| 8 | 08_P05R-GATE2.md | Full verification, server handoff, owner review hard stop |

T09 has no dependency. Each later ticket depends on the preceding ticket. Work sequentially; shared transaction/permission code makes independent parallel editing undesirable.

## Repository and commits

- Run implementation commands from the Git root sl-civic-archive, not its parent working directory.
- Verify df94f23 is an ancestor of the current checkout. Continue phase-05-remediation; do not recreate a branch from the original Phase 5 base. If already on a different branch or newer work overlaps, inspect and preserve it; resolve an actual conflict with the owner.
- One implementation ticket per commit, prefix P05R-T09: through P05R-T15:. Write execution-notes/P05R-Txx.md in that commit. Record the final hash in the next note/gate so no self-referential hash is required.
- Preserve original execution notes as historical evidence. GATE2 supersedes the earlier automated PASS for current readiness; do not rewrite historical test output.
- Never add these tickets under LoreForge_Execution_Packet/tickets. The fixed packet still has 84 tickets. This repo-local directory is intentional and versionable.
- If authoritative packet content changes, regenerate its hashes using the existing method and run its validator. Do not relax counts, hashes, or test assertions.
- Do not push or change remote branches unless the owner requests it. Stage only changes belonging to the ticket.

## Global acceptance and safety rules

1. Add a regression that reproduces each defect before its fix where feasible, then demonstrate green. Keep tests in normal scripts; do not leave the decisive evidence as disposable probes.
2. Existing baseline: 85 general and 25 DB-backed tests passed despite the defects. Counts alone are not acceptance; assert the stated outcomes. Record exact commands, exit codes, test counts, and database targets.
3. Tests run against uniquely named disposable databases. Before any deletion/reset, resolve and validate the exact target and prove it is not DATABASE_URI for the user's environment. Never reset, seed over, or schema-push the user database during unit/security/build checks.
4. T09–T13 use isolated databases. T14 owns the real database upgrade, with consistent backup, dry run, rollback plan, and preservation checks. A new schema field in TypeScript or a successful throwaway build is not deployment evidence.
5. Transactional operations must fail closed if the adapter cannot provide a transaction. No warning-and-sequential fallback, fabricated transaction ID, swallowed write failure, or process-only mutex offered as storage integrity.
6. Transaction requests must propagate through nested reads, hooks, writes, provenance, and audit. Preserve server-established actor/context; never trust client-supplied authorization flags.
7. No secrets, user database copies, uploaded media, credentials, or full private record bodies in commits or execution notes.
8. Do not build into the active dev server's output concurrently. Arrange a controlled stop/restart or supported isolated build directory. At the final gate leave the server running on port 3055 and verify it.
9. No UI redesign. Error feedback belongs in existing form/page patterns; preserve all document fields on failure. Do not invent labels, modes, navigation, Share semantics, or editor fields.
10. Owner approval is required for conflicting existing data with no uniquely safe repair, and for the outstanding Prepared-by ruling. Do not silently choose grant versus deny or discard records to make a migration succeed.

## Frozen boundaries

- Characters, Roles, Departments, and Folders stay separate. Department participation derives from active Roles; folder permission changes must not change RoleAssignments.
- Preserve current admin/owner authorization restrictions, T08 soft-delete hardening, and the live Domain/Character selectors.
- Keep all 24 contract capabilities, including manage_access. The earlier 23-count/removal instruction was erroneous.
- Keep Share disabled under CC-2026-09-03-04. Public Folder behavior belongs to P08; full permission precedence/delegation to P07; broad search performance/pagination to P12; legacy persistence retirement to P10.
- Permission uniqueness and exhaustive mutation cleanup are current integrity requirements, not deferred search pagination.
- Preserve T08 deferrals for additional Prepared-by picker, tag picker, and member attachment behavior. Required acting-Character credit atomicity is not that optional picker work.
- No changes to domain themes, document layout, templates, or navigation beyond required existing error feedback.

## Standard ticket handoff

Every execution note includes scope/files, finding IDs, before/after regression evidence, transaction boundaries when relevant, fresh test results, schema changes queued for T14, remaining blockers, and the next ticket. An unresolved required item keeps the ticket open; an executor cannot invent a new deferral.
