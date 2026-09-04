# P06-T02 — Neutral form schema and Payload Form Builder migration seam

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 6  
**Commit prefix:** `P06-T02:`

## Objective
Replace plugin-specific form definitions as business data with LoreForge's frozen neutral form schema while preserving the spike's proven form-to-Markdown path.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-06/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P06-T01

## Frozen context for this ticket
- Stored form schema is owned by LoreForge, not SurveyJS/Payload Form Builder.
- Supported field types for first production form system: text, textarea, date, select, checkbox, character.
- Field keys are stable machine identifiers; labels are editable display text.
- Template tokens are `{{field_key}}`; `{{content}}` is reserved for template composition.
- Raw form answers are not retained after successful Document creation.

## Required work
1. Define/version `LoreForgeFormSchema` TypeScript + validation schema with field key/type/label/help/required/options/default as applicable.
2. Add formSchema to form-first Templates and validate tokens at save time where possible.
3. Write adapter/importer that converts the spike/Payload Form Builder supported field subset into LoreForge schema; preserve unsupported-form warning rather than guessing.
4. Route runtime rendering through neutral schema, not Payload plugin collections.
5. Retain spike `generateDocument` seam but make it accept validated neutral answers + Template.

## Likely code touchpoints
- src/lib/forms/schema.ts
- src/lib/forms/adapter-payload.ts
- src/lib/forms/generateDocument.ts
- src/collections/Templates.ts

## Automated acceptance
- Schema validator rejects duplicate/invalid keys and select without options.
- Adapter fixtures correctly convert Payload text/textarea/date/select/checkbox fields. `character` is LoreForge-native and has no required Payload Form Builder equivalent; unsupported plugin fields produce an explicit warning, while P06-T03 authors `character` directly in the neutral schema.
- Unknown template token causes validation/runtime error and no Document creation.
- Successful generation emits only Markdown/Document data; raw answer persistence test proves none stored.

## Manual acceptance
- Convert the spike Incident Report definition to neutral schema and create a matching Document.
- Inspect database/admin to confirm submission-answer records are not retained as product data.

## Guardrails / non-goals
- `Do not add new field types without owner decision.`
- `Do not make form schema arbitrary JSON without version/validation.`
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.
- Forward-patch guardrails (P05R-T07, DEF-FORM-01): retire the permissive legacy Payload Form Builder submission create/read surface; old spike-era submission records are not permanent product data; no unrestricted legacy submissions API survives this ticket.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P06-T02.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
