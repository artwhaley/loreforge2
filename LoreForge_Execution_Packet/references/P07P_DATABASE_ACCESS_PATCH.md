# P07P — Database access and authorization performance patch

Date: 2026-09-04
Status: REVISED AND AUTHORIZED FOR EXECUTION (same session, owner instruction).
Execution scope: existing Phase 7 implementation and acceptance repairs.
Canonical file: this file. The repository-root P07_DATABASE_ACCESS_PATCH.md is
an entry-point link, not a second copy of the specification.

## Owner decisions recorded before execution (2026-09-04)

These decisions were given by the owner when authorizing execution and override
any conflicting earlier text:

1. **P05 corrective findings are closed.** R01-R10 were re-verified in the
   current tree before this patch started: version-parent authorization,
   transactional supersede-create with in-transaction attribution, real-database
   schema (public_access, domain_audit_events, rule_key canonical identity,
   relationship indexes), transactional permission-rule replacement, canonical
   rule identity via unique ruleKey, unbounded domain-removal cleanup,
   lock preservation via lockApplied/priorLifecycle, Domain-resource scope
   validation, and transactional audits. No P05R rework is in this patch.
2. **Page navigation is the primary performance problem.** Search has not been
   a user complaint. Optimize navigation surfaces (Domain home, TenantShell,
   document detail, Records page open, People workspace) first. Server search
   work is correctness-first: it must return the complete authorized result set
   beyond the first 100 documents / 25 people, but FTS and search latency work
   is conditional on measurement, not mandatory.
3. **Acting Character is a first-order permission identity.** A User may
   control several Characters, but they are evaluated strictly separately for
   roleplay immersion. The controlled-Character union fallback in
   canAccessDocument is removed as specified; REST with no validated active
   Character receives only User-level authority.
4. **People ranking tie-break by stable ID is approved** (was name localeCompare).
5. **No arbitrary result caps on authorization inputs.** Per-Domain and
   cross-Domain aggregate caps (200 Characters, 500 Departments, 1000-2000
   Folders/memberships/domains) are removed wherever they gate an authorization
   decision or a correctness-critical listing. Use unbounded pagination
   (limit: 0 + pagination: false) or chunked exhaustive iteration. The platform
   must function with many Domains each holding modest content (for example
   100 Domains with 20 Folders each); any cross-Domain aggregate query that
   silently truncates at a fixed cap is a defect. A cap is acceptable only for
   a single interactive page/request where the value is explicitly surfaced to
   the user as a visible result-set bound, never inside a security decision.

## Outcome and boundary

Make document opening, Records exploration, People search, and permission
trees fast by eliminating repeated database work and filtering in database
queries. Preserve the frozen authorization model, lifecycle, audit, Domain
isolation, Character identity, and existing workflows.

Navigation-first ordering: P07P-02/03/04 optimize every page-render surface;
P07P-05 search work is scoped as complete-correctness plus measured-improvement
(see the revised P07P-05).

No RLS work, database/provider migration, new permission product, Redis,
external search service, background ACL materialization, or Phase 8 work.
Use the installed Payload/SQLite/Drizzle stack. Small internal read repositories
and explicit migrations are in scope, not a second public data API/framework.
No homepage/theming/Form Studio redesign. Do not reduce the fixture tree to
make benchmarks pass. Do not enable previously closed collection endpoints.

P07-GATE must be rerun after this patch. Do not mark it accepted. The owner
should resume section 3 (Head Scribe) only after the automated repair gate and
the executor's exact-login browser smoke checks pass.

## Verified failure paths to remove

- TenantShell reloads active context, loads departments/folders, and invokes
  independent evaluators across them merely to decide navigation visibility.
- canOpenPeople performs serial per-capability/per-resource database-backed
  checks; folderControls invokes four independently loading evaluations.
- evaluatePermission reloads authority, membership, all Domain Roles, active
  assignments, and rules for each decision. resolveResourceTree fetches each
  ancestor separately; getRoleTree repeatedly rebuilds the same graph.
- Records fetches the first 100 documents, checks four capabilities per row,
  serializes bodies to the browser, then searches/filters that incomplete set.
  It also loads up to 5,000 Domain-wide supersession edges.
- readableVersionParentQuery scans up to 10,000 documents across Domains and
  invokes canAccessDocument for each. This is both expensive and incomplete.
- People search fetches large Character/context/Role sets plus unscoped active
  assignments, ranks in JavaScript, and returns only 25. It is not database FTS.
- getTenantsForUser queries memberships once per controlled Character;
  getCharactersForTenant loads Domain memberships then filters controllers.
- Related documents can be populated at depth 1 before their visibility is
  checked. Query projection, not merely UI hiding, must enforce confidentiality.

These are code-inspection findings. No exact baseline SQL count or latency is
claimed until P07P-01 measures it.

## Frozen security invariants — apply to every ticket

1. Resolve authenticated User, selected Domain, and optional active Character
   server-side. Validate controller, active Character, active Domain membership.
   Neither client-supplied role IDs nor a submitted target person are the actor.
2. No union of all a User's Characters to authorize the active Character.
   Current canAccessDocument tries each controlled Character: remove that
   fallback as part of P07P-04 because it conflicts with P07-T02 and Contract
   section 5/7. Owner/admin User authority still works without a Character.
   REST with no validated acting Character receives only actual User-level
   authority, not an automatically chosen identity. Add a two-Character test.
   (Owner decision 2026-09-04: acting Characters are evaluated separately for
   roleplay immersion; this removal is confirmed product behavior, and it must
   land as its own commit with an inventory of the 95 live HTTP checks that
   depended on the fallback, so any check failure bisects to that commit.)
3. Check actual resource Domain even for platform administrators. Preserve
   audited platform bypass and owner/admin operational authority; do not
   broaden platform-only collections or public/anonymous policies.
4. Rule ordering remains: direct User/Character peers > Role > membership;
   within each tier Document > deepest Folder > Department > Domain; deny on
   equal specificity. A more-specific direct grant can override a broader
   direct deny; a Role grant cannot override an applicable direct deny.
   Represent specificity lexicographically, not numeric offsets that invert
   after a sufficiently deep Folder tree. Frozen contract beats existing bugs.
5. Senior Role matches subordinate Role defaults in the same Department.
   assign_subordinates means strict descendants of an active held Role in the
   same Department, never self/peer/ancestor/inactive/other-Department.
6. Grant requires manage_access plus possession of the granted capability at
   the target scope. Deny/revoke still require manage_access. Write is the
   atomic create_document + edit_document pair. RoleAssignment has no Folder.
7. Lifecycle and soft-delete restrictions remain independent of ACL grants.
   Claim approval, supersession, and paired grants remain transactional.
   No optimization may remove audit/provenance or silently omit an actor.
8. Permission results are server-only. Never serialize a rule snapshot, hidden
   record IDs, private controller data, or unfiltered counters/search snippets.
   A readable Document does not automatically expose private related records.
9. No silent result caps in authorization inputs. Read complete applicable
   metadata via correct SQL/pagination, not limit:10000 and assume completeness.
   Malformed/cyclic/cross-Domain graphs fail closed; cycles must terminate.
   (Owner decision 2026-09-04: extend this to cross-Domain aggregates — the
   query shapes must be correct with 100+ Domains; remove the 200-Character,
   500-Department, 1000-2000 Folder/membership/domain caps from every
   authorization input and correctness-critical listing. Unbounded
   pagination (limit 0 + pagination false) or exhaustive chunked iteration
   replaces them. A fixed cap may remain only where the value is surfaced to
   the user as a visible page bound.)

## Target design

One explicit, request-owned authorization session loads reusable facts and
evaluates decisions without doing more I/O. The same session serves the page,
TenantShell, query compiler, per-row controls, and explanation output.

Suggested internal boundaries (names may follow established conventions):

- loadAuthorizationSession(authenticatedContext, { transactionID? })
- loadResourceMetadata(session, resourceRefs)
- decide(session, capability, resourceMetadata) -> decision + reason
- decideMany(session, capabilities, resources) -> matrix, zero I/O after preload
- compileDocumentReadScope(session) -> server-owned database predicate
- getNavigationCapabilities(session) -> existing menu booleans
- searchReadableRecords(session, filters, cursor) -> projected result groups
- searchManageablePeople(session, query, cursor) -> safe ranked projection

### Loading and lifetime

Use explicit dependency passing for routes/actions/services and request-local
memoization for Server Components. A React request-cache adapter may share the
same loader across page and shell, but is not the only implementation: Payload
hooks/REST must receive the same request-owned session too. Read installed
framework docs before choosing the adapter. No module-global decision cache,
persistent Next cache, TTL permissions, or process-wide mutable current actor.

Deduplicate in-flight loads within the session. Key by User, Character (including
null), Domain, and transaction identity; capability/resource keyed decisions
must not leak between principals. Viewing a subject's permissions requires a
separate explicitly identified subject evaluation, not swapping the actor.

Fetch lightweight facts with explicit projections/depth 0:
authority and membership, applicable active assignments, necessary Role graph,
relevant rules restricted by Domain/principal/capability, Folder graph metadata,
and document-exception resource IDs/folders. Bulk-load public display fields
separately. Never populate full Users or Documents just to get relationship IDs.
Index in-memory maps once. Inheritance propagation should traverse graph/rule
inputs, not scan the entire rule set afresh for every folder or row.

Request-local reuse alone is not sufficient for correct writes:
start a fresh transaction-aware authority load for a mutation, perform checks
and changes using the same transaction, and invalidate any session reused after
a permission/identity/topology mutation. Do not upgrade a read session into a
write authority cache. SQLite write-lock acquisition and reads must share the
existing transaction handle; do not claim revocation race safety based only on
a pre-transaction check. Next request must see every committed grant/revocation.

### Query-level filtering algorithm

Compile effective Folder read decisions for the actual actor. Evaluate all
applicable document-specific exception rules with their Folder/Department/Domain
ancestors using the SAME pure decision engine, not a second SQL precedence
implementation. Relevant exception metadata contains IDs/scope only, not bodies.

For a Domain, derive:
A = folders whose inherited effective Document read is allowed;
G = Documents whose final decision is allowed despite a denied Folder baseline;
D = Documents whose final decision is denied despite an allowed Folder baseline.

The content predicate is:
Domain matches AND not-soft-deleted AND
((folder belongs to A AND document does not belong to D) OR document belongs to G).

Intersect this with folder/subfolder selection, text match and Document Type
BEFORE sorting, cursor/limit, count, facets, or snippets. Direct grants/denies
must be resolved by frozen tier/specificity rules; do NOT simply subtract every
deny row or union every grant row. Empty permission sets compile to FALSE.
Ownership bypass can simplify ACL predicates only after Domain validation and
while preserving soft-delete/lifecycle/collection boundaries.

Use native Payload Where constraints when they express the plan efficiently.
For large sets, joins, recursive chain queries, and authorized version-parent
queries, use a parameterized internal SQLite read repository through the existing
adapter. Verify generated table/relationship layouts; do not guess column names.
Avoid huge IN lists exceeding SQLite bind limits. Use proven parameterized set
relations/CTEs (e.g. json_each if verified available), or relational joins—not
string-built SQL, one request per ID, or an unfiltered fallback. OR-chunking IN
lists does not solve the statement-wide parameter limit. Preserve transactions
and count all actual SQL statements below the Payload boundary.

Document detail: authorize against minimal resource metadata, then fetch body
and safe related projections only for the authorized, Domain-scoped ID.
Version history: constrain version parent with the same authorized Document
predicate before version pagination; never enumerate the document corpus.

## Ordered execution tickets

### P07P-01 — Baseline instrumentation and semantic oracle

Depends on: current P07 code, this whole spec, AGENTS.md, Contract sections 5–10,
P07-T01/T02, and current P07 testing guide. Read relevant local Next/Payload docs.

Work:
- Add opt-in local/test request diagnostics: route, actor class, elapsed time,
  actual SQL statement count/time, returned-row counts, evaluator calls and
  session loads. Capture indirect ORM population/count queries. No body text,
  passwords, tokens, cookies, query literals containing private data, or email.
- Report auth loading, navigation, document/search query, and rendering timing
  separately; measure completion of full response as well as first byte.
- Add isolated deterministic scale fixtures and a reproducible benchmark runner.
  Refuse working/production DBs; verify absolute test path before cleanup.
- Record baseline before optimizing. Freeze existing golden decisions and add
  explicit frozen-contract corrections (active-Character fallback, deep-tree
  specificity). Existing code is not the oracle for known contract violations.
- Instrumentation disabled in normal operation; do not add customer debug UI.

Touchpoints: scripts, test helpers, existing DB seam, package scripts.
Acceptance: small fixture and scale baselines recorded by route/account; no
business data mutated outside isolated fixtures; driver query totals validated
against a known test request. Baseline measurement must not need manual SQL.

### P07P-02 — Request-scoped facts and pure batch evaluator

Depends on: 01.
Work:
- Split evaluate.ts into I/O loader and pure rules/precedence; retain a temporary
  compatible wrapper so callers can migrate without weakened authorization.
- Bulk metadata/resource ancestry; Role descendant closures/maps computed once.
- Reuse context in TenantShell and query helpers; replace membership N+1s.
- Replace navigation per-Folder DB checks with decisions from preloaded facts.
  A bounded metadata traversal is fine; a DB lookup per resource is not.
- Convert folderControls, role assignment/default checks and People/Role/Folder
  trees to shared batch evaluation. Preserve separate subject vs actor scopes.
- Eliminate wrapper callers that accidentally construct a new session per row.

Touchpoints: lib/authz/*, lib/tenant/activeTenant.ts, lib/tenant/queries.ts,
components/theme/TenantShell.tsx, People/Role/Folder server pages/components.
Acceptance: batch decisions equal the semantic oracle; after session preload,
1,000 mixed decisions cause ZERO SQL statements. Repeated page/shell context
uses one actor session. Role and Folder tree explanations agree with decisions.
Concurrent requests and Character switches never reuse each other's authority.

### P07P-03 — Authorized read repository, predicates, and indexes

Depends on: 02.
Work:
- Implement/test the A/G/D read-scope compiler and parameterized query execution.
  Session facts and content queries must use a consistent request/read snapshot
  where needed; document the commit boundary for concurrent revocation.
- Add explicit migrations for missing measured composite indexes. Candidates:
  membership(Domain, Character, status), assignments(Character, status, Role),
  Roles(Domain, Department, parent, active), Folders(Domain, parent),
  applicable PermissionRules including principal/resource relationship storage,
  documents(Domain, Folder, soft-delete, sort key, id), document type queries,
  supersession source/target+Domain, version parent+version order, Character
  context(Domain, Character), provenance(document, occurredAt, id).
  Inspect existing indexes and EXPLAIN QUERY PLAN; do not duplicate blindly.
  Migrations must be tested three ways: fresh DB, upgrade-with-data, AND
  against a copy of the real drifted dev database (P05-R03 history: the dev
  DB has previously lagged collection configs; verify with PRAGMA
  table_info/index_list probes before claiming success).
- Expose detail, list/count/facet, related metadata, and authorized version
  helpers with typed safe projections. Server-produced predicates only.
- No hidden body retrieval to decide permission. Do not populate relation
  content before checking endpoint visibility.
- Raw SQL reads are explicitly trusted internal boundaries with mandatory
  actor+Domain arguments, not caller-controlled overrideAccess shortcuts.

Acceptance: randomized/property fixtures compare every candidate Document's
pure decision to SQL membership, including grant/deny ties, cross-principal
tiers, more-specific exceptions, no-role members, ownership, invalid IDs and
empty scopes. Test >SQLite bind-limit permission sets. Permission filtering
happens before LIMIT/count; a readable row after 1,000 denied rows is returned.
EXPLAIN evidence and migrations pass both fresh DB and upgrade-with-data tests.

### P07P-04 — Migrate detail, history, APIs, and mutation boundaries

Depends on: 03.
Work:
- Switch document view/edit/history, Domain recent records, document access
  hooks, related links/credits, and version-list authorization to repository
  and request session. Remove corpus scans and duplicated context loads.
- Resolve REST/Local API actor context explicitly; remove the controlled-
  Character union fallback specified above. Keep generic collection lists
  closed if currently closed; internal read repositories do not imply new APIs.
- Verify ordinary read, edit affordance, direct URL, forged save, version detail,
  history list and relationship projections use consistent scope.
- Apply transaction-fresh authorization to in-scope Role/permission/membership/
  Folder/claim/document mutations. Preserve audit and existing atomicity.
  No persistent caching of permission answers, no security checks moved client-side.

Acceptance: existing P7 integration/HTTP suite plus two-Character adversarial
suite pass. Role/default/deny/membership/controller changes take effect on the
next request with no process restart. Revoke before mutation transaction ->
refused; mutation committed before revoke -> recorded authorized prior action.
Document and revision IDs are never conflated. Role assignment cannot mutate
Folder rules. No unauthorized parent/successor title/credit in HTML/RSC/API.

### P07P-05 — Complete server search and paged Records/People

Depends on: 04.
Owner scope note (2026-09-04): search lag is NOT the reported problem; page
navigation is. This ticket's mandatory scope is (a) removing correctness
defects — client-side filtering over the first 100 documents and serializing
bodies to the browser — and (b) making search hit the database so results are
complete. Latency work beyond the measured LIKE predicate (FTS/trigram) is
OPTIONAL and gated on P07P-01/03 measurements proving LIKE+indexes miss the
target. Do not spend FTS effort while navigation surfaces remain slow.
Work:
- Replace client-body filtering and first-100 retrieval in RecordsExplorer with
  server-side authorized search. Remove body from list DTO. Maintain existing
  toolbar, right-click actions, folder selection, type Expose behavior and
  search-subfolders default. No redesign or new workflow fields.
- Keep blank-search folder behavior: selected Folder shows direct children;
  nonblank search with Search subfolders checked includes descendant folders.
  All folders means the selected Domain, never other Domains.
- Debounce 200 ms, cancel/ignore stale results, preserve query/filter/selection
  in URL state, clear selected record if it leaves results, reset cursor on
  filter/identity changes. Switching Character must clear stale protected
  results immediately and requery, without erasing the user's search text.
- Fetch 50 distinct visible supersession GROUPS per page with a stable opaque
  cursor; append on scroll using the existing explorer area. No new controls
  unless necessary for accessible retry/loading (no diagnostic labels).
- Match authorized documents, deduplicate to the newest readable record in
  each chain, sort groups by newest matching activity key then ID, and retrieve
  complete readable chain metadata for those groups—even when only an old
  title/body matches. Use recursive SQL/batch joins, not one query per link or
  all Domain edges. Keep the whole permitted chain in the same record box.
  Never expose hidden nodes, IDs, dates, counts, or gap placeholders. Do not
  fabricate direct supersedes relationships across hidden nodes. Security
  takes precedence over displaying inaccessible ancestors/descendants.
- Folder counts and Expose matching branches derive from the complete authorized
  result set, not the loaded page. Keep existing structural Folder visibility;
  do not infer authorization from a nonzero count or accidentally hide valid
  filing destinations. This patch does not expand public folder discovery.
- Preserve case-insensitive substring semantics for Records title/body search
  using parameterized indexed scope + database LIKE predicates, measured.
  OPTIONAL (only if P07P-03 measurements prove LIKE misses the p95 target on
  the scale fixture): verify FTS5 trigram tokenizers are actually available in
  the installed SQLite build BEFORE promising them (SQLITE_ENABLE_FTS_TRIGRAM
  is a compile-time flag; better-sqlite3/libsql prebuilds may lack it). If
  available, add a tested trigram candidate index plus exact LIKE/substring
  verification, with correct short-query fallback. No token-only replacement
  that changes matches for punctuation/partial words. FTS is derived from
  canonical text, synchronized transactionally on create, edit, import,
  supersede and delete/restore; index all supported write paths.
- People search: authorize before searching, perform bounded server queries on
  Character name/local alias/controller PUBLIC name/Role/Department, then rank
  in the DB with current prefix-before-substring behavior and the approved
  stable ID tie (owner decision 2026-09-04, replacing name.localeCompare).
  Restrict joins to Domain and active members/assignments; no global assignment
  dump and no email/SL-identity search. At most 25 safe results (this cap is
  the visible interactive result bound and stays); keyboard behavior
  unchanged. Trigram strategy only if benchmarks require.

Acceptance: searchable documents beyond initial 100/10,000 and people beyond
initial 1,000 are found; folder/type/cursor tampering cannot widen access.
Counts, pagination, Expose and chain grouping are correct with mixed-access
chains and matches outside the page. No duplicate/skipped groups for a static
dataset; mutations reset/refetch cursors safely. Stable 200-link readable chain
is complete without N+1. 50 list groups serialize no bodies. Search cancellation
and changing actor never display a stale prior actor result.

### P07P-06 — Performance gate, small metadata correction, test handoff

Depends on: 05.
Work:
- Implement the owner's existing recent-record metadata correction on populated
  lists/previews touched here: Document Type, actual action date, actual action
  person; remove source/origin badges. Use existing provenance to get last action
  per displayed document in one bounded query, then batch safe actor/type names.
  Character display name preferred for Character-authored actions; safe User
  display name for User-only actions. Do not infer last editor from Prepared by.
  If an old record lacks provenance, omit unknown action data rather than invent
  attribution; do not manufacture events. Keep unimplemented subordinate feeds
  placeholders—building a new activity product is not this patch.
- Rerun correctness, HTTP, concurrency, performance and browser tests; write
  before/after evidence. Remove obsolete slow helpers/call sites, not just leave
  both paths working depending on route.
- Update PHASE_07_TESTING.md: real accounts/URLs, no seed work for the owner.
  Section 2 step 6 must explicitly expect body {"results":[]} and explain that
  the automated check validates 403. A successful empty search is 200 and is
  NOT evidence of a forbidden response. Do not change the API just for the guide.
- Verify Head Scribe sign-in -> search P7 member -> assignment -> Folder access
  -> cleanup in the browser before asking the owner to retry section 3.
  Verify read-only document view and negative endpoints too.
- Leave a verified local server running. Do not restart another active build or
  overwrite concurrent Form Studio work; coordinate/isolate benchmarks instead.
  No self-acceptance of Phase 7 and no Phase 8 work.

## Measurable release criteria

These are patch acceptance targets, NOT measurements already achieved.
Measure all SQL including adapter populations/auth/count queries. Login/fixture
creation is outside timed requests; authentication inside each request is not.
Use 5 warmups + at least 30 samples per actor/route, production build, same
machine, idle compiler, report median/p95/p99 and full-response completion.
Also report warm dev results separately—compilation cannot hide warm-path cost.

Owner decision 2026-09-04: navigation is the primary complaint. Every
navigation row below is mandatory and must be reported first; search rows are
mandatory for correctness but their p95 latency targets are secondary targets
that may be revised with evidence without blocking patch acceptance.

| Operation | Max SQL statements/request | Warm local full-response p95 target |
| --- | ---: | ---: |
| Document view including shared header | 30 | 500 ms |
| Domain home with recent records | 30 | 500 ms |
| Records page open (blank search), 50 groups plus header/facets | 40 | 750 ms |
| Person workspace with 1,000 lightweight folders | 45 | 1,000 ms |
| Roles/Folders management page | 45 | 1,000 ms |
| Version history, 50 versions | 30 | 500 ms |
| People quick search, excluding 200 ms debounce | 20 | 300 ms (secondary) |
| Records text search, 50 groups | 40 | 750 ms (secondary) |

Baseline P7 fixtures and an isolated scale fixture are both mandatory:
- 3 Domains in the authorization-scale fixture PLUS a separate multi-Domain
  aggregate fixture proving cross-Domain queries are complete at 100 Domains
  with 20 Folders each (owner decision 2026-09-04: no aggregate cap may
  silently truncate; 100x20 is the expected real shape);
- 100,000 documents in the main Domain, 20,000 outside it;
- 1,000 Folders, 1,000 Roles, 5,000 Characters, 20,000 active rules;
- at least 2,000 applicable document exceptions (tests parameter limits),
  80% hidden documents for an ordinary actor, direct exception/deny/multi-role;
- mixed chain lengths including 200, a readable child with unreadable successor,
  body-only/substring matches, and enough versions for multiple pages.

Run ordinary member, head, deputy, scoped access manager, owner, and platform
paths. Increase document corpus 10x without increasing detail/header query count.
Folder/Role metadata volume may scale; repeated query count per decision may not.
Exceptions can require bounded metadata reads; report them, do not hide them.
Repeat at concurrency 5: no leaks/errors and p95 at most twice single-client.
Record a simulated +20 ms/query diagnostic to expose sequential-roundtrip
dependence; it is not a substitute for actual isolated production measurements.

Targets must pass or receive explicit owner revision with evidence. Do not
silently raise budgets, omit denied actors, lower data volume, or claim caching
wins from reusing the same permission snapshot across HTTP requests.

## Required automated regressions

- All existing unit/security/integration suites plus previous 95 live HTTP checks
  and subsequent stale-Domain/home-list checks.
- Table-driven and generated pure-vs-query decision parity, explicitly including
  User vs Character ties, broader deny/narrower grant, Role/membership conflicts.
- Cross-Domain IDs/joins/cursors, forged Character, no active Character, two
  controlled Characters with conflicting access, inactive/removed memberships.
- Counts/snippets/related rows and raw HTML/RSC/JSON contain no hidden content;
  version-list filtering is complete and not a 10,000-row scan.
- Permission mutation, tree move, membership removal, claim/rebind races:
  no stale grants, revived membership assignments, partial paired Writes, or
  lost audit/provenance; same transaction context propagated to all operations.
- New index migration upgrade/backfill preserves records and has a safe rollback.
  If FTS is added, rebuild and incremental updates give identical matches;
  search index hits cannot bypass the document ACL predicate.
- Privacy test: email/SL identifier matches cannot influence People ranking or
  suggest account existence; actor display projection has no sensitive fields.

## Execution and handoff rules

Implement 01 through 06 in order after the owner authorizes execution. Each is a
bounded work unit with its own execution note and eventual P07P-0N commit.
Do not stage unrelated work; if the same files are concurrently edited, reconcile
or isolate without resetting the user's work. This specification turn does not
authorize committing application changes or deploying anything.

Executor adds repeatable commands (names to implement, not currently promised):
npm run test:authz-query
npm run test:perf
npm run verify:p7
npm run bench:p7

Benchmark scripts must locate a disposable DB, choose an unused port (not 3055),
start/stop only their own processes, and report actionable readiness failures.
Use a separate build output/worktree when needed; never replace the running
dev server's .next artifacts. Run typecheck/lint/build against the same stable
source snapshot; distinguish unrelated concurrent diagnostics, not hide them.

Deliver execution-notes/P07P-01.md through P07P-06.md, machine-readable benchmark
results and EXPLAIN evidence, a before/after summary, changed-path inventory,
migration/rollback instructions, updated human guide, and working server URL.
Record previous completed Phase 7 acceptance sections; request rechecks only
where behavior changed, then resume Head Scribe. Stop at the owner gate.
