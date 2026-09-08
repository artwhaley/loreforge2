# OBSIDIAN-T00 — Freeze baselines and audit Domain surfaces

## Heads

- Base branch `phase-07x-acting-identity-document-workflows` HEAD: `6c5cc6bb8d9fe1b659c139a90161fa100b948ca1`
- Integration branch created: `patch/design-contract-management-and-obsidian` (from base HEAD)
- Design source `origin/design/obsidian-incubation` HEAD: `fc22e6c7db7da05b6166e2f126c5e6c9e6a20223` (fetched, not merged)
- Local `obsidian-incubation/` checkout at workspace root exists but git reports dubious ownership; the remote ref is authoritative for T10.

## Baseline test status (before edits)

- `npx tsc --noEmit`: clean (0 errors)
- `npm run test:design` (vitest): 147/147 passed
- No pre-existing failures recorded.

## Domain-local route inventory (`src/app/(frontend)/domain/[slug]/**`)

| Route | Classification | Shell | Body / components | Data / authz / mutations | Tests |
|---|---|---|---|---|---|
| `/` (Home) | public Design page | canonical resolver (`resolveDomainRouteShell`) | `design.pages.home` | `HomePageModel` builder | design conformance |
| `/records` | public Design page | canonical resolver | `design.pages.records` (client, `useRecordsWorkspace`) | `records-search` endpoint (cursor pagination, fixed `-updatedAt`) | workspace + design tests |
| `/records/new` | shared editor (selected Shell) | `TenantShell` | NewDocumentForm | guarded create flow | creation tests |
| `/documents/[id]` | public Design page | canonical resolver | `design.pages.document` + action bridge | `DocumentPageModel`, `workflowAction`/`deleteAction` | design conformance |
| `/documents/[id]/edit` | shared editor | `TenantShell` | edit form | guarded update | — |
| `/documents/[id]/history` | shared editor | `TenantShell` | history | provenance queries | provenance tests |
| `/departments` | public Design page | canonical resolver | `design.pages.departments` | `DepartmentsPageModel` | design conformance |
| `/departments/[departmentSlug]` | public Design page | canonical resolver | `design.pages.department` | `DepartmentPageModel` | design conformance |
| `/about` | public Design page | canonical resolver | `design.pages.about` | `AboutPageModel` | design conformance |
| `/lore` | public Design page | canonical resolver | `design.pages.lore` (empty model today) | `LorePageModel` = {baseUrl, destinations} | design conformance |
| `/members` | **public Design page (new slot `pages.members` per patched packet)** | `TenantShell` today | inline JSX + character search | `getDomainMemberRows`, `getDepartmentParticipants`, role assignments, `searchActiveCharacters` | — |
| `/work` | contracted operational (slot `pages.work`) | `TenantShell` today | inline JSX | `projectDomainWork`, `documentWorkflowAction` | `test:p07x-t10`, projection tests |
| `/manage/folders` | contracted operational (`pages.management.folders`) | `TenantShell` today | `FolderManager.tsx` (mixes Arborist render, search/sort/selection, dialogs, fetch POST `/api/folders` create/delete/move), `ArboristFolderTree` | route builds `AdminFolderNode`; `/api/folders` guarded | folder invariant tests, security tests |
| `/roles` | contracted operational (`pages.management.roles`) | `TenantShell` today | `RoleManager.tsx` (role selection, debounced fetch `/api/people-search`, assignment + permission forms) | route builds role/department tree, holders, folder + type state, manageable/assignable ids | role/delegation tests |
| `/document-types` | contracted operational (`pages.management.documentTypes`) | `TenantShell` today | `DocumentTypesBrowser.tsx`, `TypeInspector.tsx`, Arborist trees | `resolveTypeTree`, `resolveInspectorData`, `canManage`, Unassigned semantics | `test:p08x-t03/t04/t05/t07` |
| `/manage/people` | contracted operational (`pages.management.people`) | `TenantShell` today | `PeopleSearch.tsx` | `searchActiveCharacters` server filter | `peopleWorkspace.test.ts` |
| `/manage/people/[characterId]` | contracted operational (`pages.management.person`) | `TenantShell` today | inline JSX + `PersonAccessTrees` (`FolderTree`, `RoleTree`) | heavy authz session use (`loadCachedAuthorizationSession`, `canAssignRoleInSession`, `resolveFolderPermissionInSession`, `canOpenPeopleSession`, `folderControlsSession`) | people/security tests |
| `/manage/invitations` | contracted operational (`pages.management.invitations`) | `TenantShell` today | `IssueCharacterInvitationPanel`, `IssueDomainJoinPanel` | `canManageDomainInvitations`, `listInvitations`, invitation services | `test:p07x-t08/t09` |
| `/manage/departments` | contracted operational (`pages.management.departments`) | `TenantShell` today | inline JSX | `getSubdomainsForDomain`, POST `/api/departments` create/archive/restore | department authz tests |
| `/review` | **shared editor inside selected Shell** (patched-packet classification) | `TenantShell` today | inline JSX (P08X-T02 review queue) | `documentWorkflowAction`, submitted-documents query | P08X acceptance |
| `/templates*`, `/forms*`, `/import`, `/pages/[pageSlug]/edit`, `/customize` | shared editors / Site Studio | `TenantShell` / SiteStudio | shared authoring components | guarded flows | form/template tests |

## Key structural observations (recorded for later tickets)

1. **`TenantShell` is design-aware.** `src/components/theme/TenantShell.tsx` already calls `buildDomainShellModel()` + `resolveDomainDesign()` and renders the selected Design `Shell` (P08D-T04-C). Its cssVars prop is vestigial (resolved tokens come from `resolveDomainDesign`). Remediation targets page **bodies**; `TenantShell` remains the shared-editor wrapper.
2. **`resolveDomainRouteShell` does not expose config.** `src/lib/design/resolveRoute.ts` returns design/shell/headerLayout/documentStyle/cssVars only — T02 work confirmed.
3. **Records endpoint is cursor-only, fixed `-updatedAt`** — no page-size/sort params (T15 mandatory extension).
4. **`DesignDefinition.pages` has no work/management/members slots**; all public slots required (T01 adds optional operational slots per patched §5.1).
5. **`LorePageModel` is effectively empty**; `Pages` collection exists (slug/title/body/published) with no page-type field (T14 slug-convention fallback).
6. **Dependencies:** production root has only `react-arborist` of the incubator's deps; incubator uses lucide-react, radix-ui, motion, fontsource, syncfusion (T11 policy: lucide+radix pre-approved, others justified, syncfusion excluded).

## Incubation source inventory check

Remote `origin/design/obsidian-incubation` `design-incubator/obsidian/src/` contains: `ObsidianShell`, `Navigation`, `controls`, `ObsidianHome`, `ObsidianRecords`, `ObsidianDocument`, `ReadingSurface`, `ObsidianAbout`, `ObsidianLore`, `ObsidianDepartments`, `ObsidianDepartmentDetail`, `ObsidianCharacterProfile`, `ObsidianManagement`, `ObsidianFolderManager`, `ObsidianDocumentTypes`, `DocumentActions`, `config.ts`, `contracts/**`, `obsidian.module.css`, `preview/**` (fixtures, main.tsx, reset.css, useMockWorkspace). Matches the packet's port list.

## Deviations

- None. No production behavior changed; this ticket is audit-only.

## Contract pressure

- `/members` needs a slot (packet patched to add `pages.members`).
- `/review` classified as shared editor (packet patched).