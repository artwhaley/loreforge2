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
| Keyboard: full flow without a mouse | | |
