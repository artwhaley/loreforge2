# P11-T02 — Single-owner transfer and Community Domain lifecycle states

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 11  
**Commit prefix:** `P11-T02:`

## Objective
Implement final authority and non-destructive subscription/closure states without prematurely choosing billing economics.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-11/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P11-T01

## Frozen context for this ticket
- Exactly one Community Domain Owner User.
- Multiple operational admins are allowed; they are not co-owners.
- LoreForge must not arbitrate organizer disputes: owner is final subscription/closure authority unless Platform Admin repairs/transfers.
- Lifecycle states: Active, Grace, Read-only, Suspended, Archived/Closed. Payment lapse never automatically deletes data.
- Sunset/read-only service pricing policy remains future owner decision.

## Required work
1. Implement owner transfer: current Owner can transfer with confirmation; Platform Admin can repair/transfer with mandatory reason/audit.
2. Implement the exact Architecture Contract lifecycle matrix: Active normal; Grace normal plus notices; Read-only preserves public/member reads per policy but blocks content writes (owner may read/export and change recovery settings); Suspended denies public/member access and permits owner/admin lifecycle/support view only; Archived/Closed permits owner read/export only; Platform Admin retains audited repair/transition/export. No executor-configurable read policy in this phase.
3. Build owner/admin lifecycle UI with destructive-language warnings and no permanent delete button.
4. Add lifecycle banner/status on Domain member/public surfaces.
5. Record transitions/audit.

## Likely code touchpoints
- src/lib/domains/lifecycle.ts
- src/app/**/domain-settings/**

## Automated acceptance
- Second owner assignment rejected.
- Read-only blocks writes at server even via API.
- State change never deletes Domain data.
- Platform transfer audited with reason.
- Table-driven tests cover public, ordinary member, owner/admin, and Platform Admin read/write/export behavior in every lifecycle state.

## Manual acceptance
- Transfer Domain owner; move Active->Grace->Read-only->Suspended->Archived in fixture/staging and confirm access/write behavior.

## Guardrails / non-goals
- `Do not decide billing trigger timings/grace durations here.`
- `Do not auto-delete expired Domains.`
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
- `execution-notes/P11-T02.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
