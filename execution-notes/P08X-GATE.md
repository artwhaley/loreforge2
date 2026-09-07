# P08X-GATE — Owner end-to-end review of the Document Types authoring surface

**Hard stop.** Implementation of T01–T07 is complete and verified; the owner
walkthrough of `02_INTEGRATED_ACCEPTANCE.md` is the remaining step.

## 1. Branch + final commit list

Branch: `phase-07x-acting-identity-document-workflows`

| Commit | Ticket |
| --- | --- |
| `7996383` | P08X-T01 rename Templates & Forms management entry to Document Types |
| `af280cc` | P08X-T02 add type tree, template selection, and lifecycle stage schema |
| `1927421` | P08X-T03 add Document Type folder-tree management surface |
| `a014bd3` | P08X-T04 add Document Type inspector panel and lifecycle configuration |
| `e86494e` | P08X-T05 duplicate Document Types with independent template copies |
| `8af2334` | P08X-T06 enforce lifecycle-stage permissions and private drafts |
| `2ff4573` | P08X-T07 add lifecycle-aware creation and stage-driven transitions |

## 2. Migration report (`migrate:p08x-document-types`, idempotent, additive)

Green-field 1.0 — new tables/columns only; no value remaps, no legacy
upgrades. Applied to the dev DB (last run after T06):

- **T02 additions**: `type_folders` table (+ indexes); `document_types`
  gains `department_id`, `type_folder_id`, `template_selection`; new
  `lifecycle_stages` table + unique `(document_type, stage)` + role rels
  table; `documents` gains `locked` (default false) and `private_draft`
  (default true); `document_relationships.prior_locked`;
  `payload_locked_documents_rels` relation columns.
- **T06 additions** (same script, re-run idempotent): `documents.
  creator_character_id` (the private-draft visibility boundary) with a
  one-time legacy backfill — the pre-existing corpus was never truly private,
  so `private_draft` was cleared on it (17 legacy documents in the dev DB),
  guarded by the new column's presence so it runs exactly once; `domains.
  authz_epoch` (authorization-facts version).
- **Dev DB state**: all columns present; **0 `lifecycle_stages` rows** — by
  design, stage rows are seeded when a Document Type is created/edited
  through the inspector (`ensureLifecycleStageRows`); pre-existing Types keep
  legacy route-field behavior until configured there.
- **T07**: no schema changes (creation-phase validation and transitions are
  logic-only).

## 3. Test commands / results (final state)

- `npx tsc --noEmit` — clean.
- `npm test` — 129/129.
- P08X focused suites (fresh DBs): `test:p08x-t03` 9/9 (type tree resolver),
  `t04` 6/6 (inspector config round-trip), `t05` 6/6 (duplicate semantics +
  magic-pops-up), `t06` 9/9 (stage authorization + private drafts + epoch),
  `t07` 9/9 (creation phases + stage transitions).
- P07X regression suites (fresh DBs): t02 9/9, t03 7/7, t04 4/4, t05 8/8,
  t06 3/3, t08 5/5, t09 6/6, t10 5/5, t11 2/2; `test:p08-gate` 1/1;
  `test:security` all six suites; `test:users-boundary` 6/6.

## 4. Deviations / remaining UX pain (friction log)

1. **Dev server is wedged.** The running `next dev` on port 3055 (PID 64456,
   started before this stack) listens but never answers HTTP — it has been
   dead the entire stack. It needs a restart before the walkthrough; every
   other gate (typecheck, pure + DB suites) is green in its place.
2. **Stage config gates creation for configured Types.** Once a Type has
   stage rows (any inspector save), creation at a stage requires the actor to
   hold that stage's `writeRoles` (or Domain authority) per spec §3.4. A Type
   whose stage rows have empty role lists is only creatable by Domain
   administration until roles are assigned — worth knowing during the
   walkthrough, since the inspector is where roles get wired.
3. **Deprecate has no frozen capability** (spec §3.4) — it is authorized
   through `manage(deprecated)` at the workflow seam, and the Documents
   collection hook deliberately does not re-check it (no capability exists to
   check). Enforcement is the action seam.
4. **T06 integration gaps found and closed in T07**: the document detail
   page did not thread `documentTypeId`/stage/private-draft into its decision
   targets (stage-list grants never applied there — the page would 404 for
   stage-list-only readers), and the home-page recent-records filter did not
   apply the private-draft boundary. Both fixed in T07.
5. **`applyLifecycleStageConfig` merge contract fixed** (T07): partial
   updates previously clobbered `enabled`/`allowOnCreation` to defaults;
   now only the fields a caller sends are written, matching the documented
   "missing field leaves stored value untouched" contract.
6. **DB-backed suites are fresh-run artifacts.** The suites' find-or-create
   fixtures accumulate state across repeated runs against the same
   `*-test.db`; the established pattern is to delete the disposable DB before
   running. All numbers above are from fresh DBs.
7. **Creation default**: the starting-phase dropdown defaults to the latest
   permitted stage (so Draft+Filed-permitted defaults to Filed) per the
   requirement; the private-draft checkbox appears only when the Type's Draft
   stage allows private drafts (default on).

## 5. Owner exercise (remaining)

Work through `02_INTEGRATED_ACCEPTANCE.md` by hand once the dev server is
restarted. Demo checklist from the packet: tree surface (department roots,
Unassigned, subfolders, drag/drop, line cards with template links),
inspector (lifecycle table, folder popup, role lists, private drafts),
duplicate-with-copy flow, inactive grey-out, creation phase dropdown,
hovertext coverage. Every friction point feeds the next tickets and the
eventual starter pack.