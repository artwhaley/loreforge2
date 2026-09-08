# OBSIDIAN-T02 — Propagate validated Design config to renderers

## Files changed

- `src/lib/design/types.ts` — added `DesignConfigProps<TConfig>`; `DesignShellProps<TConfig>` now carries `designConfig`; every page slot (public + optional operational) typed with `& DesignConfigProps<TConfig>`; `DesignDefinition.Shell` typed `DesignShellProps<TConfig>`.
- `src/lib/design/resolveRoute.ts` — `DomainRouteShell` now exposes `config: unknown` from `resolveDomainDesign()`.
- 7 public routes (`[slug]/`, `records`, `documents/[id]`, `departments`, `departments/[departmentSlug]`, `about`, `lore`) pass `designConfig={route.config as object}` to Shell + page.
- `src/components/theme/TenantShell.tsx` — passes `resolved.config` to the selected Shell (shared editors ride the same seam).
- `src/components/site-studio/SiteStudio.tsx` — preview passes `draftBank.config` (DRAFT config, per T02 guardrail: per-keystroke edits render before Save; saved config never substituted).
- All Civic/Ledger/Poster Shells + page components + shared legacy thin views accept `designConfig` typed against their own config (config unused today; erasure at dispatch).
- Test fixtures updated to the erased-dispatch pattern (`DesignDefinition<object>` + `designConfig={{}}`) or per-design defaults (`civicDefaults` etc.) — matching the registry's `eraseConfig` pattern.
- Added `src/lib/design/configSeam.design.test.tsx` — fake Design whose page DISPLAYS its config through the erased registry dispatch (runtime receipt proof).

## Tests run

- `npx tsc --noEmit` clean
- `npm run test:design` 151/151 (was 150; +1 seam test)
- `npm run lint` 0 errors (6 pre-existing `<img>` warnings in shells, unchanged)

## Deviations

- `designConfig` is required in the type (per packet §8 frozen shape); components that don't use it yet accept-and-ignore.
- Route call sites cast `route.config as object` at the erased dispatch boundary — the single localized erasure point, consistent with the registry.
- The seam test avoids exercising `resolveDomainDesign` with a fake key because `pickDesignKey` only admits registered keys; invalid-config fallback is already covered for real Designs in `v2.design.test.ts`.

## Contract pressure

- None. No appearance change: all renders pass through identical props plus the ignored config.