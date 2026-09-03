# Change Control and Executor Guardrails

## Priority
1. Explicit owner instruction issued after this packet.
2. Frozen product decisions.
3. Architecture contract.
4. Current ticket.
5. Full product specification.
6. Spike implementation details.

The spike is evidence, not authority over later product decisions.

`references/STALE_LOREFORGE_FUNCTIONAL_SPEC.md` is historical intent-mining material only. Consult it only when useful to explain an ambiguity; it never overrides frozen decisions, the Architecture Contract, current tickets, or owner gates.

## If source disagrees
### A. Harmless implementation drift
Proceed using actual names/locations; note it in completion report.

### B. Extra nonconflicting local work
Preserve it. Do not delete owner work just to match the snapshot.

### C. Conflict with frozen decision/prerequisite
Stop the ticket and write `BLOCKED-<ticket-id>.md` with:
- exact file/commit evidence;
- conflicting packet requirement;
- smallest resolution choices.
Do not silently redesign.

### D. Library/API impossibility
Keep product behavior fixed. Demonstrate incompatibility minimally. Stop only if straightforward mechanisms require changing the contract.

## Forbidden scope expansion
No:
- Postgres/cloud before P10;
- raw CSS;
- page builder;
- external FGA;
- external search engine;
- arbitrary metadata framework;
- permanent raw form submissions;
- recursive Subdomains;
- multi-SL-alt linking;
- live collaborative editing;
- WebSocket chat architecture;
- SL bot inside Next/Payload process;
- third-party starter packs.

## Schema changes
- Only in tickets that name them.
- Regenerate Payload types.
- Before P10, fixture reset may be used only when ticket permits.
- After P10, repeatable migrations are mandatory.

## UI
Customer workflows use LoreForge language, never Payload/CMS terminology.
Do not defer a ticket's scheduled UX tuning with “polish later.”

## Completion standard
- required behavior implemented;
- targeted tests pass;
- full suite passes;
- build/typecheck/lint supported by repo pass;
- manual acceptance recorded or exact environment block documented;
- no unrelated changes;
- execution note written;
- ticket committed.

## Review gates
Hard stop. Executor reports; owner approves. No self-approval.

## Approved change log

### CC-2026-09-02-01 — User-first customer shell before Phase 4

- **Authority:** explicit owner approval on 2026-09-02 of `PROPOSED_UX_WORKFLOW_SPEC.md` after Phase 3 acceptance.
- **Problem closed:** the Phase 3 spike exposed database-shaped customer pages, a redundant Administration Domain selector/mode, diagnostic platform home, ordinary login through `/admin/login`, missing People-centered administration, and an inline-title Document creation entry that did not match the real workflow.
- **Supersedes:** every packet statement requiring an explicit Administration context/mode, Enter/Exit Administration controls, or a second administrative Domain selector. It also changes the default customer noun from Subdomain to Department while retaining the neutral internal model.
- **Frozen replacement:** one selected Domain, optional eligible acting Character, capability-driven management links, stable Domain primary navigation, branded platform home/login/dashboard, Character-centered People workspace, and full-page Document creation as defined in `02_FROZEN_PRODUCT_DECISIONS.md` and `03_ARCHITECTURE_CONTRACT.md`.
- **Execution:** Phase 4 begins with P04-T00, P04-T05, and P04-T06 before the existing lifecycle sequence. Phase 5 distinguishes Prepared by/Concerns links; Phases 6–8 and 11 hydrate the approved surfaces; P13-T00 adds Domain notices before activity projection.
- **Non-change:** User-level Domain authority remains distinct from Character identity; server authorization remains authoritative; internal `subdomain` schema may remain; pricing/providers remain owner-gated.
