# P13-T02 — In-app notifications and preference model

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 13  
**Commit prefix:** `P13-T02:`

## Objective
Add durable user notification inbox with explicit event eligibility, separate from correspondence.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-13/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P13-T01

## Frozen context for this ticket
- Notifications are not correspondence/messages.
- Email is only an optional notification delivery channel.
- Notification event eligibility is explicit and can expand later.
- Recipient identity ultimately maps to User for delivery, though triggering resources/Characters are contextual.

## Required work
1. Add Notification collection/model with recipient User, Domain/context, type, target pointer, created/read state, safe rendered payload data.
2. Create notification service with the initial direct-notification allowlist exactly: Document shared with recipient; Document Share revoked for the affected recipient; Character claim approved/rejected for claimant; Role assignment granted/revoked for affected Character's controlling User; direct PermissionRule grant/deny/revocation for the affected User/Character; and Document review approved/rejected for submitting User. Role-derived access changes notify through Role assignment events, not as synthetic direct grants. All watch-generated edit/status/supersede notifications are added in P13-T03. Other audit/activity events, including Domain lifecycle/ownership changes, do not notify unless a later owner decision adds them.
3. Build inbox/unread badge/read-all/read item UI.
4. Add user preferences for in-app (required core) and future email toggle/category settings; no correspondence controls here.
5. Ensure notification creation is transactionally/idempotently tied to originating event where practical.

## Likely code touchpoints
- src/collections/Notifications.ts
- src/lib/notifications/**
- src/app/**/notifications/**

## Automated acceptance
- Duplicate event processing does not duplicate same notification.
- Read/unread counts accurate.
- Notification payload does not preserve secret body text that recipient later loses permission to see.
- Correspondence rows never appear in notification inbox as message content.
- Character-targeted notification resolves to the current controlling User at event time, records Character context, and emits nothing when unclaimed; it never leaks to a former controller.

## Manual acceptance
- Share then revoke a document; inspect notification wording and access behavior when link clicked after revocation.

## Guardrails / non-goals
- `Do not build email sending until T04.`
- `Do not use Notifications as audit log.`
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
- `execution-notes/P13-T02.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
