# P07-T02 — Server, Payload, and query authorization enforcement

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 7  
**Commit prefix:** `P07-T02:`

## Objective
Make the evaluator authoritative across all read/write paths so UI hiding is never the security boundary.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-07/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P07-T01

## Frozen context for this ticket
- Spike query-level tenant scoping was acceptable only for MVP; real application must enforce Domain and resource authorization consistently.
- Payload Admin/API must not become an accidental bypass for ordinary users.
- Platform Admin remains explicit superuser with audited actions.

## Required work
1. Create server authorization context resolver from authenticated User + selected Domain + optional active Character. User-level Domain owner/admin evaluation must work without a Character; Character-scoped operations require the validated active member Character. Do not recreate Administration mode in authorization context.
2. Wire the shared evaluator into every customer-accessible tenant-owned path for Documents, Folders, Document Types, Templates, Tags, Document Character links, Document Relationships, Characters/DomainCharacterContexts, CharacterClaimRequests, Domain/Subdomain memberships, Subdomains, Roles/RoleAssignments, and PermissionRules. Claim decisions require `manage_claims` on the claim Domain and a still-unclaimed Character. Collections that are platform-internal only must deny ordinary customer API access. Do not duplicate precedence inside hooks.
3. Filter list/search queries by readable resource scope and avoid returning hidden titles/counts where access denied.
4. Ensure mutations re-check authorization server-side using persisted target state, not client destination claims.
5. Add integration tests that exercise direct REST/local API/server actions, not only browser UI.
6. Replace and delete `authorizeInterimOperation`, the legacy Tenant-admin branch, and the temporary P05 share enforcement adapter. Preserve workflow APIs and PermissionRule rows; no legacy User Membership may grant post-P07 access.

## Likely code touchpoints
- src/lib/authz/context.ts
- src/collections/**
- src/lib/documents/**

## Automated acceptance
- Unauthorized direct API read/write receives deny even when route guessed.
- Moving to a destination requires source and destination permissions.
- Document-specific share permits direct document read without parent folder listing.
- Cross-Domain IDs cannot be used to bypass active Domain scope.
- Platform Admin bypass path emits audit event.
- Concurrent claim approvals cannot double-bind a Character; a caller lacking `manage_claims` is denied through UI, REST/local API, and server action.
- A former legacy Tenant admin with no final owner/admin/rule authority receives no access after interim code removal.
- Domain owner/admin with no active Character can use authorized User-level management APIs but cannot perform Character-authored actions or inherit Character permissions.

## Manual acceptance
- Log in as fixture actors and compare navigation visibility with direct URL/API attempts.
- Inspect Payload admin availability for ordinary customer users; they must not receive a broad CMS backdoor.

## Guardrails / non-goals
- `Do not rely solely on route middleware.`
- `Do not fork a second permission implementation inside Payload hooks; call shared evaluator.`
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
- `execution-notes/P07-T02.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
