/**
 * Pure listbox keyboard-navigation helpers for PeopleSearch (P05R-T03 C).
 * Contract: ArrowDown -> next result, ArrowUp -> previous result, the active
 * item stays visible (clamped when the result set shrinks), and Escape closes
 * the list. Rendered as a focused highlight + aria-activedescendant, not a
 * native focus move, so mouse behavior is untouched.
 */
export type SearchNavState = { activeIndex: number | null; count: number }

/** Move the active index for ArrowDown (direction 1) / ArrowUp (direction -1). */
export function stepActiveIndex(state: SearchNavState, direction: 1 | -1): number | null {
  if (state.count <= 0) return null
  if (state.activeIndex === null) return direction === 1 ? 0 : state.count - 1
  const next = state.activeIndex + direction
  if (next < 0 || next >= state.count) return state.activeIndex
  return next
}

/** After the result set changes, keep the active item visible or clear it. */
export function clampActiveIndex(activeIndex: number | null, count: number): number | null {
  if (count <= 0) return null
  if (activeIndex === null) return null
  return activeIndex >= count ? count - 1 : activeIndex
}
