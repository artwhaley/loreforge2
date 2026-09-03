# MVP Review

Written at the end of Ticket 08 (before REVIEW GATE F). These are the product questions that
remain before any production-hardening work. They are **not** hidden requirements — they are
open decisions for the review. Each is grouped as the build spec requested.

The full 27-step acceptance scenario from `00_BUILD_SPEC.md §15` passes from a clean local reset.

---

## Editor

- Is MDXEditor the right WYSIWYG long term, or is a lighter/simple Markdown editor sufficient?
  The current editor is pleasant to use but brings a heavy dependency for the MVP scope.
- Should the source/Edit toggle default to one mode? Right now documents open in Edit (WYSIWYG);
  power users currently toggle to Source each time.
- Do we want an autosave/draft concept, or is explicit Save fine for this audience?
- The safe source editor (own textarea behind a Source toggle) preserved block structure in
  round-trips — worth confirming the reviewer finds that acceptable vs. MDXEditor's built-in diff
  pane (which was intentionally rejected for collapsing structure).

## Theme / personalization

- Is the curated 2-preset / 4-color / 7-font palette enough, or do tenants need more freedom?
  (Spec explicitly forbids arbitrary CSS, so this is a "how far to push curation" question.)
- Are seal/logo + banner uploads the only media tenants need, or should they add e.g. an avatar
  or a small gallery?
- The Theme Studio lives at `/tenant/[slug]/customize`. Should personalization be per-user (a
  volunteer's own view) rather than per-tenant? The MVP scopes it to the whole tenant.

## Archive UX

- Folder model is 2-levels deep in fixtures but supports arbitrary nesting. Is a flat "folder +
  search + recent" mental model enough for the target roleplayer?
- Search is a simple `title/body LIKE` (spec §7.5). Good enough for hundreds of records, but a
  real deployment may need paging/tagging. Confirm volume assumptions.
- Record deletion is hard delete. Do we need soft-delete/archive instead?
- The "origin" badge (Web editor / Markdown import / Form) is now consistent — confirm it means
  anything to users, or should it be hidden.

## Forms

- Payload Form Builder passed authoring. The admin UI shows Emails/Confirmation sections that are
  irrelevant to the archive use case (no email transport) — should we hide them for a cleaner
  authoring surface?
- Form fill generates a Document via the explicit seam (`src/lib/forms/generateDocument.ts`).
  Confirm the fixture field set (date/officer/location/type/persons/narrative/follow-up) matches
  what players actually want to report.
- Should form submissions also be retained as raw submissions, or is the generated Document the
  single record of truth (current behavior)?

## Permissions (later)

- Only two roles exist (admin/member) via a membership row. The spec defers richer roles.
  Confirm: does a member filling a form need to be restricted to *their* tenant only (currently
  true), and can any member author the theme (currently admin-only via Customize)?

## Second Life integration (later)

- Import is a paste-Markdown surface with `origin: markdown-import`. The real SL transport (LSL,
  notecard asset handling, HTTP-in/out) is explicitly deferred. Confirm the paste surface is a
  believable stand-in for the review.

## Production infrastructure (later)

- SQLite + local filesystem media are the MVP default. Postgres + object storage are deferred.
- No auth email flow beyond the seeded password users (no email service). Confirm that is fine for
  the target audience.
- `npm run dev` collisions on Windows when seeding (dev server vs. schema push) — a scripted reset
  script would smooth onboarding.

---

## Gate F product question

> Is creating, styling, filing, finding, and reusing these records already materially better than
> managing Second Life notecards?

Answer only after using the software. Production architecture work begins only when the answer is
yes and the rejected UX choices above are resolved.
