import { defineConfig, globalIgnores } from 'eslint/config'
// eslint-config-next@16 exports a flat config array (no legacy named presets).
// The Next.js recommended preset ships as the `core-web-vitals` subpath export.
import nextVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...nextVitals,
  globalIgnores(['.next/**', 'node_modules/**', 'src/payload-types.ts', 'src/app/(payload)/**']),
])
