# P06-T03 — Customer-facing Form Studio

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 6  
**Commit prefix:** `P06-T03:`

## Objective
Build the Head-Scribe-friendly form-template authoring surface instead of exposing Payload's CMS-oriented Form Builder admin UI.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-06/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P06-T02

## Frozen context for this ticket
- The spike proved form mechanics but stock Payload Form Builder showed irrelevant Emails/Confirmation configuration and is not accepted customer UX.
- Target user may be a 75-year-old roleplayer; ordinary creation must not require Markdown/token knowledge.
- Form Studio edits neutral LoreForge schema and Markdown output template.
- Before P07, only ownerUser/operational DomainAdmins may create/edit/duplicate/deactivate Templates through the audited interim authorization boundary.

## Required work
1. Build Form Studio under the approved unlabeled management bar at `Templates & Forms -> Forms` for authorized template managers: ordered field list with Add/Remove/Reorder, field editor for six supported types, required toggle, select options, preview.
2. Provide Document Output editor using existing Markdown WYSIWYG/source component plus `Insert Field` control that inserts the selected token without typing braces.
3. Show live/generated preview using sample values; surface unknown/missing token errors inline.
4. Provide base-template selector constrained to available ancestor Templates.
5. Add save/duplicate/deactivate actions with clear dirty-state/navigation protection.
6. Keep Document Types, Templates, and Forms visibly distinct while providing direct cross-links to the selected Template's Type, base Template, and new-document preview; do not expose raw Payload collection navigation.

## Likely code touchpoints
- src/components/forms/FormStudio/**
- src/app/**/templates/**

## Automated acceptance
- UI writes valid neutral schema only.
- Reorder preserves stable field keys.
- Deleting a field referenced by Markdown blocks save until reference removed/replaced.
- Keyboard-only basic field add/edit/reorder alternative is available even if drag reorder exists.
- A LoreForge-native Character field survives save/load round-trip with stable key/type and needs no Payload plugin mapping.
- Ordinary member and forged API cannot manage a Template before P07.
- Primary Domain navigation remains unchanged while Form Studio appears only in the subordinate capability-driven management area.

## Manual acceptance
- Have a clean-context tester build General Incident Report with date, character, select, narrative and preview output without reading technical docs.
- Confirm no Payload `Emails` or `Confirmation` concepts appear in customer UI.

## Guardrails / non-goals
- `Do not build conditional logic/multi-page surveys in this phase.`
- `Do not expose raw schema JSON to ordinary users.`
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
- `execution-notes/P06-T03.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
