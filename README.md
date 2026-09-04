# LoreForge2 — Civic Archive (sl-civic-archive)

LoreForge2 is a multi-tenant civic records and archive system for Second Life roleplay
communities: Documents (records) live in a Domain, organized into Departments
(Subdomains) and Folders, with Character-driven participation (Roles and RoleAssignments),
workflow lifecycles (draft → review → filed/locked/superseded), provenance history,
and a delegated-administration model that lands in Phase 7.

**This is the successor to the SL Civic Archive MVP.** The old spike documentation is
historical only — see [History](#history).

## Canonical vocabulary

- **Domain** — the top-level community unit (owner + Domain Admins, members, folders, documents).
- **Department** (collection `subdomains`) — a Domain's organizational unit; Roles live here.
- **Role / RoleAssignment** — Department-scoped institutional roles; a Character participates
  in a Department exactly when they hold an active Role there.
- **Folder** — filing hierarchy inside a Domain; direct access is granted per principal
  via PermissionRules.
- **Document** — the archived record; carries lifecycle, provenance, tags, character links,
  and supersession relationships.
- **Character** — a roleplay persona controlled by a User; participation and access are
  Character-scoped, not User-scoped.

Customer URLs are canonical under `/domain/{slug}/...`; `/tenant/{slug}/...` URLs are a
legacy compatibility shim that redirects to `/domain`.

## Stack

- Next.js (App Router) + React + TypeScript
- Payload CMS (Local API + guarded Next.js route handlers; direct collection REST/GraphQL
  writes are access-closed)
- Payload official SQLite adapter (`@payloadcms/db-sqlite`) with WAL + real transactions
- Local filesystem storage (no cloud services)

> `NODE_OPTIONS=--no-experimental-require-module` is set by the dev/build scripts because the
> lexical editor package uses top-level await, which Node 24's `require()` path rejects.

## Setup

```bash
npm install
cp .env.example .env      # set DATABASE_URI and PAYLOAD_SECRET
npm run dev               # http://localhost:3055 (pinned)
```

Seed and migration scripts run against `DATABASE_URI`:

```bash
PAYLOAD_PUSH=false npm run seed            # fixture Domains, Characters, Roles, Documents
npm run migrate:phase5                     # Phase 3→5 model migration (tenants → Domains)
```

To fully reset: stop the dev server, delete `sl-civic-archive.db*` from the project root and
`public/media/*`, then re-run the seed. If the Payload admin reports a missing import-map
component after a fresh clone, run `npx payload generate:importmap` once.

## Checks

```bash
npm test               # unit + pure-logic suites (78 tests)
npm run test:security  # DB-backed suites: access boundary, supersession, people workspace, domain removal (25 tests)
npx tsc --noEmit       # typecheck
```

Schema changes: `npx payload generate:types` regenerates `src/payload-types.ts`.

## Workflow / execution packet

Authoritative architecture, frozen product decisions, and per-phase tickets live in
`LoreForge_Execution_Packet/` (start at `00_START_HERE.md`). Phases execute ticket by
ticket on their own branches with per-ticket commits, execution notes in
`execution-notes/`, and a review-gate at each phase end. Packet integrity is enforced by
`LoreForge_Execution_Packet/tools/validate_packet.py` (SHA256SUMS). The current remediation
stack for Phase 5 audit findings lives in `../P05-corrective-stack/` (tickets `P05R-T00`
through `P05R-GATE`).

## Status

- **Phase 5** (Document supersession + Character-driven access) implemented and remediated
  (P05R stack). Document Sharing is explicitly deferred pending an ownership decision
  (see `LoreForge_Execution_Packet/references/P07-D01-DOCUMENT-SHARING-DECISION.md`).
- **Phase 6**: prepared-by / tagging / lifecycle correctness.
- **Phase 7**: final authorization evaluator and delegated administration (replaces the
  interim authority seams); requires the sharing decision before GATE closes.
- Phase 10 tracks legacy-tenant (`DEF-TENANT-01`) and `Documents.origin` (`DEF-ORIGIN-01`)
  removal.

## History

The original SL Civic Archive MVP (Ravenhurst multi-tenant spike, tickets 01–08, `tenants`/
`memberships` models) is superseded by LoreForge2. Legacy models remain in the schema only
for migration compatibility and are marked "Legacy compatibility only" at their definitions.