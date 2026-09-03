# P14-T03 — Modified delivery, interception/failure, and immutable correspondence history

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 14  
**Commit prefix:** `P14-T03:`

## Objective
Support GM-mediated roleplay outcomes while retaining an authoritative original for administrators.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-14/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P14-T02

## Frozen context for this ticket
- Original body is always retained for authorized audit.
- Delivered/garbled body is separate; recipient sees only delivered version.
- Moderator actor, action, note/reason, timestamps are preserved.
- Intercept/fail may intentionally leave sender with limited status according to policy; do not fabricate delivery.

## Required work
1. Implement moderator actions with exact transitions: Deliver Original `queued_for_review -> delivered`; Deliver Modified `queued_for_review -> delivered` with `deliveredBody`; Intercept `queued_for_review -> intercepted`; Fail/Lost `queued_for_review -> failed`. Preserve immutable originalBody and sentAt.
2. Add CorrespondenceHistory events with original/delivered versions and moderator User/Character where relevant.
3. Build modified-body editor from safe Markdown editor with explicit banner that original is retained.
4. Render recipient only deliveredBody; platform/domain authorized audit view can compare original vs delivered.
5. Render sender status only from the Domain's fixed `senderOutcomeVisibility` policy: `dispatched_only` always remains Dispatched after Send; `delivery_status` may show the actual terminal Delivered/Failed/Intercepted state. Add no second mapping/configuration layer.

## Likely code touchpoints
- src/collections/CorrespondenceHistory.ts
- src/lib/correspondence/moderate.ts

## Automated acceptance
- Modified delivery preserves original byte/canonical hash.
- Recipient API never returns original when deliveredBody differs unless separately moderator-authorized.
- Intercept/fail creates no recipient delivery.
- Every moderator action audited.

## Manual acceptance
- Garble a letter, deliver, compare sender/moderator/recipient views; intercept second letter.

## Guardrails / non-goals
- `Do not overwrite original body.`
- `Do not make correspondence edits after dispatch ordinary user edits.`
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P14-T03.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
