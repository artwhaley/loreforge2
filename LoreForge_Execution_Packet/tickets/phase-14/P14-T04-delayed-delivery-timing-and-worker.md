# P14-T04 — Delayed correspondence delivery timing

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 14  
**Commit prefix:** `P14-T04:`

## Objective
Implement actual server-held delayed delivery using original send time semantics and the existing worker.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-14/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P14-T03

## Frozen context for this ticket
- GM chooses delay relative to original sent time, not decision time.
- If message sent 2 days ago and GM chooses `takes 3 days`, due time is sentAt + 3 days (1 day remains).
- Before GM chooses action, queue never auto-sends.
- After GM explicitly chooses delayed delivery, worker may automatically make it visible at due time.
- If chosen due time is already past, deliver promptly after decision rather than adding new delay.

## Required work
1. Add moderator Delay action accepting duration/due rule and calculate dueAt from immutable sentAt.
2. Transition only `queued_for_review -> approved_waiting` after GM chooses Delay (with original or modified deliveredBody) and enqueue an idempotent delayed-delivery job using Payload job queue `waitUntil`/equivalent. The worker performs only `approved_waiting -> delivered`.
3. Worker rechecks message state/due time and authorization invariant; terminal/intercepted message is no-op.
4. Expose moderator queue countdown/overdue indication based on sentAt/dueAt.
5. Test timezone using UTC persisted timestamps and clock abstraction/fake timers.

## Likely code touchpoints
- src/jobs/deliverCorrespondence.ts
- src/lib/correspondence/timing.ts

## Automated acceptance
- 2-days-old + 3-day delay schedules 1 day remaining.
- 4-days-old + 3-day delay delivers on moderator action/job promptly.
- No GM action => no delivery regardless of age.
- Job retry idempotent/no duplicate delivery.
- Restart worker retains scheduled delivery.

## Manual acceptance
- Use fake/test clock to demonstrate exact timing; then local short-duration delayed message through real worker.

## Guardrails / non-goals
- `Do not run setTimeout in web process.`
- `Do not reset sentAt/dueAt on retries.`
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
- `execution-notes/P14-T04.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
