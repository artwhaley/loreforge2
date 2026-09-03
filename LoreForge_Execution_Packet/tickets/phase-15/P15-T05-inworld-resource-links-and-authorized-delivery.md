# P15-T05 — In-world resource links and authorized bot delivery

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 15  
**Commit prefix:** `P15-T05:`

## Objective
Support stable LoreForge references from SL objects such as filing cabinets while ensuring core authorization precedes any notecard delivery.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-15/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P15-T04

## Frozen context for this ticket
- LoreForge resources need stable external IDs/URLs.
- An in-world object may point to Folder/Document but possession/click does not grant access.
- Example: filing cabinet request -> core checks local permission + location condition -> only then bridge packages/delivers notecard.
- Public resource may still require configured courthouse location; public is authorization status, location is additive condition.

## Required work
1. Define stable resource-link token/URL scheme using non-secret IDs and normal authentication.
2. Implement bridge-facing request flow for avatar asks for Document/Folder resource: resolve verified User and require an explicitly selected Character currently controlled by that User; evaluate core authorization plus the effective action-start location condition, then return only the authorized command/content. Never guess a Character from avatar name or last activity.
3. Implement Folder object flow as navigation/list/request protocol only to approved extent; never bulk-send hidden items.
4. Record request/delivery provenance/audit with object/source metadata if available.
5. Add abuse/rate baseline and idempotency for repeated clicks.

## Likely code touchpoints
- src/lib/sl/resources/**
- bridge/**

## Automated acceptance
- Guessing valid Document ID from in-world request yields no content without authorization.
- Public+wrong required location denied; private+right location but no permission denied; permission+location succeeds.
- Repeated click does not duplicate transfer uncontrollably.
- Stable resource URL remains after Document move.

## Manual acceptance
- Use mock/approved in-world object request to retrieve one authorized notecard and attempt two denied cases.

## Guardrails / non-goals
- `Do not let bridge evaluate permissions independently.`
- `Do not encode permission grants into permanent resource URL tokens.`
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
- `execution-notes/P15-T05.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
