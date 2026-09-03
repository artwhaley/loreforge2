# P01-T01 — Markdown dialect and render safety

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 1  
**Commit prefix:** `P01-T01:`

## Objective
Close the spike's known Markdown injection gap while preserving canonical Markdown as the stored format.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-01/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- Approved previous phase state / spike baseline.

## Frozen context for this ticket
- Raw HTML is not a supported LoreForge feature and must render inertly.
- Marked currently parses unsanitized HTML; this is a known spike defect.
- Use the approved Marked + sanitize-html defense-in-depth path.
- Use the exact tag/attribute/scheme allowlist in Architecture Contract §3; do not widen it to Marked's full feature set.
- If the approved `sanitize-html` version cannot install/work with the locked runtime, STOP under Change Control Category D with the exact compatibility error; do not choose a different parser/sanitizer silently.

## Required work
1. Add `sanitize-html` using the existing package manager/lockfile.
2. Refactor Markdown rendering so raw HTML tokens are escaped/inert before they can become DOM markup and final generated HTML is sanitized with the exact dialect allowlist. Configure Marked for GFM tables and `breaks=false`.
3. Keep LF canonicalization unchanged and ensure imports/editor saves still store Markdown, never sanitized HTML.
4. Reject all URL schemes except http/https/mailto and reject protocol-relative URLs, including encoded/case/whitespace-obfuscated `javascript:`, `data:`, and `vbscript:` variants.
5. Add dedicated Markdown safety tests and include them in the project test script.

## Likely code touchpoints
- `src/lib/markdown/render.ts`
- `src/lib/markdown/canonical.ts`
- `src/lib/markdown/*.test.ts`
- `package.json`
- `package-lock.json`

## Automated acceptance
- Safe headings/lists/table/link fixture renders as expected.
- `<script>`, event handlers, javascript links, SVG/script payloads cannot become active output.
- Unsupported tags/attributes/schemes are absent from output; the exact allowlist is asserted in tests.
- Benign angle-bracket prose remains visible.
- Canonicalization regression tests still pass.

## Manual acceptance
- Open malicious-looking imported/source content and confirm viewer is inert.
- Open ordinary fixture Document and confirm expected formatting.

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
- `execution-notes/P01-T01.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
