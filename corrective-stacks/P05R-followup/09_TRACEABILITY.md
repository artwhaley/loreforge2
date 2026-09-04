# Review finding → execution ticket → required evidence

| Finding | Primary ticket | Definitive closure |
| --- | --- | --- |
| R01 foreign version disclosure | T09 | Real REST/Local API version-ID collision denied; authorized history still works |
| R02 successor cannot be read in transaction; required credit/error state | T10 | Production create unit succeeds; per-step injected failures leave no residue; fields preserved |
| R03 actual database missing schema | T14 | Verified non-destructive actual-DB upgrade, preserved data, schema/index and startup checks |
| R04 half Write pair | T12 | Second-capability failure rolls back complete submitted state and audit |
| R05 duplicate/opposing PermissionRules | T11 | Storage uniqueness, exact identity upsert, large fixtures and competing writers |
| R06 cleanup stops at 500 | T13 | Mixed/large fixtures leave zero targeted state; late-batch failures roll back |
| R07 independent locks removed | T10 | Originally Filed restored; originally Locked/unknown legacy remains Locked |
| R08 cross-Domain Domain resource | T11 | Alpha rule targeting Domain Beta rejected; valid global/scoped combinations work |
| R09 audit failure still succeeds | T12 | Actual admin routes roll back on audit failure and show failure feedback |
| R10 gate overclaims coverage | T15 + GATE2 | Real concurrency/full-aggregate faults/real URLs, accurate test categories and owner gate |

## Completion record template

Executor fills the definitive test file/name and note/commit for every row in the GATE2 execution note. A row cannot close on “existing tests pass.” Status values: OPEN, VERIFIED_BY_TEST, WAITING_FOR_OWNER, APPROVED_BY_OWNER (gate only). This table is the planning map, not a claim the work is already complete.

## Scope reconciliation

The prior T04 capability-count mistake and T06 conditional live switch-tenant route are not reopened. The contract's 24 capabilities and live Domain switcher remain. T08 fixes and deferrals are preserved. General search pagination and permission precedence remain future work; current uniqueness and complete revocation are not deferred with them.

