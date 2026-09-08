# OBSIDIAN-T15 — Records workspace

Status: complete.

Obsidian Records now consumes `useRecordsWorkspace`; card/list defaults and page sizes come from validated Obsidian config, actions are built from server-projected record capabilities, and delete uses the existing server-action context. The shared records-search transport now accepts bounded page sizes `6|12|24|25|50|100` and allowlisted sorts `-updatedAt|updatedAt|title|-title`; cursor paging and supersession closure remain server-side.

Verification: `npx tsc --noEmit`, `npm run test:design`, `npm run lint` (warnings only, no errors).

Deviation/pressure: the initial Records Page Model remains the existing authorized projection; the new query options extend only the shared search path and do not create an Obsidian-specific endpoint.
