# LoreForge Phase 6 + Phase 7 acceptance checks

The Phase 6 human gate was bypassed by explicit owner instruction. Phase 7 is
implemented but remains a human review gate. Run these checks against the local
server at `http://localhost:3055`.

## Start and sign in

From the repository root:

```powershell
npm run dev
```

Open `http://localhost:3055/`, sign in, choose a Domain in the top selector,
then choose an acting Character in the Character selector. If the user has no
active Character, owner/admin-only document creation remains available, while
ordinary member document creation must be rejected with its entered fields
preserved.

## Phase 6 — Templates and Forms

1. In a Domain where you are the owner/admin, use the capability-driven
   management bar and open **Templates & Forms** → **Forms** → **Create form**.
2. Create a form with several supported fields (text, number/date, checkbox,
   select, and Character where useful). Reorder fields, remove one, save, and
   reopen it. Confirm the search and preview controls remain usable.
3. From the Forms list, open the form, duplicate it, and deactivate the copy.
   Confirm inactive forms are not offered for new authoring.
4. Create a document from Records → **New document**. Search the available
   templates and select the form. Fill the form and submit it. Confirm the
   result is an ordinary archive Document with generated Markdown/body and no
   raw answer payload stored as the document's business model.
5. On the new-document editor, deliberately leave a required field empty after
   entering a title, destination, body, and concerns. Submit, confirm the
   validation message, and confirm every entered value remains in the form.
6. Return to the form/template preview and confirm base composition (header,
   footer, and Domain styling) is presentation-only and does not alter the
   canonical document body unexpectedly.

## Phase 7 — authorization and delegation

### Direct boundaries and scope

1. As an ordinary active Domain member, try the management URLs and their
   matching REST endpoints (`/api/roles`, `/api/folders`,
   `/api/permission-rules`, `/api/domain-memberships`, `/api/people-search`).
   Confirm unauthorized pages do not render and forged writes do not persist.
2. Try IDs from a second Domain in a URL/form/API request. Confirm the request
   is denied even when the acting user is an owner or platform administrator
   of the first Domain; no foreign document, folder, role, or rule is exposed.
3. Confirm the primary Domain navigation stays **Home, About, Departments,
   Records**. Management links appear only for capabilities the current actor
   actually holds; there is no “Manage <Domain>” label or administration mode.

### People, Roles, and folders

1. Open management **People**, search for a Character, and open the Character
   workspace. The role tree and folder tree are separate; changing Folder
   Read/Write does not add, remove, or alter a RoleAssignment.
2. Switch between **Held roles** and **Roles I can assign**. Confirm held
   branches auto-open and only server-authorized Role checkboxes are enabled.
   Attempt a disabled Role through a forged request and confirm no assignment
   is created.
3. In the folder tree, set Read and Write independently to Allow, Deny, and
   Inherited. Confirm Write is stored as the atomic create/edit pair, Inherit
   removes the direct rules, and explicit Character Deny wins over an inherited
   Role grant without changing the held Role.
4. Open **Roles**, select a Role, inspect its holders, and edit its **Default
   folder access**. Confirm the operation contains no RoleAssignment Folder
   scope. Right-click a Role and verify subordinate creation, assignment, and
   deletion are bounded by the current evaluator.
5. Open **Folders**, create a child beneath a managed Folder, then try to
   create/move/delete outside that branch. Confirm only the in-scope mutation
   succeeds and each successful mutation appears in the Domain audit trail.

### Delegated administration chain

1. Build a same-Department chain such as Head Scribe → Property Archivist →
   Deeds clerk. Give the Head Scribe `assign_subordinates` and test assigning
   each strict descendant.
2. From each lower-level actor, attempt to assign itself, a peer, its ancestor,
   an inactive Role, and a Role in another Department. Every escalation must
   fail. Holding `assign_subordinates` alone must not create a Role.
3. Give a manager `manage_access` but not `edit_document`; attempt to grant
   edit access. Confirm the grant fails. Confirm a manager may deny/revoke only
   within the resource scope they actually manage.
4. Have a Folder manager attempt to create a Role. Confirm the Role creation
   is denied, while an explicitly Department-scoped `manage_roles` holder can
   create only in that Department.
5. Use a Character claim request for an unclaimed Character. Confirm only an
   authorized claim manager can approve it, concurrent approvals leave one
   winner, and an already claimed Character cannot be rebound.

### Lifecycle and audit spot checks

- Direct document/folder/role/membership mutations go through the evaluator;
  UI hiding is not the security boundary.
- Superseded documents remain locked and the relationship tree remains
  tenant-scoped; the deferred Share button remains inert and does not grant
  access.
- Review the Domain audit records for membership, Role, RoleAssignment,
  Folder, and PermissionRule changes. Confirm actor User and active Character
  context are present where applicable.

