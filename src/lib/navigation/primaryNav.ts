/**
 * Frozen canonical primary navigation SEGMENTS (DEF-SHELL-01). The route
 * structure is what stays frozen; display labels are Domain-vocabulary
 * driven. `buildDomainShellModel` is the single source Designs receive
 * already-filtered nav from; this constant pins the canonical order for
 * invariants and regression tests.
 */
export const PRIMARY_NAV_SEGMENTS = ['', 'about', 'lore', 'departments', 'records'] as const
export type PrimaryNavSegment = (typeof PRIMARY_NAV_SEGMENTS)[number]