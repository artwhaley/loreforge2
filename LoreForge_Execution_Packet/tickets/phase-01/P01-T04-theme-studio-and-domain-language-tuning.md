# P01-T04 — Theme Studio and Domain-language tuning

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 1  
**Commit prefix:** `P01-T04:`

## Objective
Give the rough spike its first taste/usability pass and remove customer-facing assumptions that every Domain is a modern city.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-01/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P01-T03

## Frozen context for this ticket
- No page builder/raw CSS.
- Theme changes affect chrome/rendered Documents, not Markdown.
- Schema-wide Tenant->Domain rename waits P03.
- This ticket tunes the existing spike Theme Studio and current token set for Gate 1. New contracted tokens (header layout, content width, document style, background treatment), controlled vocabulary, public-surface integration, and final productization belong to P08-T01; do not pull them forward.

## Required work
1. Tune Theme Studio grouping, labels, layout, save feedback, and live preview for nontechnical use.
2. Make at least two presets visibly/intentionally different; improve curated font/color options only within current schema.
3. Make logo/seal and banner upload obvious and robust to missing media. Enforce the Architecture Contract media boundary server-side: decoded/re-encoded JPEG/PNG/WebP only, maximum 5 MiB and 4096x4096; reject SVG, animation/polyglots, MIME mismatch, and decompression-bomb inputs.
4. Show both shell/home and representative Document in live preview or equally direct dual preview.
5. Inventory customer-facing chrome/help/validation strings and replace generic hard-coded `city`/`tenant`/`department` labels with `Domain`/`community`/`Subdomain`/`archive` as context requires. Do not rename schema/routes until their scheduled tickets, and do not alter fixture/proper-name/editorial content merely because it contains those words. Keep an explicit allowlist for remaining customer-visible occurrences.
6. Inspect Payload Form Builder once and write `execution-notes/P01-FORM-BUILDER-OBSERVATIONS.md` listing irrelevant email/confirmation/CMS controls to eliminate in P06. Do not build Form Studio now.

## Likely code touchpoints
- `src/components/theme/ThemeStudio.tsx`
- `src/components/theme/TenantShell.tsx`
- `src/collections/Tenants.ts`
- `src/lib/theme/*`

## Automated acceptance
- Theme save round-trip retains allowed values/assets.
- No Document body changes when theme changes.
- Theme/font tests cover any added curated choices.
- Customer-visible terminology scan contains no unallowlisted generic `city`, `tenant`, or `department` labels; fixture/proper-name/schema occurrences remain deliberately documented.
- Media tests reject SVG/script, spoofed MIME/extension, oversize byte/dimension, and malformed-image fixtures.

## Manual acceptance
- Make same Domain look traditional, then strongly modern, using Theme Studio only.
- Confirm shell and same Document both update.
- Reviewer can find logo/banner/colors/fonts/Save without manual.

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
- `execution-notes/P01-T04.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
