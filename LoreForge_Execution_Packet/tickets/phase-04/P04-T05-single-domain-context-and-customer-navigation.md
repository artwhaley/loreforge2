# P04-T05 — Single-Domain context and customer navigation

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 4  
**Commit prefix:** `P04-T05:`

## Objective
Replace Administration mode and collection-shaped navigation with one selected Domain, an optional eligible acting Character, stable customer navigation, and capability-driven management links.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `06_CHANGE_CONTROL.md` section `CC-2026-09-02-01`
- `tickets/phase-04/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P04-T00

## Frozen context for this ticket
- There is exactly one Domain selector. Participating and User-managed Domains may be grouped within it but never appear as parallel controls.
- Domain selection is valid without an acting Character for public browsing and User-level owner/admin work. Character-scoped work still requires an eligible active Character and membership.
- Administration is capability, not a mode. No Enter/Exit Administration control or second Domain selection survives.
- Domain primary navigation is always ordered Home, About, Departments, Records. Conditional management navigation is visually subordinate and server-authorized.
- Platform Console is global account/operator navigation, not a Domain administration item.

## Required work
1. Replace the current context cookie/action model as needed so the server can preserve one selected Domain with either a valid member Character or no Character. Remove the administration-mode cookie/action/UI seam; migrate or safely ignore stale local cookies.
2. Build the persistent authenticated LoreForge header: LoreForge logo to `/`, one Domain selector on the left, `Acting as` Character selector on the right, and Account menu. Group selector options as Participating/Managed when both exist and deduplicate Domains.
3. On Domain switch, preserve the acting Character only when eligible in the destination; otherwise clear it without selecting another Character. On Character switch, reject/clear incompatible identity without silently changing Domain.
4. Permit User-level owner/operational-admin routes for the selected Domain with no active Character while continuing to require a Character for Character-scoped roleplay actions. Show `No participating Character` rather than implying identity.
5. Refactor Domain shell navigation to stable `Home, About, Departments, Records`. Move all management links to a subordinate unlabeled bar with `People, Roles, Templates & Forms, Customize`, showing only destinations authorized by the current interim boundary. Do not add redundant `Manage <Domain>` copy or treat link hiding as authorization.
6. Make LoreForge logo `/` and Domain Home `/domain/:slug` visibly distinct. Add persistent breadcrumbs or equivalent hierarchy on deeper Department, Folder, Document, and management pages so every screen has an explicit upward path.
7. Change customer-visible default copy and canonical routes from Subdomain(s) to Department(s). Make `/domain/:slug/departments` canonical and redirect legacy `/subdomains` routes without changing internal schema IDs/collections.
8. Remove ordinary customer-facing Payload/CMS terms and any page copy explaining internal record separation when a concise user-facing explanation suffices.

## Likely code touchpoints
- `src/components/theme/TenantShell.tsx`
- `src/lib/tenant/activeTenant.ts`
- `src/lib/tenant/queries.ts`
- `src/app/(payload)/api/switch-tenant/route.ts`
- `src/app/(payload)/api/switch-character/route.ts`
- `src/app/(payload)/api/switch-administration/route.ts`
- `src/app/(frontend)/domain/**`

## Automated acceptance
- Customer shell renders one and only one Domain selector and no Administration selector/mode/Exit control.
- A User can select a managed Domain with no member Character; owner/admin management authorization remains valid while Character-scoped authoring fails closed.
- Domain switch never silently chooses another Character, and invalid Character/Domain pairs are never accepted by server actions.
- Primary navigation labels/order remain Home, About, Departments, Records for ordinary and administrative fixtures.
- Management links reflect interim authority, while forged route/API requests remain denied independently.
- Legacy `/subdomains` routes redirect to equivalent canonical `/departments` destinations without losing the selected Domain/Character context.

## Manual acceptance
- Switch among a Domain with two eligible Characters, a participating-only Domain, and a managed-only Domain. Confirm the Domain remains selected, Character changes are explicit, and management links appear without a mode transition.
- Starting from a deep Department/Folder/Document page, return explicitly to Department, Records, Domain Home, and LoreForge Dashboard without relying on browser Back.

## Guardrails / non-goals
- `Do not weaken Character-scoped authorization merely because no Character is required for User-level administration.`
- `Do not preserve Administration mode under a renamed cookie, route, tab, or visual state.`
- `Do not rename the internal Subdomain schema in this ticket.`
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
- `execution-notes/P04-T05.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to P04-T06.
