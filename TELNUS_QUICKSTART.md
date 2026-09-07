# LoreForge — Telnus Empty-Domain End-to-End Quickstart

Owner-led buildout exercise (DEF-STARTER-01 / P07X-GATE-FINAL). Start at `http://localhost:3055`.

Sign in on the home page login card with the admin account you invited when creating Telnus.

---

## 0. Orientation — what appears where

- **Global header:** LoreForge logo, **Domain selector**, **Acting as** (Character) selector, Account menu.
- **Primary nav** (every Domain page): `Home  About  Lore  Departments  Records` — plus **Work** (your queue: join requests, pending records).
- **Management bar** (smaller bar beneath, admin only): `People · Members · Roles · Folders · Templates & Forms · Invitations · Customize`. This bar is where nearly all admin work happens.
- The admin's acting Character is the provisioned `domain_admin` identity (e.g. "Administrator of Telnus"). It needs **no Domain membership** — authority is its kind, not a Role.

Build order matters: **Departments → Folders → Roles → Document Types → Templates/Forms → People → Documents**. (Document Types need Folders for their lifecycle routing; Templates need Types; Role assignment needs People.)

---

## 1. Departments — `Home → Departments → (admin) Manage Departments`

The manage link is visible only to admins (it is the plain `Manage` path `/manage/departments` — reachable from the admin bar or directly).

1. On **Departments**, use the admin form: fill **name**, **slug** (url-safe), optional description, sort order → **Create Department**.
2. Repeat for each department, e.g.:
   - `HOC — Hall of Coin` (slug `hall-of-coin`)
   - `Clerk's Office` (slug `clerks-office`)
   - `Townsfolk` (slug `townsfolk`)

Departments have no permission controls on this page — they only organize Roles.

---

## 2. Folders — management bar → **Folders**

Page: `/domain/telnus/manage/folders`.

1. **New folder** (top-right) → name it, e.g. `Ledgers` → **Create folder**. Repeat for:
   - `Ledgers` — daily coin records
   - `Writs & Licenses`
   - `Tax Records`
2. For nesting, **right-click** a folder → **New subfolder** (e.g. under `Tax Records`, add `Assessments`).
   - Move/delete/rename are also in that right-click menu. The system root is read-only.

Set up a small tree first; you'll point Document Types at these folders next. Note that record *capabilities* (create/edit/approve) are granted on **Document Types**, not folders — folders only organize and restrict.

---

## 3. Roles — management bar → **Roles**

Page: `/domain/telnus/roles`.

1. Toolbar → **New top-level role** → choose Department (e.g. HOC) → name it `Chancellor of Coin` → **Create role**.
2. Right-click the new role → **Create subordinate role** → e.g. `Treasurer`, then under it `Clerk`.
3. Repeat in `Clerk's Office`: `Chief Clerk` → `Archivist`.
4. Leave `Townsfolk` with no roles for now — that's where regular members will be assigned by a plain Role later.

**Grant each Role its record powers** — for the selected role, use the **Record Type access** grid (right panel):

- Each row is a Document Type you created in §4; each column is a capability (Read / Create / Edit / Submit / Approve / Delete…; more under **Advanced capabilities…**).
- Each cell is a three-state toggle: **Inherited / Allow / Deny**. Set the Role's row and press **Save** on that row.
- Example: `Chancellor of Coin` → *Ledger Type*: Allow on Read/Create/Edit/Submit/Approve. `Treasurer` → *Ledger Type*: Allow Read/Create/Edit/Submit. `Clerk` → Allow Read/Create only.
- **Advanced: Folder organization and access** (collapsed, below the grid) — sets the Role's *default* folder Read/Write, with the same three-state controls per folder. Leave inherited for the head; optionally narrow the Clerk (e.g. read-only on some branch).

Department heads need one more grant to manage their people — see §6 step 4.

---

## 4. Document Types — management bar → **Templates & Forms → Document Types**

Page: `/domain/telnus/document-types`.

Create each type with the **Create Document Type** form at the bottom:

1. **Name** — e.g. `Ledger`.
2. **Methods** checkboxes:
   - *Allow blank documents* — enables the plain editor path.
   - *Allow document Templates* — enables the Markdown-template path.
   - *Allow Forms* — enables the form-builder path.
   Leave all three checked to test every method with one type.
3. **Default filing policy** — `Direct file` or `Review required`. (This controls what happens when a record is created via a Template/Form with `Inherit`.) Set `Ledger` to `Review required` to test approval.
4. **Template-compatible filing policy** — `Inherit` keeps the above.
5. Lifecycle folders (dropdowns of your §2 folders): set **Draft folder** (`Ledgers`), **Pending review folder**, **Filed folder**, and optionally **Locked folder**. If unset, lifecycle routing falls back to the default folder.
6. **Create Type**.

Repeat for a couple of types — e.g. `Writ` (direct-file, blank+template), `Ledger` (review, blank+template+form), `Tax Assessment` (form-only). The Type list shows each type's effective creation methods.

---

## 5. Templates & Forms — management bar → **Templates & Forms**

Two sibling pages with subnav **Forms · Templates · Document Types**, plus **Create template** / **Create form** buttons on the Templates page.

### 5a. Markdown Document Template

`Templates → Create template` (`/templates/new`):

1. **Name** — `Ledger — Daily Entry`.
2. **Document Type** — `Ledger`.
3. **Available from Folder** — the folder where this template is offered (e.g. `Ledgers`). Required.
4. **Base Template (optional)** — for header/footer composition reuse.
5. **Title** — a title template, e.g. `Daily Ledger — {{content}}`.
6. **Body** — Markdown with `{{content}}` where the author's text goes, e.g.:
   ```md
   # Daily Ledger

   Date: {{content}}
   ## Entries
   (record the day's coin)
   ```
7. **Create template**.

On the Templates list you can **Edit** / **Duplicate** / **Deactivate** each item.

### 5b. Form (form-feeding-Markdown)

`Templates & Forms → Forms → Create form` (`/forms/new`) — the Form Studio:

1. **Details row:** Form name (`Tax Assessment`), Document Type (`Tax Assessment`), **Available from** folder, **Base template** (optional — only templates available in the chosen folder are listed).
2. **Name each record by the answer to** — pick which question auto-names records.
3. **Document framing** — optional fixed Markdown **Header** / **Footer** around the generated answer sections (no answer tokens allowed in these).
4. **Toolbox → Canvas:** drag or click to add questions — Short answer, Long answer, Date, Time, Choice list, Checkbox, Pick a Character, Pick Characters. Click a question to edit its label/choices/required in the **Inspector** (right). Reorder by drag or arrow buttons; duplicate/delete from the row menu.
5. **Record preview** (view bar) shows the Markdown document the form will produce.
6. **Save form** (disabled until every question is labeled and at least one exists).

---

## 6. People — invites, the HOC head, and the regular user

### 6a. Invite the HOC head (department head)

1. Management bar → **Invitations** (`/manage/invitations`).
2. Panel **Invite Domain participation** → optional max uses / expiry → **Create Domain link**. Copy the shown link immediately (shown once).
3. Give the link to your HOC-head test user. They sign in / create an account, land on the invite page, choose **Create a new Character** (or an existing one) → **Accept invitation**. This files a pending join request — nothing is active until you approve.
4. Back on **Invitations**, **Pending Domain join requests** → **Approve**.

### 6b. Make them the department head

1. Management bar → **People** (`/manage/people`) → search the Character in the search box → open their workspace.
2. **Roles** panel — a Department-grouped tree with checkboxes. Check `Chancellor of Coin` (in HOC). Department participation derives from the held Role automatically — there is no separate membership step.

### 6c. Grant the head authority over their department

The head needs to assign Roles **within HOC** without being domain admin. There is no customer UI surface that grants Department-scoped capabilities yet — the Roles page grid only covers Document Types, and its Advanced section only covers Folders. To let the head assign their subordinates' roles, the domain admin (or a script) must create a PermissionRule like:

```
principalType: Role, principal: <Chancellor of Coin>
resourceType: Subdomain, resource: <HOC>
capability: assign_subordinates, effect: grant
```

If you want to avoid touching the DB/script for the exercise, the fallback is: the head assigns nothing; the domain admin assigns all HOC roles via People, and the head merely holds the top Role. (Note the session rule: `assign_subordinates` requires the granting Role to *hold* a role that is a strict ancestor of the target role — so grant it to the top role in the department.)

*(If you prefer, run a one-off script with `payload.create` on `permission-rules` to insert the rule — say the word and I'll write it.)*

### 6d. Invite the regular user

1. Repeat 6a (new link) for the second user; they accept with a new Character, e.g. `Mira`.
2. **Invitations → Pending Domain join requests → Approve**.
3. **People → Mira** → Roles panel → check `Townsfolk`'s plain Role (create a simple `Citizen` role in that department first if you haven't) — or a HOC `Clerk` role to test the chain of command.

---

## 7. Document creation & the approval lifecycle

Sign in as the appropriate user (or use the acting-Character selector to switch identities).

### 7a. Blank document

1. **Records → New document** (`/records/new`).
2. **Document Type** — `Writ` (its single method shows *Blank document*).
3. **Title**, body Markdown, optionally Concerns (Character picker), Tags.
4. **Create document** → blank creation always starts as a **Draft** regardless of the Type's policy. From the document page, **Submit for review** (needs an acting Character) or **File now** (if authorized) moves it onward; the draft lands in the Type's draft folder.

### 7b. Markdown-template document

1. **New document** → Type `Ledger` → method **Document Template** → pick `Ledger — Daily Entry`.
2. The template supplies the title/body composition; the folder is resolved automatically from the Type — there is no folder picker.
3. **Create document** → policy `Review required` routes it to **Pending Review** automatically (check the document page status and `/history`).

### 7c. Form document

1. **New document** → Type `Tax Assessment` → method **Form** → pick `Tax Assessment`.
2. Answer the questions; the record is named from the chosen naming question (no title typing).
3. **Create document** → review the generated Markdown record.

### 7d. Approval / return / lock

- As the head (if granted `approve_document` via the Role grid in §3) or as admin: **Work** (top nav) shows **Pending records** with **Approve and file** / **Return to Draft** (optional reason). The classic **Review queue** page (`/review`) has the same controls.
- On any document page (with permission): **Edit**, **History**, **Lock** (from Filed), **Unlock**, **Submit for review**, **File now**. Supersede is available from the Records browser's right-click on an eligible (Filed/Locked) record.
- Pending-review records are frozen; a rejected record returns to Draft with the reason in History.

---

## 8. Permission spot-checks (the point of the test)

- As the regular user (`Mira`), open **Records**: she should see only folders/types her Role grants (Ledgers Read if `Clerk`, etc.). The **New document** Type dropdown lists only types she may create.
- In **People → Mira** as admin, the **Record Type access** table shows her effective Read/Create/Edit per type with the source rule (Role grant vs direct grant vs department restriction).
- Direct Character overrides: in her People workspace, the **Folder access** tree has per-folder Read/Write three-state (Inherited/Allow/Deny) controls — set a Deny somewhere and watch it beat the Role default; Inherited removes the direct rule.
- As the head (acting as their Character): management bar shows **People** (scoped) if the Subdomain rule from 6c exists; they can assign only HOC roles below theirs. Compare with what the admin sees.
- Negative check: a user with no Role in HOC should not see HOC documents even though other folders are readable.

---

## 9. Tear-down / reset

Nothing to tear down per se — the Telnus Domain is your living test bed. If you want a clean slate: the nuclear option is deleting the DB and re-seeding, which loses the whole exercise; otherwise archive/deactivate via the UI (deactivate Templates, archive Departments, remove memberships from People workspaces — removal also strips their Roles and folder overrides and is audited).

---

## Cheat-sheet of routes

| Page | Route |
|---|---|
| Domain home | `/domain/telnus` |
| Departments | `/domain/telnus/departments` |
| Manage departments | `/domain/telnus/manage/departments` |
| Folders | `/domain/telnus/manage/folders` |
| Roles | `/domain/telnus/roles` |
| Templates | `/domain/telnus/templates` |
| Forms | `/domain/telnus/forms` |
| Document Types | `/domain/telnus/document-types` |
| People | `/domain/telnus/manage/people` |
| Invitations | `/domain/telnus/manage/invitations` |
| Records | `/domain/telnus/records` |
| New document | `/domain/telnus/records/new` |
| Review queue | `/domain/telnus/review` |
| Work queue | `/domain/telnus/work` |
| Your Characters | `/account/characters` |
