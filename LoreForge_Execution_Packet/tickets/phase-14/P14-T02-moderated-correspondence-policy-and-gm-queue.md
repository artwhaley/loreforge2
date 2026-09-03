# P14-T02 — Optional moderated correspondence policy and GM queue

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 14  
**Commit prefix:** `P14-T02:`

## Objective
Implement the politics-heavy RP mode where a GM decides whether/when/how a dispatched message arrives.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-14/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P14-T01

## Frozen context for this ticket
- Moderation is optional per Domain and NOT default.
- Under moderated policy, sender submits now; recipient sees nothing until GM action.
- GM queue does not auto-decide if nobody logs in.
- Authorized moderator roles/users are configured by Domain permission, not hard-coded title.

## Required work
1. Add Domain correspondence policy fields exactly: `mode=immediate|moderated` (default immediate) and explicitly stored `senderOutcomeVisibility=delivery_status|dispatched_only`. Derive its default from mode when the policy is created/changed (`delivery_status` immediate, `dispatched_only` moderated), while permitting only those two explicit values. Add permission capability `moderate_correspondence`.
2. Route moderated Send from `draft -> queued_for_review`, setting immutable `sentAt`, originalBody, and operator. Recipient receives no correspondence row/body while queued.
3. Build moderator queue ordered by sent time/age with sender/recipient/context and actions: deliver now, delay, deliver modified/garbled, intercept/fail.
4. Ensure recipient APIs cannot see held metadata/body.
5. Enforce sender status policy exactly: moderated + `dispatched_only` always renders Dispatched after Send regardless of eventual moderator outcome; `delivery_status` may render Delivered/Failed/Intercepted after the terminal decision. Never expose moderator notes or modified body before recipient delivery.

## Likely code touchpoints
- src/lib/correspondence/policy.ts
- src/app/**/correspondence/moderation/**

## Automated acceptance
- Held message inaccessible to recipient direct ID/API.
- Non-moderator cannot see queue.
- Immediate Domain unaffected.
- Original sentAt never reset by moderator opening/action.

## Manual acceptance
- Submit message and leave it held; verify recipient sees nothing and queue age advances from original send time.

## Guardrails / non-goals
- `Do not automatically fail/deliver held messages due to queue age.`
- `Do not expose moderator private notes to sender/recipient.`
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
- `execution-notes/P14-T02.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
