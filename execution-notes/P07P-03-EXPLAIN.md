# P07P-03 — SQLite index evidence

Captured 2026-09-04 from the real development database after
`migrateP07PIndexes.ts` completed. These are read-only `EXPLAIN QUERY PLAN`
probes using the same column shapes as the authorized read paths; parameter
values are fixture IDs only.

| Query shape | Planner evidence |
| --- | --- |
| Documents by Domain and Folder | `SEARCH documents USING INDEX p07p_documents_domain_folder_idx (domain_id=? AND folder_id=?)` |
| Recent Documents by Domain | `SEARCH documents USING INDEX p07p_documents_domain_updated_idx (domain_id=?)` |
| Supersession edges by Domain and kind | `SEARCH document_relationships USING INDEX p07p_relationships_domain_kind_idx (domain_id=? AND kind=?)` |
| Provenance events by Document IDs | `SEARCH document_provenance_events USING COVERING INDEX p07p_provenance_document_occurred_idx (document_id=?)`; SQLite uses a temporary sort only for the requested cross-document `occurred_at` ordering. |

The migration is additive and idempotent. The development database currently
contains all eleven `p07p_*` indexes listed in `src/scripts/migrateP07PIndexes.ts`.
