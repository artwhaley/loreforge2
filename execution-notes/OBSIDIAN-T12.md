# OBSIDIAN-T12 — Shell and operating context

Status: complete.

Changed `ObsidianShell` to the production `DesignShellProps` contract, mount the shared `OperatingContext` exactly once, apply resolved universal and Obsidian tokens, and preserve all supplied primary and management navigation. Navigation no longer depends on an incubation-only `active` prop; route data remains authoritative.

Verification: `npx tsc --noEmit`, `npm run test:design`, `npm run lint` (warnings only, no errors).

Deviation/pressure: the current shell contract does not carry a pathname/active-segment fact, so Obsidian leaves active styling unset rather than inventing route state.
