# P10-T03 — Operational backup and restore baseline

**Mode:** IMPLEMENTATION TICKET  
**Phase:** 10  
**Commit prefix:** `P10-T03:`

## Objective
Prove LoreForge can recover its database/media before hosting real community history.

## Required pre-read
- `00_START_HERE.md`
- `02_FROZEN_PRODUCT_DECISIONS.md`
- `03_ARCHITECTURE_CONTRACT.md`
- `04_SPIKE_BASELINE.md`
- `05_FIXTURE_AND_ACCEPTANCE_CONTRACT.md`
- `tickets/phase-10/00_PHASE_ORCHESTRATOR.md`
- this ticket.

## Depends on
- P10-T02

## Frozen context for this ticket
- Community history must not be casually destroyed.
- Backup/restore is operational infrastructure distinct from owner-facing whole-Domain export in P12.
- Exact hosted backup product waits for provider choice; local/provider-neutral commands are required now.

## Required work
1. Implement documented PostgreSQL logical backup command/script and restore-to-empty verification workflow.
2. Back up media/files alongside database with manifest/checksums in development baseline.
3. Create automated restore smoke in a uniquely named disposable database/media directory using a small fixture. The script must verify the resolved targets are disposable and refuse to restore over the active development/production database or media root without a separate operator-approved disaster-recovery procedure.
4. Document recovery order, secrets exclusions, retention placeholders, and what is not covered until hosted-provider gate.
5. Add backup metadata/version marker for schema compatibility.

## Likely code touchpoints
- scripts/backup.*
- scripts/restore.*
- docs/operations/backup-restore.md

## Automated acceptance
- Automated fixture backup restores and passes integrity counts/body hash.
- Media checksum matches after restore.
- Secrets not included in archive.
- Restore fails clearly on incompatible/missing manifest.

## Manual acceptance
- Perform a manual backup and restore into a new disposable database/media directory, then run the golden read/edit scenario against the restored target. Do not destroy the working local volumes for acceptance.

## Guardrails / non-goals
- `Do not invent final retention duration or hosted snapshot SLA.`
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
- `execution-notes/P10-T03.md` records commit hash, files changed, tests, manual result, and any specifically deferred issue.
- Commit with prefix above, then proceed only to the next listed ticket in this phase.
