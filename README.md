# SL Civic Archive — MVP

Local proof of concept for a multi-tenant civic records/archive system aimed at Second Life
roleplay communities. Spec and tickets live in `../sl-civic-archive-mvp-packet/`.

## Stack

- Next.js 16 (App Router) + React + TypeScript
- Payload CMS 3.88 integrated into the Next.js app
- Payload official SQLite adapter (`@payloadcms/db-sqlite`) — one local DB file
- Local filesystem storage (no cloud services)

> Note: dev/build scripts set `NODE_OPTIONS=--no-experimental-require-module` because the
> current lexical editor package uses top-level await, which Node 24's `require()` path rejects.
> `next dev` picks the first free port; check the console output for the actual URL.

## Local setup

```bash
npm install
npm run dev        # pinned to http://localhost:3055
npm run seed       # fixture users, tenants, memberships, documents, theme media
npm test           # unit tests (tenant scoping + theme resolution)
```

Dev server port is pinned to **3055**; if it's taken, `npm run dev` fails loudly rather than silently picking another port.

Reset: delete the SQLite file (see `payload.config.ts` for its path) and `public/media/*`, then re-run `npm run seed`.

## Local test credentials (fixtures, not secrets)

| User        | Email                 | Password            |
| ----------- | --------------------- | ------------------- |
| Morgan Vale | admin@example.test    | test-password-123   |
| Alex Mercer | officer@example.test  | test-password-123   |

## Seed / reset

```bash
npm run seed
```

To fully reset: stop the dev server, delete `sl-civic-archive.db*` from the project root, and run
`npm run seed` again (the dev server also creates the DB on boot).

## Local files (gitignored)

- `sl-civic-archive.db` — SQLite database
- `public/media/` — uploaded media (future tickets)

## Ticket 01 scope

Tenant-scoped civic sites. Both seeded cities render the same fixture Markdown with distinct
branding through centralized theme tokens (`--tenant-*` CSS variables) driven by the tenant's
theme settings. A server-side active-tenant resolver (cookie + verified membership) scopes every
document query — the UI never filters by tenant. Tenant themes are flattened onto the `Tenants`
collection for MVP (a dedicated Theme Studio arrives in Ticket 03).

Routes: `/tenant/ravenhurst`, `/tenant/port-victoria` and their `.../records`, `.../about`,
`.../departments`, and `.../documents/:id`. Switch cities via the "Viewing as" selector or the
city buttons on the home page.

## Ticket 04 scope

Each tenant site is now a small believable city website built from a `Pages` collection (Home
welcome prose + About), a fixture department directory, and the archive's Records route.Prose pages use the same Markdown editor as documents (WYSIWYG + safe source mode) and store canonical
Markdown. Home is an application-owned layout: editable welcome prose (a `home` page) plus fixed
quick-link modules and recent records. Routes: `/tenant/[slug]`, `.../about`, `.../departments`,
`.../records`, `.../documents/:id`, and `.../pages/[pageSlug]/edit`.

## Ticket 05 scope

The archive is now a usable records system. A tenant-owned `Folders` collection (nullable parent)
drives an understandable folder tree, and every document belongs to a folder (or the root). The
`/tenant/[slug]/records` route is the archive browser: folder tree sidebar with counts, a
current-folder document list with breadcrumb, a basic search box, and create/folder + create/record
flows. Document viewers support Edit, a Move-to-folder selector, Delete, and Markdown source.
Server actions re-verifies the session user is a member of the tenant for every create/move/delete.
Delete folder refuses a non-empty folder. Search is tenant-scoped over title and body (spec §7.5).

## Tests

```bash
npm test
```

Covers the tenant scope helper and theme token resolution (cheap, important logic per spec §14).
