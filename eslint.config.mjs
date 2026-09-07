import { defineConfig, globalIgnores } from 'eslint/config'
// eslint-config-next@16 exports a flat config array (no legacy named presets).
// The Next.js recommended preset ships as the `core-web-vitals` subpath export.
import nextVitals from 'eslint-config-next/core-web-vitals'

const designSeamMessage =
  'Designs consume Page Models; they do not discover protected Domain data (spec §33 Guardrail 2).'
const builderSeamMessage =
  'Client workspace modules must not import server-only Page Model builders (spec §33).'

export default defineConfig([
  ...nextVitals,
  globalIgnores(['.next/**', 'node_modules/**', 'src/payload-types.ts', 'src/app/(payload)/**']),
  {
    files: ['src/designs/**/*.ts', 'src/designs/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@/lib/payload', message: designSeamMessage },
            { name: '@/payload.config', message: designSeamMessage },
            { name: '@payload-config', message: designSeamMessage },
            { name: 'payload', message: designSeamMessage },
            { name: '@/lib/tenant/queries', message: designSeamMessage },
            { name: '@/lib/design/resolveRoute', message: 'Route resolution is server-only; Designs receive the resolved Design, never resolve it.' },
          ],
          patterns: [
            { group: ['@/lib/authz/*'], message: designSeamMessage },
            { group: ['@/collections/*'], message: designSeamMessage },
            {
              group: [
                '@/lib/shell/*',
                '@/lib/home/*',
                '@/lib/document/*',
                '@/lib/departments/*',
                '@/lib/records/buildRecordsPageModel*',
              ],
              message: builderSeamMessage,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/lib/records/workspace/**/*.ts', 'src/lib/records/workspace/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: '@/lib/design/resolveRoute', message: builderSeamMessage }],
          patterns: [
            {
              group: [
                '@/lib/shell/*',
                '@/lib/home/*',
                '@/lib/document/*',
                '@/lib/departments/*',
                '@/lib/records/buildRecordsPageModel*',
              ],
              message: builderSeamMessage,
            },
          ],
        },
      ],
    },
  },
])
