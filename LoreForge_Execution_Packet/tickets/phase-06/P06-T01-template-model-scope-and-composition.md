# P06-T01 — Template model, inheritance scope, and base composition

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 6  
**Commit prefix:** `P06-T01:`

## Objective
Create a reusable template system that supports Domain/Subdomain/folder availability and letterhead-style composition without a page-builder.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-06/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P05-GATE approved

## Frozen context for this ticket
- Document Type and Template remain distinct; each Template creates exactly one required Document Type.
- Templates are content configuration, not runtime starter-pack dependencies.
- A Template has an owning scope/location and `availableToDescendants` toggle.
- Child templates may base themselves on an available ancestor Template (e.g. Scribe letterhead -> Deed template).
- Blank Plain Text is an ordinary Domain-level inheritable Template.
- Template management before P07 is ownerUser/operational-DomainAdmin only through the audited interim authorization boundary.

## Required work
1. Add Template collection exactly as contracted: Domain, required scope Folder (Domain root allowed), name, Document Type, kind `document|form`, title/body Markdown template, neutral form fields for form kind, optional same-Domain baseTemplate, availableToDescendants, lifecycle policy override/inherit, active/version timestamps.
2. Implement deterministic availability resolver based on current destination folder ancestry and inheritance toggle.
3. Implement base-template composition with exactly one reserved `{{content}}` insertion point in every referenced base; reject activation/save when missing or duplicated, validate no cycles, and replace that token with child output before resolving field tokens. Never append implicitly.
4. Hydrate the approved `/domain/:domain/records/new` searchable Template combobox, grouped by Document Type and filtered by destination availability. Plain Text is the ordinary blank choice; changing Template after user input requires explicit replacement confirmation.
5. Seed/update Plain Text template at Domain root.
6. Establish the customer `Templates & Forms` management area with separate Document Types, Templates, and Forms subnavigation; this ticket hydrates Types/Templates and leaves the Form Studio destination to P06-T03.

## Likely code touchpoints
- src/collections/Templates.ts
- src/lib/templates/resolve.ts
- src/lib/templates/compose.ts

## Automated acceptance
- Ancestor template available with toggle on and hidden with toggle off.
- Base-template cycle rejected.
- Composition output canonical and deterministic.
- Template pointing to Type from another Domain rejected.
- Missing/duplicate `{{content}}` in a referenced base is rejected; owner/admin interim checks apply equally to direct API writes.
- Searchable chooser never offers a Template unavailable to the selected destination and never silently replaces entered content.

## Manual acceptance
- Create Head Scribe Letterhead at Scribes root; create Deed template beneath it; update letterhead and verify new documents use updated composition while old Documents remain unchanged.
- Verify Plain Text appears in descendant folders by normal inheritance.
- From Records -> New document, search the chooser by Template and Type name, switch destination, and verify the available options update without leaving the creation page.

## Guardrails / non-goals
- `Do not retroactively alter Documents when Templates change.`
- `Do not introduce arbitrary nested page-builder blocks.`
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
- `execution-notes/P06-T01.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
