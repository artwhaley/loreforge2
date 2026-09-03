# P15-T03 — SL location restrictions with action-start semantics

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 15  
**Commit prefix:** `P15-T03:`

## Objective
Apply optional Domain/Subdomain/Folder Second Life presence requirements without creating an annoying continuous policing system.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-15/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P15-T02

## Frozen context for this ticket
- Location restriction scopes: Domain, Subdomain, Folder; Documents inherit Folder.
- Local LoreForge permissions are still required. Location never grants access by itself unless resource itself is otherwise public/permitted.
- Check at START of action/access: search start, document open, edit start. Successful edit start authorizes that edit session/save even if later location check would fail.
- Do not close tabs/invalidate visible results due to lag. Clicking a result may require a new access check.
- Effective restriction is deepest Folder, then Subdomain, then Domain using `inherit|none|required`; Documents inherit Folder. `none` explicitly clears an ancestor restriction.

## Required work
1. Add Domain/Subdomain/Folder `inherit|none|required` location configuration referencing only approved SL region/parcel/area descriptors from protocol, with the exact precedence above.
2. Add external-condition service that asks bridge/core assertion at action start after local authorization passes, with bounded timeout and user-friendly unavailable response.
3. Issue a server-recorded signed edit session bound to User, controlled active Character, Document, and starting version. It expires after 8 hours or first successful save/explicit close and is non-transferable; save never rechecks SL location. On expiration or optimistic-version conflict, retain the body locally and require a new start check rather than losing work.
4. Search checks at search start; result open performs its own check; open/read authorization remains for that view.
5. Audit condition failures/success only at useful level without high-volume spam.

## Likely code touchpoints
- src/lib/sl/location/**
- src/lib/authz/externalConditions.ts
- bridge/**

## Automated acceptance
- Locally unauthorized user denied without bridge granting access.
- Authorized+wrong location denied start.
- Authorized edit start then simulated bridge outage still allows that specific save.
- New document open after outage requires fresh check/fails safely.
- Search results remain on screen after later location change.
- Folder/Subdomain/Domain precedence and explicit `none` are table-tested; expired/session-replay/version-conflict saves fail without discarding submitted content.

## Manual acceptance
- Walk fixture user into/out of mocked/approved location and demonstrate exact open/search/edit-start behavior.

## Guardrails / non-goals
- `Do not poll continuous position.`
- `Do not recheck at save and risk lost typing.`
- `Do not embed simulator coordinates logic in generic permission evaluator.`
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
- `execution-notes/P15-T03.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
