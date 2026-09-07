import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Vitest for Design/component conformance (spec §29.2). Additive only: the
 * existing node --test suites stay untouched. CSS/SCSS imports resolve to
 * empty modules — conformance asserts structure and behavior, not pixels.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
    },
  },
  test: {
    css: false,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/designs/**/*.design.test.{ts,tsx}', 'src/lib/design/**/*.design.test.{ts,tsx}', 'src/lib/records/**/*.design.test.{ts,tsx}', 'src/lib/documents/**/*.design.test.{ts,tsx}'],
  },
})
