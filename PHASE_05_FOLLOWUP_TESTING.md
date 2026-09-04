# Phase 05 follow-up — focused owner checks

The local server is `http://localhost:3055`. Begin at `http://localhost:3055/`.
Use the established seeded fixture login mechanism; this document intentionally
does not repeat credentials. After login, select **Ar** in the top-level Domain
selector. If a document form needs an acting Character, select **Lucan** or
**Elara** in the header Character selector; changing it on the current Domain
page must preserve the page and every entered field.

## 1. Supersession workflow

1. Open `http://localhost:3055/domain/ar/records`.
2. In the left Folder tree, select the folder containing a Filed record. In the
   records pane, click the record row, then click the first toolbar button,
   **View**.
3. At the bottom of the document page click **Create superseding document**.
   Confirm the new-document page contains the old title, body, and concerns,
   including the inserted supersedes line, and that **Prepared by** is the
   current header Character rather than a free-standing picker.
4. Save. The old record must be locked; its page must show a prominent
   **Document superseded by** link to the new title, date, and preparer.

## 2. Validation failure preserves fields

1. From the same Records explorer, click **New document**.
2. Enter a distinctive body, choose a valid Document Type and Destination
   folder, then clear the **Title** field. Click **Create document**.
3. The page must show understandable validation feedback and retain the title,
   body, type, concerns, and any selected options so they do not need to be
   retyped. Participating Characters are optional; a title, an active Document
   Type, and the document body are the creation requirements exposed here (an
   empty Destination folder means Domain Root).

## 3. People workspace and independent Folder permissions

1. Open `http://localhost:3055/domain/ar/manage/people`.
2. In the People search box type **Tarl** (or another visible fixture
   Character), wait for the result list under the box, and click the matching
   Character row. Do not use the browser back button to find the page again.
3. In the **Roles** tree, expand a Department drawer in **All roles**. Switch
   the filter to **Held only**; the drawer(s) containing held roles should open
   automatically. Switch back to **All roles** and confirm the drawers you
   opened remain open.
4. In **Folder access**, expand the file-explorer tree and use the checkboxes to
   set Read and Write independently on a non-root Folder. Save, reload this
   same Character page from the People search, and confirm the two permissions
   persisted. Confirm the Character's role checkboxes did not change.

## 4. Failure feedback and scope sanity

1. From the Ar management bar open **Roles**, attempt one ordinary authorized
   role change, and confirm success is visible. If a controlled test fixture
   returns to the page with `error=mutation`, the page must show a visible
   failure message and must not imply that the change succeeded.
2. Visit `/`, `/domain/ar`, and `/domain/ar/records`. Confirm there is no new
   unrequested theme, Share implementation, document transfer/copy action,
   redundant administration mode, or picker replacing the Domain/Character
   header selectors. Share remains a disabled/deferred placeholder.

The audit-storage failure, independent transaction race, schema upgrade, and
large cleanup cases are deterministic automated checks and are not reproduced
against the real database during owner validation.
