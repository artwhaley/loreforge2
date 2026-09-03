# P01-T03 — Editor toolbar, Source round-trip, and accessibility

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 1  
**Commit prefix:** `P01-T03:`

## Objective
Tune the actual editing experience while keeping the tested custom Source seam.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-01/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P01-T02

## Frozen context for this ticket
- Do not replace MDXEditor in this ticket.
- Toolbar only exposes supported Markdown features.
- Custom Source textarea remains.

## Required work
1. Configure a small supported toolbar: undo/redo, heading, bold, italic, lists, link, blockquote, horizontal rule. Expose table only if the table fixture survives three Edit->Source->Edit cycles and save/reopen without semantic drift, runtime errors, or inaccessible keyboard operation; otherwise omit only the table control and record the reproducible defect for Gate 1.
2. Ensure Edit->Source seeds current editor Markdown and Source->Edit reparses exact source without reload.
3. Add round-trip fixtures covering headings, nested lists, blockquotes, tables, links, horizontal rules, blank-line structure.
4. Label Source mode clearly as advanced/power-user.
5. Add keyboard focus states, semantic labels, and basic tab navigation.
6. If supported Markdown corruption is reproducible, document it for Gate 1; do not select a replacement editor.

## Likely code touchpoints
- `src/components/editor/DocumentEditor.tsx`
- `src/components/editor/ForwardRefEditor.tsx`
- `src/components/editor/InitializedMDXEditor.tsx`

## Automated acceptance
- Round-trip fixture retains semantic structure and LF newlines.
- The table stability criterion is tested and the toolbar result (enabled or deliberately omitted) is recorded.
- Unsupported toolbar controls absent.
- Mode switching preserves unsaved content.

## Manual acceptance
- Create/edit a multi-section report entirely WYSIWYG.
- Switch Source, make valid edit, return, save/reopen.
- Use keyboard to reach mode toggle and Save.

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
- `execution-notes/P01-T03.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
