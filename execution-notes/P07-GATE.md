# P07-GATE — Authorization and delegated administration review gate

Status: implementation and automated repair gate complete; owner manual acceptance pending.
Updated 2026-09-04. Phase 8 has not started.

## Current owner instructions

[PHASE_07_TESTING.md](../PHASE_07_TESTING.md) replaces the obsolete blocked-fixture
guide. All required accounts, acting Characters, permissions, and document
fixtures now exist in P7 Workshop and P7 Outside. All 18 logins were verified.
Ar, existing users, and existing memberships were not reset.

## Repairs made after the acceptance setup review

- People navigation, workspace admission, and quick search now accept delegated
  subordinate assignment and scoped management authority without promoting the
  actor to Domain admin. Mutations still enforce their own resource capability.
- Role and Folder controls expose only the actor's permitted scope. Access
  managers cannot offer Write grants they do not possess; deny/revoke remain
  independently authorized. Scoped Folder managers cannot move to Domain root.
- Document view/editor/history and Records listing use the actual acting
  Character and Document authorization. Write-denied members cannot enter an
  editable form; denied records are removed before serialization. The Domain
  home recent-record list likewise filters denied titles.
- Dashboard Character switching now clears an incompatible stale Domain instead
  of losing the newly selected Character. Switching from an incompatible Domain
  page returns to the dashboard with the selected identity preserved.
- Claim decisions use manage_claims for the active actor, validate the claim's
  Domain/Character tuple, and atomically update claim and controller. Concurrent
  approvals cannot rebind ownership; losing SQLite transactions fail closed.
- Role/assignment/permission mutations now retain acting-Character audit data.
- Platform fixture is actually a platform administrator. Context/navigation
  honor that flag, and public User writes cannot self-assign it.

## Verification

- Normal regression suite: 114 tests passed.
- Security regression suites: 31 tests passed across access boundaries,
  supersession, concurrency, People workspace, and Domain-removal paths.
- Isolated real-database acceptance suite: 7 tests passed, including strict
  descendant exclusions, scoped grants, Commander/Captains/Warrior matrix,
  explicit deny, multi-role, owner/platform and claim concurrency.
- Live HTTP suite: 104 checks passed against the dev server, including the
  stale-Domain Character switch, Domain-home filtering, authorized and denied
  Records search, mutation, and audit probes.
- `npx tsc --noEmit`: clean.
- Lint: zero errors, two pre-existing image warnings in TenantShell.
- Production build: successful; all static and dynamic routes generated.
- Packet validator: passed (84 ticket files, 69 implementation/design tickets,
  15 gates, 15 phases, references and SHA manifest complete).
- Browser walkthrough verifies fixture login and dashboard Character selection,
  Workshop navigation, live People search, result selection, and the subject's
  expanded assignable-role tree and scope-disabled Folder controls. The
  owner-facing Head Scribe workflow remains a manual gate and is not self-
  approved by these automated results.
- Disposable P07P benchmark completed on an isolated SQLite database; the
  machine-readable result is recorded in `execution-notes/P07P-benchmark-small.json`.
  Windows may defer removal of the temporary WAL directory until the adapter
  process releases its handle.

## Reproduce without resetting the working database

Working-data fixture install (additive, reserved P7 names only):

```powershell
node --env-file=.env --import tsx -e 'process.env.PAYLOAD_PUSH="false"; await import("./src/scripts/seedPhase7Acceptance.ts")'
```

Live verification with the server already running at localhost:3055:

```powershell
node --env-file=.env --import tsx -e 'process.env.PAYLOAD_PUSH="false"; await import("./src/scripts/verifyPhase7Http.ts")'
```

Isolated integration test, from a separate shell:

```powershell
$env:DATABASE_URI = 'file:./p7-acceptance-test-' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + '.db'
$env:PAYLOAD_PUSH = 'true'
node --env-file=.env --import tsx --test --test-force-exit src/lib/authz/phase7Acceptance.test.ts
```

The integration test refuses a non-test database name. It creates a fresh local
test database and does not delete the working database. Concurrent losing claim
transactions can produce a handled SQLITE_BUSY adapter log; the test verifies
exactly one owner and one approved claim.

The working fixture installer skips existing fixtures rather than resetting
human acceptance work. Manual claim target 35 remains unclaimed until the owner
runs the claim test. Temporary live Folder probes are removed and Role probes
archived; direct permission and assignment probes restore baseline state.

## Scope / gate status

Phase 6 Form Studio replacement is separate work; no authorization repair was
used as permission to redesign it or the homepage. P07-D01 / DEF-SHARE-01 remains
the owner-deferred Sharing decision, not a requirement to make Sharing work.
The remaining release evidence is owner-only warm production sampling (5
warmups plus 30 samples per route/actor against the packet budgets) and the
visible Head Scribe browser acceptance. No Phase 8 work is included.
