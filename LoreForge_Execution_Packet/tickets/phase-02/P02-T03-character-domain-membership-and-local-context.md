# P02-T03 — Character Domain membership and local context

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 2  
**Commit prefix:** `P02-T03:`

## Objective
Move participation from spike User Memberships to explicit Character memberships.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-02/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P02-T02

## Frozen context for this ticket
- Membership belongs to Character.
- Membership is separate from local context and Roles.
- Character may join multiple Domains.

## Required work
1. Add DomainMemberships against current tenant/Domain entity until P03 rename.
2. Migrate/seed spike memberships to Character memberships with a restartable mapping report: a User with exactly one active controlled Character maps to that Character; fixture mappings are explicit; zero/multiple-Character Users remain unresolved and block legacy-membership deletion until an owner/operator selects one Character. Never fan one User membership out to every controlled Character.
3. Update Domain chooser/navigation and active-context validation to use active Character membership; after migration, a valid prior Domain may be reselected only when the new Character holds its active membership.
   The final top-level context bar is the paired contract: `Domain` on the left, `Acting as` Character on the right. Roleplay Domain choices come from the union of active memberships held by the User's controlled Characters; a visibly separate Administration group may list User-owned/operational-admin Domains without a Character member. Character choices for a selected Domain are restricted to the User's controlled Characters with an active membership in that Domain. Administration mode has no acting Character and grants only User-level operational authority. If a Domain choice would invalidate the current Character, require an explicit compatible Character choice or explicit Administration mode rather than silently changing acting identity. Commit and validate the selected mode server-side.
4. Create local context when Character is mentioned/linked in Domain if absent; do not auto-create membership.
5. Preserve each legacy `admin` bit in an explicit temporary operational-admin migration record consumed by P03-T01; do not reinterpret it as a Character Role. Deprecate old User Memberships in customer app paths and delete only after row-count/mapping reconciliation proves every row resolved or was deliberately rejected.

## Likely code touchpoints
- `src/collections/Memberships.ts`
- `src/collections/DomainMemberships.ts`
- `src/lib/tenant/queries.ts`

## Automated acceptance
- Same Character can join two Domains.
- Same User's Characters can differ in membership.
- Mentioned nonmember gets no membership/access.
- Migration is idempotent; ambiguous Users grant no new Character access, and every legacy row appears exactly once in the reconciliation report.
- The Domain/Acting-as bar offers only valid connected pairs; local aliases do not appear as membership choices, and changing Domain never silently changes the acting Character.

## Manual acceptance
- Verify one Character sees a Domain the other does not; Unknown Traveler remains nonmember.

## Guardrails / non-goals
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
- `execution-notes/P02-T03.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
