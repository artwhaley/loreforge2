# Atelier

Portable editorial Design installed in both production and Design Lab. The same folder owns all 16 required page slots, the optional character profile, shell, five full palette looks, typography, spacing, divider controls, and thumbnail.

## Management

- Departments: create, archive, restore, and capability-filtered actions.
- Folders: shared search/sort/selection, create, rename, legal destination picker, move, and confirmed deletion.
- Roles: department index, parent/child creation, holders and assignment search, removal, shared Document Type permission grid, and folder restrictions.
- Document Types: create/configure through the shared inspector, template/lifecycle settings, duplicate, activate/deactivate.
- People: debounced search with keyboard navigation; person workspace with role assignments, folder permissions, effective type access, and confirmed membership removal.
- Invitations: issue join/claim links, revoke, and approve/reject join requests and character claims.
- Work: host-provided approve/file and return-to-draft actions; requests link to invitation management.

Actions use shared workspace hooks, the authorized form endpoints, or host action bridges. No imports from another Design and no Atelier-specific host adapter. Production remains responsible for authorization. Lab emulates those actions against fixture data.

## Review and transfer

In Lab select Atelier and an operational surface. Use a mutable fixture profile (for example Obsidian fidelity) to test changes; production-preview is the fixed rendering oracle. Its displayed models intentionally remain deterministic.

Copy this entire folder into either host's src/designs directory and run the host discovery/build. Version 3 configuration migrates older Atelier settings. Host scratch under .design-local is optional and ignored. Do not copy generated host registry or public assets; discovery recreates them.

## Separate existing boundaries

Records still filters the supplied records locally rather than using the shared paginated Records workspace. Members is a locally filtered directory. These are not certified here as completed archive/membership-search workflows.

Shared Class B template/form/import editors retain the Lab's documented limits. In particular, template-document scaffolding is a production operation, not a pretend Lab success. No real Domain selection or stored configuration was changed by this installation.

## Tests

management.design.test.tsx travels with the folder and runs in either host. Lab also has src/tests/atelierManagement.test.tsx and tests/e2e/atelierManagement.spec.ts for emulated mutation outcomes and live browser checks. Cross-host evidence lives outside the folder under Lab docs/parity/cross-host/atelier.
