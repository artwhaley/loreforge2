# P13-T03 — Document and Folder watches

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 13  
**Commit prefix:** `P13-T03:`

## Objective
Implement the intentionally narrow subscription model for changes users explicitly care about.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-13/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P13-T02

## Frozen context for this ticket
- Watches are only Document and Folder for now; Type/tag watches explicitly deferred.
- Folder watch includes descendants by default and exposes a visible per-watch toggle to restrict it to the target Folder only.
- Watching never grants read access.

## Required work
1. Add Watch model with recipient User and required active Character context, target Document|Folder, visible `includeDescendants` for Folder default true, enabled. Creation requires the User still controls that Character and the target is readable in that context.
2. Add Watch/Unwatch controls only when target is readable.
3. Translate Document edit/status/supersede and other explicitly allowlisted provenance events to notifications while checking that the User still controls the stored Character and that Character currently reads the resource, both at creation and click. Clicking offers/switches to that Character context; watching never follows whatever Character happens to be active later.
4. Deduplicate when user watches both a Document and ancestor Folder.
5. Add `My watches` management page.

## Likely code touchpoints
- src/collections/Watches.ts
- src/lib/notifications/watchProcessor.ts

## Automated acceptance
- Document edit/status/supersede notification reaches watcher once.
- Folder descendant event reaches watcher when includeDescendants true.
- Revoked reader receives no secret payload and cannot use watch to regain access.
- Type/tag watch cannot be created through API.
- Same User's sibling Character with no access receives no notification through another Character's Watch; loss of control disables delivery.

## Manual acceptance
- Watch Property Records folder, file/edit a deed, see one notification; unwatch and verify future event silent.

## Guardrails / non-goals
- `Do not create automatic watches for every linked Character unless later owner decision.`
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
- `execution-notes/P13-T03.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
