# LoreForge Phase 6 + Phase 7 acceptance checks

The Phase 6 human gate was bypassed by explicit owner instruction. Phase 7 is
implemented and repaired, and remains a human review gate.
**For Phase 7, use [PHASE_07_TESTING.md](PHASE_07_TESTING.md)**:
it replaces the old generic scenarios with verified accounts, Domains, direct
HTTP links, exact controls, and cleanup steps. Dedicated P7 fixtures are already installed.
The Phase 6 instructions below are retained separately; the Form Studio UX
replacement discussion is paused pending the owner's direction.

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

Local Phase 6 fixture credentials (not the Phase 7 actor matrix):

- Ar Domain owner: `admin@example.test` / `test-password-123`; acting Character Lucan.
- `officer@example.test` signs in with `test-password-123`, but currently lacks
  a canonical active Domain membership. Do not use it as the Phase 7 ordinary
  member. The Phase 7 guide identifies the actual member fixture.

These are development-only accounts; they are not production credentials.

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
5. On the new-document editor, confirm the acting Character is shown as a
   required, non-removable Prepared-by credit. Search for and add one or more
   additional active Domain Characters, then remove one of the additional
   credits. Search an existing tag and add it; type a new tag and use the
   Create control. Confirm the selected credits, tags, Concerns, and form
   answers remain visible in the submitted snapshot.
6. On the new-document editor, deliberately leave a required field empty after
   entering a title, destination, body, and concerns. Submit, confirm the
   validation message, and confirm every entered value remains in the form.
7. Return to the form/template preview and confirm base composition (header,
   footer, and Domain styling) is presentation-only and does not alter the
   canonical document body unexpectedly.

## Phase 7 — authorization and delegation

Follow [Phase 7's step-by-step guide](PHASE_07_TESTING.md), starting at section 1.
It contains the actual password/account/Character/Domain combinations and blue
HTTP links for the running local application. Do not use the old generic
instructions from earlier revisions.

The guide distinguishes runnable owner checks from missing delegated fixtures
and agent-owned forged-write, concurrency, and audit verification. GET links
to POST-only endpoints are not permission tests. Phase 7 remains unaccepted;
finishing the available checks does not waive its remaining requirements.
