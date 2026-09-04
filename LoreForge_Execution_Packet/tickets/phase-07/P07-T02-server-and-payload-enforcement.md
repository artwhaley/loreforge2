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
2. Wire the shared evaluator into every customer-accessible tenant-owned path for Documents, Folders, Document Types, Templates, Tags, Document Character links, Document Relationships, Characters/DomainCharacterContexts, CharacterClaimRequests, Domain memberships, Subdomains, Roles/RoleAssignments, and PermissionRules. Department participation is derived from Roles; obsolete SubdomainMembership paths must not exist or authorize. Claim decisions require `manage_claims` on the claim Domain and a still-unclaimed Character. Collections that are platform-internal only must deny ordinary customer API access. Do not duplicate precedence inside hooks.
3. Filter list/search queries by readable resource scope and avoid returning hidden titles/counts where access denied.
4. Ensure mutations re-check authorization server-side using persisted target state, not client destination claims.
5. Add integration tests that exercise direct REST/local API/server actions, not only browser UI.
6. Replace and delete `authorizeInterimOperation`, the legacy Tenant-admin branch, and the temporary P05 share enforcement adapter, following the P05R-T00 call-site inventory appendix below (disposition per site: replace with the shared evaluator, delete, or keep for a named reason). Preserve workflow APIs and PermissionRule rows; no legacy User Membership may grant post-P07 access. Do not replace the Share adapter with a customer Share workflow unless `P07-D01` (`references/P07-D01-DOCUMENT-SHARING-DECISION.md`) has separately approved one; Share remains deferred (CC-2026-09-03-04).

## Likely code touchpoints
- src/lib/authz/context.ts
- src/collections/**
- src/lib/documents/**

## Automated acceptance
- Unauthorized direct API read/write receives deny even when route guessed.
- Moving to a destination requires source and destination permissions.
- Document-resource PermissionRules are enforced correctly as generic authorization primitives. No customer-facing Share workflow is implied (Share deferred, CC-2026-09-03-04).
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

## Interim-seam teardown inventory (binding support material from P05R-T00)

Generated 2026-09-04 at branch `phase-05-document-supersession-and-sharing` tip by P05R-T00 (full per-site detail in `execution-notes/P05R-T00.md`). This ticket must replace or delete every `authorizeInterimOperation` / `requireInterimWorkflowAuthority` / `authorizeSharedDocumentAccess` site below; none may survive P07-GATE.

| Site | Enforces | Disposition |
| --- | --- | --- |
| `src/lib/authorization/interim.ts:6` — `authorizeInterimOperation` definition | interim owner/DomainAdmin decision | delete (replaced by evaluator) |
| `src/lib/documents/workflow.ts:50` — `requireInterimWorkflowAuthority` | interim admin authority for lifecycle transitions | delete; call evaluator per transition |
| `src/lib/documents/sharing.ts:21` (shareDocument/revoke) + `:58` `authorizeSharedDocumentAccess` | interim admin authority; prototype read grant | delete; Share deferred (CC-2026-09-03-04); route already inert |
| `src/lib/documents/relationships.ts:15` | interim authority for relationship mutation | replace with evaluator (`edit_document` both docs) |
| `src/lib/documents/links.ts:16` | interim authority for tag/link mutation | replace with evaluator (`edit_document` on Document) |
| `src/lib/actions/archive.ts:232` | interim authority + active-Character gate for creation | replace with evaluator + Character membership context |
| `src/lib/actions/documentWorkflow.ts:59,61,83,97` | interim authority for workflow actions | replace with evaluator per operation |
| `src/lib/actions/documentVersions.ts:46` | interim authority for version-history reads | replace with evaluator read decision |
| `src/collections/Documents.ts:35,71` — `access.read` + beforeChange admin gate | per-document read decision + interim admin | replace read with evaluator; hook keeps structural checks |
| `src/app/(payload)/api/roles/route.ts:27`, `role-assignments/route.ts:28`, `permission-rules/route.ts:28`, `folders/route.ts:30`, `domain-memberships/route.ts:19`, `departments/route.ts:14`, `people-search/route.ts:22` | interim admin authority on guarded customer routes | replace with evaluator; access config closures (P05R-T01) already deny direct collection writes |

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P07-T02.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
