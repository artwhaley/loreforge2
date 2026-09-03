# P15-T04 — Second Life notecard import/export with provenance round-trip

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 15  
**Commit prefix:** `P15-T04:`

## Objective
Connect canonical Markdown Documents to SL notecards through the bridge while retaining chain-of-custody-style RP provenance.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-15/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P15-T03

## Frozen context for this ticket
- Markdown is canonical and deliberately readable as SL plain text/notecard content.
- Import/export both directions are required.
- Bot/bridge may create/deliver notecard; provenance includes original creator/date when known, archive uploader/date, exporter/bot/date, read-only marker/status where available.
- Exact SL capabilities come from approved protocol; do not fabricate unavailable metadata.

## Required work
1. Implement core import endpoint/event that maps the verified avatar to User and a controlled active Character, then requires local `create_document` on the chosen destination Folder plus its action-start location condition. The bridge attests only approved SL facts; it never selects authority. Create canonical Document/provenance atomically.
2. Implement export request requiring `read` + `export_document` on the Document and its action-start location condition. Render canonical Markdown plus owner-approved provenance header/footer, send command to bridge, and record queued/created/delivered as distinct events.
3. Bridge implements notecard receive/create/deliver operations per approved LibreMetaverse capability.
4. Preserve original imported raw text/hash/source metadata in provenance/context as allowed without making raw text second editable body.
5. Handle transfer failure/retry idempotently; never record delivered when only created/queued.

## Likely code touchpoints
- src/lib/sl/notecards/**
- bridge/**

## Automated acceptance
- Imported notecard becomes ordinary Document searchable/editable per lifecycle.
- Exported content contains approved provenance and readable Markdown.
- Retry does not create duplicate Document/notecard delivery for same request where protocol can guarantee idempotency.
- Failed delivery status accurate.
- Verified avatar with no controlled active Character, wrong location, or missing local capability is denied even if bridge request/service credentials are valid.

## Manual acceptance
- Round-trip a fixture notecard into archive, edit/file as allowed, export back and inspect provenance text.

## Guardrails / non-goals
- `Do not bypass permissions for import/export.`
- `Do not claim SL metadata not actually supplied by protocol.`
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
- `execution-notes/P15-T04.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
