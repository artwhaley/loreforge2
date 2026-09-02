# Phase 3 testing handoff

This handoff covers the current Phase 3 Domain/Subdomain/Role build and the
post-gate lifecycle and navigation fixes. The canonical application routes use
`/domain/...`; the older `/tenant/...` routes remain compatibility aliases.

The pushed branch is `phase-03-domain-subdomain-structure`.

## Pick up on another computer

```powershell
git clone https://github.com/artwhaley/loreforge2.git
cd loreforge2/sl-civic-archive
git switch phase-03-domain-subdomain-structure
npm install
Copy-Item .env.example .env
npm run seed
```

`npm run seed` creates the local SQLite fixture on a fresh checkout. Do not
commit `.env` or the generated `.db` file.

## Start the local server

From the project root:

```powershell
npm run dev
```

The app runs at <http://localhost:3055>.

The existing fixture database uses SQLite. The development command already
sets `PAYLOAD_PUSH=false`, which avoids Payload trying to recreate existing
indexes in the compatibility database.

## Fixture logins

- Admin account: `admin@example.test` / `test-password-123`
- Ordinary officer account: `officer@example.test` / `test-password-123`

The admin account owns the Ar Domain. The officer account controls Alex Mercer,
who is an ordinary Character-level member of Ar.

## Test the context and authorization split

1. Log in as the admin account.
2. From the account home page, click **Manage Ar**, or use the top
   **Administration** selector.
3. Confirm Administration mode clears the acting Character and exposes the
   management controls.
4. Exit Administration, choose a Character that is an active Ar member, and
   enter Ar as that Character.
5. Confirm the top bar labels the view **Read-only Character view** and does
   not show Role or membership mutation controls.
6. Log in as `officer@example.test`, select Alex Mercer, and select Ar. Confirm
   the same read-only behavior.
7. Use the **Log out** control in the top-right context bar. It should return
   to the login prompt. The account home page also has a **Log out** control.

Administration is intentionally User-level and separate from Character
identity. Real delegated Role/ACL administration is deferred to the later
authorization phase.

## Test Domain and Subdomain membership lifecycle

1. In Administration mode, open <http://localhost:3055/domain/ar/members>.
2. The roster shows Character, local alias, controlling User, Domain
   membership, Subdomains, Roles, and an explicit **Remove Domain membership**
   action.
3. Open <http://localhost:3055/domain/ar/subdomains/warriors>.
4. Under **Members**, each active member has a **Remove from Warriors** button.
   Use that button and confirm the page returns to Warriors with the member
   removed.
5. Return to the Domain roster. Confirm the Character's Domain membership is
   still **Active** and its Subdomains column no longer lists Warriors.
6. Re-add the Character to Warriors. Confirm this does not create or remove a
   Role.
7. For the cascade test, click **Remove Domain membership** in the Domain
   roster. Confirm the Character disappears from the active Domain roster,
   Subdomain pages, and active Role assignments.
8. Add the Character back to the Domain. Confirm Domain membership is
   **Active**, but the Character is not automatically restored to any
   Subdomain and has no active Role assignment.
9. Re-add each desired Subdomain and Role explicitly.

The database retains deactivated historical rows for auditability. Inactive
rows do not display in active rosters and do not grant access.

## Test multi-folder Role assignments

1. In Administration mode, open <http://localhost:3055/domain/ar/roles>.
2. Under **Assign Role**, choose an active Ar Domain member and a Role.
3. In **Folder scopes (select any number)**, Ctrl-click (Windows/Linux) or
   Cmd-click (macOS) at least two folders. Do not select **Domain-wide** for
   this test.
4. Click **Assign Role**.
5. Confirm the Active assignments table contains one row for each selected
   folder. Each row is an independent Character/Role/Folder grant; a Character
   may have many such rows.
6. Remove one scoped row. Confirm the other scoped rows remain active.
7. Assigning **Domain-wide** is a separate broad grant and can be selected with
   the checkbox when that is actually intended.

## Test the seeded institutional structure

- <http://localhost:3055/domain/ar/subdomains> lists Scribes, Warriors, and
  Magistrates.
- Browse Warriors to First Platoon to Battle Plans from the records tree.
- The Roles page shows the Commander > Captain > Warrior hierarchy, the Scribe
  hierarchy, and the Magistrate hierarchy.
- The same Captain Role is scoped separately to First Platoon and Second
  Platoon.
- Aren appears with both Warrior and Magistrate assignments.
- The Domain roster keeps Domain membership, Subdomain membership, and Roles in
  separate columns.

## Expected navigation behavior

The Domain/Character selectors and account-level Administration control are
the current Phase 3 context scaffold. Subdomain landing-page sections for
folders, templates, and recent records are intentional placeholders until
their dedicated phases. The Account link and Log out control are the explicit
escape hatch from a Domain view.

## Automated checks

From the project root:

```powershell
npx tsc --noEmit
npm test
npm run build
```

At the time of this handoff, all 49 tests pass, TypeScript passes, the
production build passes, and the server responds with HTTP 200 on port 3055.
