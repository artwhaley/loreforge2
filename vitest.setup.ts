import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// RTL auto-cleanup only self-registers under framework globals; Vitest needs
// the explicit hook so renders never leak across conformance cases.
afterEach(() => {
  cleanup()
})
