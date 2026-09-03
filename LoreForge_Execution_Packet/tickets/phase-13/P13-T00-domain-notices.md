# P13-T00 — Domain notices for member and public dashboards

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 13  
**Commit prefix:** `P13-T00:`

## Objective
Add deliberate administrator-authored Domain notices as a dashboard/feed source without treating announcements as audit history, notifications, or correspondence.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-13/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P12-GATE approved

## Frozen context for this ticket
- Domain notices are authored content. Audit records prove who changed them, but audit/provenance is not the notice body or publication store.
- Initial scope is Domain-wide. Domain Owner/operational admins have authority through their frozen operational tier; an active Character may manage notices only when the evaluator grants `manage_notices` at Domain scope. Department-targeted announcements, comments, reactions, and general social posting are deferred.
- Audience is exactly `members|public`. Public notices still require the Domain public site to be enabled; members see only notices from Domains in which one of their controlled Characters actively participates or which they User-level manage.
- Publishing a notice does not automatically send an in-app/email notification. Notifications remain an explicit allowlist in later Phase 13 tickets.

## Required work
1. Add DomainNotice model/collection with Domain, title, canonical safe Markdown body, status exactly `draft|published|archived`, audience exactly `members|public`, pinned boolean, publishedAt, optional expiresAt, author/editor User, timestamps, and audited create/edit/publish/archive actions.
2. Authorize create/edit/publish/archive through the shared evaluator's `manage_notices` capability, including the existing Domain Owner/operational-admin allow tier. Platform Admin uses the audited bypass. Ordinary members and forged APIs cannot mutate notices.
3. Build a compact notice manager reachable contextually from the selected Domain Home management summary, not as a new primary navigation item or Administration mode.
4. Render active notices in the signed-in User dashboard `For you` feed and selected-Domain Home. Show public notices on public Domain Home only when `publicEnabled=true`. Filter expired/archived/draft/private-Domain notices before counts and pagination.
5. Establish a stable notice projection identity so P13-T01 can merge published/updated/archived notice events with authoritative activity projections without duplicates.

## Likely code touchpoints
- `src/collections/DomainNotices.ts`
- `src/lib/notices/**`
- `src/app/(frontend)/domain/[slug]/**`
- `src/app/(frontend)/page.tsx`
- `src/lib/activity/**`

## Automated acceptance
- Draft/archived/expired notices never appear in member or public feeds; public notices disappear when Domain public access is disabled.
- Ordinary member and forged API cannot create, edit, publish, or archive a notice.
- User dashboard shows a member notice once when the User controls multiple member Characters in the same Domain.
- Notice content renders through the canonical safe Markdown boundary and cannot execute raw HTML/script.
- Notice storage, audit events, activity projection identity, notification inbox, and correspondence remain distinct.

## Manual acceptance
- As Ar Domain admin, publish one member notice and one public notice from Domain Home; verify member dashboard, selected-Domain Home, and anonymous Domain Home show exactly the appropriate notice, then archive it and confirm removal.
- Confirm notice management does not add an item to primary Home/About/Departments/Records navigation.

## Guardrails / non-goals
- `Do not build a social feed, comments, reactions, or Department-targeted notices.`
- `Do not automatically create in-app/email notifications for every notice.`
- `Do not store notice body in audit/provenance events.`
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
- `execution-notes/P13-T00.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to P13-T01.
