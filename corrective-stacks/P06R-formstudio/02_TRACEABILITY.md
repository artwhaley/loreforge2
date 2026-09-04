# P06R Form Studio — traceability

Branch: `phase-07-authorization-delegation` (shared checkout; the owner's
Phase 7 in-progress doc edits were never staged or committed by this
corrective).

## Commits

| Commit | Summary | Files |
| --- | --- | --- |
| `a0216cb` | P06R: neutral form-schema sizing hints and auto-layout rendering | `src/lib/forms/schema.ts`, `schema.test.ts`, `layout.ts` (new), `layout.test.ts` (new), `src/lib/templates/compose.ts`, `src/lib/forms/generateDocument.ts`, `src/lib/actions/archive.ts`, `src/lib/actions/forms.ts`, `package.json`, `package-lock.json` |
| `db42f38` | P06R: rebuild the Form Studio as a drag-and-drop visual builder | Studio UI (`src/components/forms/FormStudio/*`), `FieldControl.*`, `CharacterFieldPicker.tsx` (extracted), `FillForm.tsx`, `NewDocumentForm.tsx`, `src/lib/actions/templates.ts`, Forms routes incl. new `[formId]/edit/page.tsx`, deletion of legacy `tenant/[slug]/forms/*` shims and the old `FormStudio.tsx` |

## New dependency (owner-authorized)

`@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2`
— MIT drag/sortable primitives only; no schema, storage, or framework
adoption. Recorded as the authorized exception in `00_START_HERE.md`.

## Behavior contracts preserved

- Storage: `Templates` rows, `kind: 'form'`, versioned neutral `formSchema`
  JSON. No DB migration; schema stays version 1 with additive optional
  `width`/`rows`.
- Enforcement: `assertFormSchema`, `validateTemplateTokens`, and the
  `Templates.beforeChange` hooks unchanged in behavior; all creation paths
  still route through the audited `manage_templates` server actions.
- Generation: `renderNeutralTemplate` / `composeTemplate` / Character-link
  creation seams unchanged in shape; answers are still never retained as
  product data.
- Fill UX: the six neutral field types are unchanged; keyboard-only authoring
  (add/edit/reorder/remove) is required and provided alongside drag.
- Legacy: `/tenant` customer URLs other than the two deleted form shims stay
  per P05R-T06 / P10 `DEF-TENANT-01`.

## Behavior changes (intended)

- Member form fills now render help text, defaults, sizing, and a real
  Character picker (previously a plain text box — a Phase 6 defect).
- Records read human text: select answers render their labels, checkboxes
  render Yes/No, Character answers render names; record titles render plain
  (dates are not Markdown-escaped anymore).
- Editing an existing form (new route) saves the next active version instead
  of the old duplicate-then-dead-end flow.
- Pre-corrective forms that are edited are re-laid-out by the auto-layout
  composer (their previously hand-written body templates are regenerated from
  the question list on save).

## Verification evidence (run at commit time)

- `npm test`: 109 pass / 0 fail.
- `npx tsc --noEmit`: clean.
- `eslint` on all changed files: clean.
- Dev-server smoke requests to `/domain/{slug}/forms`,
  `/domain/{slug}/forms/new`, `/domain/{slug}/forms/1/edit`,
  `/domain/{slug}/forms/1` returned auth-shielded responses (no 500 /
  compile errors).
- Manual acceptance: **not yet run** — see `01_MANUAL_ACCEPTANCE.md`.
