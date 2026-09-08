# OBSIDIAN-T16 — Document actions

Status: complete.

Obsidian Document now consumes the production flat Document model plus the existing `workflowAction` and `deleteAction` server bridges. It renders canonical body/source tabs, metadata, tags, concerns, lifecycle, lineage, status alerts, and only capability-backed Edit/workflow/supersede/delete controls. No client authorization table or demo callback remains.

Verification: `npx tsc --noEmit`, `npm run test:design`.

Deviation/pressure: no new lifecycle operation was introduced; the existing operation names and server handlers remain authoritative.
