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
copy .env.example .env
npm run dev
```

Then:

- App: http://localhost:3000
- Payload admin: http://localhost:3000/admin

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
