import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Shared operational bodies (OBSIDIAN-T08) import interactive management
// components whose server-action modules import Payload config. Payload only
// *builds* config at import (no DB connection); the guards just need these
// env vars present. Tests never call getPayload.
process.env.DATABASE_URI ??= 'file:./design-suite-test.db'
process.env.PAYLOAD_SECRET ??= 'dev-only-secret-not-for-production-use'

// jsdom lacks ResizeObserver; the shared FolderManager measures its tree
// container (OBSIDIAN-T08). Provide a no-op so effect-based components render.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}

// RTL auto-cleanup only self-registers under framework globals; Vitest needs
// the explicit hook so renders never leak across conformance cases.
afterEach(() => {
  cleanup()
})
