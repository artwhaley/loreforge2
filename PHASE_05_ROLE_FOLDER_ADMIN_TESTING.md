# Phase 5 role and folder administration testing

The local server runs at `http://localhost:3055`. Log in at `/` with
`admin@example.test` / `test-password-123`, select **Ar**, and keep the
admin account active for these checks.

## Role manager

1. Use the management bar under the Ar header and choose **Roles**.
2. Confirm the page contains the same collapsible Department → Role tree used
   on a person workspace. There should be no “Roles are Department-owned…”
   explanatory paragraph and no raw assignment table.
3. Left-click a role name. The selected row should be highlighted and the box
   below should list every active Domain member who holds that role. Each name
   links to that person’s workspace.
4. Right-click a role. Use **Create subordinate role**, enter a name, and
   confirm the new role appears below the selected role after the page reloads.
   A role cannot be created under a role in another Department.
5. Right-click a role and choose **Assign this role…**. Search for a person,
   check one or more result rows, and click **Assign role**. Confirm the holder
   list updates. Role assignment does not present a Folder field.
6. Under **Default folder access**, expand/search the same Folder tree used on
   person pages. Change Read and Write independently and save. The note there
   explicitly defers whether defaults affect existing versus future members to
   P07; this phase only stores the role default rows.
7. Right-click an empty-leaf role and choose **Delete this role**. Confirm it
   disappears from the active tree. A role with active subordinate roles must
   be reorganized before it can be archived.

## Folder manager

1. Return to the Ar management bar and choose **Folders**. It is between
   **Roles** and **Templates & Forms**.
2. Confirm the page is a searchable interactive folder tree, not a flat table.
3. Right-click a folder and choose **New subfolder**. Create one and confirm
   it appears beneath the selected folder.
4. Right-click an ordinary folder and use **Move folder…**. Select another
   valid parent or Domain root. A folder cannot be moved under itself or one of
   its descendants; system-managed roots cannot be moved or deleted.
5. Delete an empty ordinary folder. Attempting to delete a folder that still
   contains documents or subfolders should leave it in place.

## Person workspace regression

1. Choose **People** in the management bar and search for a Character.
2. On that person’s page, expand a Department/Role drawer in **All roles**,
   switch to **Held only**, then switch back to **All roles**. The expanded
   drawer state should remain, and Held only should automatically open the
   drawers needed to reveal held roles.
3. Save a direct Folder Read/Write override on the person. Confirm the person’s
   Role assignments are unchanged. These direct controls are independent from
   role defaults.

The document relationship/copy/move/share scenarios remain the separate P05
document-system review and are not covered by this checklist.
