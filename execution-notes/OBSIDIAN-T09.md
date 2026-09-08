# OBSIDIAN-T09 — Management contract conformance gate

**Status: PASS** — the abstraction held; no corrective ticket required before T10.

## What was done

1. **Deterministic operational fixtures** (`src/lib/design/fixtures.ts`) — no-DB fixtures for Work (with entries / empty), Members (admin / viewer), Departments management (with archive / restore-only), Folders (capable / denied), and Invitations (revocable + exhausted rows).

2. **Operational conformance helper** (`src/lib/design/conformance.ts` → `assertOperationalCapabilities`) — asserts model facts render and, critically, that **capability absence produces no actionable control**:
   - work: no entries → no approve/reject buttons;
   - members: `canSearch: false` → no admin search input (checked by `aria-label`, since it is not text content);
   - management.departments: restore-only model → no Archive affordance;
   - management.invitations: only revocable rows expose Revoke;
   - management.folders: denied model → the "New folder" button renders **disabled** (the surface stays visible but inert — asserted via the disabled state, matching the real FolderManager behavior).

3. **Gate test** (`src/lib/design/managementGate.design.test.tsx`, 10 tests) — the same fixtures render through **Civic and Ledger's** operational slots (`work`, `members`, `management.departments`, `management.folders`, `management.invitations`), proving the two first-class Designs consume the identical operational contracts. Includes:
   - capability-absence assertions for every gated surface;
   - a required-slot identity check across both first-class Designs (all 9 slots declared);
   - **invalid-config normalization**: a malformed V1 blob resolves through `resolveDomainDesign` to Civic defaults and then renders an operational surface without throwing — proving operation renderers never receive raw invalid config.

4. **Isolation scan extension** (`presentationInvariants.design.test.ts`) — first-class Design folders (`civic/`, `ledger/`) now also may not import `@/lib/actions/*`. Work action bridges arrive as props (`WorkDesignViewProps`); a Design importing an action module would bypass the bridge seam.

5. **Docs** — `DESIGN_AUTHORING.md` §19 records the closed requiredness ladder (required in the type since T08, enforced by this gate; T01's optional machinery removed).

6. **Manual smoke (build-level)** — `npm run build` compiles the full route tree including all nine rewritten operational routes (`/manage/folders`, `/roles`, `/document-types`, `/manage/people`, `/manage/people/[characterId]`, `/manage/invitations`, `/manage/departments`, `/work`, `/members`). Interactive walkthrough against `sl-civic-archive.db` was performed by the user after T08's predecessor tickets; the gate's DOM-level assertions cover the surface contracts this ticket adds.

## Verification

- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors (6 pre-existing warnings)
- Design suite — 169/169 pass (managementGate's 10 included)
- `npm test` — 155/155 pass
- `npm run build` — full route tree compiles

## Gate verdict

**PASS.** Civic and Ledger both exercise the same operational models/workspaces with zero per-route branching; no forbidden imports exist in first-class Design folders; capability absence produces no actionable controls; invalid config is normalized before any operational renderer. The seam is ready for Obsidian (T10+).
