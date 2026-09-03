# P07-T04 — Folder inheritance, direct grants, and explicit denies

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 7  
**Commit prefix:** `P07-T04:`

## Objective
Complete practical folder/document permission administration including temporary lockout cases.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-07/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P07-T03

## Frozen context for this ticket
- Folder is the primary unit of record access and permission inheritance.
- Membership and Role can carry defaults, but are not permanently linked to access.
- Explicit deny is required (e.g. Warrior under investigation retains Role but loses sensitive access).
- Document-specific exceptions are supported.
- Personal folder sharing remains prohibited later; Community Domain folder access is normal.

## Required work
1. Hydrate both the contextual Folder permissions panel and People -> Character -> Access tree from the same evaluator/explanation service. Show inherited/effective rules separately from rules authored at the Folder.
2. Allow authorized manager to grant/deny Character/User/Role actions at Folder and Document resources.
3. Implement inheritance through descendants using evaluator; no duplicated copied rules per child.
4. On the Character Access tree, provide `Can view`, `Can edit`, and `Can manage` filters and explain each effective node using Role, inherited grant, direct grant, or explicit deny sources. Show explicit deny clearly in both person- and resource-centered views.
5. Add safe revoke/delete rule actions with provenance/audit.

## Likely code touchpoints
- src/app/**/folders/**/permissions/**
- src/lib/authz/**

## Automated acceptance
- Parent grant reaches child unless more-specific applicable deny/rule precedence changes it.
- Explicit Character deny removes access otherwise inherited from Role.
- Unrelated soldier can receive direct First Platoon folder edit despite not holding Captain/First-Platoon Role.
- Document-specific read grant exposes only target document.
- People Access tree and Folder permission panel return the same effective result/explanation for the same Character, capability, and resource.

## Manual acceptance
- As Commander, deny Cassian access to Investigations while he remains Warrior; verify Role display unchanged and access gone.
- As First Platoon Captain, direct-grant Varro edit to battle plans; verify grant works without membership rewrite.
- Open Varro from People, switch among Can view/edit/manage, locate the grant and its source in the Folder tree, and make the permitted change without leaving the Character workspace.

## Guardrails / non-goals
- `Do not require creating one-person Roles for exceptions.`
- `Do not copy permission rules into every descendant Folder.`
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
- `execution-notes/P07-T04.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
