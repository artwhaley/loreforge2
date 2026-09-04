# P06R Form Studio — manual acceptance

Run with a clean-context tester who has NOT read this corrective or any
ticket. The tester is a Domain Owner / Domain Admin in a scratch Domain with
at least one extra active Character besides their own.

**Checklist owner:** mark every row PASS/FAIL with the tester's words. A FAIL
blocks closure of this corrective.

## Scenario A — build a form without any technical reading

1. Via the management bar open **Templates & Forms → Forms → Create form**.
2. Name it "General Incident Report" and pick its Document Type, availability
   Folder, and destination Folder.
3. Add questions **only by dragging from the left rail or pressing Add**:
   - a **Date** ("When did it happen?")
   - a **Pick a Character** question ("Witness", relationship label `witness`)
   - a **Choice list** ("What kind of incident?") with at least three choices
   - a **Long answer** ("Describe what happened")
4. For the Long answer, open the inspector (click it) and set its height to 6
   lines and width to Full. For the Date, set width Short.
5. Give one question help text and confirm it appears under that question on
   the canvas exactly where a filer will see it.
6. Reorder questions by dragging the handle; also move one with the ↑/↓
   buttons only (keyboard path — no mouse drag).
7. Reopen the **Record preview** toggle and confirm the sample record reads
   naturally (title from the chosen naming question, one section per
   question, choice shown as its label).
8. Fill the form name picker: "Name each record by the answer to" the Kind
   question. Remove that question and confirm the app warns before removal
   and falls back cleanly.
9. **Save.** Confirm you are returned to the Forms list and the new form is
   Active.

### Pass criteria

- The tester never saw: a `Key`, `{{...}}`, schema JSON, Markdown, or any
  Payload/CMS word. No popup settings dialog anywhere — only the right-hand
  inspector.
- The canvas looked like the real form (controls, help, sizing), and the
  whole task took no technical documentation.

## Scenario B — edit, duplicate, lifecycle

1. From the Forms list choose **Edit** on the saved form. Change a question
   label and the help text; **Save changes**. Confirm the list still shows one
   form (the edit saved a new version of the same form, Active).
2. **Deactivate** the form from the Templates page, then open **Edit** again
   and save — the form is Active again and no longer offered for filing when
   inactive.
3. **Duplicate** a form and confirm the copy is Inactive and editable.

## Scenario C — a member files through the form

1. As a member with an acting Character, open the form from Forms and fill
   every question, including picking a real Character for the Witness
   question (search box, not a text field).
2. Submit and confirm you land on an ordinary archive Document whose record
   title comes from the naming question, whose body has one section per
   question with the human-readable answers (choice label, Character name,
   Yes/No), and whose Character links include the witness with the
   `witness` relationship.
3. Deliberately submit once with a required question empty and confirm the
   inline error preserves every other entered value.

## Scenario D — follow-up: multiple-Characters question + filing fix

Added after the owner hit a server error while filling a form (follow-up
2026-09-04). The crash was a `FOREIGN KEY constraint failed` on the document
insert: the create passed the Domain id into the retired `tenants` legacy
column, which has no such row. Fixed by scoping new documents by `domain`
alone, matching every other create path.

1. Edit the saved form and add a **Pick Characters** question ("Witnesses",
   relationship label `witness`, full width) alongside the single **Pick a
   Character** question. Save changes.
2. As a member, fill the form: search and add SEVERAL Characters to the
   Witnesses question (chips with Remove), one Character to the single pick.
   Submit — you must land on the record, never a server error.
3. On the record, confirm the Witnesses section lists each chosen Character's
   name, that every chosen Character is linked with the `witness`
   relationship, and the single pick is linked once.
4. Mark the Witnesses question required, save, then submit it empty: the
   inline error must preserve every other entered value (chips included).

## Scenario E — follow-up: Time question + full filing retest

The filing crash chain is now fixed twice over (legacy-tenant FK, then
in-transaction hook visibility — `Not Found`). Both were verified by
replaying the exact failing sequence on a scratch copy of the live DB. The
final check must be a real end-to-end filing in a browser.

1. In the studio, add a **Time** question ("At what time?") right after a
   Date question; give it width Short. Save and confirm the record preview
   shows a sample time.
2. As a member with an acting Character, fill the form completely — Date,
   Time, one or more Character picks — and submit.
3. You must land on the finished record (no server error anywhere in the
   filing), with the time reading `HH:MM`, every Character name shown, and
   the acting Character visible as the Prepared-by credit.

## Scenario F — follow-up: filing with Character questions (the `Resource not found.` crash)

Added after the owner hit `Resource not found.` whenever filing a form with a
Character question (follow-up 2026-09-04). The crash was NOT a permission
decision: the concerns-link attach ran an `edit_document` check whose document
lookup did not carry the open transaction's id, so it read a pre-create
snapshot and reported the just-created document as not found. Fixed by treating
the form's own Character links as part of the create act (skip the redundant
post-create check; the `create_document` preflight on the destination folder is
the real gate) and by threading `transactionID` through the permission helpers
for any future in-transaction check. Verified by replaying the exact sequence
on a scratch copy of the live DB.

1. As a Domain Admin with an acting Character, fill the plumbing incident
   form completely (Date, Time, single Character pick, multi-Character pick)
   and submit — you must land on the record, never a server error.
2. As a plain member with `create_document` in the destination folder, fill
   and submit the same form — same result, record created with the acting
   Character as Prepared-by and every picked Character linked with the
   relationship label.
3. As a member WITHOUT `create_document` in the destination folder, submit:
   the fill page must show the graceful "Not authorized." message — never a
   crash.
4. From **records/new** with a form template that has Character questions,
   create a document with Concerns and an extra Prepared-by credit and save:
   the record must open in the editor (the same create-act skip applies
   there).

## Keyboard-only pass (repeat scenario A #6)

Add, edit, move up/down, remove, and save entirely without a mouse.

---

| Check | PASS/FAIL | Tester note |
| --- | --- | --- |
| A: no machine terminology visible | | |
| A: drag + click-to-add from toolbox | | |
| A: inspector panel (no popups) | | |
| A: canvas == real form (help, sizing, defaults) | | |
| A: reorder by drag AND by buttons | | |
| A: record preview reads naturally | | |
| A: naming-question picker + removal warning | | |
| A: save → Active form listed | | |
| B: edit saves next active version | | |
| B: inactive not fillable; edit re-activates | | |
| C: Character picker on fill, link + relationship | | |
| C: record body human-readable (labels/names/Yes-No) | | |
| C: required-miss error preserves entries | | |
| C: filing creates the record (no server error) | | |
| D: multi-Character chips picker on fill | | |
| D: every chosen Character linked with the label | | |
| D: multi required-miss error preserves entries | | |
| E: Time question in studio + record preview | | |
| E: end-to-end filing with Date + Time + Characters lands on the record | | |
| E: Prepared-by credit present on the filed record | | |
| F: admin filing with Character questions lands on the record | | |
| F: member filing with Character questions lands on the record | | |
| F: member without create_document sees "Not authorized.", not a crash | | |
| F: records/new with Concerns + extra Prepared-by creates the record | | |
| Keyboard: full flow without a mouse | | |
