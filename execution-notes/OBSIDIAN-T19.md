# OBSIDIAN-T19 — Switching, preview, regression, and release gate

Status: complete.

Obsidian is now registered as a first-class Design. The release gate covers the
four-key registry/catalog, validated Obsidian config and Studio path, first-
class isolation restrictions, public and operational entrypoints, shared
Records/Document workspaces, and the complete DOM capability contract. The
switching regression restores distinct Civic, Ledger, and Obsidian banks across
Civic → Obsidian → Ledger → Obsidian → Civic without changing the Domain model
or route vocabulary.

Verification:

- `npm test` — 155 tests passed.
- `npm run test:security` — all authorization, supersession, concurrency,
  people, and Domain-removal cases passed, including the >500-rule case.
- `npm run test:design` — 23 files / 184 tests passed.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed with the repository's existing image optimization
  warnings only.
- `npm run build` — passed; all 38 static pages generated successfully.

The deterministic management and capability fixtures serve as the owner-
walkthrough proxy in this checkout. A human walkthrough against a populated
real Domain remains the final deployment sign-off step for Folders, Roles,
Document Types, People, Invitations, Work, Records, and Document lifecycle
actions; no production credentials or live Domain were available to perform
that external step here.

Deviation/pressure: the Department detail keeps the documented member-directory
fallback because core still has no visibility-safe organization hierarchy model.
No Syncfusion dependency or inferred reporting relationship was introduced.
