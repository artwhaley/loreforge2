# P08-T02 — Public Domain, member Domain Home, and Department surfaces

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 8  
**Commit prefix:** `P08-T02:`

## Objective
Hydrate and polish the approved LoreForge/Domain surfaces with public policy and real member data without replacing the user-first shell or becoming a free-form website CMS.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-08/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P08-T01

## Frozen context for this ticket
- Public Domain landing and logged-in selected-Domain Home are related but not identical. Signed-in `/` remains the cross-Domain LoreForge User dashboard.
- Department landing pages are application-generated navigation to folders/forms/templates available to the active Character.
- P04 already established the public platform home/login, User dashboard, global header, Domain navigation, Departments, and People shells. Preserve their routes and interaction model.
- Informational prose pages use the same Markdown editor/rendering seam; no arbitrary block layout.
- Public access must expose only resources explicitly public through authorization/public rules.
- Public access uses Architecture Contract §7 resource policy, not a new PermissionRule principal or an executor-invented `isPublic` shortcut.

## Required work
1. Implement the contracted public settings/fields (`publicEnabled`, internal Subdomain `publicListing`, Folder/Document/Page public access) and one shared server-side public-read predicate. Hydrate Domain public landing: identity/header, optional explicitly public welcome Markdown page, public Departments, public archive/search entry points.
2. Hydrate signed-in `/` and selected-Domain Home without conflating them: global User dashboard shows cross-Domain cards/continuations and feed placeholders; Domain Home shows active Character identity, their Departments, recent accessible Documents, available create Templates, and selected-Domain management summaries.
3. Hydrate Department landing from real membership/permission/template/folder data and preserve the separate authorized Manage Department affordance.
4. Add simple informational Page model/editor if not already adequate from spike; canonical Markdown and fixed site chrome.
5. Perform responsive/accessibility/UI tuning for desktop and mobile browser widths.

## Likely code touchpoints
- src/app/(public)/**
- src/app/(member)/**
- src/collections/Pages.ts

## Automated acceptance
- Anonymous user cannot discover private folders/documents via landing/list counts.
- User dashboard and selected-Domain Home differ intentionally; Domain Home differs by fixture Character permissions.
- Department landing only offers Templates whose destination/access is valid.
- Pages render safe canonical Markdown under Domain theme.
- Explicit public Document inside a private Folder is directly readable/searchable without leaking ancestor names, sibling counts, or breadcrumbs; `publicEnabled=false` suppresses every public resource.
- Counts, pagination, snippets, relationship labels, and facets are computed only after public filtering.

## Manual acceptance
- Browse Ar anonymously, then compare signed-in `/` and Ar Home as Head Scribe, Warrior, and Magistrate; each surface should feel coherent, preserve the approved navigation, and show different relevant content.
- Test narrow mobile viewport for browsing/reading even though native app is later.

## Guardrails / non-goals
- `Do not build drag/drop page layout.`
- `Do not add notifications implementation here.`
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
- `execution-notes/P08-T02.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
