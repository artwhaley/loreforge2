# Phase 2 review — User versus Character context

## Review status

Phase 2 implementation is complete on branch `phase-02-character-context` and is awaiting the owner decision at `P02-GATE`. No Phase 3 work has been started.

## Identity model finding

The implementation keeps the concepts separate:

- A User is the authenticated account and retains account-level identity and the legacy transitional Domain membership.
- A Character is a global roleplay identity. A User may control several active Characters; an unclaimed Character is not silently assigned to a User.
- DomainMembership is the explicit Character-to-Domain relationship used for Domain access. It is distinct from the legacy User Membership and does not create a new User.
- DomainCharacterContext stores only Domain-local display alias/note. It does not rename the global Character or grant membership.
- Claim requests change control only through an explicit pending request and an interim legacy Domain-admin decision. Merge requests are pending-only in Phase 2.

The public Character projection exposes display-safe fields and controller name only; account email, SL fields, controller IDs, and administration metadata are not rendered.

## Manual review evidence

Using the seeded fixtures in the running browser:

1. `admin@example.test` can choose Lucan or Elara. With Lucan active, both City of Ravenhurst and Port Victoria are offered. Switching to Elara clears the Domain; attempting Port Victoria while Elara is active is rejected because Elara is not a Port Victoria member.
2. The Domain shell presents the operating context as a visually grouped bar: `Domain` on the left and `Acting as` Character on the right. An explicit `Administration` link is shown separately to a Domain admin. Changing Character never preserves an invalid Domain cookie.
3. Clearing the active Character makes Domain selection unavailable; a direct `/tenant/ravenhurst` request resolves to not-found rather than showing content under an ambiguous identity.
4. `officer@example.test` sees only Alex Mercer and City of Ravenhurst. In the Unknown Traveler profile the ordinary member can request a claim but does not see claim decision controls.
5. Unknown Traveler's Ravenhurst alias and note persisted after refresh. The profile continued to show the global name separately, and no DomainMembership was created by the local-context edit.
6. An admin claim request was visible as pending, then approved with a decision note; the profile controller changed to Morgan Vale and the claim-decision controls disappeared.
7. A merge request with evidence and note was created as `Pending` in the Payload admin collection. There is no Phase 2 customer-facing merge approval path.

## Findings and deferred items

- The gate walkthrough consumed the seeded Unknown Traveler claim fixture by approving it. To repeat the unclaimed flow from a clean state, reset the local SQLite database and rerun `npm run seed`, or create a fresh unclaimed Character in the admin UI.
- The explicit Administration affordance is a clearly separated route to the existing Payload back office. Real Domain owner/admin roles and ACL enforcement remain intentionally deferred to P03/P07; Phase 2 uses the legacy Domain-admin seam only for claim decisions.
- There is no dedicated zero-membership user in the seed, so the no-active-Character empty state was verified, while a truly empty-account fixture remains an owner follow-up.
- `npx eslint .` remains environment-blocked by the repository's pre-existing ESLint 9/config error (`core-web-vitals` is undefined); tests, typecheck, build, and seed pass.

## Review conclusion

The User/Character/Domain relationships are now concrete and visible enough to proceed to owner review. The next permitted action is owner approval of `P02-GATE`; do not begin Phase 3 until that approval is recorded.
