# P07-D01 — Document Sharing Workflow Decision (OWNER DECISION / DESIGN DISCOVERY ONLY)

**Status:** OPEN — decision pending owner. **Mode:** decision brief, not an implementation ticket. Implementation is explicitly forbidden by this brief and by CC-2026-09-03-04.

**Register row:** `DEF-SHARE-01`. **Change control:** CC-2026-09-03-04.

## Why this exists

Phase 5 attempted to freeze and implement Document Sharing before the operational workflow was understood, storing Share state without delivering a coherent feature. The owner deferred the workflow (CC-2026-09-03-04). This brief exists so the deferred feature cannot disappear silently and so the owner has one place to record the eventual decision after the P07 authorization evaluator exists. No implementation may be generated merely because this brief exists.

## Current frozen facts (do not reopen)

- Share, if eventually implemented, operates on the same canonical Document ID and revision stream. Copy and Move remain rejected product concepts.
- `share_document` remains reserved capability vocabulary; `shared` and `share_revoked` remain reserved provenance names. No customer workflow creates or revokes Share PermissionRules before the owner decision.
- Existing Share adapter/route code is prototype residue and may be removed when final authorization is wired.

## Questions the owner must answer (after the P07 evaluator exists)

1. Who can receive a Share — a User, a Character, or either?
2. Must the recipient already participate (active membership) in the Domain?
3. Are external/non-member recipients desirable?
4. Read only, edit, or both?
5. Does Edit imply Read?
6. How does lifecycle (draft/pending/filed/locked/superseded) affect edit sharing?
7. Is Share a direct grant or an invitation that must be accepted?
8. How are recipients found without leaking account data (no raw account email/ID in finders)?
9. Does the recipient see any Folder/container context?
10. Are notifications needed?
11. How does revocation work (future access only; audit retained)?
12. Does Share survive supersession of the shared Document?
13. Are successor shares inherited, copied, or deliberately absent?
14. Are Personal-Domain rules different (Personal Domains allow only Document-specific shares)?
15. What should the UI actually look like (finder, current-shares list, revocation), given People-workspace conventions?

## Required output

- an owner-approved workflow spec with a named later implementation ticket; **or**
- another explicit deferral with a named future implementation ticket.

Record the result in change control and close or extend `DEF-SHARE-01` in `11_DEFERRED_WORK_REGISTER.md`. P07-GATE requires this owner-recorded result before Gate 7 closes; Gate 7 does not require Sharing to work.
