# P06R — Form Studio rebuild (visual drag-and-drop builder)

**Status:** EXECUTED — owner approved the surgery plan on 2026-09-04; manual
UX acceptance is still owed by a human tester (see `01_MANUAL_ACCEPTANCE.md`).

## Why this corrective exists

The Phase 6 Form Studio shipped a machine-oriented authoring surface (editable
field `Key`s, raw `{{token}}` Markdown composing, a fake `[field_1]` text
preview) that was never human-acceptance tested. The owner judged it
unusable for non-technical roleplayers and directed a rebuild. Form.io,
SurveyJS Creator, and the wider open-source field were evaluated first:
SurveyJS Creator is proprietary (paid), Form.io would impose a foreign schema,
machine-field settings dialogs, and a two-way adapter, and no maintained
free embeddable React builder emits the LoreForge neutral schema. Decision:
a bespoke studio on the MIT drag toolkit `@dnd-kit`.

## Owner decisions recorded here (2026-09-04)

1. **Technology:** bespoke Form Studio built on `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (MIT). This is the owner-authorized exception to the packet guardrail "do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract" — recorded here so a later executor does not relitigate it.
2. **Sizing:** optional `width` (`short`/`medium`/`full`) and `rows` (long-answer height) presentation hints, additive to schema v1. Old stored schemas stay valid and are not rewritten.
3. **Record layout:** auto-layout only — the question list derives the record title/body templates at save time. Authors never type Markdown or `{{tokens}}`.
4. **Scope:** rebuild create + add edit-existing-form (save = next active version), fill-surface parity, and retire the legacy `/tenant` form shims.

## What changed (commits on `phase-07-authorization-delegation`)

- `a0216cb` P06R: neutral form-schema sizing hints and auto-layout rendering
- `db42f38` P06R: rebuild the Form Studio as a drag-and-drop visual builder

See `02_TRACEABILITY.md` for the file map.

## Verification already run

- `npm test` — 109 pass / 0 fail (includes the previously orphaned
  `schema`/`adapter-payload`/`compose`/`resolve` tests and the new `layout` tests).
- `npx tsc --noEmit` — clean.
- `eslint` over every changed file — clean.
- Live-route smoke requests against the running dev server returned normal
  auth-shielded responses (no 500 / compile errors) for the Forms list,
  create, and edit routes.

## Still owed

- Human manual acceptance — clean-context scenario in
  `01_MANUAL_ACCEPTANCE.md`. The Phase 6 human gate was bypassed during the
  original run; this corrective must not repeat that.

## Collaboration note

`PHASE_06_07_TESTING.md`, `PHASE_07_TESTING.md`, and the P07-GATE documents
carry in-progress Phase 7 owner edits and were intentionally never touched by
this corrective.
