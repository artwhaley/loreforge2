# P06R-formstudio — Form Studio visual rebuild

**Status: executed; owner-directed corrective; manual acceptance pending.**

## Why

The Phase 6 Form Studio shipped with the human Phase 6 gate bypassed and was
never manually accepted. The owner reviewed it and judged the authoring
surface (machine field keys, raw `{{token}}` Markdown editing, a fake
`[field_1]` preview) unusable for non-technical roleplayers, and directed a
rebuild after evaluating Form.io, SurveyJS Creator, and the free
open-source field.

## What was decided (owner, 2026-09-04)

- Bespoke visual builder on `@dnd-kit` (MIT) instead of a third-party form
  engine; the new-dependency exception is recorded in
  `corrective-stacks/P06R-formstudio/00_START_HERE.md`.
- Practical per-question sizing as additive schema-v1 hints (`width`, `rows`).
- Auto-layout records only: title/body templates derived from the question
  list at save; no Markdown/token authoring.
- Create + edit-existing scope; legacy `/tenant` form shims retired.

## Implemented

- Schema: optional `width`/`rows` (+ `help`/`default` round-tripping
  preserved); validator rejects invalid values instead of coercing; older
  stored schemas remain valid and unrewritten.
- Auto-layout lib (`src/lib/forms/layout.ts`): deterministic keys, record
  title/body composers, brace-safe headings, title-source inference.
- Rendering chain: select answers display as labels, checkbox strings
  normalize to Yes/No, Character answers resolve to names for the record
  while raw ids feed the existing Character-link step; record titles render
  plain (no Markdown escaping of dates).
- Actions: create + new update action derive templates server-side; shared
  placement/availability checks; edit saves the next active version
  (duplicate-inactive dead-end removed).
- Studio UI (`src/components/forms/FormStudio/`): toolbox → canvas →
  inspector; drag via @dnd-kit plus keyboard add/move/remove; canvas renders
  the real controls (help, defaults, sizing); record-preview toggle; no Key /
  JSON / token / CMS vocabulary anywhere.
- Fill parity: shared `FieldControl` used by studio canvas, member fill, and
  the records/new template form; Character picker extracted and now rendered
  on form fills (was a plain text box).
- Routes: `/forms/new` mounts the studio; `/forms/[formId]/edit` added; Forms
  list shows Active/Inactive and an Edit action; legacy `tenant` form shims
  deleted.

## Evidence

- `npm test` — 114 pass / 0 fail (schema/adapter/compose/resolve tests were
  previously omitted from the runner and are now included with the new
  layout tests; follow-ups added multi-Character and Time cases).
- `npx tsc --noEmit` — clean.
- `eslint` changed files — clean.
- Dev-server smoke requests to the four Forms routes returned auth-shielded
  responses; no compile errors.

## Manual acceptance

Not run before unattended execution. Scenario + sign-off table:
`corrective-stacks/P06R-formstudio/01_MANUAL_ACCEPTANCE.md`.

## Follow-up (2026-09-04): filing crash fix + multiple-Characters question

While manually filing a form the owner hit a server error:
`FOREIGN KEY constraint failed` on the `documents` insert. Root cause: the
create wrote the Domain id into the `documents.tenant` column, whose FK
references the retired `tenants` collection (only the two legacy fixture
rows exist), so any Domain beyond the legacy two crashed. Every other create
path in the app either omits `tenant` or writes a genuine legacy id
(`archive.ts`). Fix (`c204cfe`): the generation seam now scopes new records
by `domain` alone.

The owner also asked for two versions of the Character chooser: the existing
single pick plus one that selects MULTIPLE Characters. Added a `characters`
question type: schema/validator support (additive, stays schema v1), answer
values as id arrays, a chips multi-select in the shared picker (one hidden
input per chosen Character so native form submission reads them via
`getAll`), record bodies that join the chosen Characters' names, and a
Character link per selection. The Form Studio exposes it as a new
"Pick Characters" question with the same inspector options (relationship
label etc.); fills and records/new render it through the shared
`FieldControl`.

## Follow-up 2 (2026-09-04): transaction-visibility crash + Time question

The next filing retest crashed with `Not Found` from
`DocumentCharacterLinks.beforeChange`. Root cause: inside the atomic filing
transaction the hook looked the just-created Document up WITHOUT `req`, so
Payload auto-committed a separate read that could not see the uncommitted
row (`src/lib/db/transactions.ts` documents the rule). The same latent bug
sat in `DocumentTags.beforeChange` (tags attach inside the same atomic
create flow). Fix (`aa5ac4f`): hook lookups now pass `req` and join the
caller's transaction.

Verified empirically by replaying the failing sequence on a scratch copy of
the live DB (document create + Prepared-by credit in one transaction):
pre-fix the probe threw `Not Found` exactly like the owner's crash;
post-fix the Document and its credit commit together.

The owner also asked for a time picker. Added a `time` question type beside
`date` (`d608433`): native time input on fills and the studio canvas, a
Time toolbox tile, time default answers in the inspector, sample time in
the record preview. Time answers never name records, matching checkbox and
Character questions.

Verification at commit: `npm test` 114 pass / 0 fail, `tsc --noEmit` clean,
`eslint` clean. Manual scenarios added as Scenarios D and E in
`corrective-stacks/P06R-formstudio/01_MANUAL_ACCEPTANCE.md`.

## Deferred / notes

- Editing a pre-corrective form regenerates its record layout from the
  question list on save (title source inferred from the old title template
  when it was a single naming token).
- Record preview in the studio uses sample answers; real Character names are
  only known at filing time.
- Non-form `/tenant` redirect shims remain until their scheduled P10 removal.
