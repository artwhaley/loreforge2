# Completed MVP Spike — Baseline and Review Notes

## Purpose of the spike
The completed `sl-civic-archive` project was a UX/technology proof, not a miniature production architecture. Preserve it as evidence and a regression baseline. Do not freeze its current schema merely because it works.

## Reported result
The spike's own `MVP_REVIEW.md` reports that the full 27-step acceptance scenario passed from a clean local reset. Treat that as the executor's recorded result, not an independent certification by this packet author.

## Technology snapshot
From the submitted source:
- Next.js `16.3.4`
- React/React DOM `19.2.4`
- Payload `3.88.0`
- Payload SQLite adapter `3.88.0`
- Payload Form Builder `^3.88.0`
- MDXEditor `^4.2.3`
- Marked `^18.0.11`
- TypeScript `^5.9.3`
- Node `>=20.9.0`
- dev port `3055`

Do not upgrade this stack as part of Phase 1 unless an actual security/compatibility blocker requires it.

## What the source proves

### Canonical Markdown seam
`src/lib/markdown/canonical.ts` normalizes CRLF/lone CR to LF. Editor saves/imports store Markdown rather than rendered HTML.

### Editor seam
`src/components/editor/DocumentEditor.tsx` uses MDXEditor WYSIWYG plus a separate Source textarea. The custom Source path was chosen because it preserved block structure better than the tested built-in diff/source mode.

### Known render-safety gap
`src/lib/markdown/render.ts` calls `marked.parse()` without sanitizing the generated HTML. A comment says raw HTML is outside the dialect, but the code does not enforce that. P01-T01 fixes this before untrusted use.

### Theme seam
Theme fields currently live on `Tenants`. The spike proves semantic theme tokens + CSS variables + live preview. It does not prove the current two presets/limited fonts are enough.

### Forms seam
Payload Form Builder is configured in `src/payload.config.ts`. Form metadata includes tenant/folder and output title/Markdown templates. `src/lib/forms/generateDocument.ts` is the intentionally small transformation seam. Preserve the seam, not the plugin schema/UI as permanent architecture.

### Tenant/app scope seam
The spike uses `Tenants`, User `Memberships(admin/member)`, and application query helpers under `src/lib/tenant/*`. Correct for a local spike; not final authorization.

### Archive seam
Current Documents are intentionally tiny: tenant, optional folder, title, Markdown body, origin badge, createdBy User. Folders allow nullable parent/root. These evolve in named later phases.

### Infrastructure seam
SQLite + local media are deliberate local choices. Do not replace them before Phase 10.

## Current files that matter first
- `src/lib/markdown/canonical.ts` — preserve concept.
- `src/lib/markdown/render.ts` — fix in P01-T01.
- `src/components/editor/DocumentEditor.tsx` — tune P01-T02/T03.
- `src/components/editor/ForwardRefEditor.tsx`
- `src/components/editor/InitializedMDXEditor.tsx`
- `src/components/theme/ThemeStudio.tsx` — tune P01-T04.
- `src/components/theme/TenantShell.tsx`
- `src/collections/Tenants.ts` — customer wording can become Domain-generic in P01; schema rename waits P03.
- `src/lib/forms/generateDocument.ts` — preserve one generation seam; neutral form model arrives P06.
- `src/payload.config.ts` — current Form Builder plugin is reference implementation.
- `src/lib/tenant/*` — temporary scope helpers.
- `src/seed/index.ts` — evolve fixtures only through named tickets.

## Do not “fix early”
Phase 1 does **not**:
- rename every tenant database field;
- add Characters;
- replace Memberships;
- build ACLs;
- add Postgres;
- remove Form Builder;
- build starter packs;
- redesign the final Document schema;
- implement SL transport.

## Spike review questions carried into Phase 1
- Is WYSIWYG pleasant enough after tuning?
- Is explicit Save + dirty warning clear?
- Is Source understandable as advanced mode?
- Are theme controls sufficiently expressive without arbitrary CSS?
- Which Payload Form Builder controls must disappear from the later customer Form Studio?

The owner intentionally did not spend time polishing the test spike. Rough styling is not a rejected direction; tune it at the assigned phase.
