# OBSIDIAN-T17 — Folder and Document Type management

Status: complete.

Obsidian management slots now mount the canonical Folder and Document Type workspaces (`FolderManager`/`DocumentTypesBrowser`) rather than incubation tree callbacks. The shared workspaces retain root-move, system-managed, descendant-cycle, Unassigned, lifecycle, template, and capability rules. The obsolete preview-only tree adapters were reduced to model adapters with no `onAction(label)` state machine.

Verification: `npx tsc --noEmit`, `npm run test:design`.

Deviation/pressure: the production workspaces are intentionally reused as functional primitives; no second Obsidian mutation protocol was introduced.
