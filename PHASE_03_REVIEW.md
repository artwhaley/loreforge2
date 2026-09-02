# Phase 3 review — Domain/Subdomain structure

Status: `AWAITING_OWNER_APPROVAL`

Branch: `phase-03-domain-subdomain-structure`

Implemented commits:

- `f4cacc8` — P03-T01 durable Domain migration.
- `fe2808e` — P03-T02 Subdomains and separate member roster.
- `d6c56a8` — P03-T03 protected Domain roots and folder branches.
- `4707af2` — P03-T04 Role hierarchy and scoped assignments.

Automated evidence:

- Packet validator: PASS (79 tickets; references complete).
- `npm run generate:types`: PASS.
- `npx tsc --noEmit`: PASS.
- `npm test`: 49 passing, 0 failing.
- `npm run build`: PASS; canonical Domain, Subdomain, folder, Role, and API routes compiled.
- Seed: PASS with 4 Domains, 4 Domain admins, 3 Ar Subdomains, 29 folders (4 protected roots), 9 Roles, 11 active Role assignments, and 0 unfiled Documents.
- Phase 3 migration rerun: PASS; 2 legacy Tenants mapped, 5 Documents reconciled, body hashes reported, and canonical-only records safely ignored.

Implemented contract points:

- Community Domain ownership is User-level and separate from Character-level membership, Subdomain membership, and Role assignment.
- The top context bar separates Domain selection, Acting-as Character selection, and account-level Administration.
- Domain roster displays Character, local alias, controlling User, Domain membership, Subdomain membership, and Roles in separate columns.
- Subdomains are first-class Domain-owned records with Character heads/admins and app-owned landing pages.
- Every Domain has a protected system root; every seeded/new Document is filed to a Folder, and folder parent writes reject cross-Domain parents/cycles.
- Roles are Domain/Subdomain-owned, acyclic, and assignable to the same Character multiple times; `scopeFolder` is rendered as a full branch path. Interim mutations use `authorizeInterimOperation` and emit audit log entries.

Owner-only acceptance still required:

1. Visual/context pass for the Domain/Character/Administration selectors and the distinction between User authority and Character identity.
2. Admin membership pass: add/remove a Character from `/domain/ar/members`, then independently add/remove a Subdomain membership; verify the two changes do not alter each other or imply a Role.
3. Folder pass: inspect `/domain/ar/records`, expand the Scribes/Warriors/Magistrates tree, verify breadcrumbs, and confirm `Domain Root` cannot be deleted or moved.
4. Role pass: inspect the seeded hierarchy, verify the same Captain Role is scoped to First Platoon and Second Platoon, and verify Aren appears with both Warrior and Magistrate assignments.
5. Authorization pass: as `officer@example.test`, confirm no Administration or mutation controls and confirm a direct forged POST to `/api/roles` or `/api/role-assignments` creates nothing; as `admin@example.test` in Administration mode, confirm mutations succeed without an acting Character.
6. Canonical route pass: use `/domain/ar` links and verify no customer-facing Payload/CMS terminology appears.

Known environment caveat: the existing local SQLite file was created before the new collections. Its compatibility schema was migrated in place for this run; the dev command intentionally uses `PAYLOAD_PUSH=false` because Payload's dev-push currently attempts to recreate already-existing indexes. A fresh database may run the seed with schema push enabled once; the existing fixture should use the command in the test instructions below.

Hard stop: do not begin Phase 4 until the owner records approval in `execution-notes/P03-GATE.md`.
