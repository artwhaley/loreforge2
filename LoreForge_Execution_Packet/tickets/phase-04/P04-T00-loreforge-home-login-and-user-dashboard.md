# P04-T00 — LoreForge home, customer login, and User dashboard

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 4  
**Commit prefix:** `P04-T00:`

## Objective
Replace the diagnostic root and ordinary Payload-admin login entry with a deliberate LoreForge public home, embedded customer login, and authenticated User dashboard foundation.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `06_CHANGE_CONTROL.md` section `CC-2026-09-02-01`
- `tickets/phase-04/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P03-GATE approved

## Frozen context for this ticket
- Signed-out `/` is LoreForge's branded marketing/login home; signed-in `/` is the User dashboard.
- Ordinary users never need `/admin/login`; Payload Admin remains an unlinked internal/operator back office.
- About, Subscriptions, Create Account, Forgot Password, Account, and Characters need intentional branded destinations now, but pricing/checkout, open-registration policy, password-delivery provider, and SL verification remain later decisions.
- The final activity/watch system is P13. This ticket builds useful permission-safe placeholders and no shadow activity database.
- Platform branding is genre-neutral. Domain themes begin on Domain surfaces and must not overwrite the persistent LoreForge identity.

## Required work
1. Replace the root diagnostic output with a responsive LoreForge platform shell and the approved crafted-archive visual direction: ink/charcoal foundation, parchment surfaces, restrained ember/copper accent, editorial display face, readable interface face, and a genre-neutral forged-seal/folio motif. Remove runtime/database diagnostics and test credentials from customer output.
2. Build signed-out `/` with LoreForge header, product hero, embedded Email/Password login form, show-password control, Remember me behavior if supported by current auth, Forgot Password link, Create Account link, product explanation, subscription preview, and footer. Authentication errors remain inline and accessible.
3. Add a customer login endpoint/action that uses the existing Payload Users auth/session securely and returns to `/`; do not duplicate password storage or expose Payload Admin as the customer flow.
4. Add branded `/about`, `/subscriptions`, `/create-account`, and `/forgot-password` pages. Until their gates are approved, state unavailable commercial/provider behavior plainly and do not simulate checkout, send fake recovery email, or silently enable unrestricted registration.
5. Build signed-in `/` as the User dashboard with identity/active-Character summary, Your Domains, Continue Working placeholders where authoritative data is absent, a deliberate `For you` feed empty state, and capability-gated administrator summary slots. Do not project or persist fake activity.
6. Add `/account` and `/account/characters` customer surfaces using existing safe User/Character data. Account exposes profile/security destinations without leaking internal flags; Characters distinguishes global Character identity from Domain membership.
7. Add a persistent account menu with Dashboard, Account, Characters, Log out, and later-notification placeholder where appropriate. Platform Console may be shown only to the contracted Platform Admin flag and remains unimplemented until P11.
8. Retain a separate internal path to Payload Admin for developer/operator use, but remove it from ordinary navigation and customer instructions.

## Likely code touchpoints
- `src/app/(frontend)/page.tsx`
- `src/app/(frontend)/about/**`
- `src/app/(frontend)/subscriptions/**`
- `src/app/(frontend)/create-account/**`
- `src/app/(frontend)/forgot-password/**`
- `src/app/(frontend)/account/**`
- `src/components/platform/**`
- `src/app/(payload)/api/**`

## Automated acceptance
- Signed-out `/` renders the customer login and public LoreForge navigation with no diagnostic status, test credential, or ordinary `/admin/login` link.
- Valid customer credentials establish the existing User session and return to signed-in `/`; invalid credentials produce an accessible generic error without account enumeration.
- Signed-in `/` renders User-safe data and deliberate feed/admin placeholders without writing activity rows.
- Ordinary Users cannot see Platform Console links or internal User/platform fields.
- Placeholder commercial/recovery/registration pages do not perform provider-dependent or unauthorized state changes.

## Manual acceptance
- At desktop and narrow mobile widths, review signed-out `/` as a real product homepage; log in directly on the page, arrive at the LoreForge dashboard, open Account and Characters, log out, and return to the signed-out homepage.
- Confirm the page feels like LoreForge rather than a Payload/Next.js diagnostic or a genre-specific Domain.

## Guardrails / non-goals
- `Do not choose subscription prices, billing provider, email provider, or unrestricted registration policy.`
- `Do not remove Payload Admin; keep it as unlinked internal back office.`
- `Do not fabricate activity, notification, review, or recent-work records to fill the dashboard.`
- Do not advance work scheduled for a later phase merely because a nearby file is open.
- Do not introduce a new framework/provider/abstraction not authorized by the Architecture Contract.
- Keep customer-facing language free of Payload/CMS schema terminology.
- Preserve passing behavior outside this ticket; add regression tests for changed contracts.
- Regenerate Payload types after schema changes.
- Commit this ticket separately and write its execution note before proceeding.

## Completion handoff
- All required automated checks pass.
- Manual acceptance is recorded, or exact environment block documented.
- No unrelated refactor/provider/dependency work is mixed in.
- `execution-notes/P04-T00.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to P04-T05.
