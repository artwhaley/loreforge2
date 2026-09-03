# P13-T04 — Email notification delivery channel

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 13  
**Commit prefix:** `P13-T04:`

## Objective
Add email as an optional transport for Notifications without coupling product semantics to a particular mail provider.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-13/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P13-T03

## Frozen context for this ticket
- Email carries notification summaries/links; it is not the in-app correspondence system.
- Production email provider should use provider approved in P10 deployment decisions if one exists; if not, owner must choose before production sending.
- Development must use safe sink/capture.

## Required work
1. Define notification channel adapter interface and email renderer with Domain branding-safe but consistent security links.
2. Implement dev capture/sink adapter and chosen production adapter only if P10 owner decision names one; otherwise leave production email disabled with clear config.
3. Queue email delivery through worker with retries/idempotency; update delivery status separate from Notification read state.
4. Respect user email/category preferences and unsubscribe/settings link.
5. Do not include full sensitive Document body in email.

## Likely code touchpoints
- src/lib/notifications/channels/email/**
- src/jobs/sendNotificationEmail.ts

## Automated acceptance
- Dev email captured and matches notification.
- Retry does not duplicate beyond provider idempotency strategy.
- Disabled production provider fails closed/no fake success.
- Preference off prevents email but retains in-app notification.

## Manual acceptance
- Trigger watched-document notification and inspect dev-captured email; click link and reauthorize resource.

## Guardrails / non-goals
- `Do not send correspondence content through this channel.`
- `Do not choose provider if owner hasn't.`
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
- `execution-notes/P13-T04.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
