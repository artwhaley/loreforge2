# P05R-GATE2 — Follow-up acceptance gate

Depends on: T09–T15 complete.
Mode: HARD REVIEW GATE; not permission to begin P06.
Commit prefix for gate evidence: P05R-GATE2:

## Automated and operational gate

Run and record fresh results on the final code:
- General and full DB-backed suites, including every new test from T09–T15.
- Typecheck, lint, generated-type parity, isolated production build.
- Actual-database schema verifier, integrity checks, and preservation evidence from T14.
- Packet/hash validation; 84 tickets unchanged.
- Git branch/HEAD and T09–T15 commit hashes; identify any unrelated dirty work, never discard it.
- R01–R10 closure table naming production source and definitive tests; unresolved or deferred-without-owner-approval rows fail the gate.

The pass criteria include real version authorization, full supersede creation, all fault rollbacks, independently started competing attempts, complete Write pair, unique rule identity, complete cleanup beyond 500, independent-lock preservation, Domain resource validation, and atomic durable audit.

Do not describe a sequential test as concurrency or a 404 on a nonexistent route as an authorization test. Do not certify the actual database from fresh-fixture/build output.

## Server handoff

After build/checks, start the normal server on http://localhost:3055, verify readiness and relevant authenticated routes, and leave it running. On Windows launch any background helper hidden. Record launch command, process/log location, tested URL/status, and recovery command without credentials.

## Focused human validation

Executor automates all deterministic checks it can, and records what it actually ran. Owner validation should concern behavior that still needs human judgment, not SQL integrity the executor can prove.

Write PHASE_05_FOLLOWUP_TESTING.md in the project root with VERIFIED current navigation. For every unautomated step provide the exact starting URL, visible control text, action, expected result, and working fixture identity/authority. Do not say “return to roster” or “select an authorized user” without explaining exactly where/how. Do not include passwords; use the established fixture credential mechanism. If the fixture/navigation differs, update the instructions before handing them over.

Required visible scenarios (only leave owner work that executor could not verify):
1. From the domain records explorer, select an eligible Filed record; use the current Supersede control. Confirm title/body/concerns prefill, current acting Character credit, save, predecessor lock, and visible succession link.
2. Trigger a controlled safe validation/conflict failure using a reproducible test fixture—not a production failure switch—and verify all editor inputs remain, with understandable error feedback.
3. From the domain People directory, keyboard-select a Character, change Folder Read/Write and return each axis to Inherit. Confirm role selections remain unchanged and persisted controls reflect the saved result.
4. Verify existing administration failure feedback is understandable and cannot be mistaken for success. Backend audit-failure correctness must already be automated.
5. Verify no unrequested theme, document layout, navigation, Share, or picker changes were introduced.

If supersession correction has no current customer control, test its existing sanctioned service/route directly and report that fact; do not invent a new correction UI or give the owner nonexistent buttons.

## Owner decisions and closeout

- Obtain/record explicit owner confirmation or amendment of CC-2026-09-03-05: Character-authored creates carry required acting-Character credit; authorized owner/user-path creation may omit it with no Character; ordinary members act through a Character. Existing user instructions take precedence if amended.
- Share remains intentionally unimplemented under CC-2026-09-03-04. Working Share is not a gate requirement.
- Missing manual acceptance or unresolved data conflicts means WAITING_FOR_OWNER, not APPROVED.
- execution-notes/P05R-GATE2.md contains exact fresh evidence, data upgrade/backup outcome, all commit hashes, human checks performed versus pending, owner decision status, and next-phase hard stop.
- Record GATE2 as APPROVED_BY_OWNER only after the owner actually approves. Preserve the old P05R-GATE as historical; current readiness follows GATE2.

