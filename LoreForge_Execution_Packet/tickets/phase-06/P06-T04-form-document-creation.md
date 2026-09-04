# P06-T04 — Form-driven Document creation

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 6  
**Commit prefix:** `P06-T04:`

## Objective
Complete form-first authoring so a filer fills a friendly form and receives an ordinary canonical Markdown Document with structural Character links.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-06/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P06-T03

## Frozen context for this ticket
- Form is only an authoring mechanism. Result is an ordinary Document.
- Raw structured answers are discarded after successful creation.
- `character` fields create/select `concerns` Character links, optionally with the Template-defined human relationship label; they do not create Prepared by credit or merely interpolate an opaque ID into prose.
- Lifecycle policy is resolved from Template > Folder > Type > Domain.
- Before P07, form/document creation requires authenticated User -> controlled active Character -> active DomainMembership plus the existing server-validated destination scope. Inline creation of an unclaimed Character is separately ownerUser/operational-DomainAdmin only. All checks use the interim boundary and are replaced by P07 without changing creation APIs.

## Required work
1. Complete the existing `/domain/:domain/records/new` flow rather than adding a parallel form route: searchable Template selection, Template-derived destination Folder, title, Prepared by, Concerns, Tags, and form/WYSIWYG body share one creation shell. Alternative destination selection appears only when the chosen Template permits it.
2. Render form from neutral schema; character field searches readable existing Characters. Show create-unclaimed inline only to an interim-authorized owner/admin and enforce the same check server-side.
3. Generate canonical Markdown, escape user input so field values cannot inject unintended Markdown structure, and create Document + typed Character links in one transaction. Preserve the active Character as required Prepared by credit and map Character form fields only to Concerns.
4. Apply effective lifecycle: save draft explicitly or submit using direct-file/review-required policy.
5. Write provenance identifying Template used and form-authored source without storing raw answer payload.

## Likely code touchpoints
- src/app/**/new/**
- src/lib/forms/generateDocument.ts
- src/lib/documents/create.ts

## Automated acceptance
- Incident form creates expected Markdown exactly from fixture.
- Character form value creates DocumentCharacterLink.
- Form and WYSIWYG Template choices use the same title, destination, Prepared by, Concerns, Tags, lifecycle, validation, and provenance machinery.
- The server rejects a forged destination different from a fixed Template's normal destination and rejects every override the Template or actor does not permit.
- Unknown token or failed Character create rolls back entire Document creation.
- No raw form answer object remains in database after commit.
- Review-required Template submission produces Pending Review.
- Inactive/nonmember active Character cannot create through direct API; ordinary member cannot use the inline unclaimed-Character mutation.

## Manual acceptance
- Officer opens Records -> New document, selects Incident Report in the same searchable chooser used for Plain Text, sees its destination selected automatically, completes the form with the active Character retained under Prepared by, later opens it in the normal Markdown editor once editable, and sees it behave identically to a hand-authored Document.
- Verify output remains readable when copied as plain Markdown/notecard-style text.

## Guardrails / non-goals
- `Do not lock form-created Documents into perpetual form editing.`
- `Do not retain a hidden structured submission record.`
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.
- Forward-patch guardrails (P05R-T07): on form-created Documents the active member Character automatically becomes Prepared-by; Character form fields create Concerns, not Prepared-by credits; ordinary form authoring requires an active member Character; new code uses canonical `sourceKind`, never legacy `origin`.
- Forward-patch guardrails (P05R-T08, DEF-TAGS-01, DEF-PREP-01, DEF-ATTACH-01): document-entry surfaces land the tag autocomplete/create-new picker (DEF-TAGS-01), an add-more-Prepared-by-credits control on the creation surface (DEF-PREP-01), and visible member tag/concern attach behavior instead of silent drops or bare rejections (DEF-ATTACH-01).

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P06-T04.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
