# P14-T01 — Character-to-Character correspondence and immediate delivery

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 14  
**Commit prefix:** `P14-T01:`

## Objective
Add formal RP correspondence as a first-class system separate from Documents and Notifications.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-14/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P13-GATE approved

## Frozen context for this ticket
- Visible sender/recipient are Characters; authenticated User/operator is retained for audit.
- Correspondence belongs to a Domain context.
- Normal/default policy delivers immediately.
- Individual messages with optional `replyTo` linkage; no Slack/chat rooms.
- Correspondence is not a Document unless explicitly filed later.

## Required work
1. Add Correspondence collection/model exactly for one sender Character and one recipient Character: Domain, sender Character, recipient Character, operator User, canonical Markdown `originalBody`, nullable `deliveredBody`, nullable same-Domain `replyTo`, immutable `sentAt` after Send, nullable `deliveredAt`, state enum exactly `draft|queued_for_review|approved_waiting|delivered|intercepted|failed`, due/decision fields required by later moderated flow, and audit timestamps.
2. Implement send authorization exactly: authenticated User must control the active sender Character; sender and recipient must each have active membership in the same active Community Domain; recipient Character must be active/not merged. Owner/Admin status never permits impersonating an uncontrolled sender. No cross-Domain implicit send.
3. Implement immediate delivery path `draft -> delivered` on Send, setting `sentAt` and `deliveredAt` in the same authoritative operation; build recipient inbox and sender sent views.
4. Render reply linkage as simple conversation trail without persistent chat channel.
5. Audit/provenance correspondence actions in dedicated correspondence history, not Document provenance.

## Likely code touchpoints
- src/collections/Correspondence.ts
- src/lib/correspondence/**
- src/app/**/correspondence/**

## Automated acceptance
- User cannot send as Character they do not control/operate with Domain authority.
- Recipient sees delivered body, sender sees original sent body/status.
- Reply links correctly and cannot reference inaccessible foreign Domain message.
- Message absent from Documents/search unless later filed.
- Owner/Admin who does not control sender is denied; inactive/nonmember/merged recipient and cross-Domain recipient are denied without revealing private profile data.

## Manual acceptance
- Send and reply between fixture Characters under default immediate policy.

## Guardrails / non-goals
- `Do not build realtime chat/WebSockets.`
- `Do not reuse Notifications table as messages.`
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
- `execution-notes/P14-T01.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
