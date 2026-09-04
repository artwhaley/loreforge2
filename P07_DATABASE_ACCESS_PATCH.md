# Phase 7 database-access performance patch

Status: revised per owner decisions 2026-09-04 and authorized for execution.

Read the [canonical executable patch specification](LoreForge_Execution_Packet/references/P07P_DATABASE_ACCESS_PATCH.md).

It defines request-scoped authorization, database-side filtering before pagination,
complete server search, query-count/latency gates, unchanged permission semantics,
transaction-safe writes, the recent-record metadata correction, and acceptance
handoff. The revision records: navigation-first priority (search latency is
secondary/conditional), strict acting-Character separation with the union
fallback removed as its own commit, no arbitrary caps on authorization inputs
(including cross-Domain aggregates at 100 Domains x 20 Folders), the approved
stable-ID People ranking tie, and FTS trigram verification before any promise.
No RLS or database-engine change is proposed; measured index migrations are
included. P05 corrective findings were re-verified closed before execution.
