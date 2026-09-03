# P05-T01 — Prepared-by credits, Concerns links, and Domain tag vocabulary

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 5  
**Commit prefix:** `P05-T01:`

## Objective
Add typed Character credits/subject links and Domain tags beside Markdown without collapsing visible attribution into provenance or turning forms into arbitrary structured records.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-05/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P05-T00

## Frozen context for this ticket
- Characters linked to a Document are typed structural relationships, not inferred mentions in Markdown.
- `prepared_by` is visible authorship/preparation credit. `concerns` identifies Characters the record is about and may carry a human relationship label. Immutable create/edit actors remain provenance and are not inferred from either link.
- Every Character-authored new Document includes the active Character as `prepared_by`; creation UI cannot remove that Character but may add more credits.
- Tags use a Domain-managed vocabulary but authorized filers may create an ad-hoc tag while filing.
- Metadata remains platform-defined; do not add arbitrary per-Type database fields.
- Before P07, add/remove Tag and Character link mutations are ownerUser/operational-DomainAdmin only through `authorizeInterimOperation`; P07 replaces this with `edit_document` plus Domain integrity checks.

## Required work
1. Add DocumentCharacterLink model/collection with kind exactly `prepared_by|concerns`, optional human relationship label only for `concerns`, uniqueness/integrity rules, and attach/detach service preserving provenance.
2. Add Tag model scoped to Domain and DocumentTag relationship; normalize display/lookup uniqueness case-insensitively while retaining chosen display casing.
3. Hydrate the approved new-document/edit surface with separate searchable `Prepared by` and `Concerns` Character selectors plus tag autocomplete/create-new flow. On create, lock the active Character into Prepared by while permitting additional credits; never label provenance actor data as a credit.
4. Expose Prepared by, Concerns including optional relationship labels, and tags as distinct sections on Document view/edit and filters-ready query methods.
5. Record attach/detach/tag changes in Document provenance.

## Likely code touchpoints
- src/collections/DocumentCharacterLinks.ts
- src/collections/Tags.ts
- src/lib/documents/links.ts

## Automated acceptance
- Document can credit multiple Prepared by Characters, concern multiple Characters, and link one Character in both kinds without ambiguous duplicate display.
- Character-authored create fails without the active Character's `prepared_by` link, and forged create/update cannot omit or relabel the required creation credit.
- Provenance actor remains the actual authenticated User/acting Character even when additional preparers are credited.
- Case-insensitive duplicate tag creation is rejected/merged predictably.
- Removing a Character link does not delete Character.
- All mutations Domain-scoped and provenance-recorded.

## Manual acceptance
- Create an Incident Report as Varro, retain Varro as non-removable Prepared by, add another preparer, and add controlled plus unclaimed Characters under Concerns with a relationship label; browse each Character and see the record where access permits.
- Create a new ad-hoc tag during filing and reuse it from autocomplete.

## Guardrails / non-goals
- `Do not parse Markdown to auto-create Character links.`
- `Do not add custom field schemas here.`
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
- `execution-notes/P05-T01.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
