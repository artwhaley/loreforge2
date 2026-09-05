# Phase 7 — working acceptance test

**Performance patch status:** P07P-02 through P07P-06 are implemented in the
working tree and the automated authorization/search gates below are green.
The owner manual gate remains open for the visible Head Scribe workflow and
the performance release-criteria sample; do not mark Phase 7 accepted from
this document alone.

The owner-directed P07X corrective extension is tracked separately. Its
current integrated acceptance is executable with
`npm run test:p07x-t11`; see [the P07X integrated contract](../LoreForge_P07X_Execution_Packet/02_INTEGRATED_ACCEPTANCE.md)
and stop at P07X-GATE-FINAL for owner review.

Updated September 4, 2026. Use **http://localhost:3055**, this working database,
and the accounts below. The fixture/setup and permission defects from the
previous guide have been repaired. **Owner acceptance is still pending.**
You do not need to seed anything or configure permissions before starting.

These are dedicated test Domains. Ar, its theme, and its memberships were not
changed. Do not use the older admin/officer/Alpha accounts for this guide.

## 1. Sign in — repeat these steps whenever a section changes accounts

1. Open [Loreforge](http://localhost:3055/).
2. If signed in, click **Log out** beside **Account** in the dashboard's upper
   area. You can always return here using that link, regardless of your current
   Domain page.
3. Under **Welcome back**, enter the section's email and password
   **`test-password-123`**. Click **Sign in**.
4. On the dashboard, choose the matching **P7 …** name in the **Character**
   dropdown, then click **Switch** immediately beside it.
5. Verify the dashboard says **Acting as P7 …**.
6. Under **Your Domains**, click **P7 Workshop**. All sections use this Domain
   unless explicitly marked **P7 Outside**.
7. Verify the top bar says **Domain: P7 Workshop** and **Acting as: P7 …**.
   Now use the section's blue links. Opening them does not switch accounts.

An old Domain selection from another login no longer prevents choosing your
Character on the dashboard. If you need to check which account is signed in,
open [current login JSON](http://localhost:3055/api/users/me). Read the user's
email; close that tab and return to the app.

All API links below use the current browser's login. A successful read shows
JSON containing the named record. A denied API read shows an error/forbidden
response, not the record. A denied app page intentionally shows **404 / This
page could not be found**. Those specific denials are expected results.

### Accounts, Characters, and purposes

Every password is **`test-password-123`**. These are local development fixtures,
not production credentials.

| Email | Choose Character | Domain | Test |
| --- | --- | --- | --- |
| p7-member@example.test | P7 member | P7 Workshop | Ordinary read-only Records Clerk |
| p7-head@example.test | P7 head | P7 Workshop | Head Scribe; descendant assignments and Scribes folder access |
| p7-deputy@example.test | P7 deputy | P7 Workshop | Assistant Head Scribe; narrower descendant assignments |
| p7-access@example.test | P7 access | P7 Workshop | Deeds access manager; cannot grant Write |
| p7-roles@example.test | P7 roles | P7 Workshop | Role creation in Scribes only |
| p7-folders@example.test | P7 folders | P7 Workshop | Folder management under Deeds only |
| p7-claimant@example.test | P7 claimant | P7 Workshop | Request control of the unclaimed fixture |
| p7-claims@example.test | P7 claims | P7 Workshop | Delegated claim approver |
| p7-owner@example.test | P7 owner | P7 Workshop | Domain owner, not platform admin |
| p7-outside@example.test | P7 outside | P7 Outside | Owner of the other Domain |
| p7-platform@example.test | P7 platform | P7 Workshop initially | Actual platform administrator |
| p7-commander@example.test | P7 commander | P7 Workshop | Inherits both Captain branches |
| p7-captain1@example.test | P7 captain1 | P7 Workshop | First Platoon only |
| p7-captain2@example.test | P7 captain2 | P7 Workshop | Second Platoon only |
| p7-warrior@example.test | P7 warrior | P7 Workshop | Incident Reports plus direct Court read exception |
| p7-denied@example.test | P7 denied | P7 Workshop | Warrior with explicit Incident Reports read deny |
| p7-multi@example.test | P7 multi | P7 Workshop | Warrior and Magistrate, both write grants |

A second claimant account, `p7-claimant2@example.test` / **P7 claimant2**, is
reserved for automated probes. You do not need it for the manual run.

## 2. Ordinary member: readable does not mean editable

**Sign in as p7-member@example.test; Character P7 member; Domain P7 Workshop.**

1. Open [Records](http://localhost:3055/domain/p7-workshop/records).
   Find **P7 Working Deed** (use the search box if needed). You can read Scribes
   records, but should not see Warrior or Court document titles.
2. Open [P7 Working Deed](http://localhost:3055/domain/p7-workshop/documents/8).
   Its title and body should render. There must be no usable **Edit** action.
3. Click [the direct editor URL](http://localhost:3055/domain/p7-workshop/documents/8/edit).
   You must return to the document view, not an editable form.
4. Open [People](http://localhost:3055/domain/p7-workshop/manage/people),
   [Roles](http://localhost:3055/domain/p7-workshop/roles), and
   [Folders](http://localhost:3055/domain/p7-workshop/manage/folders), separately.
   Each must show the not-found page. Management links should not be offered
   in this account's Domain navigation.
5. Click [read the Deed through the API](http://localhost:3055/api/documents/8?depth=0):
   JSON should contain **P7 Working Deed**.
6. Click [try management People search](http://localhost:3055/api/people-search?domainSlug=p7-workshop&q=P7):
   access must be denied.
7. Return using [Records](http://localhost:3055/domain/p7-workshop/records).

No data changes or cleanup in this section.

## 3. Head Scribe: find a person, assign a descendant, change folder access

**Sign in as p7-head@example.test; Character P7 head; Domain P7 Workshop.**

1. Click **People** in the management navigation, or open
   [People](http://localhost:3055/domain/p7-workshop/manage/people).
2. In **Find a Character**, type **P7 member**. Click that result beneath the
   search box. You should reach
   [P7 member's workspace](http://localhost:3055/domain/p7-workshop/manage/people/21).
3. In **Roles**, click **Held roles**. The Scribes drawers should already open
   down to the checked **Records Clerk**.
4. Click **Roles I can assign**. You should be able to assign **Assistant Head
   Scribe**, **Records Clerk**, **Deputy Clerk**, and **Historical Archivist**.
   **Head Scribe** can appear as a disabled ancestor for context, not as an
   assignable checkbox. Warriors/Magistrates are not assignable here.
5. Type **Deputy Clerk** into **Search roles or departments**. Check its box.
   This saves immediately; there is no separate role Save button.
6. Click **Held roles** and confirm **Deputy Clerk** is now held. Uncheck
   **Deputy Clerk** to restore the baseline. Leave **Records Clerk** checked.
7. Scroll down to **Folder access**. In **Search folders**, type **Deeds**.
   Expand the arrow beside **Deeds** if necessary. Use the row named **Deeds**,
   not its child **Filed Deeds**.
8. On that row, leave **Read → Inherited** selected. Under **Write**, choose
   **Allow**, then click that row's **Save**. After reload, the effective Write
   explanation should say **Allowed** and identify a direct Character rule.
9. On the same Deeds row, choose **Write → Deny**, then **Save**.
   Effective Write should now be **Denied**.
10. **Cleanup:** choose **Write → Inherited**, leave **Read → Inherited**, and
    **Save**. This removes the direct overrides. Effective Read remains allowed
    through Records Clerk; Write returns to denied because the Clerk role has
    no Write grant. The Records Clerk checkbox must still be checked.

Current access controls are three labeled choices per axis: **Inherited /
Allow / Deny**. Use these exact choices, not a nonexistent permission dropdown.
Role assignments and Folder overrides are separate saves; neither changes the
other. Judge whether the tree, source explanation, and save behavior are usable.

## 4. Assistant Head Scribe: narrower delegation

**Sign in as p7-deputy@example.test; Character P7 deputy; Domain P7 Workshop.**

1. Open [P7 member's workspace](http://localhost:3055/domain/p7-workshop/manage/people/21).
2. Click **Roles I can assign**; clear **Search roles or departments** if needed.
3. **Records Clerk** and **Deputy Clerk** should be assignable. Head Scribe and
   Assistant Head Scribe may appear as disabled ancestry. Historical Archivist
   (a peer branch), Warriors, and the inactive Retired Clerk are not assignable.
4. Check **Deputy Clerk**, then click **Held roles** and confirm it was added.
5. **Cleanup:** uncheck **Deputy Clerk** again. Keep **Records Clerk** checked.
6. Click [Roles administration](http://localhost:3055/domain/p7-workshop/roles).
   Expect not found. Permission to assign subordinates is not permission to
   create/delete roles. Return through
   [People](http://localhost:3055/domain/p7-workshop/manage/people).
7. On P7 member's Folder access, controls should not let this account save
   folder rules. This account has role-assignment authority, not access management.

Forged self/ancestor/peer/other-Department/inactive assignments were tested by
the implementation agent; you do not need to craft HTTP requests.

## 5. Access manager: cannot grant permissions they do not possess

**Sign in as p7-access@example.test; Character P7 access; Domain P7 Workshop.**

1. Open [P7 member's workspace](http://localhost:3055/domain/p7-workshop/manage/people/21).
2. Scroll to **Folder access**, search **Deeds**, and find the **Deeds** row.
3. **Read → Allow** is enabled. **Write → Allow** is disabled: this manager does
   not possess Write. **Write → Deny** and **Write → Inherited** remain enabled.
4. Keep Read **Inherited**. Select Write **Deny**, click the row's **Save**, and
   confirm effective Write is denied.
5. **Cleanup:** select Write **Inherited**, keep Read **Inherited**, then **Save**.
6. Search **Historical Records** instead. Its permission choices and **Save**
   must be disabled. It is outside this manager's Deeds scope.
7. Do not expect role-assignment checkboxes to be enabled for this account.

## 6. Department-scoped role manager

**Sign in as p7-roles@example.test; Character P7 roles; Domain P7 Workshop.**

1. Open [Roles](http://localhost:3055/domain/p7-workshop/roles).
2. Click **New top-level role**. In **Department**, the only usable Department
   must be **Scribes**. Click **Cancel** without creating a role.
3. Search the role tree for **Records Clerk**. Right-click it, then choose
   **Create subordinate role**.
4. In **Role name**, type **P7 Manual Helper**; click **Create role**.
5. Search for **P7 Manual Helper** and confirm it appears below Records Clerk.
6. **Cleanup:** right-click **P7 Manual Helper**, choose **Delete this role**,
   then click **Delete role** in the confirmation. Do not delete a baseline role.
7. Search **Commander**. Right-click it: create/delete actions must be disabled
   because it belongs to Warriors. Close the menu by clicking outside it.
8. This account does not have assignment or Folder-access authority. **Assign
   this role…** and default Folder-permission changes must not be enabled
   merely because it can create Scribes roles.

## 7. Folder-scoped manager

**Sign in as p7-folders@example.test; Character P7 folders; Domain P7 Workshop.**

1. Open [Folders](http://localhost:3055/domain/p7-workshop/manage/folders).
   The top-level **New folder** button must be disabled.
2. In **Search folders**, type **Deeds**. Right-click **Deeds**, then
   **New subfolder**.
3. In **Folder name**, enter **P7 Manual Folder**, then click **Create folder**.
4. Search **P7 Manual Folder**, right-click it, choose **Move folder…**.
5. In **Move under**, choose **Filed Deeds**, then click **Move folder**.
   **Domain root** must be disabled and **Historical Records** must not be
   offered as an allowed destination.
6. Clear the search and expand Domain Root → Scribes → Deeds → Filed Deeds.
   Confirm P7 Manual Folder is under Filed Deeds.
7. **Cleanup:** right-click **P7 Manual Folder** → **Delete folder** → confirm
   **Delete folder**. It is empty and must disappear.
8. Search **Historical Records** and right-click it. Management actions must
   be disabled. Do not alter the baseline filing tree.

## 8. Role hierarchy, direct exception, explicit deny, multiple roles

Each row is a separate login using section 1, always **P7 Workshop**. The
Character is the email prefix with `p7-` replaced by `P7 `.
For each row, click all four document links below and compare with the table.
On readable documents, check whether the **Edit** action exists; you do not
need to type or save anything. Denied documents must show not found.

- [First Platoon Plan](http://localhost:3055/domain/p7-workshop/documents/12)
- [Second Platoon Plan](http://localhost:3055/domain/p7-workshop/documents/13)
- [Incident Report](http://localhost:3055/domain/p7-workshop/documents/14)
- [Court Record](http://localhost:3055/domain/p7-workshop/documents/15)

| Login email | First Platoon | Second Platoon | Incident Report | Court Record |
| --- | --- | --- | --- | --- |
| p7-commander@example.test | Read + Edit | Read + Edit | Denied | Denied |
| p7-captain1@example.test | Read + Edit | Denied | Denied | Denied |
| p7-captain2@example.test | Denied | Read + Edit | Denied | Denied |
| p7-warrior@example.test | Denied | Denied | Read + Edit | Read only |
| p7-denied@example.test | Denied | Denied | Denied | Denied |
| p7-multi@example.test | Denied | Denied | Read + Edit | Read + Edit |

Commander inherits its subordinate Captains' grants. Warrior's Court access
is a direct Character exception, not a second role. P7 denied's explicit deny
overrides Warrior. P7 multi holds Warrior and Magistrate.

While signed in as **p7-denied**, also open
[Records](http://localhost:3055/domain/p7-workshop/records) and
[Domain home](http://localhost:3055/domain/p7-workshop).
Neither may reveal **P7 Incident Report** in a listing. Its
[history URL](http://localhost:3055/domain/p7-workshop/documents/14/history)
must also be denied. No cleanup.

## 9. Claim approval by a delegated manager

This section intentionally changes ownership of one disposable fixture.
It is a one-time approval test, not a test that resets itself.

1. Sign in as **p7-claimant@example.test**, choose **P7 claimant**, enter
   **P7 Workshop**.
2. Open [P7 Unclaimed Applicant](http://localhost:3055/characters/35).
   Controller should be **Unclaimed**.
3. Under **Claim this Character**, click **Request claim**. The page should say
   the claim is pending in P7 Workshop.
4. Sign out through [the dashboard](http://localhost:3055/). Sign in as
   **p7-member@example.test**, select **P7 member**, enter **P7 Workshop**.
5. Open [the same applicant](http://localhost:3055/characters/35). This ordinary
   member must not see **Pending claim decisions** or an **Approve** button.
6. Sign out and sign in as **p7-claims@example.test**, select **P7 claims**, enter
   **P7 Workshop**. Open [the applicant](http://localhost:3055/characters/35).
7. Under **Pending claim decisions**, verify **Claimant: P7 claimant**.
   Click **Approve** on that request.
8. Controller should now be **P7 claimant**. This account is a delegated claims
   manager, not the owner.
9. Sign out and sign back in as **p7-claimant@example.test**. On
   [the dashboard](http://localhost:3055/), the Character dropdown should now
   include **P7 Unclaimed Applicant**. Select it and click **Switch**.
10. Click **P7 Workshop** under Your Domains and confirm **Acting as** shows
    the newly claimed Character.

Leave the approved fixture in place. If it already says Controller: P7 claimant
from an earlier run, verify steps 9–10 instead of requesting another claim.
Competing approvals and attempts to rebind an already claimed Character were
tested automatically on a separate isolated database.

## 10. Owner versus platform administrator; cross-Domain boundary

1. Sign in as **p7-owner@example.test**, select **P7 owner**, enter **P7 Workshop**.
   [People](http://localhost:3055/domain/p7-workshop/manage/people),
   [Roles](http://localhost:3055/domain/p7-workshop/roles), and
   [Folders](http://localhost:3055/domain/p7-workshop/manage/folders) should open.
2. Click [Outside record API](http://localhost:3055/api/documents/16?depth=0).
   Expect forbidden. Being Workshop's owner does not grant Outside access.
3. Sign in as **p7-outside@example.test**, select **P7 outside**, and choose
   **P7 Outside** under Your Domains.
4. Open [Outside record](http://localhost:3055/domain/p7-outside/documents/16)
   and [its API](http://localhost:3055/api/documents/16?depth=0).
   Both should now succeed.
5. Sign in as **p7-platform@example.test**, select **P7 platform**, and enter
   **P7 Workshop**. In the top **Domain** dropdown choose **P7 Outside**, then
   click the **Switch** beside that Domain dropdown.
6. Platform administration must work there even with **No participating
   Character**. Open
   [Outside People](http://localhost:3055/domain/p7-outside/manage/people) and
   [Outside record](http://localhost:3055/domain/p7-outside/documents/16).
7. Even for platform admin, the
   [wrong-Domain document URL](http://localhost:3055/domain/p7-workshop/documents/16)
   must not display the Outside record. A route cannot disguise a record as
   belonging to another Domain.

## 11. Lifecycle still wins over permission

**Sign in as p7-owner@example.test; select P7 owner; enter P7 Workshop.**

1. Open [P7 Superseded Deed](http://localhost:3055/domain/p7-workshop/documents/9).
   It must show the superseding notice linking to **P7 Current Deed**, not an
   editable old document.
2. Open [the old deed's editor](http://localhost:3055/domain/p7-workshop/documents/9/edit).
   It must not allow editing/saving the old locked body.
3. Follow [P7 Current Deed](http://localhost:3055/domain/p7-workshop/documents/10).
   The current version should open normally.
4. In [Records](http://localhost:3055/domain/p7-workshop/records), search
   **P7 Superseded Deed**. The accessible supersession chain should remain
   grouped with the current record, not an orphaned result.

## 12. What the implementation agent already tested

Do not use Postman, guess IDs, create grants, or handcraft mutation requests.

- All 18 reserved fixture account logins succeed.
- The live HTTP suite currently passes **104 checks**. It covers workspace admission, document read/edit/history
  boundaries, no denied record content in listings, forged subordinate-role
  assignments, allowed assignment/removal, Department-limited role creation,
  scoped folder creation/moves/deletion, atomic permission rejection,
  permission cleanup, denied document writes, and durable acting-Character audits.
- The isolated database suite passes seven scenarios, including the golden
  matrix, explicit deny, owner/platform boundaries, delegated grants, and
  simultaneous claim approvals with exactly one winner. The strict acting
  Character is supplied explicitly to document access checks; no Character
  union fallback remains.
- The normal regression suite passes 114 tests; the security chain passes 31.
- The request session loads authorization facts once and pure decisions issue
  zero SQL. The read-scope compiler fetches only Document-exception metadata,
  never the whole Domain corpus. Records search applies the authorized
  server predicate before projection, returns no bodies, closes readable
  supersession chains without exposing hidden nodes, and pages 50 distinct
  groups behind an opaque cursor as the records pane scrolls.
- P07P index migration is idempotent and uses eleven measured composite
  indexes. The disposable benchmark runner refuses a production/working DB,
  reports session/decision/scope/navigation timings, and releases its adapter
  before cleanup.
- Browser checks cover login → dashboard Character switch → Workshop → People
  search → subject workspace. A stale-Domain Character-switch defect discovered
  during that walkthrough was fixed.

Your part is the visible behavior and usability above. Record the section,
account, URL, action, and observed result if anything disagrees. Phase 7 is not
marked accepted until you say so. Document Sharing remains deferred under
P07-D01 / DEF-SHARE-01; these tests do not require it. Phase 8 has not started.
