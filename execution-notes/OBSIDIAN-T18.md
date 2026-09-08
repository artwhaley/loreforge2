# OBSIDIAN-T18 — Remaining operational surfaces

Status: complete.

Obsidian now has explicit renderers for Work, Members, People, Person, Roles, Invitations, and Department management. People uses the shared debounced/server-filtered `PeopleSearch`; Person uses the authorized `PersonManagementPageModel` through the canonical access-tree primitives; Roles/Folders/Types use their shared workspaces; Work/Invitations/Departments/Members preserve their existing server form/action bridges. Capability-negative behavior is covered by the expanded management gate.

Verification: `npx tsc --noEmit`, `npm run test:design`.

Deviation/pressure: no semantic organization-chart model exists, so Department detail remains the explicit member-directory fallback. No Character kind/name is used as a capability substitute.
