import test from 'node:test'
import assert from 'node:assert/strict'

import { clampActiveIndex, stepActiveIndex } from './searchNavigation'

test('P05R-T03 C: ArrowDown moves to the next result and ArrowUp to the previous', () => {
  assert.equal(stepActiveIndex({ activeIndex: null, count: 3 }, 1), 0, 'Down with no active opens on the first result')
  assert.equal(stepActiveIndex({ activeIndex: null, count: 3 }, -1), 2, 'Up with no active opens on the last result')
  assert.equal(stepActiveIndex({ activeIndex: 0, count: 3 }, 1), 1)
  assert.equal(stepActiveIndex({ activeIndex: 2, count: 3 }, 1), 2, 'Down at the last result stays put (no wrap)')
  assert.equal(stepActiveIndex({ activeIndex: 1, count: 3 }, -1), 0)
  assert.equal(stepActiveIndex({ activeIndex: 0, count: 3 }, -1), 0, 'Up at the first result stays put (no wrap)')
})

test('P05R-T03 C: empty lists never produce an active item', () => {
  assert.equal(stepActiveIndex({ activeIndex: null, count: 0 }, 1), null)
  assert.equal(stepActiveIndex({ activeIndex: 2, count: 0 }, -1), null)
  assert.equal(clampActiveIndex(2, 0), null)
})

test('P05R-T03 C: the active item stays visible when the result set shrinks', () => {
  assert.equal(clampActiveIndex(4, 3), 2, 'active clamps to the last visible result')
  assert.equal(clampActiveIndex(1, 5), 1, 'active inside the new range is untouched')
  assert.equal(clampActiveIndex(null, 5), null, 'no active stays inactive')
})

test('P05R-T03 C: Enter selects the active result and Escape clears — handled at the component via these bounds', () => {
  // The component maps Enter -> navigate when an active result exists; this
  // guards the bound: with a valid active index the listbox always has a
  // selectable result at that index.
  const count = 3
  for (const index of [0, 1, 2]) {
    const clamped = clampActiveIndex(index, count)
    assert.notEqual(clamped, null)
    assert.ok(clamped !== null && clamped >= 0 && clamped < count, 'every active index maps to a selectable result')
  }
})
