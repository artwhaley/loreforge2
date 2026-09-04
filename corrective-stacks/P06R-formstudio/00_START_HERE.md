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
- `c204cfe` P06R: fix form-filing FK crash and add a multiple-Characters question (follow-up)
- `aa5ac4f` P06R: join the caller's transaction inside link/tag collection hooks (follow-up)
- `d608433` P06R: add a Time question type alongside Date (follow-up)

See `02_TRACEABILITY.md` for the file map.

## Follow-ups (2026-09-04, driven by the owner's filing retests)

- **Filing fix 1 (FK):** a submission failed with `FOREIGN KEY constraint
  failed` because the create wrote the Domain id into the retired legacy
  `tenants` column (which holds only the two legacy fixture rows). Records
  are now created scoped by `domain` alone, matching every other create path.
- **Filing fix 2 (transaction visibility):** the next retest crashed with
  `Not Found` inside the DocumentCharacterLinks hook: link/tag hooks looked
  rows up without `req`, so inside the atomic filing transaction Payload
  auto-committed a separate read that could not see the uncommitted Document.
  Hook lookups now join the caller's transaction. Verified by replaying the
  failing sequence on a scratch DB copy — pre-fix `Not Found`, post-fix the
  Document and its Prepared-by credit commit together.
- **Multiple-Characters question:** new `characters` question type — a chips
  multi-select on fills (single pick remains `character`). Manual scenario
  added as Scenario D in `01_MANUAL_ACCEPTANCE.md`.
- **Time question:** new `time` type beside `date` (Scenario E).

## Verification already run

- `npm test` — 114 pass / 0 fail (includes the previously orphaned
  `schema`/`adapter-payload`/`compose`/`resolve` tests and the new `layout` tests).
- `npx tsc --noEmit` — clean.
- `eslint` over every changed file — clean.
- Filing sequence replayed against a scratch copy of the live DB: the
  in-transaction Document + Prepared-by credit now commits (was `Not Found`).
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
